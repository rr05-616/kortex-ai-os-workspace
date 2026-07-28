"""Chat API — SSE streaming chat endpoint."""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from ..schemas.chat import ChatRequest, ChatResponse
router = APIRouter(prefix="/api", tags=["chat"])

@router.post("/chat")
async def chat(request: ChatRequest):
    from ..ai.ai_agent import AIAgent
    agent = AIAgent()
    response = await agent.process(request, workspace_data=request.workspace_data)
    return response

@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    from ..ai.stream_manager import StreamManager
    stream = StreamManager()
    return StreamingResponse(
        stream.generate_stream(request),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@router.post("/copilot")
async def copilot(request: ChatRequest):
    from ..ai.ai_agent import AIAgent
    agent = AIAgent()
    response = await agent.process(request, workspace_data=request.workspace_data)
    return response

@router.post("/ask")
async def ask(request: ChatRequest):
    from ..ai.ai_agent import AIAgent
    agent = AIAgent()
    response = await agent.process(request, workspace_data=request.workspace_data)
    return response
