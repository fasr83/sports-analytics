import httpx
from ..config import settings

BASE_URL = "https://api-football-v1.p.rapidapi.com/v3"

HEADERS = {
    "X-RapidAPI-Key": settings.API_FOOTBALL_KEY,
    "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
}

async def fetch_fixtures(league_id: int, season: int = 2024) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{BASE_URL}/fixtures",
            headers=HEADERS,
            params={"league": league_id, "season": season},
            timeout=15
        )
        r.raise_for_status()
        return r.json()

async def fetch_standings(league_id: int, season: int = 2024) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{BASE_URL}/standings",
            headers=HEADERS,
            params={"league": league_id, "season": season},
            timeout=15
        )
        r.raise_for_status()
        return r.json()
