"""Response Formatter — Builds structured markdown responses."""

from __future__ import annotations

import structlog
from .schemas import (
    AgentResponse, AnalysisResult, Recommendation,
    WorkspaceContext, IntentResult,
)

logger = structlog.get_logger(__name__)


class ResponseFormatter:
    """Formats every response with structured sections.

    Each response contains: Observation, Analysis, Recommendation,
    Reason, Implementation Steps, Estimated Effort, Next Action.
    """

    def format(
        self,
        llm_response: str,
        analysis: AnalysisResult,
        recommendation: Recommendation,
        context: WorkspaceContext,
        intent: IntentResult,
    ) -> AgentResponse:
        """Format the final response from all engine outputs."""
        logger.info("response_formatter.format")

        response = AgentResponse()

        # If LLM provided a good response, use it as the base
        if llm_response and len(llm_response) > 50:
            response.raw_response = llm_response
            response.observation = self._extract_section(llm_response, "observation")
            response.analysis = self._extract_section(llm_response, "analysis")
            response.recommendation = self._extract_section(llm_response, "recommendation")
        else:
            # Build from structured data
            response.observation = self._build_observation(analysis, context)
            response.analysis = self._build_analysis(analysis, context)
            response.recommendation = self._build_recommendation(recommendation, analysis)

        # Always add structured sections
        response.reason = self._build_reason(analysis, recommendation)
        response.implementation_steps = self._build_steps(recommendation, analysis)
        response.estimated_effort = recommendation.estimated_time or "Varies"
        response.next_action = self._build_next_action(recommendation, analysis)

        # Build the final formatted response
        if not response.raw_response:
            response.raw_response = self._compose_markdown(response, context, intent)

        response.metadata = {
            "intent": intent.intent.value,
            "confidence": intent.confidence,
            "tasks_analyzed": context.total_tasks,
            "completion": context.completion_rate,
        }

        logger.info("response_formatter.done")
        return response

    def _build_observation(self, analysis: AnalysisResult, ctx: WorkspaceContext) -> str:
        if analysis.observations:
            return "\n".join(f"• {o}" for o in analysis.observations[:3])
        return f"Workspace has {ctx.total_tasks} tasks with {ctx.completion_rate}% completion."

    def _build_analysis(self, analysis: AnalysisResult, ctx: WorkspaceContext) -> str:
        parts = []
        if analysis.risks:
            parts.append("**Risks:** " + "; ".join(analysis.risks[:2]))
        if analysis.opportunities:
            parts.append("**Opportunities:** " + "; ".join(analysis.opportunities[:2]))
        return "\n".join(parts) if parts else "Workspace appears stable."

    def _build_recommendation(self, rec: Recommendation, analysis: AnalysisResult) -> str:
        if analysis.recommendations:
            return "\n".join(f"{i+1}. {r}" for i, r in enumerate(analysis.recommendations[:3]))
        if rec.top_task:
            return f"Focus on **{rec.top_task.task_title}** (highest priority score)."
        return "Continue with current tasks."

    def _build_reason(self, analysis: AnalysisResult, rec: Recommendation) -> str:
        if rec.top_task:
            return rec.top_task.reasoning
        if analysis.risks:
            return f"Addressing the {len(analysis.risks)} identified risk(s) will improve project health."
        return "Based on current workspace metrics."

    def _build_steps(self, rec: Recommendation, analysis: AnalysisResult) -> list[str]:
        steps = []
        if analysis.next_actions:
            steps.extend(analysis.next_actions[:3])
        if rec.implementation_order:
            steps.extend(rec.implementation_order[:2])
        return steps[:4]

    def _build_next_action(self, rec: Recommendation, analysis: AnalysisResult) -> str:
        if analysis.next_actions:
            return analysis.next_actions[0]
        if rec.top_task:
            return f'Start working on "{rec.top_task.task_title}"'
        return "Review your workspace for next steps."

    def _extract_section(self, text: str, section: str) -> str:
        """Extract a section from LLM response by header."""
        import re
        pattern = rf"##?\s*{section}[:\s]*\n(.*?)(?=\n##|\Z)"
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        return match.group(1).strip() if match else ""

    def _compose_markdown(
        self,
        response: AgentResponse,
        ctx: WorkspaceContext,
        intent: IntentResult,
    ) -> str:
        """Compose the final markdown response."""
        lines = []

        # Header
        project_name = ctx.project.name if ctx.project else "Your Workspace"
        lines.append(f"**{project_name} — Analysis**\n")

        # Observation
        if response.observation:
            lines.append(f"**What I found:**\n{response.observation}\n")

        # Analysis
        if response.analysis:
            lines.append(f"**Analysis:**\n{response.analysis}\n")

        # Recommendation
        if response.recommendation:
            lines.append(f"**My recommendation:**\n{response.recommendation}\n")

        # Implementation steps
        if response.implementation_steps:
            lines.append("**Next steps:**")
            for step in response.implementation_steps:
                lines.append(f"• {step}")
            lines.append("")

        # Effort and next action
        if response.estimated_effort and response.estimated_effort != "Varies":
            lines.append(f"**Estimated effort:** {response.estimated_effort}")
        if response.next_action:
            lines.append(f"**Start with:** {response.next_action}")

        return "\n".join(lines)
