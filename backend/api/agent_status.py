"""Agent status endpoint."""
from __future__ import annotations
import os
from fastapi import APIRouter, Request
router = APIRouter(prefix="/api", tags=["agent"])

@router.get("/agent/status")
async def agent_status(request: Request):
    agent = getattr(request.app.state, "ai_agent", None)
    return {"status": "ok" if agent else "unavailable", "gemini_configured": bool(os.getenv("GEMINI_API_KEY")), "openai_configured": bool(os.getenv("OPENAI_API_KEY"))}
