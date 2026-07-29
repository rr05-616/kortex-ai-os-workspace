"""KORTEX AI — FastAPI Backend. Hybrid mode: Convex + FastAPI."""
from __future__ import annotations
import os, sys, time
from contextlib import asynccontextmanager
from typing import AsyncIterator
import structlog
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

_backend_dir = os.path.dirname(os.path.abspath(__file__))
_project_dir = os.path.dirname(_backend_dir)
if _project_dir not in sys.path:
    sys.path.insert(0, _project_dir)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from backend.config import settings
from backend.logging_config import configure_logging
from backend.middleware import RateLimitMiddleware, RequestContextMiddleware, RequestLoggingMiddleware, setup_cors
from backend.database import close_redis, init_chroma, init_redis
from backend.api.health import router as health_router
from backend.api.chat import router as chat_router
from backend.api.agent_status import router as agent_router
from backend.api.projects import router as projects_router
from backend.api.tasks import router as tasks_router
from backend.api.sprints import router as sprints_router
from backend.api.analytics import router as analytics_router
from backend.api.notifications import router as notifications_router
from backend.api.settings_api import router as settings_router
from backend.api.workspace import router as workspace_router

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

configure_logging(log_level=settings.LOG_LEVEL, log_format=settings.LOG_FORMAT)
log = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    started_at = time.monotonic()
    log.info("kortex.ai.starting", version=settings.APP_VERSION)
    app.state.ready = False
    app.state.dependency_status: dict[str, str] = {}

    # Redis is optional — degrade gracefully if unavailable
    try:
        await init_redis(settings.REDIS_URL)
        app.state.dependency_status["redis"] = "ok"
    except Exception:
        app.state.dependency_status["redis"] = "failed"
        log.warning("kortex.redis.degraded")

    # ChromaDB is optional — degrade gracefully if unavailable
    try:
        init_chroma(settings.CHROMA_PERSIST_DIR, settings.CHROMA_COLLECTION)
        app.state.dependency_status["chroma"] = "ok"
    except Exception:
        app.state.dependency_status["chroma"] = "degraded"
        log.warning("kortex.chroma.degraded")

    # AI Agent — optional, degrade gracefully
    try:
        from backend.ai.ai_agent import AIAgent
        app.state.ai_agent = AIAgent()
        app.state.dependency_status["ai_agent"] = "ok"
    except Exception:
        app.state.dependency_status["ai_agent"] = "failed"
        app.state.ai_agent = None
        log.warning("kortex.agent.degraded")

    app.state.ready = True
    app.state.startup_duration_s = round(time.monotonic() - started_at, 3)
    log.info("kortex.ai.started", duration_s=app.state.startup_duration_s, dependencies=app.state.dependency_status)
    yield
    log.info("kortex.ai.stopping")
    await close_redis()
    log.info("kortex.ai.stopped")


def create_app() -> FastAPI:
    is_prod = getattr(settings, "ENVIRONMENT", "development") == "production"
    app = FastAPI(
        title=settings.APP_NAME, version=settings.APP_VERSION, lifespan=lifespan,
        docs_url=None if is_prod else "/docs",
        redoc_url=None if is_prod else "/redoc",
        openapi_url=None if is_prod else "/openapi.json",
    )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(status_code=422, content={"error": "validation_error", "detail": exc.errors()})

    @app.exception_handler(StarletteHTTPException)
    async def http_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(status_code=exc.status_code, content={"error": "http_error", "detail": exc.detail})

    @app.exception_handler(Exception)
    async def unhandled_handler(request: Request, exc: Exception):
        return JSONResponse(status_code=500, content={"error": "internal_error", "detail": "An unexpected error occurred."})

    setup_cors(app, settings.CORS_ORIGINS)
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RateLimitMiddleware, max_requests=settings.RATE_LIMIT_REQUESTS, window=settings.RATE_LIMIT_WINDOW)

    for r in [health_router, chat_router, agent_router, projects_router, tasks_router,
              sprints_router, analytics_router, notifications_router, settings_router, workspace_router]:
        app.include_router(r)

    @app.get("/", tags=["meta"])
    async def root():
        return {"service": settings.APP_NAME, "version": settings.APP_VERSION, "status": "ok"}

    return app


app = create_app()
