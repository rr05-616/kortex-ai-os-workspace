"""Planner Engine — Generates roadmaps, sprint plans, milestones, subtasks."""
from __future__ import annotations
import structlog
from .schemas import WorkspaceContext, IntentType

log = structlog.get_logger(__name__)

class PlannerEngine:
    """Generates development plans, sprint plans, and roadmaps from workspace context."""

    def generate_sprint_plan(self, ctx: WorkspaceContext, tasks: list[dict]) -> dict:
        log.info("planner.sprint_plan", tasks=len(tasks))
        backlog = [t for t in tasks if t.get("status") in ("backlog", "todo")]
        backlog.sort(key=lambda t: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(t.get("priority", "low"), 4))
        selected = backlog[:10]
        estimated_hours = sum(t.get("estimated_hours", 4) for t in selected)
        return {
            "plan_type": "sprint",
            "tasks": [t.get("title", "Untitled") for t in selected],
            "task_count": len(selected),
            "estimated_hours": estimated_hours,
            "sprint_name": ctx.active_sprint.name if ctx.active_sprint else "New Sprint",
            "goal": self._derive_goal(ctx, selected),
            "risks": [t["title"] for t in selected if t.get("ai_risk_score", 0) > 0.7],
        }

    def generate_roadmap(self, ctx: WorkspaceContext) -> dict:
        log.info("planner.roadmap", stage=ctx.stage)
        phases = []
        if ctx.completion_rate < 20:
            phases.append({"phase": "Foundation", "focus": "Core architecture and critical path"})
        if ctx.completion_rate < 50:
            phases.append({"phase": "Development", "focus": "Feature implementation"})
        if ctx.completion_rate < 80:
            phases.append({"phase": "Polish", "focus": "Testing, optimization, edge cases"})
        phases.append({"phase": "Release", "focus": "Deployment and monitoring"})
        return {
            "plan_type": "roadmap",
            "current_stage": ctx.stage,
            "completion": ctx.completion_rate,
            "phases": phases,
            "total_tasks": ctx.total_tasks,
            "completed_tasks": ctx.total_done,
        }

    def break_down_task(self, task_title: str, context: str = "") -> dict:
        log.info("planner.break_down", task=task_title)
        subtasks = [
            {"title": f"Analyze requirements for {task_title}", "priority": "high"},
            {"title": f"Design implementation approach", "priority": "high"},
            {"title": f"Implement {task_title}", "priority": "critical"},
            {"title": f"Write tests for {task_title}", "priority": "medium"},
            {"title": f"Review and integrate {task_title}", "priority": "medium"},
        ]
        return {"parent": task_title, "subtasks": subtasks, "estimated_hours": len(subtasks) * 2}

    def _derive_goal(self, ctx: WorkspaceContext, tasks: list[dict]) -> str:
        priorities = [t.get("priority", "medium") for t in tasks]
        if "critical" in priorities:
            return "Address critical blockers and core functionality"
        if "high" in priorities:
            return "Advance high-priority features"
        return f"Make progress on {ctx.stage.lower()} stage objectives"
