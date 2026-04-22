from fastapi import APIRouter, HTTPException
from ..api import football_data, api_football
from ..config import LEAGUES, settings
from .setup import get_demo_fixtures, get_demo_standings

router = APIRouter(prefix="/leagues", tags=["leagues"])


@router.get("/")
async def list_leagues():
    return [{"code": k, **v} for k, v in LEAGUES.items()]


@router.get("/{league_code}/standings")
async def get_standings(league_code: str):
    league_info = LEAGUES.get(league_code)
    if not league_info:
        raise HTTPException(404, "League not found")

    # Try real API if key available
    if settings.FOOTBALL_DATA_API_KEY and league_info["source"] == "football-data":
        try:
            data = await football_data.fetch_standings(league_code)
            standings = []
            for table in data.get("standings", []):
                if table.get("type") == "TOTAL":
                    for row in table.get("table", []):
                        standings.append({
                            "position": row["position"],
                            "team": row["team"]["name"],
                            "crest": row["team"].get("crest", ""),
                            "played": row["playedGames"],
                            "won": row["won"],
                            "draw": row["draw"],
                            "lost": row["lost"],
                            "goals_for": row["goalsFor"],
                            "goals_against": row["goalsAgainst"],
                            "goal_diff": row["goalDifference"],
                            "points": row["points"],
                        })
            if standings:
                return {"league": league_info["name"], "standings": standings, "source": "api"}
        except Exception:
            pass

    if settings.API_FOOTBALL_KEY and league_info["source"] == "api-football":
        try:
            data = await api_football.fetch_standings(league_info["api_football_id"])
            standings = []
            for entry in data.get("response", []):
                for league_data in entry.get("league", {}).get("standings", []):
                    for row in league_data:
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
            if standings:
                return {"league": league_info["name"], "standings": standings, "source": "api"}
        except Exception:
            pass

    # Fallback to demo data
    demo = get_demo_standings(league_code)
    if demo:
        return {"league": league_info["name"], "standings": demo, "source": "demo"}
    raise HTTPException(503, "No data available. Run /setup/init-demo first.")


@router.get("/{league_code}/matches")
async def get_matches(league_code: str, status: str = "SCHEDULED"):
    league_info = LEAGUES.get(league_code)
    if not league_info:
        raise HTTPException(404, "League not found")

    if status == "FINISHED" and settings.FOOTBALL_DATA_API_KEY and league_info["source"] == "football-data":
        try:
            data = await football_data.fetch_matches(league_code, status="FINISHED")
            matches = [
                {
                    "id": m["id"],
                    "date": m["utcDate"],
                    "status": m["status"],
                    "home_team": m["homeTeam"]["name"],
                    "home_team_id": m["homeTeam"]["id"],
                    "away_team": m["awayTeam"]["name"],
                    "away_team_id": m["awayTeam"]["id"],
                    "home_goals": m["score"]["fullTime"].get("home"),
                    "away_goals": m["score"]["fullTime"].get("away"),
                    "league": league_code,
                }
                for m in data.get("matches", [])
            ]
            if matches:
                return {"league": league_info["name"], "matches": matches, "source": "api"}
        except Exception:
            pass

    if status == "SCHEDULED":
        # Try real API
        if settings.FOOTBALL_DATA_API_KEY and league_info["source"] == "football-data":
            try:
                data = await football_data.fetch_matches(league_code, status="SCHEDULED")
                matches = [
                    {
                        "id": m["id"],
                        "date": m["utcDate"],
                        "status": m["status"],
                        "home_team": m["homeTeam"]["name"],
                        "home_team_id": m["homeTeam"]["id"],
                        "away_team": m["awayTeam"]["name"],
                        "away_team_id": m["awayTeam"]["id"],
                        "home_goals": None,
                        "away_goals": None,
                        "league": league_code,
                    }
                    for m in data.get("matches", [])
                ]
                if matches:
                    return {"league": league_info["name"], "matches": matches, "source": "api"}
            except Exception:
                pass
        # Fallback
        demo = get_demo_fixtures(league_code)
        if demo:
            return {"league": league_info["name"], "matches": demo, "source": "demo"}

    raise HTTPException(503, f"No data available for status={status}. Run /setup/init-demo first.")
