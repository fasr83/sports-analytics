from fastapi import APIRouter, HTTPException
from ..api import football_data, odds_api, api_football
from ..analytics.poisson_model import get_model
from ..analytics.value_bets import analyze_match_odds
from ..analytics.arbitrage import find_arbitrage
from ..config import LEAGUES, settings
from .setup import get_demo_fixtures

router = APIRouter(prefix="/analytics", tags=["analytics"])


_SUFFIXES = {" fc", " af", " afc", " cf", " sc", " fk", " ac", " united", " city", " town", " rovers", " wanderers"}

def _normalize(name: str) -> str:
    n = name.lower().strip()
    for s in _SUFFIXES:
        if n.endswith(s):
            n = n[: -len(s)].strip()
    return n

def _find_team(model_teams: dict, name: str) -> str | None:
    if name in model_teams:
        return name
    # Exact normalized match
    norm = _normalize(name)
    for team in model_teams:
        if _normalize(team) == norm:
            return team
    # Substring match on normalized names
    for team in model_teams:
        tn = _normalize(team)
        if norm in tn or tn in norm:
            return team
    return None


@router.get("/{league_code}/train")
async def train_model(league_code: str):
    league_info = LEAGUES.get(league_code)
    if not league_info:
        raise HTTPException(404, "League not found")

    # Try real API first
    if settings.FOOTBALL_DATA_API_KEY and league_info["source"] == "football-data":
        try:
            data = await football_data.fetch_matches(league_code, status="FINISHED")
            training_data = [
                {
                    "home_team": m["homeTeam"]["name"],
                    "away_team": m["awayTeam"]["name"],
                    "home_goals": m["score"]["fullTime"]["home"] or 0,
                    "away_goals": m["score"]["fullTime"]["away"] or 0,
                }
                for m in data.get("matches", [])
                if m["score"]["fullTime"]["home"] is not None
            ]
            if training_data:
                model = get_model(league_code)
                model.fit(training_data)
                return {"status": "trained", "matches_used": len(training_data), "teams": len(model.attack), "source": "api"}
        except Exception:
            pass

    if settings.API_FOOTBALL_KEY and league_info["source"] == "api-football":
        try:
            data = await api_football.fetch_fixtures(league_info["api_football_id"])
            training_data = []
            for f in data.get("response", []):
                goals = f["goals"]
                if goals.get("home") is not None and goals.get("away") is not None:
                    training_data.append({
                        "home_team": f["teams"]["home"]["name"],
                        "away_team": f["teams"]["away"]["name"],
                        "home_goals": goals["home"],
                        "away_goals": goals["away"],
                    })
            if training_data:
                model = get_model(league_code)
                model.fit(training_data)
                return {"status": "trained", "matches_used": len(training_data), "teams": len(model.attack), "source": "api"}
        except Exception:
            pass

    # Fallback to seed data
    from ..seed_data import generate_finished_matches, get_all_league_codes
    if league_code not in get_all_league_codes():
        raise HTTPException(400, "No data available for this league.")
    training_data = generate_finished_matches(league_code, n=90)
    model = get_model(league_code)
    model.fit(training_data)
    return {"status": "trained", "matches_used": len(training_data), "teams": len(model.attack), "source": "demo"}


@router.get("/{league_code}/predict/{home_team}/{away_team}")
async def predict_match(league_code: str, home_team: str, away_team: str):
    model = get_model(league_code)
    if not model.fitted:
        raise HTTPException(400, "Model not trained. Call /analytics/{league}/train first.")
    prediction = model.predict(home_team, away_team)
    top_scores = model.get_top_scores(home_team, away_team)
    return {
        "home_team": home_team,
        "away_team": away_team,
        **prediction,
        "top_scores": top_scores,
    }


