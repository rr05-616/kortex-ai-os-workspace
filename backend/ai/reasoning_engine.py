"""Reasoning Engine — Converts retrieved information into engineering decisions."""

from __future__ import annotations

import structlog
from .schemas import AnalysisResult, WorkspaceContext, IntentResult

logger = structlog.get_logger(__name__)


class ReasoningEngine:
    """Analyzes workspace data and generates engineering insights.

    Never simply summarizes data — always reasons about WHY and WHAT NEXT.
    """

    def analyze(
        self,
        context: WorkspaceContext,
        intent: IntentResult,
        tool_results: list[dict],
    ) -> AnalysisResult:
        """Perform deep analysis and generate engineering decisions."""
        logger.info("reasoning_engine.analyze", intent=intent.intent.value)

        result = AnalysisResult()

        # Build observations from context
        result.observations = self._build_observations(context)

        # Identify risks
        result.risks = self._identify_risks(context)

        # Find opportunities
        result.opportunities = self._find_opportunities(context)

        # Generate recommendations
        result.recommendations = self._generate_recommendations(context, intent)

        # Rank priorities
        result.priority_ranking = self._rank_priorities(context)

        # Determine next actions
        result.next_actions = self._determine_next_actions(context, intent)

        # Calculate confidence
        result.confidence = self._calculate_confidence(context)

        logger.info(
            "reasoning_engine.done",
            observations=len(result.observations),
            risks=len(result.risks),
            recommendations=len(result.recommendations),
        )
        return result

    def _build_observations(self, ctx: WorkspaceContext) -> list[str]:
        """Build factual observations from workspace data."""
        observations = []

        if ctx.project:
            observations.append(
                f"Project '{ctx.project.name}' is in {ctx.stage} stage "
                f"with {ctx.completion_rate}% completion."
            )

        if ctx.total_tasks > 0:
            observations.append(
                f"Workspace contains {ctx.total_tasks} tasks: "
                f"{ctx.total_done} done, {ctx.total_in_progress} in progress, "
                f"{ctx.total_todo} todo, {ctx.total_backlog} backlog."
            )

        if ctx.active_sprint:
            sprint = ctx.active_sprint
            progress = (
                round(sprint.completed_tasks / sprint.task_count * 100)
                if sprint.task_count > 0 else 0
            )
            observations.append(
                f"Active sprint '{sprint.name}' is {progress}% complete "
                f"({sprint.completed_tasks}/{sprint.task_count} tasks)."
            )

        if ctx.analyses:
            a = ctx.analyses[0]
            observations.append(
                f"Repository analysis: {a.name} scored {a.score}/100, "
                f"architecture: {a.architecture[:100]}."
            )

        return observations

    def _identify_risks(self, ctx: WorkspaceContext) -> list[str]:
        """Identify risks in the workspace."""
        risks = []

        if ctx.total_risk > 0:
            risky_tasks = [t for t in ctx.tasks if t.ai_risk_score > 0.7]
            risks.append(
                f"{ctx.total_risk} high-risk task(s): "
                + ", ".join(f'"{t.title}"' for t in risky_tasks[:3])
            )

        if ctx.total_overdue > 0:
            overdue = [
                t for t in ctx.tasks
                if t.due_date and t.status != "done"
            ]
            risks.append(
                f"{ctx.total_overdue} overdue task(s): "
                + ", ".join(f'"{t.title}"' for t in overdue[:3])
            )

        if ctx.total_in_progress > 5:
            risks.append(
                f"{ctx.total_in_progress} tasks in progress may indicate "
                f"lack of focus — consider limiting WIP."
            )

        if ctx.completion_rate < 20 and ctx.total_tasks > 5:
            risks.append(
                f"Low completion rate ({ctx.completion_rate}%) with "
                f"{ctx.total_tasks} tasks — project may be stalled."
            )

        if ctx.total_backlog > ctx.total_tasks * 0.6 and ctx.total_tasks > 3:
            risks.append(
                f"Large backlog ({ctx.total_backlog}/{ctx.total_tasks}) — "
                f"consider pruning or reprioritizing."
            )

        return risks

    def _find_opportunities(self, ctx: WorkspaceContext) -> list[str]:
        """Find opportunities for improvement."""
        opportunities = []

        if ctx.total_in_progress == 0 and ctx.total_todo > 0:
            opportunities.append(
                "No tasks in progress — starting one would build momentum."
            )

        if ctx.completion_rate >= 80 and ctx.total_tasks > 0:
            opportunities.append(
                "High completion rate — consider closing this sprint "
                "or starting a new one."
            )

        if not ctx.active_sprint and ctx.total_tasks > 0:
            opportunities.append(
                "No active sprint — creating one would improve focus."
            )

        if ctx.analyses:
            strengths = ctx.analyses[0].strengths
            if strengths:
                opportunities.append(
                    f"Leverage strengths: {', '.join(strengths[:3])}"
                )

        return opportunities

    def _generate_recommendations(
        self, ctx: WorkspaceContext, intent: IntentResult
    ) -> list[str]:
        """Generate actionable recommendations."""
        recs = []

        # Always recommend addressing risks first
        if ctx.total_risk > 0:
            recs.append(
                "Address high-risk tasks immediately to prevent blockers."
            )

        if ctx.total_overdue > 0:
            recs.append(
                "Re-prioritize overdue tasks or adjust deadlines."
            )

        if ctx.total_in_progress > 3:
            recs.append(
                "Limit work-in-progress to 2-3 tasks for better focus."
            )

        if ctx.total_in_progress == 0 and ctx.total_todo > 0:
            recs.append(
                "Start the highest-priority todo task to build momentum."
            )

        if ctx.completion_rate < 30 and ctx.total_tasks > 5:
            recs.append(
                "Break large tasks into smaller, manageable pieces (2-4h each)."
            )

        if not ctx.active_sprint and ctx.total_tasks > 3:
            recs.append(
                "Create a sprint to organize work and set clear goals."
            )

        return recs[:5]

    def _rank_priorities(self, ctx: WorkspaceContext) -> list[str]:
        """Rank tasks by priority."""
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        sorted_tasks = sorted(
            ctx.tasks,
            key=lambda t: (
                priority_order.get(t.priority, 4),
                -t.ai_risk_score,
            )
        )
        return [
            f"{t.title} [{t.priority}] (risk: {t.ai_risk_score:.0%})"
            for t in sorted_tasks[:5]
            if t.status != "done"
        ]

    def _determine_next_actions(
        self, ctx: WorkspaceContext, intent: IntentResult
    ) -> list[str]:
        """Determine concrete next actions."""
        actions = []

        # Find the top priority task
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        actionable = [
            t for t in ctx.tasks
            if t.status in ("todo", "backlog", "in_progress")
        ]
        actionable.sort(key=lambda t: priority_order.get(t.priority, 4))

        if actionable:
            top = actionable[0]
            actions.append(f'Focus on "{top.title}" ({top.priority} priority)')
            if top.estimated_hours:
                actions.append(f"Estimated effort: {top.estimated_hours}h")

        if ctx.total_risk > 0:
            actions.append("Review and address high-risk tasks")

        if not ctx.active_sprint and ctx.total_tasks > 3:
            actions.append("Set up a sprint for the next 2 weeks")

        return actions[:4]

    def _calculate_confidence(self, ctx: WorkspaceContext) -> float:
        """Calculate confidence in the analysis."""
        confidence = 0.5  # Base confidence

        # More data = higher confidence
        if ctx.total_tasks > 5:
            confidence += 0.1
        if ctx.project:
            confidence += 0.1
        if ctx.analyses:
            confidence += 0.1
        if ctx.active_sprint:
            confidence += 0.1

        return min(confidence, 0.95)
