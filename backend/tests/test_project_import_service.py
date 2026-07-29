from backend.services.project_import_service import ProjectImportService


def test_parse_github_repo_url():
    service = ProjectImportService()

    assert service.parse_repo_url("https://github.com/octo/repo") == ("octo", "repo")
    assert service.parse_repo_url("https://github.com/octo/repo/tree/main") == ("octo", "repo")


def test_build_analysis_from_metadata():
    service = ProjectImportService()
    metadata = {
        "name": "kortex-ai",
        "description": "AI operating system",
        "language": "Python",
        "private": False,
        "html_url": "https://github.com/octo/kortex-ai",
    }

    analysis = service.build_analysis_from_metadata(metadata, ["main.py", "requirements.txt"], ["backend", "src"])

    assert analysis["project_summary"].startswith("AI operating system")
    assert analysis["framework"] == "FastAPI"
    assert analysis["architecture"] == "Full-stack application"
    assert analysis["risk_analysis"][0]["severity"] == "medium"
