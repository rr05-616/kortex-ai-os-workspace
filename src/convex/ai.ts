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
    const overdue = tasks.filter((t) => t.dueDate && t.dueDate < Date.now() && t.status !== "done").length;

    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    // Determine project stage
    let stage = "Planning";
    if (completionRate >= 80) stage = "Wrapping Up";
    else if (completionRate >= 50) stage = "Execution";
    else if (completionRate >= 20) stage = "Active Development";
    else if (total > 0) stage = "Early Stage";

    // Generate insights
    const insights: Array<{
      type: "insight" | "warning" | "suggestion" | "status";
      title: string;
      detail: string;
      icon: string;
    }> = [];

    // Stage insight
    insights.push({
      type: "status",
      title: `Project Stage: ${stage}`,
      detail: total === 0
        ? "No tasks yet. Start breaking down your project into actionable items."
        : completionRate === 100
          ? "All tasks completed! Consider closing this project or starting a new sprint."
          : `${done} of ${total} tasks done (${completionRate}%). ${inProgress} currently in progress.`,
      icon: "status",
    });

    // Health analysis
    if (highRisk > 0) {
      insights.push({
        type: "warning",
        title: `${highRisk} High-Risk Task${highRisk > 1 ? "s" : ""} Detected`,
        detail: `${highRisk} task${highRisk > 1 ? "s have" : " has"} been flagged as high risk. Review these tasks and consider adding more time or resources.`,
        icon: "warning",
      });
    }

    if (overdue > 0) {
      insights.push({
        type: "warning",
        title: `${overdue} Overdue Task${overdue > 1 ? "s" : ""}`,
        detail: `${overdue} task${overdue > 1 ? "s are" : " is"} past the due date. Consider rescheduling or reprioritizing.`,
        icon: "clock",
      });
    }

    // Bottleneck detection
    if (review > inProgress && review > 0) {
      insights.push({
        type: "warning",
        title: "Review Bottleneck",
        detail: `${review} tasks waiting for review but only ${inProgress} in progress. Consider reviewing pending items.`,
        icon: "bottleneck",
      });
    }

    // Velocity suggestion
    if (total > 0 && done === 0 && inProgress === 0) {
      insights.push({
        type: "suggestion",
        title: "Kickstart Development",
        detail: "Move tasks from backlog to 'In Progress' to start building momentum. Start with high-priority items.",
        icon: "rocket",
      });
    }

    // Backlog management
    if (backlog > total * 0.5 && total > 3) {
      insights.push({
        type: "suggestion",
        title: "Backlog Cleanup",
        detail: `${backlog} of ${total} tasks are in backlog (${Math.round((backlog / total) * 100)}%). Consider reviewing and prioritizing to keep the backlog manageable.`,
        icon: "list",
      });
    }

    // Completion prediction
    if (total > 0 && completionRate > 0 && completionRate < 100) {
      const remaining = total - done;
      insights.push({
        type: "suggestion",
        title: `${remaining} Task${remaining !== 1 ? "s" : ""} Remaining`,
        detail: `At current pace, focus on completing ${inProgress > 0 ? inProgress : "the next"} task${inProgress !== 1 ? "s" : ""} to maintain velocity.`,
        icon: "chart",
      });
    }

    // Workload distribution
    const tasksWithPriority = tasks.filter((t) => t.priority === "high" || t.priority === "critical");
    if (tasksWithPriority.length > 0) {
      const donePriority = tasksWithPriority.filter((t) => t.status === "done").length;
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
    const planningProjects = projects.filter((p) => p.status === "planning").length;

    // Get all tasks across projects
    let totalTasks = 0;
    let totalDone = 0;
    let totalInProgress = 0;
    let totalRisk = 0;

    for (const project of projects) {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      totalTasks += tasks.length;
      totalDone += tasks.filter((t) => t.status === "done").length;
      totalInProgress += tasks.filter((t) => t.status === "in_progress").length;
      totalRisk += tasks.filter((t) => (t.aiRiskScore ?? 0) > 0.7).length;
    }

    const globalCompletion = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

    const insights: Array<{
      type: "insight" | "warning" | "suggestion";
      title: string;
      detail: string;
    }> = [];

    if (totalProjects === 0) {
      insights.push({
        type: "suggestion",
        title: "Get Started",
        detail: "Create your first project to unlock AI-powered insights and project management features.",
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

      if (activeProjects > 0 && totalInProgress === 0) {
        insights.push({
          type: "suggestion",
          title: "Start Working",
          detail: `You have ${activeProjects} active project${activeProjects !== 1 ? "s" : ""} but no tasks in progress. Move tasks to start building.`,
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

/** Send a message and get a response */
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

    // Generate context-aware response
    let response = "";

    if (conversation.projectId) {
      const project = await ctx.db.get(conversation.projectId);
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", conversation.projectId!))
        .collect();

      const total = tasks.length;
      const done = tasks.filter((t) => t.status === "done").length;
      const inProgress = tasks.filter((t) => t.status === "in_progress").length;
      const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

      const query = args.content.toLowerCase();

      if (query.includes("progress") || query.includes("status") || query.includes("stage")) {
        response = `**${project?.name ?? "Project"}** is currently at **${completionRate}% completion**. You have ${done} completed tasks, ${inProgress} in progress, and ${total - done - inProgress} remaining. ${completionRate >= 80 ? "The project is wrapping up nicely!" : completionRate >= 40 ? "Good momentum — keep pushing!" : "There's still work ahead, stay focused."}`;
      } else if (query.includes("risk") || query.includes("block") || query.includes("issue")) {
        const highRisk = tasks.filter((t) => (t.aiRiskScore ?? 0) > 0.7);
        if (highRisk.length > 0) {
          response = `I've identified **${highRisk.length} high-risk task${highRisk.length > 1 ? "s" : ""}** in your project: ${highRisk.map((t) => `"${t.title}"`).join(", ")}. I recommend reviewing these tasks, adding buffer time, or breaking them into smaller pieces.`;
        } else {
          response = `Your project looks healthy! No high-risk tasks detected. All tasks are progressing well. Keep monitoring dependencies and deadlines to maintain this status.`;
        }
      } else if (query.includes("suggest") || query.includes("recommend") || query.includes("improve")) {
        const suggestions = [];
        if (inProgress === 0) suggestions.push("Move some tasks from backlog/todo to 'In Progress' to start building momentum.");
        if (tasks.length < 3) suggestions.push("Consider breaking down your project into more specific tasks for better tracking.");
        if (completionRate > 80) suggestions.push("The project is nearly done — start planning the next sprint or project.");
        if (suggestions.length === 0) suggestions.push("Keep up the great work! Consider setting up sprint goals if you haven't already.");
        response = `Here are my recommendations:\n\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
      } else if (query.includes("sprint") || query.includes("plan")) {
        response = `For sprint planning, I recommend:\n\n1. **Review backlog** — Prioritize the remaining ${total - done} tasks\n2. **Set goals** — Aim for 3-5 key deliverables\n3. **Assign work** — Distribute tasks based on team capacity\n4. **Set timeline** — Your sprint duration is ${project?.sprintDuration ?? 14} days`;
      } else {
        response = `I can help you with:\n\n• **Project status** — "What's the progress?"\n• **Risk analysis** — "What are the risks?"\n• **Suggestions** — "How can I improve?"\n• **Sprint planning** — "Help me plan a sprint"\n\nTry asking about any of these topics!`;
      }
    } else {
      const query = args.content.toLowerCase();
      if (query.includes("help") || query.includes("what")) {
        response = "I'm KORTEX AI Copilot! I can help you with:\n\n• **Project insights** — Analyze project health and progress\n• **Risk detection** — Identify potential blockers and risks\n• **Suggestions** — Get recommendations to improve your workflow\n• **Sprint planning** — Help plan and structure sprints\n\nSelect a project to get started with project-specific insights!";
      } else {
        response = "I can provide insights on your projects. Navigate to a specific project to get detailed analysis, or ask me general questions about project management best practices!";
      }
    }

    // Add assistant response
    messages.push({ role: "assistant" as const, content: response, timestamp: Date.now() });

    await ctx.db.patch(args.conversationId, {
      messages,
      updatedAt: Date.now(),
    });

    return messages;
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
