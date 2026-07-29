"""Chat-related Pydantic schemas."""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ChatRequest(BaseModel):
    message: str
    project_id: Optional[str] = None
    conversation_id: Optional[str] = None
    conversation_history: list[dict[str, str]] = []
    gemini_api_key: Optional[str] = None
    workspace_data: Optional[dict] = None

class ChatResponse(BaseModel):
    response: str
    intent: str = ""
    confidence: float = 0.0
    conversation_id: str = ""
    tools_used: list[str] = []
    reasoning: str = ""
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    metadata: dict = {}

class StreamChunk(BaseModel):
    event: str  # workspace_loading, reasoning, response_chunk, done, error
    data: str
    metadata: dict = {}
