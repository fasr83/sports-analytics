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


def _agg_stats(statistics: list) -> dict:
    """Aggregate player stats across multiple competitions in a season."""
    apps     = sum(s.get("games",  {}).get("appearences") or 0 for s in statistics)
    mins     = sum(s.get("games",  {}).get("minutes")     or 0 for s in statistics)
    goals    = sum(s.get("goals",  {}).get("total")       or 0 for s in statistics)
    assists  = sum(s.get("goals",  {}).get("assists")     or 0 for s in statistics)
    yellow   = sum(s.get("cards",  {}).get("yellow")      or 0 for s in statistics)
    red      = sum(s.get("cards",  {}).get("red")         or 0 for s in statistics)
    shots    = sum(s.get("shots",  {}).get("total")       or 0 for s in statistics)
    key_pass = sum(s.get("passes", {}).get("key")         or 0 for s in statistics)
    tackles  = sum(s.get("tackles",{}).get("total")       or 0 for s in statistics)
    # Rating: average of available ratings (they come as strings)
    ratings = []
    for s in statistics:
        r = s.get("games", {}).get("rating")
        if r:
            try:
                ratings.append(float(r))
            except ValueError:
                pass
    rating = round(sum(ratings) / len(ratings), 2) if ratings else None
    return {
        "apps": apps, "minutes": mins, "goals": goals, "assists": assists,
        "yellow": yellow, "red": red, "shots": shots, "key_passes": key_pass,
        "tackles": tackles, "rating": rating,
        "rating_pct": round(rating / 10 * 100) if rating else None,
    }


@router.get("/{team_id}")
async def get_team(team_id: int, season: int = 2025):
    cached = _cache.get(team_id)
    if cached and (time.time() - cached["ts"]) < CACHE_TTL:
        return cached["data"]

    if not settings.API_FOOTBALL_KEY:
        return {
            "demo": True,
            "info":      {"id": team_id, "name": "Demo", "country": "—", "founded": None, "logo": ""},
            "venue":     {"name": "—", "capacity": None, "city": "—"},
            "squad":     [],
            "recent":    [],
            "transfers": [],
        }

    try:
        team_res, stats_p1, stats_p2, recent_res, xfer_res = await asyncio.gather(
            api_football.fetch_team_info(team_id),
            api_football.fetch_player_stats(team_id, season, page=1),
            api_football.fetch_player_stats(team_id, season, page=2),
            api_football.fetch_team_recent(team_id, season),
            api_football.fetch_team_transfers(team_id),
            return_exceptions=True,
        )
    except Exception as e:
        raise HTTPException(500, str(e))

    # ── Team + venue ──────────────────────────────────────────────────────────
    info_entry = (team_res.get("response") or [{}])[0] if isinstance(team_res, dict) else {}
    team_info  = info_entry.get("team", {})
    venue_info = info_entry.get("venue", {})

    # ── Players with full stats (pages 1 + 2) ────────────────────────────────
    all_entries: list = []
    for res in [stats_p1, stats_p2]:
        if isinstance(res, dict):
            all_entries.extend(res.get("response", []))

    squad = []
    seen_ids: set = set()
    for entry in all_entries:
        p    = entry.get("player", {})
        pid  = p.get("id")
        if pid in seen_ids:
            continue
        seen_ids.add(pid)
        stats = entry.get("statistics", [])
        agg   = _agg_stats(stats)
        # Position and shirt number from first stat entry
        first = stats[0] if stats else {}
        squad.append({
            "id":          pid,
            "name":        p.get("name"),
            "firstname":   p.get("firstname"),
            "lastname":    p.get("lastname"),
            "age":         p.get("age"),
            "nationality": p.get("nationality"),
            "height":      p.get("height"),
            "weight":      p.get("weight"),
            "photo":       p.get("photo"),
            "number":      first.get("games", {}).get("number"),
            "position":    first.get("games", {}).get("position"),
            **agg,
        })

    # Sort by position order, then by appearances desc
    POS_ORDER = {"Goalkeeper": 0, "Defender": 1, "Midfielder": 2, "Attacker": 3}
    squad.sort(key=lambda x: (POS_ORDER.get(x.get("position", ""), 9), -(x.get("apps") or 0)))

    # ── Recent fixtures ───────────────────────────────────────────────────────
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
            "gf": gf, "ga": ga,
            "result":        result,
            "competition":   f.get("league", {}).get("name"),
            "venue":         fix.get("venue", {}).get("name"),
        })

    # ── Transfers ─────────────────────────────────────────────────────────────
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
