from fastapi import APIRouter, HTTPException
from ..api import football_data, odds_api
from ..analytics.poisson_model import get_model
from ..analytics.value_bets import analyze_match_odds
from ..analytics.arbitrage import find_arbitrage
from ..config import settings

router = APIRouter(prefix="/matches", tags=["matches"])

@router.get("/{league_code}/{match_id}/odds")
async def get_match_odds(league_code: str, match_id: str):
    """Get live odds for a specific match from The Odds API."""
    raw = await odds_api.fetch_odds(league_code)
    match = next((e for e in raw if str(e.get("id")) == match_id), None)
    if not match:
        raise HTTPException(404, "Match odds not found")

    model = get_model(league_code)
    home_team = match.get("home_team", "")
    away_team = match.get("away_team", "")

    prediction = None
    if model.fitted:
        prediction = model.predict(home_team, away_team)

    bookmaker_odds = []
    for bk in match.get("bookmakers", []):
        for market in bk.get("markets", []):
            if market["key"] == "h2h":
                outcomes = {o["name"]: o["price"] for o in market["outcomes"]}
                bookmaker_odds.append({
                    "bookmaker": bk["title"],
                    "odds_home": outcomes.get(home_team, 0),
                    "odds_draw": outcomes.get("Draw", 0),
                    "odds_away": outcomes.get(away_team, 0),
                })

    if prediction:
        analyzed = analyze_match_odds(prediction["prob_home"], prediction["prob_draw"], prediction["prob_away"], bookmaker_odds)
    else:
        analyzed = bookmaker_odds

    arb = find_arbitrage(bookmaker_odds)

    return {
        "home_team": home_team,
        "away_team": away_team,
        "date": match.get("commence_time"),
        "model_prediction": prediction,
        "bookmakers": analyzed,
        "arbitrage": arb,
    }
