"""
Transfermarkt unofficial public API — https://transfermarkt-api.fly.dev
Open-source project: github.com/felipeall/transfermarkt-api
No auth required; rate-limited but free.
"""
import httpx
import logging

logger = logging.getLogger("sports_analytics")
BASE = "https://transfermarkt-api.fly.dev"

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; MetricCapital/1.0)",
    "Accept": "application/json",
}


async def search_player(name: str) -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(
                f"{BASE}/players/search/{name}",
                headers=_HEADERS,
                params={"page_number": 1},
            )
            if r.status_code == 200:
                return r.json().get("results", [])
    except Exception as e:
        logger.debug(f"[TM] search_player({name}): {e}")
    return []


async def get_player_profile(tm_id: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(f"{BASE}/players/{tm_id}/profile", headers=_HEADERS)
            if r.status_code == 200:
                return r.json()
    except Exception as e:
        logger.debug(f"[TM] get_player_profile({tm_id}): {e}")
    return {}


async def get_player_transfers(tm_id: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(f"{BASE}/players/{tm_id}/transfers", headers=_HEADERS)
            if r.status_code == 200:
                return r.json()
    except Exception as e:
        logger.debug(f"[TM] get_player_transfers({tm_id}): {e}")
    return {}


def _best_match(results: list[dict], name: str, nationality: str = "") -> dict | None:
    """Pick the result that best matches the player name and nationality."""
    if not results:
        return None
    name_lower = name.lower()
    for r in results:
        r_name = r.get("name", "").lower()
        r_nats = [n.get("name", "") for n in (r.get("nationality") or [])]
        if r_name == name_lower:
            if not nationality or any(nationality.lower() in n.lower() for n in r_nats):
                return r
    # Fallback: partial match on last name
    last = name.split()[-1].lower() if name else ""
    for r in results:
        if last and last in r.get("name", "").lower():
            return r
    return results[0]  # last resort: first result
