from fastapi import APIRouter, HTTPException
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
    standings = get_demo_standings(league_code)
    if standings:
        return {"league": league_info["name"], "standings": standings}
    raise HTTPException(503, "No data yet. Call /setup/init-real first.")


@router.get("/{league_code}/matches")
async def get_matches(league_code: str, status: str = "SCHEDULED"):
    league_info = LEAGUES.get(league_code)
    if not league_info:
        raise HTTPException(404, "League not found")
    fixtures = get_demo_fixtures(league_code)
    if status == "SCHEDULED":
        matches = [f for f in fixtures if f.get("home_goals") is None]
    else:
        matches = [f for f in fixtures if f.get("home_goals") is not None]
    return {"league": league_info["name"], "matches": matches}
