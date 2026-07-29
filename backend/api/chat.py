"""Chat API endpoint."""
from __future__ import annotations
from fastapi import APIRouter, HTTPException, Request
from ..schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: Request, body: ChatRequest):
    agent = getattr(request.app.state, "ai_agent", None)
    if agent is None:
        raise HTTPException(status_code=503, detail="AI agent not available")
    result = await agent.process(body, workspace_data=body.workspace_data)
    return result


@router.post("/copilot", response_model=ChatResponse)
async def copilot(request: Request, body: ChatRequest):
    return await chat(request, body)


@router.post("/ask", response_model=ChatResponse)
async def ask(request: Request, body: ChatRequest):
    return await chat(request, body)
