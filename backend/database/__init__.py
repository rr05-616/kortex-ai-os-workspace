"""KORTEX AI — Database connectors."""
from __future__ import annotations
import structlog
log = structlog.get_logger(__name__)

_redis_client = None
_chroma_client = None
_chroma_collection = None


async def init_redis(url: str) -> None:
    global _redis_client
    try:
        import redis.asyncio as aioredis
        _redis_client = aioredis.from_url(url, decode_responses=True)
        await _redis_client.ping()
        log.info("kortex.redis.connected")
    except ImportError:
        log.warning("kortex.redis.not_installed")
    except Exception:
        log.warning("kortex.redis.connection_failed", note="rate limiting disabled")
        _redis_client = None


async def close_redis() -> None:
    global _redis_client
    if _redis_client is not None:
        try:
            await _redis_client.close()
        except Exception:
            pass
        _redis_client = None


def get_redis():
    return _redis_client


async def check_database_health() -> dict:
    result = {"redis": "disconnected", "chroma": "disconnected"}
    if _redis_client:
        try:
            await _redis_client.ping()
            result["redis"] = "connected"
        except Exception:
            result["redis"] = "error"
    return result


def init_chroma(persist_dir: str, collection_name: str) -> None:
    global _chroma_client, _chroma_collection
    try:
        import chromadb
        _chroma_client = chromadb.PersistentClient(path=persist_dir)
        _chroma_collection = _chroma_client.get_or_create_collection(name=collection_name)
    except ImportError:
        log.warning("kortex.chroma.not_installed")
    except Exception:
        log.warning("kortex.chroma.connection_failed")


def get_chroma_collection():
    return _chroma_collection
