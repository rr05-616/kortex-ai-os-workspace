/**
 * KORTEX AI Agent — Context Builder
 *
 * Builds the workspace context that the agent uses to understand
 * the current state of projects, tasks, sprints, and analysis data.
 */

import type {
  WorkspaceContext,
  ProjectData,
  TaskData,
  SprintData,
  AnalysisData,
} from "./types";

// ─── STAGE CALCULATOR ────────────────────────────────────────────────────────

export function calculateStage(completionRate: number, totalTasks: number): string {
  if (completionRate >= 90) return "Wrapping Up";
  if (completionRate >= 70) return "Execution";
  if (completionRate >= 40) return "Active Development";
  if (completionRate >= 15) return "Early Stage";
  if (totalTasks > 0) return "Kickoff";
  return "Planning";
}

// ─── BUILD CONTEXT FROM CONVEX DATA ──────────────────────────────────────────

export interface RawContextData {
  userName?: string;
  projectName?: string;
  projectDescription?: string;
  projectStatus?: string;
  healthScore?: number;
  sprintDuration?: number;
  tasks: Array<{
    title: string;
    status: string;
    priority: string;
    description?: string;
    aiRiskScore?: number;
    dueDate?: number;
    estimatedHours?: number;
    tags?: string[];
    assigneeId?: string;
    subtasks?: Array<{ title: string; completed: boolean }>;
  }>;
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
  sprints: Array<{
    name: string;
    status: string;
    goal?: string;
    taskCount: number;
    completedTasks: number;
    startDate: number;
    endDate: number;
  }>;
  activeSprint?: { name: string; goal?: string; taskCount: number; completedTasks: number };
  analyses: Array<{
    url: string;
    name: string;
    type: string;
    score: number;
    stage: string;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    techStack: { frontend: string[]; backend: string[]; database: string[]; cloud: string[]; ai: string[] };
    architecture: string;
  }>;
}

export function buildWorkspaceContext(raw: RawContextData): WorkspaceContext {
  const stage = calculateStage(raw.completionRate, raw.totalTasks);

  const tasks: TaskData[] = raw.tasks.map((t, i) => ({
    _id: `task-${i}`,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    projectId: "current",
    createdById: "current",
    order: i,
    tags: t.tags,
    aiRiskScore: t.aiRiskScore,
    dueDate: t.dueDate,
    estimatedHours: t.estimatedHours,
    assigneeId: t.assigneeId,
  }));

  const sprints: SprintData[] = raw.sprints.map((s, i) => ({
    _id: `sprint-${i}`,
    projectId: "current",
    name: s.name,
    goal: s.goal,
    startDate: s.startDate,
    endDate: s.endDate,
    status: s.status as "planning" | "active" | "completed",
    taskCount: s.taskCount,
    completedTasks: s.completedTasks,
  }));

  const analyses: AnalysisData[] = raw.analyses.map((a) => ({
    url: a.url,
    name: a.name,
    type: a.type,
    score: a.score,
    stage: a.stage,
    summary: a.summary,
    strengths: a.strengths,
    weaknesses: a.weaknesses,
    techStack: a.techStack,
    architecture: a.architecture,
  }));

  return {
    userName: raw.userName ?? "User",
    projectName: raw.projectName,
    projectDescription: raw.projectDescription,
    projectStatus: raw.projectStatus,
    healthScore: raw.healthScore,
    stage,
    tasks,
    totalTasks: raw.totalTasks,
    totalDone: raw.totalDone,
    totalInProgress: raw.totalInProgress,
    totalTodo: raw.totalTodo,
    totalBacklog: raw.totalBacklog,
    totalReview: raw.totalReview,
    totalRisk: raw.totalRisk,
    totalOverdue: raw.totalOverdue,
    completionRate: raw.completionRate,
    totalProjects: raw.totalProjects,
    activeProjects: raw.activeProjects,
    sprints,
    activeSprint: raw.activeSprint,
    analyses,
  };
}
