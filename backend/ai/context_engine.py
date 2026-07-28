"""Context Engine — Automatically builds workspace context before every AI request."""

from __future__ import annotations

import structlog
from .schemas import (
    WorkspaceContext, ProjectData, TaskData, SprintData, AnalysisData,
)

logger = structlog.get_logger(__name__)


class ContextEngine:
    """Builds comprehensive workspace context from raw data sources.

    Never exposes raw database models — always returns WorkspaceContext.
    """

    def build(
        self,
        *,
        user_name: str = "User",
        project: dict | None = None,
        tasks: list[dict] | None = None,
        sprints: list[dict] | None = None,
        analyses: list[dict] | None = None,
    ) -> WorkspaceContext:
        """Construct a WorkspaceContext from raw dictionaries."""
        logger.info("context_engine.build", user_name=user_name)

        ctx = WorkspaceContext(user_name=user_name)

        # ── Project ──
        if project:
            ctx.project = ProjectData(**{
                k: v for k, v in project.items()
                if k in ProjectData.model_fields
            })
            ctx.total_projects = 1
            ctx.active_projects = 1 if project.get("status") == "active" else 0

        # ── Tasks ──
        raw_tasks = tasks or []
        ctx.tasks = [
            TaskData(**{k: v for k, v in t.items() if k in TaskData.model_fields})
            for t in raw_tasks
        ]
        ctx.total_tasks = len(ctx.tasks)
        ctx.total_done = sum(1 for t in ctx.tasks if t.status == "done")
        ctx.total_in_progress = sum(1 for t in ctx.tasks if t.status == "in_progress")
        ctx.total_todo = sum(1 for t in ctx.tasks if t.status == "todo")
        ctx.total_backlog = sum(1 for t in ctx.tasks if t.status == "backlog")
        ctx.total_review = sum(1 for t in ctx.tasks if t.status == "in_review")
        ctx.total_risk = sum(1 for t in ctx.tasks if t.ai_risk_score > 0.7)
        ctx.total_overdue = sum(
            1 for t in ctx.tasks
            if t.due_date and t.status != "done"  # simplified overdue check
        )
        ctx.completion_rate = (
            round(ctx.total_done / ctx.total_tasks * 100)
            if ctx.total_tasks > 0 else 0
        )

        # ── Stage ──
        ctx.stage = self._compute_stage(ctx.completion_rate, ctx.total_tasks)

        # ── Sprints ──
        raw_sprints = sprints or []
        ctx.sprints = [
            SprintData(**{k: v for k, v in s.items() if k in SprintData.model_fields})
            for s in raw_sprints
        ]
        ctx.active_sprint = next(
            (s for s in ctx.sprints if s.status == "active"), None
        )

        # ── Analyses ──
        raw_analyses = analyses or []
        ctx.analyses = [
            AnalysisData(**{k: v for k, v in a.items() if k in AnalysisData.model_fields})
            for a in raw_analyses
        ]

        logger.info(
            "context_engine.built",
            tasks=ctx.total_tasks,
            completion=ctx.completion_rate,
            stage=ctx.stage,
        )
        return ctx

    @staticmethod
    def _compute_stage(completion_rate: int, total_tasks: int) -> str:
        if total_tasks == 0:
            return "Planning"
        if completion_rate >= 90:
            return "Wrapping Up"
        if completion_rate >= 70:
            return "Execution"
        if completion_rate >= 40:
            return "Active Development"
        if completion_rate >= 15:
            return "Early Stage"
        return "Kickoff"
