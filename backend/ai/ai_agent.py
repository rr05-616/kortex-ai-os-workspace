"""AI Agent — Single entry point for all AI operations.

Flow:
  Receive Request → Intent Classifier → Conversation Memory →
  Workspace Retriever → Tool Router → Reasoning Engine →
  Recommendation Engine → LLM Orchestrator → Response Formatter → Response
"""

from __future__ import annotations

import structlog

from .schemas import (
    ChatRequest, ChatResponse, WorkspaceContext, IntentResult, AgentResponse,
)
from .context_engine import ContextEngine
from .intent_classifier import IntentClassifier
from .conversation_memory import ConversationMemory
from .workspace_retriever import WorkspaceRetriever
from .tool_router import ToolRouter
from .reasoning_engine import ReasoningEngine
from .recommendation_engine import RecommendationEngine
from .llm_orchestrator import LLMOrchestrator
from .response_formatter import ResponseFormatter

logger = structlog.get_logger(__name__)


class AIAgent:
    """Autonomous workspace intelligence agent.

    Single entry point — all AI endpoints use this service.
    Never returns generic responses.
    """

    def __init__(self):
        self.context_engine = ContextEngine()
        self.intent_classifier = IntentClassifier()
        self.memory_store: dict[str, ConversationMemory] = {}
        self.workspace_retriever = WorkspaceRetriever()
        self.tool_router = ToolRouter()
        self.reasoning_engine = ReasoningEngine()
        self.recommendation_engine = RecommendationEngine()
        self.llm_orchestrator = LLMOrchestrator()
        self.response_formatter = ResponseFormatter()
        logger.info("ai_agent.initialized")

    def _get_memory(self, conversation_id: str) -> ConversationMemory:
        """Get or create conversation memory."""
        if conversation_id not in self.memory_store:
            self.memory_store[conversation_id] = ConversationMemory(
                session_id=conversation_id
            )
        return self.memory_store[conversation_id]

    async def process(
        self,
        request: ChatRequest,
        workspace_data: dict | None = None,
    ) -> ChatResponse:
        """Process a chat request through the full agent pipeline.

        This is the single entry point for all AI operations.
        """
        conversation_id = request.conversation_id or "default"
        logger.info(
            "ai_agent.process",
            message=request.message[:80],
            conversation=conversation_id,
        )

        # ── Step 1: Intent Classification ──
        memory = self._get_memory(conversation_id)
        intent = self.intent_classifier.classify(
            request.message,
            request.conversation_history,
        )

        # Detect follow-up from memory
        if intent.intent.value == "general_ai" and memory.is_follow_up(request.message):
            from .schemas import IntentType
            intent = IntentResult(
                intent=IntentType.FOLLOW_UP,
                confidence=0.7,
                raw_message=request.message,
            )

        # ── Step 2: Build Workspace Context ──
        ctx = self.context_engine.build(
            user_name=workspace_data.get("user_name", "User") if workspace_data else "User",
            project=workspace_data.get("project") if workspace_data else None,
            tasks=workspace_data.get("tasks") if workspace_data else None,
            sprints=workspace_data.get("sprints") if workspace_data else None,
            analyses=workspace_data.get("analyses") if workspace_data else None,
        )

        # ── Step 3: Retrieve Relevant Data ──
        retrieved = self.workspace_retriever.retrieve(ctx, intent)

        # ── Step 4: Route Tools ──
        tools = self.tool_router.route(intent)
        tool_results = self.tool_router.execute_tools(tools, retrieved)

        # ── Step 5: Reasoning Engine ──
        analysis = self.reasoning_engine.analyze(ctx, intent, tool_results)

        # ── Step 6: Recommendation Engine ──
        recommendation = self.recommendation_engine.generate(ctx)

        # ── Step 7: Build LLM Prompt ──
        system_prompt = self._build_system_prompt(ctx, memory, analysis, recommendation)
        memory_context = memory.get_context_string()

        # ── Step 8: LLM Generation ──
        llm_response = await self.llm_orchestrator.generate(
            system_prompt=system_prompt,
            user_message=request.message,
            conversation_history=request.conversation_history,
        )

        # ── Step 9: Format Response ──
        formatted = self.response_formatter.format(
            llm_response=llm_response,
            analysis=analysis,
            recommendation=recommendation,
            context=ctx,
            intent=intent,
        )

        # ── Step 10: Update Memory ──
        memory.update_from_message(
            user_message=request.message,
            assistant_response=formatted.raw_response,
            intent=intent.intent,
            entities=intent.entities,
        )

        logger.info("ai_agent.process.done", intent=intent.intent.value)

        return ChatResponse(
            response=formatted.raw_response,
            intent=intent.intent.value,
            confidence=intent.confidence,
            conversation_id=conversation_id,
            metadata=formatted.metadata,
        )

    def _build_system_prompt(
        self,
        ctx: WorkspaceContext,
        memory: ConversationMemory,
        analysis,
        recommendation,
    ) -> str:
        """Build the system prompt for the LLM."""
        parts = [
            "You are KORTEX AI — an autonomous workspace intelligence agent.",
            "You are NOT a chatbot. You are an AI Senior Technical Program Manager.",
            "",
            "CRITICAL RULES:",
            "1. NEVER respond with generic text like 'You can ask me about...' or 'I can help with...'",
            "2. NEVER advertise your capabilities or list what you can do.",
            "3. ALWAYS answer using the actual workspace data provided below.",
            "4. Reference specific task names, numbers, statuses, and dates.",
            "5. Every response must include: what I found → analysis → recommendation → next action.",
            "6. Keep responses concise (3-8 sentences) unless the user asks for detail.",
            "7. Tone: Professional, concise, technical, actionable.",
            "",
            "WORKSPACE DATA:",
            f"Stage: {ctx.stage}",
            f"Completion: {ctx.completion_rate}%",
            f"Tasks: {ctx.total_tasks} total, {ctx.total_done} done, {ctx.total_in_progress} in progress",
        ]

        if ctx.project:
            parts.append(f"Project: {ctx.project.name} ({ctx.project.status})")

        if ctx.tasks:
            parts.append("\nTASKS:")
            for t in ctx.tasks[:10]:
                line = f'- "{t.title}" [{t.status}] priority:{t.priority}'
                if t.ai_risk_score > 0.7:
                    line += " ⚠️HIGH_RISK"
                parts.append(line)

        if ctx.active_sprint:
            parts.append(f"\nActive Sprint: {ctx.active_sprint.name}")

        # Add memory context
        memory_str = memory.get_context_string()
        if memory_str and memory_str != "Fresh conversation — no previous context.":
            parts.append(f"\nCONVERSATION MEMORY:\n{memory_str}")

        # Add analysis insights
        if analysis.observations:
            parts.append("\nANALYSIS:")
            for obs in analysis.observations[:3]:
                parts.append(f"• {obs}")

        if analysis.recommendations:
            parts.append("\nRECOMMENDATIONS:")
            for rec in analysis.recommendations[:3]:
                parts.append(f"• {rec}")

        return "\n".join(parts)
