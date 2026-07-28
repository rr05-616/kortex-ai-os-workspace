"""Embedding Service — Generates embeddings for text using sentence-transformers or API."""
from __future__ import annotations
import structlog
from typing import Optional

log = structlog.get_logger(__name__)

class EmbeddingService:
    """Generates vector embeddings for workspace content."""

    def __init__(self):
        self._model = None

    def _get_model(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer("all-MiniLM-L6-v2")
                log.info("embedding.model_loaded")
            except ImportError:
                log.warning("embedding.no_model", hint="Install sentence-transformers for local embeddings")
        return self._model

    def embed(self, text: str) -> Optional[list[float]]:
        model = self._get_model()
        if model:
            import numpy as np
            embedding = model.encode(text)
            return embedding.tolist()
        return None

    def embed_batch(self, texts: list[str]) -> Optional[list[list[float]]]:
        model = self._get_model()
        if model:
            import numpy as np
            embeddings = model.encode(texts)
            return embeddings.tolist()
        return None
