"""Chat-related Pydantic schemas."""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional

class ChatRequest(BaseModel):
    message: str
    project_id: Optional[str] = None
    conversation_id: Optional[str] = None
    conversation_history: list[dict[str, str]] = []
    gemini_api_key: Optional[str] = None
    workspace_data: Optional[dict] = None

class ChatResponse(BaseModel):
    response: str
    intent: str = "general_ai"
    confidence: float = 0.5
    conversation_id: str = ""
    timestamp: str = ""
    metadata: dict = {}
    tools_used: list[str] = []
    reasoning: str = ""
