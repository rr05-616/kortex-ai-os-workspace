/**
 * KORTEX AI Agent — Tool Registry
 *
 * Tools the agent can use to interact with the workspace.
 * Each tool maps to real Convex data access patterns.
 */

import type {
  WorkspaceContext,
  ProjectData,
  TaskData,
  SprintData,
  ProjectStats,
  ToolDefinition,
  Intent,
} from "./types";

// ─── TOOL DEFINITIONS (for system prompt) ────────────────────────────────────

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "getProjects",
    description: "Get all projects for the current user",
    parameters: "none",
  },
  {
    name: "getProject",
    description: "Get a specific project by ID",
    parameters: "projectId: string",
  },
  {
    name: "getProjectStats",
    description: "Get statistics for a specific project (task counts, completion rate, etc.)",
    parameters: "projectId: string",
  },
  {
    name: "getTasks",
    description: "Get all tasks for a project, optionally filtered by status or assignee",
    parameters: "projectId: string, status?: string, assigneeId?: string",
  },
  {
    name: "getMyTasks",
    description: "Get all tasks assigned to the current user across all projects",
    parameters: "none",
  },
  {
    name: "getTask",
    description: "Get a specific task by ID",
    parameters: "taskId: string",
  },
  {
    name: "getSprints",
    description: "Get all sprints for a project",
    parameters: "projectId: string",
  },
  {
    name: "getActiveSprint",
    description: "Get the currently active sprint for a project",
    parameters: "projectId: string",
  },
  {
    name: "searchWorkspace",
    description: "Search across projects, tasks, and sprints for a query",
    parameters: "query: string",
  },
  {
    name: "createTask",
    description: "Create a new task in a project",
    parameters: "title: string, projectId: string, priority?: string, status?: string, description?: string, assigneeId?: string",
  },
  {
    name: "updateTask",
    description: "Update a task's status, priority, or other fields",
    parameters: "taskId: string, status?: string, priority?: string, title?: string",
  },
  {
    name: "createSprint",
    description: "Create a new sprint for a project",
    parameters: "name: string, projectId: string, startDate: number, endDate: number, goal?: string",
  },
  {
    name: "navigateTo",
    description: "Navigate to a page in the application",
    parameters: "destination: 'dashboard' | 'projects' | 'sprints' | 'analytics' | 'settings'",
  },
];

// ─── TOOL SELECTOR ───────────────────────────────────────────────────────────

export function selectToolsForIntent(intent: Intent): string[] {
  const toolMap: Record<Intent, string[]> = {
    greeting: [],
    identity: [],
    help: ["getProjects", "getTasks", "getMyTasks", "getSprints"],
    progress: ["getProjects", "getProjectStats", "getTasks", "getSprints"],
    risk: ["getTasks", "getProjectStats", "getProjects"],
    suggest: ["getTasks", "getProjectStats", "getSprints", "getProjects"],
    sprint: ["getSprints", "getTasks", "getProjectStats"],
    task_create: ["createTask", "getProjects", "getTasks"],
    task_update: ["updateTask", "getTasks", "getTask"],
    task_assign: ["updateTask", "getTasks", "getMyTasks"],
    task_list: ["getTasks", "getMyTasks"],
    team: ["getTasks", "getMyTasks", "getProjects"],
    analytics: ["getProjects", "getTasks", "getProjectStats", "getSprints"],
    architecture: ["getProject", "getAnalyses"],
    navigate: ["navigateTo"],
    search: ["searchWorkspace"],
    explain: ["getTasks", "getProjects", "getSprints"],
    create: ["createTask", "getProjects"],
    review: ["getTasks", "getProjectStats", "getSprints", "getAnalyses"],
    thanks: [],
    farewell: [],
    general: ["getProjects", "getTasks", "getMyTasks"],
  };
  return toolMap[intent] ?? toolMap.general;
}

// ─── WORKSPACE SEARCH ────────────────────────────────────────────────────────

export interface SearchResult {
  type: "project" | "task" | "sprint";
  id: string;
  title: string;
  relevance: number;
  metadata: Record<string, unknown>;
}

export function searchWorkspace(ctx: WorkspaceContext, query: string): SearchResult[] {
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  // Search projects
  for (const project of ctx.tasks.length > 0 ? [] : []) {
    // projects are not in tasks, handled by ctx directly
  }

  // Search tasks by title, description, tags
  for (const task of ctx.tasks) {
    let score = 0;
    if (task.title.toLowerCase().includes(q)) score += 10;
    if (task.description?.toLowerCase().includes(q)) score += 5;
    if (task.tags?.some((t) => t.toLowerCase().includes(q))) score += 3;

    if (score > 0) {
      results.push({
        type: "task",
        id: task._id,
        title: task.title,
        relevance: score,
        metadata: {
          status: task.status,
          priority: task.priority,
          projectId: task.projectId,
          dueDate: task.dueDate,
          aiRiskScore: task.aiRiskScore,
        },
      });
    }
  }

  // Search sprints
  for (const sprint of ctx.sprints) {
    let score = 0;
    if (sprint.name.toLowerCase().includes(q)) score += 8;
    if (sprint.goal?.toLowerCase().includes(q)) score += 4;

    if (score > 0) {
      results.push({
        type: "sprint",
        id: sprint._id,
        title: sprint.name,
        relevance: score,
        metadata: {
          status: sprint.status,
          taskCount: sprint.taskCount,
          completedTasks: sprint.completedTasks,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
        },
      });
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance);
}

// ─── ENTITY REFERENCE RESOLVER ───────────────────────────────────────────────

export function resolveEntityReference(
  ref: string,
  ctx: WorkspaceContext
): { type: string; id: string; name: string } | null {
  const lower = ref.toLowerCase();

  // "this project" / "current project"
  if (lower.includes("project") && ctx.projectName) {
    return { type: "project", id: ctx.projectName, name: ctx.projectName };
  }

  // Try to find a task by fuzzy match
  for (const task of ctx.tasks) {
    if (task.title.toLowerCase().includes(lower) || lower.includes(task.title.toLowerCase().slice(0, 10))) {
      return { type: "task", id: task._id, name: task.title };
    }
  }

  // Try sprint
  for (const sprint of ctx.sprints) {
    if (sprint.name.toLowerCase().includes(lower)) {
      return { type: "sprint", id: sprint._id, name: sprint.name };
    }
  }

  return null;
}
