"""KORTEX AI — Database Configuration.

PostgreSQL via SQLAlchemy (async), Redis for caching, ChromaDB for vector search.
In hybrid mode, Convex remains primary — these are supplementary stores.
"""

from __future__ import annotations

import structlog
from typing import Optional, AsyncGenerator

logger = structlog.get_logger(__name__)

# ── PostgreSQL (SQLAlchemy Async) ─────────────────────────────────────────────

_engine = None
_SessionLocal = None


async def init_postgres(database_url: Optional[str] = None):
    """Initialize async PostgreSQL connection pool."""
    global _engine, _SessionLocal
    if not database_url:
        logger.info("postgres.skipped", reason="No DATABASE_URL configured")
        return

    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from sqlalchemy.orm import DeclarativeBase

    _engine = create_async_engine(
        database_url,
        echo=False,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
    )
    _SessionLocal = async_sessionmaker(_engine, expire_on_commit=False)
    logger.info("postgres.connected")


async def close_postgres():
    """Close PostgreSQL connection pool."""
    global _engine
    if _engine:
        await _engine.dispose()
        logger.info("postgres.closed")


async def get_db_session():
    """Get an async database session."""
    if _SessionLocal is None:
        return
    async with _SessionLocal() as session:
        yield session


# ── Redis ─────────────────────────────────────────────────────────────────────

_redis_client = None


async def init_redis(redis_url: str = "redis://localhost:6379/0"):
    """Initialize Redis connection."""
    global _redis_client
    try:
        import redis.asyncio as aioredis
        _redis_client = aioredis.from_url(redis_url, decode_responses=True)
        await _redis_client.ping()
        logger.info("redis.connected", url=redis_url)
    except Exception as e:
        _redis_client = None
        logger.warning("redis.unavailable", error=str(e))


async def close_redis():
    """Close Redis connection."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        logger.info("redis.closed")


def get_redis():
    """Get Redis client (may be None if unavailable)."""
    return _redis_client


# ── ChromaDB (Vector Store) ──────────────────────────────────────────────────

_chroma_client = None
_chroma_collection = None


def init_chroma(persist_dir: str = "./chroma_data", collection: str = "kortex_workspace"):
    """Initialize ChromaDB vector store."""
    global _chroma_client, _chroma_collection
    try:
        import chromadb
        _chroma_client = chromadb.PersistentClient(path=persist_dir)
        _chroma_collection = _chroma_client.get_or_create_collection(
            name=collection,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("chroma.initialized", collection=collection)
    except Exception as e:
        _chroma_client = None
        _chroma_collection = None
        logger.warning("chroma.unavailable", error=str(e))


def get_chroma_collection():
    """Get ChromaDB collection (may be None if unavailable)."""
    return _chroma_collection


# ── Health Check ──────────────────────────────────────────────────────────────

async def check_database_health() -> dict:
    """Check health of all database connections."""
    health = {
        "postgres": "not_configured",
        "redis": "not_configured",
        "chroma": "not_configured",
    }

    if _engine:
        try:
            from sqlalchemy import text
            async with _engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            health["postgres"] = "healthy"
        except Exception as e:
            health["postgres"] = f"error: {e}"

    if _redis_client:
        try:
            await _redis_client.ping()
            health["redis"] = "healthy"
        except Exception as e:
            health["redis"] = f"error: {e}"

    if _chroma_collection:
        try:
            _chroma_collection.count()
            health["chroma"] = "healthy"
        except Exception as e:
            health["chroma"] = f"error: {e}"

    return health