@router.get("/{league_code}/value-bets")
async def get_value_bets(league_code: str):
    """Fetch live odds and compare with model predictions."""
    model = get_model(league_code)
    if not model.fitted:
        raise HTTPException(400, "Model not trained. Call /analytics/{league}/train first.")

    raw_odds = await odds_api.fetch_odds(league_code)
    value_bets = []

    for event in raw_odds:
        home_team = event.get("home_team", "")
        away_team = event.get("away_team", "")

        # Try fuzzy matching if exact match fails
        matched_home = _find_team(model.attack, home_team)
        matched_away = _find_team(model.attack, away_team)

        if not matched_home or not matched_away:
            continue

        prediction = model.predict(matched_home, matched_away)
        bookmaker_odds = []

        for bk in event.get("bookmakers", []):
            for market in bk.get("markets", []):
                if market["key"] == "h2h":
                    outcomes = {o["name"]: o["price"] for o in market["outcomes"]}
                    bookmaker_odds.append({
                        "bookmaker": bk["title"],
                        "odds_home": outcomes.get(home_team, 0),
                        "odds_draw": outcomes.get("Draw", 0),
                        "odds_away": outcomes.get(away_team, 0),
                    })

        analyzed = analyze_match_odds(
            prediction["prob_home"],
            prediction["prob_draw"],
            prediction["prob_away"],
            bookmaker_odds,
        )
        arb = find_arbitrage(bookmaker_odds)

        has_value = any(
            b["is_value_home"] or b["is_value_draw"] or b["is_value_away"]
            for b in analyzed
        )

        value_bets.append({
            "match_date": event.get("commence_time"),
            "home_team": home_team,
            "away_team": away_team,
            "model_prediction": prediction,
            "bookmakers": analyzed,
            "arbitrage": arb,
            "has_value": has_value,
        })

    value_bets.sort(key=lambda x: x["has_value"], reverse=True)
    return {"league": league_code, "events": value_bets}


@router.get("/{league_code}/arbitrage")
async def get_arbitrage_opportunities(league_code: str):
    """Find pure arbitrage opportunities across bookmakers."""
    raw_odds = await odds_api.fetch_odds(league_code)
    arb_opportunities = []

    for event in raw_odds:
        bookmaker_odds = []
        for bk in event.get("bookmakers", []):
            for market in bk.get("markets", []):
                if market["key"] == "h2h":
                    outcomes = {o["name"]: o["price"] for o in market["outcomes"]}
                    home_team = event.get("home_team", "")
                    away_team = event.get("away_team", "")
                    bookmaker_odds.append({
                        "bookmaker": bk["title"],
                        "odds_home": outcomes.get(home_team, 0),
                        "odds_draw": outcomes.get("Draw", 0),
                        "odds_away": outcomes.get(away_team, 0),
                    })

        arb = find_arbitrage(bookmaker_odds)
        if arb and arb.get("is_arb"):
            arb_opportunities.append({
                "match_date": event.get("commence_time"),
                "home_team": event.get("home_team"),
                "away_team": event.get("away_team"),
                **arb,
            })

    return {"league": league_code, "opportunities": arb_opportunities, "count": len(arb_opportunities)}


@router.get("/top-picks")
async def get_top_picks(min_confidence: float = 0.52, limit: int = 30):
    """Aggregate best predictions across all trained leagues."""
    from .setup import get_demo_fixtures
    all_picks = []
    for league_code, league_info in LEAGUES.items():
        model = get_model(league_code)
        if not model.fitted:
            continue
        fixtures = get_demo_fixtures(league_code)
        for f in fixtures[:10]:
            try:
                pred = model.predict(f["home_team"], f["away_team"])
                top_scores = model.get_top_scores(f["home_team"], f["away_team"], top_n=1)
                max_prob = max(pred["prob_home"], pred["prob_draw"], pred["prob_away"])
                if pred["prob_home"] == max_prob:
                    pick, pick_label = "1", f["home_team"]
                elif pred["prob_away"] == max_prob:
                    pick, pick_label = "2", f["away_team"]
                else:
                    pick, pick_label = "X", "Empate"
                if max_prob >= min_confidence:
                    all_picks.append({
                        "league_code": league_code,
                        "league_name": league_info["name"],
                        "home_team": f["home_team"],
                        "away_team": f["away_team"],
                        "date": f.get("date"),
                        "pick": pick,
                        "pick_label": pick_label,
                        "confidence": round(max_prob, 4),
                        "prob_home": round(pred["prob_home"], 4),
                        "prob_draw": round(pred["prob_draw"], 4),
                        "prob_away": round(pred["prob_away"], 4),
                        "top_score": top_scores[0] if top_scores else None,
                    })
            except Exception:
                pass
    all_picks.sort(key=lambda x: x["confidence"], reverse=True)
    return {"picks": all_picks[:limit], "total": len(all_picks)}


@router.get("/{league_code}/upcoming-predictions")
async def get_upcoming_with_predictions(league_code: str):
    model = get_model(league_code)
    if not model.fitted:
        raise HTTPException(400, "Model not trained.")
    fixtures = get_demo_fixtures(league_code)
    results = []
    for f in fixtures:
        try:
            pred = model.predict(f["home_team"], f["away_team"])
            top = model.get_top_scores(f["home_team"], f["away_team"], top_n=3)
            results.append({**f, "prediction": pred, "top_scores": top})
        except Exception:
            results.append({**f, "prediction": None})
    return {"league": league_code, "fixtures": results}
