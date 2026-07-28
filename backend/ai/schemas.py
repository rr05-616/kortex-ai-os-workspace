"""Pydantic models for the KORTEX AI Agent Framework."""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime


# ─── Enums ────────────────────────────────────────────────────────────────────

class IntentType(str, Enum):
    TASK_RECOMMENDATION = "task_recommendation"
    PROJECT_STATUS = "project_status"
    PROJECT_HEALTH = "project_health"
    RISK_ANALYSIS = "risk_analysis"
    HOW_TO = "how_to"
    IMPLEMENTATION_GUIDE = "implementation_guide"
    TASK_BREAKDOWN = "task_breakdown"
    SPRINT_PLANNING = "sprint_planning"
    ROADMAP = "roadmap"
    ARCHITECTURE_REVIEW = "architecture_review"
    CODE_REVIEW = "code_review"
    PERFORMANCE = "performance"
    SECURITY = "security"
    GENERAL_AI = "general_ai"
    FOLLOW_UP = "follow_up"
    THANK_YOU = "thank_you"
    GREETING = "greeting"
    SMALL_TALK = "small_talk"
    EXECUTE_ACTION = "execute_action"
    SEARCH = "search"
    DOCUMENTATION = "documentation"
    UNKNOWN = "unknown"


class TaskStatus(str, Enum):
    BACKLOG = "backlog"
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    DONE = "done"
    CANCELLED = "cancelled"
    BLOCKED = "blocked"


class TaskPriority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# ─── Core Data Models ─────────────────────────────────────────────────────────

class TaskData(BaseModel):
    id: str = ""
    title: str
    status: str = "todo"
    priority: str = "medium"
    description: str = ""
    ai_risk_score: float = 0.0
    due_date: Optional[str] = None
    estimated_hours: Optional[float] = None
    tags: list[str] = []
    subtasks: list[dict] = []
    dependencies: list[str] = []


class SprintData(BaseModel):
    id: str = ""
    name: str
    status: str = "planning"
    goal: str = ""
    task_count: int = 0
    completed_tasks: int = 0
    start_date: str = ""
    end_date: str = ""


class AnalysisData(BaseModel):
    url: str = ""
    name: str = "Repository"
    type: str = "unknown"
    score: float = 0
    stage: str = "Unknown"
    summary: str = ""
    strengths: list[str] = []
    weaknesses: list[str] = []
    tech_stack: dict[str, list[str]] = {
        "frontend": [], "backend": [], "database": [], "cloud": [], "ai": []
    }
    architecture: str = "Not analyzed"
    components: list[str] = []
    routes: list[str] = []
    dependencies: list[str] = []


class ProjectData(BaseModel):
    id: str = ""
    name: str = ""
    description: str = ""
    status: str = "planning"
    health_score: float = 85.0
    sprint_duration: int = 14
    owner_id: str = ""


# ─── Workspace Context ────────────────────────────────────────────────────────

class WorkspaceContext(BaseModel):
    user_name: str = "User"
    project: Optional[ProjectData] = None
    tasks: list[TaskData] = []
    total_tasks: int = 0
    total_done: int = 0
    total_in_progress: int = 0
    total_todo: int = 0
    total_backlog: int = 0
    total_review: int = 0
    total_risk: int = 0
    total_overdue: int = 0
    completion_rate: float = 0
    total_projects: int = 0
    active_projects: int = 0
    sprints: list[SprintData] = []
    active_sprint: Optional[SprintData] = None
    analyses: list[AnalysisData] = []
    stage: str = "Planning"
    recent_activity: list[str] = []


# ─── Intent Classification ────────────────────────────────────────────────────

class IntentResult(BaseModel):
    intent: IntentType = IntentType.UNKNOWN
    confidence: float = 0.0
    entities: dict[str, str] = {}
    follow_up_reference: Optional[str] = None
    raw_message: str = ""


# ─── Tool Execution ───────────────────────────────────────────────────────────

class ToolCall(BaseModel):
    tool_name: str
    arguments: dict = {}
    result: Optional[str] = None


class ToolResult(BaseModel):
    tool_name: str
    success: bool = True
    data: dict = {}
    error: Optional[str] = None


# ─── Reasoning ────────────────────────────────────────────────────────────────

class AnalysisResult(BaseModel):
    observations: list[str] = []
    risks: list[str] = []
    opportunities: list[str] = []
    recommendations: list[str] = []
    priority_ranking: list[str] = []
    next_actions: list[str] = []
    confidence: float = 0.0


# ─── Recommendations ──────────────────────────────────────────────────────────

class TaskScore(BaseModel):
    task_id: str
    task_title: str
    total_score: float = 0.0
    priority_score: float = 0.0
    dependency_score: float = 0.0
    risk_score: float = 0.0
    effort_score: float = 0.0
    urgency_score: float = 0.0
    business_value: float = 0.0
    health_impact: float = 0.0
    reasoning: str = ""


class Recommendation(BaseModel):
    top_task: Optional[TaskScore] = None
    ranked_tasks: list[TaskScore] = []
    implementation_order: list[str] = []
    estimated_time: str = ""
    dependencies: list[str] = []
    unlocks: list[str] = []
    expected_outcome: str = ""


# ─── Response ─────────────────────────────────────────────────────────────────

class AgentResponse(BaseModel):
    observation: str = ""
    analysis: str = ""
    recommendation: str = ""
    reason: str = ""
    implementation_steps: list[str] = []
    estimated_effort: str = ""
    next_action: str = ""
    raw_response: str = ""
    metadata: dict = {}


# ─── API Request/Response ─────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    project_id: Optional[str] = None
    conversation_id: Optional[str] = None
    conversation_history: list[dict[str, str]] = []


class ChatResponse(BaseModel):
    response: str
    intent: str = ""
    confidence: float = 0.0
    conversation_id: str = ""
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    metadata: dict = {}


class HealthResponse(BaseModel):
    status: str = "healthy"
    version: str = "1.0.0"
    modules: dict[str, str] = {}
