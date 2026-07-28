"""Knowledge Graph — Maps relationships between tasks, sprints, and code."""
from __future__ import annotations
import structlog
from .schemas import WorkspaceContext

log = structlog.get_logger(__name__)

class KnowledgeGraph:
    def __init__(self):
        self._nodes: dict[str, dict] = {}
        self._edges: list[dict] = []

    def build_from_context(self, ctx: WorkspaceContext) -> dict:
        log.info("kg.build", tasks=ctx.total_tasks)
        for task in ctx.tasks:
            self._nodes[task.title] = {"type": "task", "status": task.status, "priority": task.priority, "risk": task.ai_risk_score}
        for sprint in ctx.sprints:
            self._nodes[sprint.name] = {"type": "sprint", "status": sprint.status}
        for task in ctx.tasks:
            for dep in task.dependencies:
                self._edges.append({"source": dep, "target": task.title, "type": "depends_on"})
        return {"nodes": len(self._nodes), "edges": len(self._edges), "graph": self._to_dict()}

    def query(self, node_type: str = None) -> list[dict]:
        if node_type:
            return [v for k, v in self._nodes.items() if v.get("type") == node_type]
        return [{"name": k, **v} for k, v in self._nodes.items()]

    def _to_dict(self) -> dict:
        return {"nodes": [{"id": k, **v} for k, v in self._nodes.items()], "edges": self._edges}
