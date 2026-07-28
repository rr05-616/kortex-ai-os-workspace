"""AI Agent status endpoint."""
from fastapi import APIRouter
from ..config import settings
router = APIRouter(prefix="/api/agent", tags=["agent"])

@router.get("/status")
async def agent_status():
    return {
        "status": "active",
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "openai_configured": bool(settings.OPENAI_API_KEY),
        "modules_loaded": [
            "context_engine", "intent_classifier", "conversation_memory",
            "workspace_retriever", "tool_router", "reasoning_engine",
            "recommendation_engine", "llm_orchestrator", "response_formatter",
            "stream_manager", "planner_engine", "execution_engine",
            "knowledge_graph", "rag_engine", "embedding_service",
        ],
    }
