import httpx
import time
from xml.etree import ElementTree
from fastapi import APIRouter

router = APIRouter(prefix="/youtube", tags=["youtube"])

ATOM = "http://www.w3.org/2005/Atom"
YT   = "http://www.youtube.com/xml/schemas/2015"
MED  = "http://search.yahoo.com/mrss/"

YT_CHANNELS = [
    {"name": "GolCaracol",     "id": "UCXXOzmyYvDtaijm5i303Tng"},
    {"name": "Win Sports",     "id": "UCZjpA3YBPXvJv3pg4SPEjfw"},
    {"name": "MARCA",          "id": "UCop57Z1sYHrtCyxCpE2z2Bg"},
    {"name": "AS",             "id": "UCXISYK3xagaK5DHnhQ4X0hw"},
    {"name": "ESPN Deportes",  "id": "UC08mnbiC4FykqpHqbEWgFcg"},
    {"name": "FIFA",           "id": "UCpcTrCXblq78GZrTUTLWeBw"},
    {"name": "UEFA",           "id": "UCyGa1YEx9ST66rYrJTGIKOw"},
    {"name": "Premier League", "id": "UCbo9pRdiIIN8lHXiAH2xs_g"},
    {"name": "LaLiga",         "id": "UCTv-XvfzLX3i4IGWAm4sbmA"},
    {"name": "Bundesliga",     "id": "UC6UL29enLNe4mqwTfAyeNuw"},
]

_cache: dict = {"data": [], "ts": 0}
CACHE_TTL = 900  # 15 minutes


def _parse_yt_feed(xml_bytes: bytes, channel_name: str) -> list[dict]:
    try:
        root = ElementTree.fromstring(xml_bytes)
        videos = []
        for entry in root.findall(f"{{{ATOM}}}entry")[:5]:
            vid_id    = entry.findtext(f"{{{YT}}}videoId", "")
            title     = entry.findtext(f"{{{ATOM}}}title", "").strip()
            published = entry.findtext(f"{{{ATOM}}}published", "")
            thumb_el  = entry.find(f".//{{{MED}}}thumbnail")
            thumb_url = (
                thumb_el.get("url")
                if thumb_el is not None
                else f"https://i3.ytimg.com/vi/{vid_id}/hqdefault.jpg"
            )
            desc_el = entry.find(f".//{{{MED}}}description")
            desc    = (desc_el.text or "")[:200] if desc_el is not None else ""
            if vid_id and title:
                videos.append({
                    "video_id":  vid_id,
                    "title":     title,
                    "channel":   channel_name,
                    "published": published,
                    "thumbnail": thumb_url,
                    "url":       f"https://www.youtube.com/watch?v={vid_id}",
                    "embed":     f"https://www.youtube.com/embed/{vid_id}?autoplay=1",
                    "description": desc,
                })
        return videos
    except Exception:
        return []


@router.get("/videos")
async def get_videos(limit: int = 40):
    global _cache
    if time.time() - _cache["ts"] < CACHE_TTL and _cache["data"]:
        return {"videos": _cache["data"][:limit], "cached": True}

    all_videos: list[dict] = []
    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        for ch in YT_CHANNELS:
            try:
                url = f"https://www.youtube.com/feeds/videos.xml?channel_id={ch['id']}"
                r = await client.get(url, headers={"User-Agent": "MetricCapital/1.0"})
                if r.status_code == 200:
                    all_videos.extend(_parse_yt_feed(r.content, ch["name"]))
            except Exception:
                pass

    all_videos.sort(key=lambda x: x.get("published", ""), reverse=True)
    _cache = {"data": all_videos, "ts": time.time()}
    return {"videos": all_videos[:limit], "cached": False}
