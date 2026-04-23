import asyncio
import logging
import time
from fastapi import APIRouter, HTTPException, Query
from ..api import api_football, transfermarkt
from ..config import settings

router = APIRouter(prefix="/teams", tags=["teams"])
logger = logging.getLogger("sports_analytics")

_cache: dict = {}
_player_cache: dict = {}
CACHE_TTL = 3600
PLAYER_CACHE_TTL = 7200


def _agg_stats(statistics: list) -> dict:
    """Aggregate player stats across multiple competitions in a season."""
    apps      = sum(s.get("games",   {}).get("appearences") or 0 for s in statistics)
    mins      = sum(s.get("games",   {}).get("minutes")     or 0 for s in statistics)
    goals     = sum(s.get("goals",   {}).get("total")       or 0 for s in statistics)
    assists   = sum(s.get("goals",   {}).get("assists")      or 0 for s in statistics)
    yellow    = sum(s.get("cards",   {}).get("yellow")       or 0 for s in statistics)
    red       = sum(s.get("cards",   {}).get("red")          or 0 for s in statistics)
    shots     = sum(s.get("shots",   {}).get("total")        or 0 for s in statistics)
    key_pass  = sum(s.get("passes",  {}).get("key")          or 0 for s in statistics)
    tackles   = sum(s.get("tackles", {}).get("total")        or 0 for s in statistics)

    ratings = []
    for s in statistics:
        r = s.get("games", {}).get("rating")
        if r:
            try:
                ratings.append(float(r))
            except (ValueError, TypeError):
                pass
    rating = round(sum(ratings) / len(ratings), 2) if ratings else None
    return {
        "apps": apps or None, "minutes": mins or None,
        "goals": goals, "assists": assists,
        "yellow": yellow, "red": red,
        "shots": shots or None, "key_passes": key_pass or None, "tackles": tackles or None,
        "rating": rating,
        "rating_pct": round(rating / 10 * 100) if rating else None,
    }


