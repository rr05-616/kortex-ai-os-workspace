"""Recommendation Engine — Ranks work items and generates implementation plans."""

from __future__ import annotations

import structlog
from .schemas import WorkspaceContext, TaskScore, Recommendation

logger = structlog.get_logger(__name__)


class RecommendationEngine:
    """Ranks work items using a multi-factor scoring model.

    Scores tasks using: priority, dependency weight, business value,
    technical impact, risk, urgency, estimated effort, project health
    impact, sprint impact, blocker score.
    """

    # Weights for scoring factors
    WEIGHTS = {
        "priority": 0.25,
        "risk": 0.20,
        "urgency": 0.15,
        "dependency": 0.15,
        "effort": 0.10,
        "business_value": 0.10,
        "health_impact": 0.05,
    }

    def generate(self, context: WorkspaceContext) -> Recommendation:
        """Generate ranked recommendations from workspace context."""
        logger.info("recommendation_engine.generate")

        # Score all actionable tasks
        actionable = [
            t for t in context.tasks
            if t.status in ("todo", "backlog", "in_progress")
        ]

        scored_tasks = [self._score_task(t, context) for t in actionable]
        scored_tasks.sort(key=lambda s: s.total_score, reverse=True)

        # Build recommendation
        rec = Recommendation()
        if scored_tasks:
            rec.top_task = scored_tasks[0]
            rec.ranked_tasks = scored_tasks[:5]

            # Build implementation order
            rec.implementation_order = [
                f"{i+1}. {s.task_title} (score: {s.total_score:.1f})"
                for i, s in enumerate(scored_tasks[:5])
            ]

            # Estimate time
            total_hours = sum(
                context.tasks[i].estimated_hours or 4
                for i, _ in enumerate(scored_tasks[:5])
                if i < len(context.tasks)
            )
            rec.estimated_time = f"{total_hours:.0f} hours"

            # Dependencies
            rec.dependencies = self._find_dependencies(scored_tasks[0], context)

            # What this unlocks
            rec.unlocks = self._find_unlocked_tasks(scored_tasks[0], context)

            # Expected outcome
            rec.expected_outcome = self._predict_outcome(scored_tasks[0], context)

        logger.info(
            "recommendation_engine.done",
            scored=len(scored_tasks),
            top=rec.top_task.task_title if rec.top_task else "none",
        )
        return rec

    def _score_task(self, task, context: WorkspaceContext) -> TaskScore:
        """Score a single task using multi-factor model."""
        score = TaskScore(
            task_id=task.id,
            task_title=task.title,
        )

        # Priority score (0-100)
        score.priority_score = {
            "critical": 100,
            "high": 75,
            "medium": 50,
            "low": 25,
        }.get(task.priority, 50)

        # Risk score (0-100) — higher risk = higher priority
        score.risk_score = min(task.ai_risk_score * 100, 100)

        # Urgency score (0-100) — based on due date proximity
        if task.due_date:
            score.urgency_score = 80  # Has deadline = urgent
        else:
            score.urgency_score = 30

        # Dependency score (0-100) — tasks that block others score higher
        blocking_count = sum(
            1 for t in context.tasks
            if task.id in (t.dependencies or [])
        )
        score.dependency_score = min(blocking_count * 30, 100)

        # Effort score (0-100) — lower effort = higher score (quick wins)
        hours = task.estimated_hours or 4
        if hours <= 2:
            score.effort_score = 90
        elif hours <= 4:
            score.effort_score = 70
        elif hours <= 8:
            score.effort_score = 50
        else:
            score.effort_score = 30

        # Business value (0-100) — estimated from priority + status
        score.business_value = score.priority_score * 0.6 + score.risk_score * 0.4

        # Health impact (0-100) — how much completing this helps project health
        score.health_impact = 50  # Default moderate
        if task.priority in ("critical", "high"):
            score.health_impact = 80

        # Calculate total weighted score
        score.total_score = (
            score.priority_score * self.WEIGHTS["priority"]
            + score.risk_score * self.WEIGHTS["risk"]
            + score.urgency_score * self.WEIGHTS["urgency"]
            + score.dependency_score * self.WEIGHTS["dependency"]
            + score.effort_score * self.WEIGHTS["effort"]
            + score.business_value * self.WEIGHTS["business_value"]
            + score.health_impact * self.WEIGHTS["health_impact"]
        )

        # Build reasoning string
        score.reasoning = (
            f"Priority: {score.priority_score:.0f}, "
            f"Risk: {score.risk_score:.0f}, "
            f"Urgency: {score.urgency_score:.0f}, "
            f"Effort: {score.effort_score:.0f}"
        )

        return score

    def _find_dependencies(self, task: TaskScore, ctx: WorkspaceContext) -> list[str]:
        """Find tasks that must be completed before this one."""
        task_obj = next(
            (t for t in ctx.tasks if t.id == task.task_id), None
        )
        if task_obj and task_obj.dependencies:
            return task_obj.dependencies
        return []

    def _find_unlocked_tasks(self, task: TaskScore, ctx: WorkspaceContext) -> list[str]:
        """Find tasks that are blocked by this one."""
        unlocked = [
            t.title for t in ctx.tasks
            if task.task_id in (t.dependencies or [])
        ]
        return unlocked[:3]

    def _predict_outcome(self, task: TaskScore, ctx: WorkspaceContext) -> str:
        """Predict the outcome of completing this task."""
        if task.risk_score > 70:
            return f"Completing '{task.task_title}' will significantly reduce project risk."
        if task.dependency_score > 50:
            return f"Completing '{task.task_title}' will unblock other critical tasks."
        if task.priority_score >= 75:
            return f"Completing '{task.task_title}' will advance the project's highest-priority goal."
        return f"Completing '{task.task_title}' will improve project completion rate."
