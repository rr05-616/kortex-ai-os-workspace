"""Vector Search — Search embeddings in ChromaDB."""
from __future__ import annotations
import structlog
from typing import Optional

log = structlog.get_logger(__name__)

class VectorSearch:
    """Search over workspace embeddings using ChromaDB."""

    def __init__(self, collection=None):
        self._collection = collection

    def search(self, query_embedding: list[float], top_k: int = 5) -> dict:
        if not self._collection:
            return {"results": [], "error": "No collection available"}
        try:
            results = self._collection.query(query_embeddings=[query_embedding], n_results=top_k)
            return {"results": results}
        except Exception as e:
            return {"results": [], "error": str(e)}

    def add(self, document_id: str, embedding: list[float], metadata: dict = None, document: str = ""):
        if not self._collection:
            return False
        try:
            self._collection.add(ids=[document_id], embeddings=[embedding], metadatas=[metadata or {}], documents=[document])
            return True
        except Exception:
            return False

    def count(self) -> int:
        if not self._collection:
            return 0
        return self._collection.count()
