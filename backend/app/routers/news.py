import httpx
import time
from xml.etree import ElementTree
from fastapi import APIRouter

router = APIRouter(prefix="/news", tags=["news"])

RSS_FEEDS = [
    {"name": "BBC Sport",       "url": "https://feeds.bbci.co.uk/sport/football/rss.xml"},
    {"name": "Sky Sports",      "url": "https://www.skysports.com/rss/12040"},
    {"name": "Goal.com",        "url": "https://www.goal.com/feeds/en/news"},
    {"name": "ESPN FC",         "url": "https://www.espn.com/espn/rss/soccer/news"},
    {"name": "Marca",           "url": "https://e00-marca.uecdn.es/rss/futbol/internacional.xml"},
    {"name": "AS",              "url": "https://as.com/rss/tags/futbol.xml"},
    {"name": "ESPN Deportes",   "url": "https://www.espndeportes.espn.com/espndeportes/rss/noticias?seccion=futbol"},
    {"name": "Mundo Deportivo", "url": "https://www.mundodeportivo.com/rss/futbol.xml"},
    {"name": "Sport",           "url": "https://www.sport.es/rss/futbol.xml"},
    {"name": "GolCaracol",      "url": "https://golcaracol.com/rss/portada"},
]

_cache: dict = {"data": [], "ts": 0}
CACHE_TTL = 600  # 10 minutes


def _parse_feed(xml_bytes: bytes, source: str) -> list[dict]:
    try:
        root = ElementTree.fromstring(xml_bytes)
        items = []
        for item in root.findall(".//item")[:6]:
            title = item.findtext("title", "").strip()
            link = item.findtext("link", "").strip()
            desc = item.findtext("description", "").strip()
            pub = item.findtext("pubDate", "").strip()
            if title and link:
                items.append({"title": title, "link": link,
                              "description": desc[:200] if desc else "",
                              "pub_date": pub, "source": source})
        return items
    except Exception:
        return []


@router.get("/")
async def get_news(limit: int = 40):
    global _cache
    if time.time() - _cache["ts"] < CACHE_TTL and _cache["data"]:
        return {"news": _cache["data"][:limit], "cached": True}

    all_items = []
    async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
        for feed in RSS_FEEDS:
            try:
                r = await client.get(feed["url"],
                    headers={"User-Agent": "MetricCapital/1.0 RSS Reader"})
                if r.status_code == 200:
                    all_items.extend(_parse_feed(r.content, feed["name"]))
            except Exception:
                pass

    _cache = {"data": all_items, "ts": time.time()}
    return {"news": all_items[:limit], "cached": False}
