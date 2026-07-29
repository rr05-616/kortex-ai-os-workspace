"""KORTEX AI — FastAPI Dependencies."""
from __future__ import annotations
from typing import Optional
import structlog
from fastapi import Depends, Header, HTTPException, Request, status
from .config import Settings, settings
from .database import get_redis

log = structlog.get_logger(__name__)

def get_settings_dep() -> Settings:
    return settings

async def _decode_bearer_token(token: str) -> Optional[str]:
    try:
        from jose import jwt
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload.get("sub")
    except Exception:
        return None

async def get_current_user_id(authorization: Optional[str] = Header(None)) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:]
    return await _decode_bearer_token(token)

async def require_user_id(user_id: Optional[str] = Depends(get_current_user_id)) -> str:
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user_id

async def cache_get(key: str) -> Optional[str]:
    redis = get_redis()
    if not redis: return None
    try: return await redis.get(key)
    except Exception: return None

async def cache_set(key: str, value: str, ttl: int = 300) -> None:
    redis = get_redis()
    if not redis: return
    try: await redis.setex(key, ttl, value)
    except Exception: pass

def get_ai_agent(request: Request):
    agent = getattr(request.app.state, "ai_agent", None)
    if agent is not None: return agent
    from .ai.ai_agent import AIAgent
    return AIAgent()
