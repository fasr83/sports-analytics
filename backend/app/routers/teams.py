import asyncio
import logging
import time
from fastapi import APIRouter, HTTPException
from ..api import api_football
from ..config import settings

router = APIRouter(prefix="/teams", tags=["teams"])
logger = logging.getLogger("sports_analytics")

_cache: dict = {}
CACHE_TTL = 3600


@router.get("/{team_id}")
async def get_team(team_id: int, season: int = 2025):
    cached = _cache.get(team_id)
    if cached and (time.time() - cached["ts"]) < CACHE_TTL:
        return cached["data"]

    if not settings.API_FOOTBALL_KEY:
        return {
            "demo": True,
            "info": {"id": team_id, "name": "Demo", "country": "—", "founded": None, "logo": ""},
            "venue": {"name": "—", "capacity": None, "city": "—"},
            "squad": [],
            "recent": [],
            "transfers": [],
        }

    try:
        team_res, squad_res, recent_res, xfer_res = await asyncio.gather(
            api_football.fetch_team_info(team_id),
            api_football.fetch_team_squad(team_id),
            api_football.fetch_team_recent(team_id, season),
            api_football.fetch_team_transfers(team_id),
            return_exceptions=True,
        )
    except Exception as e:
        raise HTTPException(500, str(e))

    # Team + venue
    info_entry = (team_res.get("response") or [{}])[0] if isinstance(team_res, dict) else {}
    team_info  = info_entry.get("team", {})
    venue_info = info_entry.get("venue", {})

    # Squad (players/squads endpoint)
    squad_entry = (squad_res.get("response") or [{}])[0] if isinstance(squad_res, dict) else {}
    squad = [
        {
            "id":       p.get("id"),
            "name":     p.get("name"),
            "age":      p.get("age"),
            "number":   p.get("number"),
            "position": p.get("position"),
            "photo":    p.get("photo"),
        }
        for p in squad_entry.get("players", [])
    ]

    # Recent fixtures
    recent_raw = recent_res.get("response", []) if isinstance(recent_res, dict) else []
    recent = []
    for f in recent_raw:
        fix   = f.get("fixture", {})
        teams = f.get("teams", {})
        goals = f.get("goals", {})
        home_id    = teams.get("home", {}).get("id")
        home_goals = goals.get("home") or 0
        away_goals = goals.get("away") or 0
        is_home    = home_id == team_id
        gf = home_goals if is_home else away_goals
        ga = away_goals if is_home else home_goals
        result   = "W" if gf > ga else ("D" if gf == ga else "L")
        opponent = teams.get("away" if is_home else "home", {})
        recent.append({
            "date":          fix.get("date"),
            "home_away":     "H" if is_home else "A",
            "opponent":      opponent.get("name"),
            "opponent_logo": opponent.get("logo"),
            "score":         f"{home_goals}–{away_goals}",
            "gf":            gf,
            "ga":            ga,
            "result":        result,
            "competition":   f.get("league", {}).get("name"),
            "venue":         fix.get("venue", {}).get("name"),
        })

    # Transfers
    transfers_raw = xfer_res.get("response", []) if isinstance(xfer_res, dict) else []
    transfers = []
    for t in transfers_raw:
        player_name = t.get("player", {}).get("name", "")
        for tx in t.get("transfers", []):
            transfers.append({
                "player":   player_name,
                "date":     tx.get("date"),
                "type":     tx.get("type"),
                "team_in":  tx.get("teams", {}).get("in", {}).get("name"),
                "team_out": tx.get("teams", {}).get("out", {}).get("name"),
            })

    data = {
        "demo": False,
        "info": {
            "id":       team_id,
            "name":     team_info.get("name", ""),
            "country":  team_info.get("country", ""),
            "founded":  team_info.get("founded"),
            "logo":     team_info.get("logo", ""),
            "national": team_info.get("national", False),
        },
        "venue": {
            "name":     venue_info.get("name", ""),
            "city":     venue_info.get("city", ""),
            "capacity": venue_info.get("capacity"),
            "surface":  venue_info.get("surface", ""),
            "image":    venue_info.get("image", ""),
        },
        "squad":     squad,
        "recent":    recent,
        "transfers": transfers[:30],
    }
    _cache[team_id] = {"data": data, "ts": time.time()}
    return data
