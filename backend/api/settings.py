from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["settings"])


class SettingsUpdateRequest(BaseModel):
    default_model: str | None = None
    enable_streaming: bool | None = None


@router.get("/settings")
async def get_settings():
    return {
        "default_model": "gemini-2.0-flash",
        "enable_streaming": True,
        "ai_enabled": True,
    }


@router.post("/settings")
async def update_settings(payload: SettingsUpdateRequest):
    return {
        "default_model": payload.default_model or "gemini-2.0-flash",
        "enable_streaming": payload.enable_streaming if payload.enable_streaming is not None else True,
        "ai_enabled": True,
    }
