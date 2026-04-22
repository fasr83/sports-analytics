import httpx
from ..config import settings, ODDS_SPORT_KEYS

BASE_URL = "https://api.the-odds-api.com/v4"

async def fetch_odds(league_code: str) -> list:
    sport_key = ODDS_SPORT_KEYS.get(league_code)
    if not sport_key:
        return []
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{BASE_URL}/sports/{sport_key}/odds",
            params={
                "apiKey": settings.ODDS_API_KEY,
                "regions": "eu",
                "markets": "h2h",
                "oddsFormat": "decimal",
            },
            timeout=15
        )
        if r.status_code == 422:
            return []
        r.raise_for_status()
        return r.json()

async def fetch_available_sports() -> list:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{BASE_URL}/sports",
            params={"apiKey": settings.ODDS_API_KEY},
            timeout=15
        )
        r.raise_for_status()
        return r.json()
