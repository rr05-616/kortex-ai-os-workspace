"""Execution Engine — Performs actions within the workspace."""
from __future__ import annotations
import structlog
from .schemas import WorkspaceContext, ToolCall

log = structlog.get_logger(__name__)

class ExecutionEngine:
    """Executes workspace actions: create tasks, move tasks, generate docs, etc."""

    def execute(self, action: str, context: WorkspaceContext, params: dict = None) -> dict:
        params = params or {}
        log.info("execution.start", action=action)
        handlers = {
            "create_task": self._create_task,
            "update_task": self._update_task,
            "generate_docs": self._generate_docs,
            "update_sprint": self._update_sprint,
            "summarize_project": self._summarize_project,
        }
        handler = handlers.get(action, self._unknown_action)
        result = handler(context, params)
        log.info("execution.done", action=action, success=result.get("success", False))
        return result

    def _create_task(self, ctx: WorkspaceContext, params: dict) -> dict:
        title = params.get("title", "Untitled Task")
        return {"success": True, "action": "create_task", "task": {"title": title, "status": "todo", "priority": params.get("priority", "medium")}, "message": f"Task '{title}' created"}

    def _update_task(self, ctx: WorkspaceContext, params: dict) -> dict:
        return {"success": True, "action": "update_task", "message": f"Task updated: {params}"}

    def _generate_docs(self, ctx: WorkspaceContext, params: dict) -> dict:
        doc_type = params.get("type", "summary")
        return {"success": True, "action": "generate_docs", "doc_type": doc_type, "message": f"Documentation generated: {doc_type}"}

    def _update_sprint(self, ctx: WorkspaceContext, params: dict) -> dict:
        return {"success": True, "action": "update_sprint", "message": f"Sprint updated: {params}"}

    def _summarize_project(self, ctx: WorkspaceContext, params: dict) -> dict:
        return {"success": True, "action": "summarize_project", "summary": {"stage": ctx.stage, "completion": ctx.completion_rate, "total_tasks": ctx.total_tasks, "completed": ctx.total_done}}

    def _unknown_action(self, ctx: WorkspaceContext, params: dict) -> dict:
        return {"success": False, "error": f"Unknown action: {params.get('action', 'none')}"}
