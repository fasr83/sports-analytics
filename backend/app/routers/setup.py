import time
import logging
from fastapi import APIRouter
from ..seed_data import generate_finished_matches, generate_upcoming_fixtures
from ..analytics.poisson_model import get_model
from ..config import LEAGUES, settings
from ..api import api_football

logger = logging.getLogger("sports_analytics")
router = APIRouter(prefix="/setup", tags=["setup"])

_fixtures: dict[str, list] = {}
_standings: dict[str, list] = {}
_model_source: dict[str, str] = {}
_last_fetch: dict[str, float] = {}

CACHE_TTL = 6 * 3600  # 6 hours


def get_all_league_codes():
    return list(LEAGUES.keys())


def _parse_standings(data: dict) -> list[dict]:
    standings = []
    for entry in data.get("response", []):
        league_data = entry.get("league", {})
        for group in league_data.get("standings", []):
            for row in group:
                standings.append({
                    "position": row["rank"],
                    "team": row["team"]["name"],
                    "crest": row["team"].get("logo", ""),
                    "played": row["all"]["played"],
                    "won": row["all"]["win"],
                    "draw": row["all"]["draw"],
                    "lost": row["all"]["lose"],
                    "goals_for": row["all"]["goals"]["for"],
                    "goals_against": row["all"]["goals"]["against"],
                    "goal_diff": row["goalsDiff"],
                    "points": row["points"],
                })
    seen, unique = set(), []
    for s in sorted(standings, key=lambda x: (-x["points"], -x["goal_diff"])):
        if s["team"] not in seen:
            seen.add(s["team"])
            unique.append(s)
    for i, row in enumerate(unique):
        row["position"] = i + 1
    return unique


def _parse_fixtures(data: dict, league_code: str) -> list[dict]:
    fixtures = []
    for f in data.get("response", []):
        fixture = f.get("fixture", {})
        teams = f.get("teams", {})
        goals = f.get("goals", {})
        fixtures.append({
            "id": fixture.get("id"),
            "date": fixture.get("date"),
            "status": fixture.get("status", {}).get("short", ""),
            "home_team": teams.get("home", {}).get("name", ""),
            "home_team_id": teams.get("home", {}).get("id"),
            "home_crest": teams.get("home", {}).get("logo", ""),
            "away_team": teams.get("away", {}).get("name", ""),
            "away_team_id": teams.get("away", {}).get("id"),
            "away_crest": teams.get("away", {}).get("logo", ""),
            "home_goals": goals.get("home"),
            "away_goals": goals.get("away"),
            "league": league_code,
            "venue": fixture.get("venue", {}).get("name", ""),
        })
    return fixtures


def _compute_standings_from_matches(matches: list[dict]) -> list[dict]:
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


async def _fetch_league(code: str, info: dict) -> dict:
    """Fetch standings + fixtures for one league. Returns summary."""
    league_id = info["api_football_id"]
    season = info["season"]

    # Fetch finished matches for model training
    fin_data = await api_football.fetch_fixtures(league_id, season, status="FT")
    finished = _parse_fixtures(fin_data, code)
    training = [
        {"home_team": f["home_team"], "away_team": f["away_team"],
         "home_goals": f["home_goals"] or 0, "away_goals": f["away_goals"] or 0}
        for f in finished if f["home_goals"] is not None
    ]

    # Fetch upcoming fixtures
    ns_data = await api_football.fetch_fixtures(league_id, season, status="NS")
    upcoming = _parse_fixtures(ns_data, code)

    # Fetch standings from API
    try:
        st_data = await api_football.fetch_standings(league_id, season)
        standings = _parse_standings(st_data)
    except Exception:
        standings = _compute_standings_from_matches(training)

    _fixtures[code] = upcoming[:20]
    _standings[code] = standings
    _last_fetch[code] = time.time()

    return training


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
            "upcoming_fixtures": len(_fixtures.get(code, [])),
            "initialized": model.fitted,
            "last_fetch": _last_fetch.get(code),
        }
    return {
        "leagues": statuses,
        "has_api_football_key": bool(settings.API_FOOTBALL_KEY),
        "has_football_data_key": bool(settings.FOOTBALL_DATA_API_KEY),
        "has_odds_key": bool(settings.ODDS_API_KEY),
    }


@router.post("/init-real")
async def init_real():
    """Fetch real data from API-Football, train Poisson models, cache standings & fixtures."""
    if not settings.API_FOOTBALL_KEY:
        return {"error": "API_FOOTBALL_KEY not configured"}

    results = {}
    for code, info in LEAGUES.items():
        try:
            training = await _fetch_league(code, info)
            model = get_model(code)
            if training:
                model.fit(training)
                _model_source[code] = "api"
            results[code] = {
                "status": "ok",
                "matches_used": len(training),
                "teams": len(model.attack),
                "fixtures": len(_fixtures.get(code, [])),
                "standings": len(_standings.get(code, [])),
            }
            logger.info(f"[init-real] {code}: {len(training)} matches, {len(model.attack)} teams")
        except Exception as e:
            logger.error(f"[init-real] {code} failed: {e}")
            # Demo fallback
            matches = generate_finished_matches(code, n=90)
            model = get_model(code)
            if not model.fitted:
                model.fit(matches)
                _model_source[code] = "demo"
            if not _fixtures.get(code):
                _fixtures[code] = generate_upcoming_fixtures(code, n=12)
            if not _standings.get(code):
                _standings[code] = _compute_standings_from_matches(matches)
            results[code] = {"status": "demo_fallback", "error": str(e)}

    return {"results": results}


@router.post("/init-demo")
async def init_demo(league_code: str = None):
    codes = [league_code] if league_code else get_all_league_codes()
    results = {}
    for code in codes:
        model = get_model(code)
        matches = generate_finished_matches(code, n=90)
        if not model.fitted or _model_source.get(code) != "api":
            model.fit(matches)
            _model_source[code] = "demo"
        _fixtures[code] = generate_upcoming_fixtures(code, n=12)
        _standings[code] = _compute_standings_from_matches(matches)
        results[code] = {"matches_used": len(matches), "teams": len(model.attack)}
    return {"status": "ok", "results": results}


def get_demo_fixtures(league_code: str) -> list[dict]:
    return _fixtures.get(league_code, [])


def get_demo_standings(league_code: str) -> list[dict]:
    return _standings.get(league_code, [])


def is_initialized(league_code: str) -> bool:
    return get_model(league_code).fitted
