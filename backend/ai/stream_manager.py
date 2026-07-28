"""Stream Manager — SSE streaming for AI responses."""
from __future__ import annotations
import json
import asyncio
import structlog
from typing import AsyncGenerator

log = structlog.get_logger(__name__)

class StreamManager:
    """Manages Server-Sent Events streaming for AI responses."""

    async def generate_stream(self, request) -> AsyncGenerator[str, None]:
        from .ai_agent import AIAgent
        from .schemas import ChatRequest
        agent = AIAgent()
        try:
            yield self._event("status", "Initializing workspace context...")
            await asyncio.sleep(0.1)
            yield self._event("status", "Classifying intent...")
            await asyncio.sleep(0.1)
            yield self._event("status", "Retrieving workspace data...")
            await asyncio.sleep(0.1)
            yield self._event("status", "Routing tools...")
            await asyncio.sleep(0.1)
            yield self._event("status", "Reasoning...")
            await asyncio.sleep(0.1)
            yield self._event("status", "Generating recommendation...")
            response = await agent.process(request, workspace_data=getattr(request, 'workspace_data', None))
            words = response.response.split()
            chunk_size = max(1, len(words) // 10)
            for i in range(0, len(words), chunk_size):
                chunk = " ".join(words[i:i+chunk_size])
                yield self._event("chunk", chunk)
                await asyncio.sleep(0.05)
            yield self._event("done", json.dumps({"intent": response.intent, "confidence": response.confidence, "tools_used": response.tools_used}))
        except Exception as e:
            log.error("stream.error", error=str(e))
            yield self._event("error", str(e))

    def _event(self, event_type: str, data: str) -> str:
        return f"event: {event_type}\ndata: {json.dumps({'data': data})}\n\n"
