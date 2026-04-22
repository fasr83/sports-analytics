import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import init_db
from .routers import leagues, matches, analytics, setup, news

logger = logging.getLogger("sports_analytics")


async def _auto_init():
    """Train models on startup — uses real APIs if keys are set, demo otherwise."""
    try:
        from .routers.setup import init_real
        result = await init_real()
        for code, r in result.get("results", {}).items():
            logger.info(f"[startup] {code}: {r.get('status')} {r.get('matches_used', 0)} partidos")
    except Exception as e:
        logger.error(f"[startup] auto-init failed: {e}")


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


@app.get("/")
async def root():
    return {"message": "Sports Analytics API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
