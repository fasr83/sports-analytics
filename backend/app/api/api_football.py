import httpx
from ..config import settings

BASE_URL = "https://v3.football.api-sports.io"


def _headers():
    return {"x-apisports-key": settings.API_FOOTBALL_KEY}


async def fetch_standings(league_id: int, season: int = 2025) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(
            f"{BASE_URL}/standings",
            headers=_headers(),
            params={"league": league_id, "season": season},
        )
        r.raise_for_status()
        return r.json()


async def fetch_fixtures(league_id: int, season: int = 2025, status: str = None) -> dict:
    params = {"league": league_id, "season": season}
    if status:
        params["status"] = status
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(
            f"{BASE_URL}/fixtures",
            headers=_headers(),
            params=params,
        )
        r.raise_for_status()
        return r.json()


async def fetch_team_info(team_id: int) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{BASE_URL}/teams", headers=_headers(), params={"id": team_id})
        r.raise_for_status()
        return r.json()


async def fetch_team_squad(team_id: int) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{BASE_URL}/players/squads", headers=_headers(), params={"team": team_id})
        r.raise_for_status()
        return r.json()


async def fetch_player_stats(team_id: int, season: int = 2025, page: int = 1) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(
            f"{BASE_URL}/players",
            headers=_headers(),
            params={"team": team_id, "season": season, "page": page},
        )
        r.raise_for_status()
        return r.json()


async def fetch_team_recent(team_id: int, season: int = 2025) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(
            f"{BASE_URL}/fixtures", headers=_headers(),
            params={"team": team_id, "season": season, "last": 10},
        )
        r.raise_for_status()
        return r.json()


async def fetch_team_transfers(team_id: int) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{BASE_URL}/transfers", headers=_headers(), params={"team": team_id})
        r.raise_for_status()
        return r.json()


async def fetch_player_transfers(player_id: int) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{BASE_URL}/transfers", headers=_headers(), params={"player": player_id})
        r.raise_for_status()
        return r.json()


async def check_status() -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{BASE_URL}/status", headers=_headers())
        r.raise_for_status()
        return r.json()
