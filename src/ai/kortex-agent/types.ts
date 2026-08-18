/**
 * KORTEX AI Agent — Core Types
 *
 * All types for the intelligent workspace agent that understands
 * projects, tasks, sprints, and can take actions.
 */

// ─── USER & SESSION ──────────────────────────────────────────────────────────

export interface KortexUser {
  _id: string;
  name?: string;
  email?: string;
}

export interface KortexSession {
  userId: string;
  userName?: string;
  currentProjectId?: string;
  currentProjectName?: string;
  currentRoute?: string;
  currentPage?: "dashboard" | "projects" | "sprints" | "analytics" | "settings";
}

// ─── WORKSPACE DATA ──────────────────────────────────────────────────────────

export interface ProjectData {
  _id: string;
  name: string;
  description?: string;
  status: string;
  ownerId: string;
  members: string[];
  priority: string;
  startDate?: number;
  endDate?: number;
  healthScore?: number;
  sprintDuration?: number;
  aiSummary?: string;
  aiTags?: string[];
}

export interface TaskData {
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  projectId: string;
  assigneeId?: string;
  createdById: string;
  parentTaskId?: string;
  dueDate?: number;
  estimatedHours?: number;
  actualHours?: number;
  order: number;
  tags?: string[];
  aiGenerated?: boolean;
  aiRiskScore?: number;
}

export interface SprintData {
  _id: string;
  projectId: string;
  name: string;
  goal?: string;
  startDate: number;
  endDate: number;
  status: "planning" | "active" | "completed";
  taskCount?: number;
  completedTasks?: number;
}

export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  backlogTasks: number;
  completionRate: number;
  highRiskTasks: number;
  overdueTasks: number;
}

export interface AnalysisData {
  url: string;
  name: string;
  type: string;
  score: number;
  stage: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  techStack: {
    frontend: string[];
    backend: string[];
    database: string[];
    cloud: string[];
    ai: string[];
  };
  architecture: string;
}

export interface WorkspaceContext {
  userName: string;
  projectName?: string;
  projectDescription?: string;
  projectStatus?: string;
  healthScore?: number;
  stage: string;
  tasks: TaskData[];
  totalTasks: number;
  totalDone: number;
  totalInProgress: number;
  totalTodo: number;
  totalBacklog: number;
  totalReview: number;
  totalRisk: number;
  totalOverdue: number;
  completionRate: number;
  totalProjects: number;
  activeProjects: number;
  sprints: SprintData[];
  activeSprint?: { name: string; goal?: string; taskCount: number; completedTasks: number };
  analyses: AnalysisData[];
}

// ─── INTENT SYSTEM ───────────────────────────────────────────────────────────

export type Intent =
  | "greeting"
  | "identity"
  | "help"
  | "progress"
  | "risk"
  | "suggest"
  | "sprint"
  | "task_create"
  | "task_update"
  | "task_assign"
  | "task_list"
  | "team"
  | "analytics"
  | "architecture"
  | "navigate"
  | "search"
  | "explain"
  | "create"
  | "review"
  | "thanks"
  | "farewell"
  | "general";

// ─── AGENT RESPONSES ─────────────────────────────────────────────────────────

export type AgentResponse =
  | AgentAnswerResponse
  | AgentNavigationResponse
  | AgentActionResponse
  | AgentConfirmationResponse;

export interface AgentAnswerResponse {
  type: "answer";
  message: string;
  steps?: AgentStep[];
}

export interface AgentNavigationResponse {
  type: "navigation";
  message: string;
  route: string;
  routeLabel: string;
  steps?: AgentStep[];
}

export interface AgentActionResponse {
  type: "action";
  message: string;
  action: "create_task" | "update_task" | "assign_task" | "create_sprint";
  data: Record<string, unknown>;
  requiresConfirmation?: boolean;
  steps?: AgentStep[];
}

export interface AgentConfirmationResponse {
  type: "confirmation";
  message: string;
  pendingAction: "create_task" | "update_task" | "assign_task" | "create_sprint";
  pendingData: Record<string, unknown>;
}

// ─── AGENT STEPS ─────────────────────────────────────────────────────────────

export type AgentStepType = "searching" | "reading" | "analyzing" | "tool_call" | "generating";

export interface AgentStep {
  type: AgentStepType;
  label: string;
  detail?: string;
}

// ─── TOOLS ───────────────────────────────────────────────────────────────────

export type ToolName =
  | "getProjects"
  | "getProject"
  | "getProjectStats"
  | "getTasks"
  | "getMyTasks"
  | "getTask"
  | "getSprints"
  | "getActiveSprint"
  | "getAnalyses"
  | "getNotifications"
  | "searchWorkspace"
  | "createTask"
  | "updateTask"
  | "createSprint"
  | "navigateTo";

export interface ToolDefinition {
  name: ToolName;
  description: string;
  parameters: string;
}

// ─── CONVERSATION MEMORY ─────────────────────────────────────────────────────

export interface ConversationMemory {
  recentTopics: string[];
  discussedProjects: string[];
  discussedTasks: string[];
  discussedSprints: string[];
  lastAction?: string;
  lastRecommendation?: string;
  currentGoal?: string;
  entityReferences: Record<string, string>; // "this project" → project ID
}
