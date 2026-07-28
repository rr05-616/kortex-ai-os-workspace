"""KORTEX AI — FastAPI Backend Entry Point."""

from __future__ import annotations

import os
from dotenv import load_dotenv

# Load .env file from backend directory before anything else
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from ai import AIAgent, ChatRequest, ChatResponse, HealthResponse

# ─── Logging ──────────────────────────────────────────────────────────────────

structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(0),
)
logger = structlog.get_logger(__name__)

# ─── Agent singleton ──────────────────────────────────────────────────────────

agent: AIAgent | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global agent
    agent = AIAgent()
    logger.info("kortex.ai.started")
    yield
    logger.info("kortex.ai.stopped")


# ─── FastAPI App ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="KORTEX AI Backend",
    version="1.0.0",
    description="Autonomous Workspace Intelligence Agent",
    lifespan=lifespan,
)

# CORS — allow frontend to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        modules={
            "context_engine": "active",
            "intent_classifier": "active",
            "conversation_memory": "active",
            "workspace_retriever": "active",
            "tool_router": "active",
            "reasoning_engine": "active",
            "recommendation_engine": "active",
            "llm_orchestrator": "active",
            "response_formatter": "active",
            "ai_agent": "active",
        },
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main chat endpoint — processes through full agent pipeline."""
    if agent is None:
        raise RuntimeError("AI Agent not initialized")

    response = await agent.process(
        request,
        workspace_data=request.context if hasattr(request, "context") else None,
    )
    return response


@app.post("/api/copilot", response_model=ChatResponse)
async def copilot(request: ChatRequest):
    """Copilot endpoint — alias for /api/chat."""
    return await chat(request)


@app.post("/api/ask", response_model=ChatResponse)
async def ask(request: ChatRequest):
    """Ask endpoint — alias for /api/chat."""
    return await chat(request)


@app.get("/api/agent/status")
async def agent_status():
    """Get agent status and configuration."""
    return {
        "status": "active",
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
        "modules_loaded": [
            "context_engine",
            "intent_classifier",
            "conversation_memory",
            "workspace_retriever",
            "tool_router",
            "reasoning_engine",
            "recommendation_engine",
            "llm_orchestrator",
            "response_formatter",
        ],
    }


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
    )
