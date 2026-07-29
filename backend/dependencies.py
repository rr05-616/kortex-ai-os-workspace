"""KORTEX AI — FastAPI Dependencies.

Dependency injection for services, auth, and configuration.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Optional
from fastapi import Depends, Header

from .config import settings, Settings
from .database import get_redis, get_chroma_collection


@lru_cache
def get_settings_dep() -> Settings:
    """Get application settings."""
    return settings


async def get_current_user_id(
    authorization: Optional[str] = Header(None),
) -> Optional[str]:
    """Extract user ID from authorization header.

    In hybrid mode, the frontend passes the Convex user ID.
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        try:
            from jose import jwt
            payload = jwt.decode(token, settings.SECRET_KEY or "dev-secret", algorithms=["HS256"])
            return payload.get("sub")
        except Exception:
            # If JWT fails, treat the token as a Convex user ID directly
            return token
    return None


async def get_rate_limiter():
    """Get rate limiter instance."""
    redis = get_redis()
    return redis  # None if Redis unavailable


# ── Service Factories ──────────────────────────────────────────────────────────

def get_llm_orchestrator():
    """Get LLM orchestrator from the AI package."""
    from .ai.llm_orchestrator import LLMOrchestrator
    return LLMOrchestrator()


def get_ai_agent():
    """Get the AI Agent instance."""
    from .ai.ai_agent import AIAgent
    return AIAgent()


# ── Cache Helper ───────────────────────────────────────────────────────────────

async def cache_get(key: str) -> Optional[str]:
    """Get value from Redis cache."""
    redis = get_redis()
    if redis:
        try:
            return await redis.get(key)
        except Exception:
            return None
    return None


async def cache_set(key: str, value: str, ttl: int = 300):
    """Set value in Redis cache."""
    redis = get_redis()
    if redis:
        try:
            await redis.setex(key, ttl, value)
        except Exception:
            pass
