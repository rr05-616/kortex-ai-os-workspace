"""Settings API endpoints."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api", tags=["settings"])


_user_settings: dict = {
    "theme": "dark",
    "notifications_enabled": True,
    "ai_model": "gemini-2.0-flash",
    "language": "en",
}


@router.get("/settings")
async def get_settings():
    return _user_settings


@router.patch("/settings")
async def update_settings(body: dict):
    _user_settings.update(body)
    return _user_settings


@router.get("/settings/profile")
async def get_profile():
    return {"name": "User", "email": "", "avatar": ""}


@router.patch("/settings/profile")
async def update_profile(body: dict):
    return body
