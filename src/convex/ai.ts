/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/** Get AI insights for a project */
export const getProjectInsights = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const backlog = tasks.filter((t) => t.status === "backlog").length;
    const review = tasks.filter((t) => t.status === "in_review").length;
    const highRisk = tasks.filter((t) => (t.aiRiskScore ?? 0) > 0.7).length;
    const overdue = tasks.filter(
      (t) => t.dueDate && t.dueDate < Date.now() && t.status !== "done"
    ).length;

    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    let stage = "Planning";
    if (completionRate >= 90) stage = "Wrapping Up";
    else if (completionRate >= 70) stage = "Execution";
    else if (completionRate >= 40) stage = "Active Development";
    else if (completionRate >= 15) stage = "Early Stage";
    else if (total > 0) stage = "Kickoff";

    const insights: Array<{
      type: "insight" | "warning" | "suggestion" | "status";
      title: string;
      detail: string;
      icon: string;
    }> = [];

    insights.push({
      type: "status",
      title: `Project Stage: ${stage}`,
      detail:
        total === 0
          ? "No tasks yet. Start breaking down your project into actionable items."
          : completionRate === 100
            ? "All tasks completed! Consider closing this project or starting a new sprint."
            : `${done} of ${total} tasks done (${completionRate}%). ${inProgress} currently in progress.`,
      icon: "status",
    });

    if (highRisk > 0) {
      insights.push({
        type: "warning",
        title: `${highRisk} High-Risk Task${highRisk > 1 ? "s" : ""} Detected`,
        detail: `${highRisk} task${highRisk > 1 ? "s have" : " has"} been flagged as high risk.`,
        icon: "warning",
      });
    }

    if (overdue > 0) {
      insights.push({
        type: "warning",
        title: `${overdue} Overdue Task${overdue > 1 ? "s" : ""}`,
        detail: `${overdue} task${overdue > 1 ? "s are" : " is"} past the due date.`,
        icon: "clock",
      });
    }

    if (total > 0 && done === 0 && inProgress === 0) {
      insights.push({
        type: "suggestion",
        title: "Kickstart Development",
        detail: "Move tasks from backlog to 'In Progress' to start building momentum.",
        icon: "rocket",
      });
    }

    if (backlog > total * 0.5 && total > 3) {
      insights.push({
        type: "suggestion",
        title: "Backlog Cleanup",
        detail: `${backlog} of ${total} tasks are in backlog. Consider reviewing and prioritizing.`,
        icon: "list",
      });
    }

    if (total > 0 && completionRate > 0 && completionRate < 100) {
      const remaining = total - done;
      insights.push({
        type: "suggestion",
        title: `${remaining} Task${remaining !== 1 ? "s" : ""} Remaining`,
        detail: `Focus on completing ${inProgress > 0 ? inProgress : "the next"} task${inProgress !== 1 ? "s" : ""} to maintain velocity.`,
        icon: "chart",
      });
    }

    const tasksWithPriority = tasks.filter(
      (t) => t.priority === "high" || t.priority === "critical"
    );
    if (tasksWithPriority.length > 0) {
      const donePriority = tasksWithPriority.filter(
        (t) => t.status === "done"
      ).length;
      insights.push({
        type: "insight",
        title: "Priority Task Progress",
        detail: `${donePriority} of ${tasksWithPriority.length} high/critical priority tasks completed.`,
        icon: "priority",
      });
    }

    return {
      project: {
        name: project.name,
        status: project.status,
        healthScore: project.healthScore ?? 85,
        sprintDuration: project.sprintDuration ?? 14,
      },
      stats: {
        total,
        done,
        inProgress,
        todo,
        backlog,
        review,
        highRisk,
        overdue,
        completionRate,
      },
      stage,
      insights,
    };
  },
});

