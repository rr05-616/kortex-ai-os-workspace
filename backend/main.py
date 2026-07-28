"""KORTEX AI — FastAPI Backend.

Enterprise AI Operating System backend.
Hybrid mode: Convex (primary data) + FastAPI (AI intelligence).
"""
from __future__ import annotations

import os
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI

from .config import settings
from .logging_config import configure_logging
from .middleware import setup_cors, RequestContextMiddleware, RequestLoggingMiddleware, RateLimitMiddleware
from .database import init_redis, close_redis, init_chroma
from .api.health import router as health_router
from .api.chat import router as chat_router
from .api.agent_status import router as agent_router

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

configure_logging(log_level=settings.LOG_LEVEL, log_format=settings.LOG_FORMAT)
log = structlog.get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("kortex.ai.starting", version=settings.APP_VERSION)
    await init_redis(settings.REDIS_URL)
    init_chroma(settings.CHROMA_PERSIST_DIR, settings.CHROMA_COLLECTION)
    from .ai.ai_agent import AIAgent
    AIAgent()
    log.info("kortex.ai.started")
    yield
    log.info("kortex.ai.stopping")
    await close_redis()
    log.info("kortex.ai.stopped")

def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION, lifespan=lifespan)
    setup_cors(app, settings.CORS_ORIGINS)
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RateLimitMiddleware, max_requests=settings.RATE_LIMIT_REQUESTS, window=settings.RATE_LIMIT_WINDOW)
    app.include_router(health_router)
    app.include_router(chat_router)
    app.include_router(agent_router)
    return app

app = create_app()