async def _fetch_player_stats_merged(team_id: int, season: int) -> list:
    """Fetch /players pages 1+2, merge. If empty, retry with season-1."""
    async def _pages(s):
        p1, p2 = await asyncio.gather(
            api_football.fetch_player_stats(team_id, s, page=1),
            api_football.fetch_player_stats(team_id, s, page=2),
            return_exceptions=True,
        )
        entries = []
        for res in [p1, p2]:
            if isinstance(res, dict):
                entries.extend(res.get("response", []))
        return entries

    entries = await _pages(season)
    if not entries:
        entries = await _pages(season - 1)
    return entries


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
        team_res, squad_res, stat_entries, recent_res, xfer_res = await asyncio.gather(
            api_football.fetch_team_info(team_id),
            api_football.fetch_team_squad(team_id),
            _fetch_player_stats_merged(team_id, season),
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

    # ── Basic roster from /players/squads (always reliable) ──────────────────
    squad_entry   = (squad_res.get("response") or [{}])[0] if isinstance(squad_res, dict) else {}
    basic_players = {
        p["id"]: {
            "id": p.get("id"), "name": p.get("name"), "age": p.get("age"),
            "number": p.get("number"), "position": p.get("position"), "photo": p.get("photo"),
        }
        for p in squad_entry.get("players", []) if p.get("id")
    }

    # ── Full stats from /players endpoint ─────────────────────────────────────
    stat_entries_list = stat_entries if isinstance(stat_entries, list) else []
    stats_map: dict = {}
    seen: set = set()
    for entry in stat_entries_list:
        p   = entry.get("player", {})
        pid = p.get("id")
        if not pid or pid in seen:
            continue
        seen.add(pid)
        statistics = entry.get("statistics", [])
        agg  = _agg_stats(statistics)
        first = statistics[0] if statistics else {}
        stats_map[pid] = {
            "id":          pid,
            "name":        p.get("name") or basic_players.get(pid, {}).get("name"),
            "firstname":   p.get("firstname"),
            "lastname":    p.get("lastname"),
            "age":         p.get("age") or basic_players.get(pid, {}).get("age"),
            "nationality": p.get("nationality"),
            "height":      p.get("height"),
            "weight":      p.get("weight"),
            "photo":       p.get("photo") or basic_players.get(pid, {}).get("photo"),
            "number":      first.get("games", {}).get("number") or basic_players.get(pid, {}).get("number"),
            "position":    first.get("games", {}).get("position") or basic_players.get(pid, {}).get("position"),
            **agg,
        }

    # ── Merge: stats_map has priority; fall back to basic_players ─────────────
    all_ids = set(stats_map) | set(basic_players)
    squad = []
    for pid in all_ids:
        if pid in stats_map:
            squad.append(stats_map[pid])
        else:
            b = basic_players[pid]
            squad.append({
                **b,
                "firstname": None, "lastname": None,
                "nationality": None, "height": None, "weight": None,
                "apps": None, "minutes": None, "goals": None, "assists": None,
                "yellow": None, "red": None, "shots": None,
                "key_passes": None, "tackles": None,
                "rating": None, "rating_pct": None,
            })

    POS_ORDER = {"Goalkeeper": 0, "Defender": 1, "Midfielder": 2, "Attacker": 3}
    squad.sort(key=lambda x: (POS_ORDER.get(x.get("position") or "", 9), -(x.get("apps") or 0)))

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


@router.get("/player/{player_id}")
async def get_player_career(
    player_id: int,
    name: str = Query(default=""),
    nationality: str = Query(default=""),
):
    """Lazy endpoint: called when a player card is expanded.
    Returns career history (API-Football transfers) + Transfermarkt data
    (market value, contract expiry, full career clubs).
    """
    cached = _player_cache.get(player_id)
    if cached and (time.time() - cached["ts"]) < PLAYER_CACHE_TTL:
        return cached["data"]

    # ── API-Football: player transfer history ─────────────────────────────────
    aff_career: list = []
    try:
        if settings.API_FOOTBALL_KEY:
            xfer = await api_football.fetch_player_transfers(player_id)
            entries = xfer.get("response", [])
            raw_transfers = entries[0].get("transfers", []) if entries else []
            # Sort chronologically
            raw_transfers.sort(key=lambda t: t.get("date") or "")
            for tx in raw_transfers:
                t_in  = tx.get("teams", {}).get("in",  {})
                t_out = tx.get("teams", {}).get("out", {})
                aff_career.append({
                    "date":       tx.get("date"),
                    "type":       tx.get("type"),
                    "club_to":    t_in.get("name"),
                    "logo_to":    t_in.get("logo"),
                    "club_from":  t_out.get("name"),
                    "logo_from":  t_out.get("logo"),
                })
    except Exception as e:
        logger.debug(f"[teams] player transfers for {player_id}: {e}")

    # ── Transfermarkt: market value, contract, full career ────────────────────
    tm_value:    str | None = None
    tm_contract: str | None = None
    tm_career:   list = []
    tm_id:       str | None = None

    try:
        if name:
            results = await transfermarkt.search_player(name)
            match   = transfermarkt._best_match(results, name, nationality)
            if match:
                tm_id = match.get("id")

        if tm_id:
            profile, transfers_tm = await asyncio.gather(
                transfermarkt.get_player_profile(tm_id),
                transfermarkt.get_player_transfers(tm_id),
                return_exceptions=True,
            )

            if isinstance(profile, dict):
                tm_value    = profile.get("marketValue")
                contract    = profile.get("contract") or {}
                tm_contract = contract.get("expires") or contract.get("date")

            if isinstance(transfers_tm, dict):
                for tx in (transfers_tm.get("transfers") or []):
                    frm  = tx.get("from") or {}
                    to   = tx.get("to")   or {}
                    season_s = tx.get("season") or ""
                    tm_career.append({
                        "season":    season_s,
                        "club_from": (frm.get("club") or {}).get("name"),
                        "logo_from": (frm.get("club") or {}).get("image"),
                        "club_to":   (to.get("club")  or {}).get("name"),
                        "logo_to":   (to.get("club")  or {}).get("image"),
                        "fee":       tx.get("fee"),
                        "date_from": (frm.get("date") or ""),
                        "date_to":   (to.get("date")  or ""),
                    })
    except Exception as e:
        logger.debug(f"[teams] Transfermarkt for {name}: {e}")

    # Prefer TM career (richer), fall back to API-Football
    career = tm_career if tm_career else aff_career

    data = {
        "player_id":    player_id,
        "tm_id":        tm_id,
        "market_value": tm_value,
        "contract_end": tm_contract,
        "career":       career,
    }
    _player_cache[player_id] = {"data": data, "ts": time.time()}
    return data
