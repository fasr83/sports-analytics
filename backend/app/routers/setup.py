from fastapi import APIRouter
from ..seed_data import generate_finished_matches, generate_upcoming_fixtures, get_all_league_codes
from ..analytics.poisson_model import get_model
from ..config import LEAGUES, settings
from ..api import football_data as fd_api

router = APIRouter(prefix="/setup", tags=["setup"])

_demo_fixtures: dict[str, list] = {}
_demo_standings: dict[str, list] = {}
_model_source: dict[str, str] = {}   # "api" | "demo"


@router.get("/status")
async def get_status():
    statuses = {}
    for code in get_all_league_codes():
        model = get_model(code)
        statuses[code] = {
            "name": LEAGUES.get(code, {}).get("name", code),
            "model_trained": model.fitted,
            "model_source": _model_source.get(code, "none"),
            "teams_in_model": len(model.attack),
            "upcoming_fixtures": len(_demo_fixtures.get(code, [])),
            "initialized": model.fitted,
        }
    return {
        "leagues": statuses,
        "has_football_data_key": bool(settings.FOOTBALL_DATA_API_KEY),
        "has_odds_key": bool(settings.ODDS_API_KEY),
    }


@router.post("/init-demo")
async def init_demo(league_code: str = None):
    """
    Populate fixtures/standings with demo data.
    Only trains model if not already trained with real API data.
    """
    codes = [league_code] if league_code else get_all_league_codes()
    results = {}
    for code in codes:
        model = get_model(code)
        matches = generate_finished_matches(code, n=90)

        # Only train model if not already trained from real API
        if not model.fitted or _model_source.get(code) != "api":
            model.fit(matches)
            _model_source[code] = "demo"

        # Always regenerate fixtures and standings
        _demo_fixtures[code] = generate_upcoming_fixtures(code, n=12)
        _demo_standings[code] = _compute_standings(matches, code)

        results[code] = {
            "matches_used": len(matches),
            "teams": len(model.attack),
            "upcoming_fixtures": len(_demo_fixtures[code]),
            "model_source": _model_source.get(code, "demo"),
        }
    return {"status": "ok", "results": results}


@router.post("/init-real")
async def init_real():
    """Fetch real data from APIs, train models, and populate fixtures."""
    from ..api import api_football
    results = {}

    for code, info in LEAGUES.items():
        try:
            if info["source"] == "football-data":
                if not settings.FOOTBALL_DATA_API_KEY:
                    raise ValueError("No FOOTBALL_DATA_API_KEY")
                # Fetch finished matches for training
                data = await fd_api.fetch_matches(code, status="FINISHED")
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
                # Fetch upcoming fixtures
                scheduled = await fd_api.fetch_matches(code, status="SCHEDULED")
                _demo_fixtures[code] = [
                    {
                        "id": m["id"],
                        "date": m["utcDate"],
                        "status": m["status"],
                        "home_team": m["homeTeam"]["name"],
                        "away_team": m["awayTeam"]["name"],
                        "home_goals": None,
                        "away_goals": None,
                        "league": code,
                    }
                    for m in scheduled.get("matches", [])[:15]
                ]
            else:
                if not settings.API_FOOTBALL_KEY:
                    raise ValueError("No API_FOOTBALL_KEY")
                data = await api_football.fetch_fixtures(info["api_football_id"])
                training_data = [
                    {
                        "home_team": f["teams"]["home"]["name"],
                        "away_team": f["teams"]["away"]["name"],
                        "home_goals": f["goals"]["home"],
                        "away_goals": f["goals"]["away"],
                    }
                    for f in data.get("response", [])
                    if f["goals"].get("home") is not None
                ]
                _demo_fixtures[code] = [
                    {
                        "id": f["fixture"]["id"],
                        "date": f["fixture"]["date"],
                        "status": f["fixture"]["status"]["long"],
                        "home_team": f["teams"]["home"]["name"],
                        "away_team": f["teams"]["away"]["name"],
                        "home_goals": None,
                        "away_goals": None,
                        "league": code,
                    }
                    for f in data.get("response", [])
                    if f["goals"].get("home") is None
                ][:15]

            model = get_model(code)
            model.fit(training_data)
            _model_source[code] = "api"
            _demo_standings[code] = _compute_standings(training_data, code)
            results[code] = {
                "status": "ok",
                "matches_used": len(training_data),
                "teams": len(model.attack),
                "fixtures": len(_demo_fixtures.get(code, [])),
            }
        except Exception as e:
            # Fallback to demo for this league
            matches = generate_finished_matches(code, n=90)
            model = get_model(code)
            if not model.fitted:
                model.fit(matches)
                _model_source[code] = "demo"
            _demo_fixtures[code] = generate_upcoming_fixtures(code, n=12)
            _demo_standings[code] = _compute_standings(matches, code)
            results[code] = {"status": "demo_fallback", "error": str(e), "teams": len(model.attack)}

    return {"results": results}


def _compute_standings(matches: list[dict], league_code: str) -> list[dict]:
    table: dict[str, dict] = {}
    for m in matches:
        for team, gf, ga in [
            (m["home_team"], m["home_goals"], m["away_goals"]),
            (m["away_team"], m["away_goals"], m["home_goals"]),
        ]:
            if team not in table:
                table[team] = {"team": team, "played": 0, "won": 0, "draw": 0, "lost": 0,
                               "goals_for": 0, "goals_against": 0, "points": 0, "crest": ""}
            t = table[team]
            t["played"] += 1
            t["goals_for"] += gf
            t["goals_against"] += ga
            if gf > ga:
                t["won"] += 1; t["points"] += 3
            elif gf == ga:
                t["draw"] += 1; t["points"] += 1
            else:
                t["lost"] += 1
    rows = sorted(table.values(), key=lambda x: (-x["points"], -(x["goals_for"] - x["goals_against"])))
    for i, row in enumerate(rows):
        row["position"] = i + 1
        row["goal_diff"] = row["goals_for"] - row["goals_against"]
    return rows


def get_demo_fixtures(league_code: str) -> list[dict]:
    return _demo_fixtures.get(league_code, [])


def get_demo_standings(league_code: str) -> list[dict]:
    return _demo_standings.get(league_code, [])


def is_initialized(league_code: str) -> bool:
    return get_model(league_code).fitted
