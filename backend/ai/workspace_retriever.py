"""Workspace Retriever — Retrieves relevant workspace data based on intent."""

from __future__ import annotations

import structlog
from .schemas import (
    WorkspaceContext, IntentType, IntentResult,
    TaskData, SprintData, AnalysisData,
)

logger = structlog.get_logger(__name__)


class WorkspaceRetriever:
    """Retrieves only relevant workspace data based on detected intent.

    Does not retrieve unnecessary data — intent-driven retrieval.
    """

    def retrieve(
        self,
        context: WorkspaceContext,
        intent: IntentResult,
    ) -> dict:
        """Retrieve relevant data slices based on the detected intent."""
        logger.info("workspace_retriever.retrieve", intent=intent.intent.value)

        result: dict = {
            "context_summary": self._summarize_context(context),
        }

        match intent.intent:
            case IntentType.TASK_RECOMMENDATION | IntentType.TASK_BREAKDOWN:
                result["tasks"] = self._get_actionable_tasks(context)
                result["priorities"] = self._get_priority_summary(context)

            case IntentType.PROJECT_STATUS | IntentType.PROJECT_HEALTH:
                result["status"] = self._get_project_status(context)
                result["metrics"] = self._get_metrics(context)

            case IntentType.RISK_ANALYSIS:
                result["risks"] = self._get_risks(context)
                result["overdue"] = self._get_overdue_tasks(context)

            case IntentType.SPRINT_PLANNING:
                result["sprints"] = self._get_sprint_data(context)
                result["ready_tasks"] = self._get_actionable_tasks(context)

            case IntentType.ARCHITECTURE_REVIEW | IntentType.CODE_REVIEW:
                result["analyses"] = self._get_analyses(context)
                result["tech_stack"] = self._get_tech_stack(context)

            case IntentType.EXECUTE_ACTION:
                result["tasks"] = self._get_actionable_tasks(context)
                result["sprints"] = self._get_sprint_data(context)

            case _:
                # General: provide overview
                result["overview"] = self._get_overview(context)

        logger.info("workspace_retriever.done", keys=list(result.keys()))
        return result

    def _summarize_context(self, ctx: WorkspaceContext) -> str:
        parts = [f"Stage: {ctx.stage}"]
        if ctx.project:
            parts.append(f"Project: {ctx.project.name} ({ctx.project.status})")
        parts.append(f"Tasks: {ctx.total_tasks} total, {ctx.total_done} done, {ctx.total_in_progress} in progress")
        parts.append(f"Completion: {ctx.completion_rate}%")
        if ctx.active_sprint:
            parts.append(f"Active Sprint: {ctx.active_sprint.name}")
        return " | ".join(parts)

    def _get_actionable_tasks(self, ctx: WorkspaceContext) -> list[dict]:
        """Get tasks that can be worked on (todo, backlog, in_progress)."""
        actionable = [
            t for t in ctx.tasks
            if t.status in ("todo", "backlog", "in_progress")
        ]
        # Sort by priority
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        actionable.sort(key=lambda t: priority_order.get(t.priority, 4))
        return [t.model_dump() for t in actionable[:10]]

    def _get_priority_summary(self, ctx: WorkspaceContext) -> dict:
        return {
            "critical": sum(1 for t in ctx.tasks if t.priority == "critical"),
            "high": sum(1 for t in ctx.tasks if t.priority == "high"),
            "medium": sum(1 for t in ctx.tasks if t.priority == "medium"),
            "low": sum(1 for t in ctx.tasks if t.priority == "low"),
        }

    def _get_project_status(self, ctx: WorkspaceContext) -> dict:
        return {
            "name": ctx.project.name if ctx.project else "N/A",
            "status": ctx.project.status if ctx.project else "unknown",
            "health": ctx.project.health_score if ctx.project else 0,
            "stage": ctx.stage,
            "completion": ctx.completion_rate,
        }

    def _get_metrics(self, ctx: WorkspaceContext) -> dict:
        return {
            "total_tasks": ctx.total_tasks,
            "done": ctx.total_done,
            "in_progress": ctx.total_in_progress,
            "todo": ctx.total_todo,
            "backlog": ctx.total_backlog,
            "review": ctx.total_review,
            "risk": ctx.total_risk,
            "overdue": ctx.total_overdue,
        }

    def _get_risks(self, ctx: WorkspaceContext) -> list[dict]:
        risky = [
            t for t in ctx.tasks
            if t.ai_risk_score > 0.7 or t.status == "blocked"
        ]
        return [t.model_dump() for t in risky[:5]]

    def _get_overdue_tasks(self, ctx: WorkspaceContext) -> list[dict]:
        overdue = [
            t for t in ctx.tasks
            if t.due_date and t.status != "done"
        ]
        return [t.model_dump() for t in overdue[:5]]

    def _get_sprint_data(self, ctx: WorkspaceContext) -> list[dict]:
        return [s.model_dump() for s in ctx.sprints]

    def _get_analyses(self, ctx: WorkspaceContext) -> list[dict]:
        return [a.model_dump() for a in ctx.analyses]

    def _get_tech_stack(self, ctx: WorkspaceContext) -> dict:
        if ctx.analyses:
            return ctx.analyses[0].tech_stack
        return {}

    def _get_overview(self, ctx: WorkspaceContext) -> dict:
        return {
            "projects": ctx.total_projects,
            "tasks": ctx.total_tasks,
            "completion": ctx.completion_rate,
            "stage": ctx.stage,
            "risk": ctx.total_risk,
            "overdue": ctx.total_overdue,
        }
