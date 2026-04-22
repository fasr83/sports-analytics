import httpx
from typing import Optional
from ..config import settings

BASE_URL = "https://api.football-data.org/v4"

async def get_headers():
    return {"X-Auth-Token": settings.FOOTBALL_DATA_API_KEY}

async def fetch_standings(league_code: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{BASE_URL}/competitions/{league_code}/standings",
            headers=await get_headers(),
            timeout=15
        )
        r.raise_for_status()
        return r.json()

async def fetch_matches(league_code: str, status: Optional[str] = None, season: Optional[int] = None) -> dict:
    params = {}
    if status:
        params["status"] = status
    if season:
        params["season"] = season
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{BASE_URL}/competitions/{league_code}/matches",
            headers=await get_headers(),
            params=params,
            timeout=15
        )
        r.raise_for_status()
        return r.json()

async def fetch_team_matches(team_id: int, limit: int = 20) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{BASE_URL}/teams/{team_id}/matches",
            headers=await get_headers(),
            params={"limit": limit, "status": "FINISHED"},
            timeout=15
        )
        r.raise_for_status()
        return r.json()