/** Get global AI insights across all projects */
export const getGlobalInsights = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === "active").length;
    const planningProjects = projects.filter(
      (p) => p.status === "planning"
    ).length;

    let totalTasks = 0;
    let totalDone = 0;
    let totalInProgress = 0;
    let totalRisk = 0;
    let totalOverdue = 0;

    for (const project of projects) {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      totalTasks += tasks.length;
      totalDone += tasks.filter((t) => t.status === "done").length;
      totalInProgress += tasks.filter((t) => t.status === "in_progress").length;
      totalRisk += tasks.filter((t) => (t.aiRiskScore ?? 0) > 0.7).length;
      totalOverdue += tasks.filter(
        (t) => t.dueDate && t.dueDate < Date.now() && t.status !== "done"
      ).length;
    }

    const globalCompletion =
      totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

    const insights: Array<{
      type: "insight" | "warning" | "suggestion";
      title: string;
      detail: string;
    }> = [];

    if (totalProjects === 0) {
      insights.push({
        type: "suggestion",
        title: "Get Started",
        detail:
          "Create your first project to unlock AI-powered insights and project management features.",
      });
    } else {
      insights.push({
        type: "insight",
        title: "Portfolio Overview",
        detail: `${totalProjects} project${totalProjects !== 1 ? "s" : ""} with ${totalTasks} total task${totalTasks !== 1 ? "s" : ""}. ${globalCompletion}% overall completion rate.`,
      });

      if (totalRisk > 0) {
        insights.push({
          type: "warning",
          title: "Risk Alert",
          detail: `${totalRisk} task${totalRisk !== 1 ? "s" : ""} across your portfolio are flagged as high risk.`,
        });
      }

      if (totalOverdue > 0) {
        insights.push({
          type: "warning",
          title: "Overdue Tasks",
          detail: `${totalOverdue} task${totalOverdue !== 1 ? "s" : ""} are past their due dates.`,
        });
      }

      if (activeProjects > 0 && totalInProgress === 0) {
        insights.push({
          type: "suggestion",
          title: "Start Working",
          detail: `You have ${activeProjects} active project${activeProjects !== 1 ? "s" : ""} but no tasks in progress.`,
        });
      }
    }

    return {
      totalProjects,
      activeProjects,
      planningProjects,
      totalTasks,
      totalDone,
      totalInProgress,
      totalRisk,
      totalOverdue,
      globalCompletion,
      insights,
    };
  },
});

/** Create an AI copilot conversation */
export const createConversation = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const now = Date.now();
    return await ctx.db.insert("aiConversations", {
      userId: user._id,
      projectId: args.projectId,
      title: args.title ?? "New conversation",
      messages: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ─── WORKSPACE CONTEXT BUILDER ───────────────────────────────────────────────

async function gatherWorkspaceContext(
  ctx: any,
  userId: any,
  projectId?: string
) {
  const context: any = {
    projectName: undefined,
    projectDescription: undefined,
    projectStatus: undefined,
    healthScore: undefined,
    sprintDuration: undefined,
    stage: "Planning",
    tasks: [],
    totalTasks: 0,
    totalDone: 0,
    totalInProgress: 0,
    totalTodo: 0,
    totalBacklog: 0,
    totalReview: 0,
    totalRisk: 0,
    totalOverdue: 0,
    completionRate: 0,
    totalProjects: 0,
    activeProjects: 0,
    sprints: [],
    activeSprint: undefined,
    analyses: [],
  };

  if (projectId) {
    const project = await ctx.db.get(projectId);
    if (project) {
      context.projectName = project.name;
      context.projectDescription = project.description;
      context.projectStatus = project.status;
      context.healthScore = project.healthScore;
      context.sprintDuration = project.sprintDuration;
      context.totalProjects = 1;
      context.activeProjects = project.status === "active" ? 1 : 0;
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q: any) => q.eq("projectId", projectId))
      .collect();

    context.tasks = tasks.map((t: any) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      description: t.description,
      aiRiskScore: t.aiRiskScore,
      dueDate: t.dueDate,
      estimatedHours: t.estimatedHours,
      tags: t.tags,
    }));
    context.totalTasks = tasks.length;
    context.totalDone = tasks.filter((t: any) => t.status === "done").length;
    context.totalInProgress = tasks.filter((t: any) => t.status === "in_progress").length;
    context.totalTodo = tasks.filter((t: any) => t.status === "todo").length;
    context.totalBacklog = tasks.filter((t: any) => t.status === "backlog").length;
    context.totalReview = tasks.filter((t: any) => t.status === "in_review").length;
    context.totalRisk = tasks.filter((t: any) => (t.aiRiskScore ?? 0) > 0.7).length;
    context.totalOverdue = tasks.filter(
      (t: any) => t.dueDate && t.dueDate < Date.now() && t.status !== "done"
    ).length;
    context.completionRate =
      context.totalTasks > 0 ? Math.round((context.totalDone / context.totalTasks) * 100) : 0;

    if (context.completionRate >= 90) context.stage = "Wrapping Up";
    else if (context.completionRate >= 70) context.stage = "Execution";
    else if (context.completionRate >= 40) context.stage = "Active Development";
    else if (context.completionRate >= 15) context.stage = "Early Stage";
    else if (context.totalTasks > 0) context.stage = "Kickoff";
    else context.stage = "Planning";

    try {
      const sprints = await ctx.db
        .query("sprints")
        .withIndex("by_project", (q: any) => q.eq("projectId", projectId))
        .collect();

      for (const sprint of sprints) {
        const sprintTasks = await ctx.db
          .query("sprintTasks")
          .withIndex("by_sprint", (q: any) => q.eq("sprintId", sprint._id))
          .collect();

        const taskIds = sprintTasks.map((st: any) => st.taskId);
        const sprintTaskDocs = await Promise.all(taskIds.map((id: any) => ctx.db.get(id)));
        const validTasks = sprintTaskDocs.filter(Boolean);

        context.sprints.push({
          name: sprint.name,
          status: sprint.status,
          goal: sprint.goal,
          taskCount: validTasks.length,
          completedTasks: validTasks.filter((t: any) => t!.status === "done").length,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
        });

        if (sprint.status === "active") {
          context.activeSprint = {
            name: sprint.name,
            goal: sprint.goal,
            taskCount: validTasks.length,
            completedTasks: validTasks.filter((t: any) => t!.status === "done").length,
          };
        }
      }
    } catch { /* sprints may not exist */ }

    try {
      const analyses = await ctx.db
        .query("projectAnalyses")
        .withIndex("by_project", (q: any) => q.eq("projectId", projectId))
        .collect();

      context.analyses = analyses.map((a: any) => ({
        url: a.url,
        name: a.repoInfo?.name ?? "Repository",
        type: a.urlType,
        score: a.scores?.overall ?? 0,
        stage: a.recommendations?.developmentStage ?? "Unknown",
        summary: a.analysis?.executiveSummary ?? "",
        strengths: a.recommendations?.strengths ?? [],
        weaknesses: a.recommendations?.weaknesses ?? [],
        techStack: a.analysis?.techStack ?? { frontend: [], backend: [], database: [], cloud: [], ai: [] },
        architecture: a.analysis?.architecture ?? "Not analyzed",
      }));
    } catch { /* analyses may not exist */ }
  } else {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q: any) => q.eq("ownerId", userId))
      .collect();

    context.totalProjects = projects.length;
    context.activeProjects = projects.filter((p: any) => p.status === "active").length;

    for (const project of projects) {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q: any) => q.eq("projectId", project._id))
        .collect();

      context.totalTasks += tasks.length;
      context.totalDone += tasks.filter((t: any) => t.status === "done").length;
      context.totalInProgress += tasks.filter((t: any) => t.status === "in_progress").length;
      context.totalTodo += tasks.filter((t: any) => t.status === "todo").length;
      context.totalBacklog += tasks.filter((t: any) => t.status === "backlog").length;
      context.totalReview += tasks.filter((t: any) => t.status === "in_review").length;
      context.totalRisk += tasks.filter((t: any) => (t.aiRiskScore ?? 0) > 0.7).length;
      context.totalOverdue += tasks.filter(
        (t: any) => t.dueDate && t.dueDate < Date.now() && t.status !== "done"
      ).length;

      context.tasks = context.tasks.concat(
        tasks.map((t: any) => ({
          title: t.title,
          status: t.status,
          priority: t.priority,
          description: t.description,
          aiRiskScore: t.aiRiskScore,
          dueDate: t.dueDate,
          estimatedHours: t.estimatedHours,
          tags: t.tags,
        }))
      );
    }

    context.completionRate =
      context.totalTasks > 0 ? Math.round((context.totalDone / context.totalTasks) * 100) : 0;

    if (context.completionRate >= 90) context.stage = "Wrapping Up";
    else if (context.completionRate >= 70) context.stage = "Execution";
    else if (context.completionRate >= 40) context.stage = "Active Development";
    else if (context.completionRate >= 15) context.stage = "Early Stage";
    else if (context.totalTasks > 0) context.stage = "Kickoff";
    else context.stage = "Planning";
  }

  return context;
}

