import httpx
import time
from xml.etree import ElementTree
from fastapi import APIRouter

router = APIRouter(prefix="/news", tags=["news"])

RSS_FEEDS = [
    # Google News (most reliable, rarely blocked)
    {"name": "Google Fútbol",  "url": "https://news.google.com/rss/search?q=futbol+fichajes&hl=es&gl=CO&ceid=CO:es"},
    {"name": "Google PL",      "url": "https://news.google.com/rss/search?q=Premier+League&hl=es&gl=ES&ceid=ES:es"},
    {"name": "Google UCL",     "url": "https://news.google.com/rss/search?q=Champions+League&hl=es&gl=ES&ceid=ES:es"},
    {"name": "Google Mundial", "url": "https://news.google.com/rss/search?q=Mundial+2026+futbol&hl=es&gl=CO&ceid=CO:es"},
    # Spanish sports media
    {"name": "Marca",          "url": "https://e00-marca.uecdn.es/rss/futbol/internacional.xml"},
    {"name": "AS",             "url": "https://as.com/rss/tags/futbol.xml"},
    {"name": "Mundo Deportivo","url": "https://www.mundodeportivo.com/rss/futbol.xml"},
    # International
    {"name": "BBC Sport",      "url": "https://feeds.bbci.co.uk/sport/football/rss.xml"},
    {"name": "ESPN FC",        "url": "https://www.espn.com/espn/rss/soccer/news"},
    {"name": "Goal.com",       "url": "https://www.goal.com/feeds/en/news"},
    # Colombia / Latin America
    {"name": "GolCaracol",     "url": "https://golcaracol.com/rss/portada"},
    {"name": "ESPN Deportes",  "url": "https://www.espndeportes.espn.com/espndeportes/rss/noticias?seccion=futbol"},
]

_cache: dict = {"data": [], "ts": 0}
CACHE_TTL = 600  # 10 minutes


def _parse_feed(xml_bytes: bytes, source: str) -> list[dict]:
    try:
        root = ElementTree.fromstring(xml_bytes)
        items = []
        for item in root.findall(".//item")[:6]:
            title = item.findtext("title", "").strip()
            link  = item.findtext("link",  "").strip()
            desc  = item.findtext("description", "").strip()
            pub   = item.findtext("pubDate", "").strip()
            if title and link:
                items.append({
                    "title":       title,
                    "link":        link,
                    "description": desc[:200] if desc else "",
                    "pub_date":    pub,
                    "source":      source,
                })
        return items
    except Exception:
        return []


@router.get("/")
async def get_news(limit: int = 50):
    global _cache
    if time.time() - _cache["ts"] < CACHE_TTL and _cache["data"]:
        return {"news": _cache["data"][:limit], "cached": True}

    all_items: list[dict] = []
    browser_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate",
        "Cache-Control": "no-cache",
    }
    async with httpx.AsyncClient(timeout=12, follow_redirects=True) as client:
        for feed in RSS_FEEDS:
            try:
                r = await client.get(feed["url"], headers=browser_headers)
                if r.status_code == 200 and b"<" in r.content[:50]:
                    all_items.extend(_parse_feed(r.content, feed["name"]))
            except Exception:
                pass

    if all_items:
        _cache = {"data": all_items, "ts": time.time()}
    elif _cache["data"]:
        # Serve stale cache rather than empty
        return {"news": _cache["data"][:limit], "cached": True, "stale": True}
    return {"news": all_items[:limit], "cached": False}
