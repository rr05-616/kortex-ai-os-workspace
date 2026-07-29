from __future__ import annotations
from fastapi import APIRouter
router = APIRouter(prefix="/api", tags=["settings"])
_user_settings = {"theme": "dark", "notifications_enabled": True, "ai_model": "gemini-2.0-flash", "language": "en"}

@router.get("/settings")
async def get_settings(): return _user_settings

@router.patch("/settings")
async def update_settings(body: dict): _user_settings.update(body); return _user_settings