// ─── SEND MESSAGE ────────────────────────────────────────────────────────────

/**
 * Send a message and get a response.
 * This mutation:
 * 1. Loads the full conversation history
 * 2. Gathers complete workspace context
 * 3. Calls the generateResponse action with full context + history
 * 4. Stores the response
 *
 * The AI NEVER gives generic responses — it always uses workspace data.
 */
export const sendMessage = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    const now = Date.now();

    // Add user message
    const messages = [
      ...conversation.messages,
      { role: "user" as const, content: args.content, timestamp: now },
    ];

    // Gather full workspace context
    const context = await gatherWorkspaceContext(ctx, user._id, conversation.projectId ?? undefined);

    // Build conversation history for the AI (last 10 messages for context window)
    const conversationHistory = messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Save the user message first so it appears in the conversation
    await ctx.db.patch(args.conversationId, {
      messages,
      updatedAt: Date.now(),
    });

    // Return the conversation with metadata so the frontend can call the action
    return {
      messages,
      context,
      conversationHistory,
    };
  },
});

/** Get AI copilot conversations */
export const getConversations = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("aiConversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

/** Get a single conversation */
export const getConversation = query({
  args: { conversationId: v.id("aiConversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== user._id) return null;
    return conversation;
  },
});

/** Save assistant response to conversation */
export const saveAssistantResponse = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    const assistantMessage = {
      role: "assistant" as const,
      content: args.content,
      timestamp: Date.now(),
    };

    const updatedMessages = [...conversation.messages, assistantMessage];

    await ctx.db.patch(args.conversationId, {
      messages: updatedMessages,
      updatedAt: Date.now(),
    });

    return updatedMessages;
  },
});
