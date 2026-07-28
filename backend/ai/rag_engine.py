"""RAG Engine — Retrieval Augmented Generation for workspace context."""
from __future__ import annotations
import structlog
from .schemas import WorkspaceContext

log = structlog.get_logger(__name__)

class RAGEngine:
    """Searches workspace context and retrieves relevant information before LLM generation."""

    def retrieve(self, query: str, ctx: WorkspaceContext, top_k: int = 5) -> dict:
        log.info("rag.retrieve", query=query[:80])
        results = []
        query_lower = query.lower()
        for task in ctx.tasks:
            score = 0.0
            if any(w in task.title.lower() for w in query_lower.split()):
                score += 0.8
            if task.ai_risk_score > 0.7:
                score += 0.2
            if score > 0:
                results.append({"type": "task", "title": task.title, "status": task.status, "score": score})
        for sprint in ctx.sprints:
            if any(w in sprint.name.lower() for w in query_lower.split()):
                results.append({"type": "sprint", "name": sprint.name, "status": sprint.status, "score": 0.5})
        results.sort(key=lambda r: r["score"], reverse=True)
        return {"query": query, "results": results[:top_k], "total_matches": len(results)}

    def index_workspace(self, ctx: WorkspaceContext) -> dict:
        log.info("rag.index", tasks=ctx.total_tasks)
        return {"indexed": ctx.total_tasks, "sprints": len(ctx.sprints), "analyses": len(ctx.analyses)}
