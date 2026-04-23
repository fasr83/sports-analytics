import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import init_db
from .routers import leagues, matches, analytics, setup, news, youtube, teams

logger = logging.getLogger("sports_analytics")


async def _auto_init():
    """Train models on startup — uses real APIs if keys are set, demo otherwise."""
    from .routers.setup import init_real, init_demo
    from .config import settings
    try:
        if settings.API_FOOTBALL_KEY:
            result = await init_real()
            for code, r in result.get("results", {}).items():
                logger.info(f"[startup] {code}: {r.get('status')} {r.get('matches_used', 0)} partidos")
        else:
            logger.warning("[startup] No API_FOOTBALL_KEY — loading demo data")
            await init_demo()
    except Exception as e:
        logger.error(f"[startup] auto-init failed: {e}, falling back to demo")
        try:
            await init_demo()
        except Exception as e2:
            logger.error(f"[startup] demo fallback also failed: {e2}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    asyncio.create_task(_auto_init())
    yield


app = FastAPI(title="Sports Analytics API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Permitir Netlify + localhost
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(leagues.router)
app.include_router(matches.router)
app.include_router(analytics.router)
app.include_router(setup.router)
app.include_router(news.router)
app.include_router(youtube.router)
app.include_router(teams.router)


@app.get("/")
async def root():
    return {"message": "Sports Analytics API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
