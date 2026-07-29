from __future__ import annotations

import re
from typing import Any


class ProjectImportService:
    """Service for analyzing repository imports and producing structured summaries."""

    def parse_repo_url(self, repo_url: str) -> tuple[str, str]:
        cleaned = repo_url.strip().rstrip("/")
        match = re.search(r"github\.com[:/]+([^/]+)/([^/]+)", cleaned)
        if not match:
            raise ValueError("Unsupported repository URL")
        return match.group(1), match.group(2)

    def build_analysis_from_metadata(
        self,
        metadata: dict[str, Any],
        files: list[str] | None = None,
        folders: list[str] | None = None,
    ) -> dict[str, Any]:
        files = files or []
        folders = folders or []
        framework = self._infer_framework(files)
        architecture = self._infer_architecture(framework, folders)
        description = (metadata.get("description") or "Repository import").strip()
        project_summary = f"{description} — analyzed via KORTEX AI import pipeline."
        dependency_summary = self._infer_dependencies(files)
        docs = self._collect_documentation(files)

        return {
            "project_summary": project_summary,
            "architecture_summary": architecture,
            "framework": framework,
            "architecture": architecture,
            "dependencies": dependency_summary,
            "readme": docs,
            "folder_structure": folders,
            "risk_analysis": [
                {
                    "type": "dependency_gap",
                    "severity": "medium",
                    "message": "Review environment configuration and deployment readiness before launch.",
                }
            ],
            "documentation": {
                "summary": docs,
                "generated_at": "now",
            },
        }

    def _infer_framework(self, files: list[str]) -> str:
        normalized = {f.lower() for f in files}
        if any(name.endswith(".py") for name in normalized):
            if any(name in normalized for name in {"requirements.txt", "pyproject.toml", "setup.py"}):
                return "FastAPI"
            return "Python"
        if any(name.endswith((".ts", ".tsx", ".js", ".jsx")) for name in normalized):
            return "React"
        return "Unknown"

    def _infer_architecture(self, framework: str, folders: list[str]) -> str:
        if framework == "FastAPI" and any(folder.lower() in {"backend", "api", "src"} for folder in folders):
            return "Full-stack application"
        if folders:
            return "Modular service architecture"
        return "Standard application"

    def _infer_dependencies(self, files: list[str]) -> list[str]:
        dependencies: list[str] = []
        normalized = {f.lower() for f in files}
        if "requirements.txt" in normalized:
            dependencies.append("Python dependencies")
        if "package.json" in normalized:
            dependencies.append("Node.js dependencies")
        if "dockerfile" in normalized:
            dependencies.append("Docker")
        return dependencies

    def _collect_documentation(self, files: list[str]) -> str:
        normalized = {f.lower() for f in files}
        has_readme = any(name in normalized for name in {"readme.md", "readme.rst", "readme.txt"})
        if has_readme:
            return "Repository documentation detected."
        return "No repository documentation was found; a summary was generated from repository metadata."
