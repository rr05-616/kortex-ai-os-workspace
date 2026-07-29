from __future__ import annotations
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware

def setup_cors(app, origins: Optional[list[str]] = None):
    app.add_middleware(CORSMiddleware, allow_origins=origins or ["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])
