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

    let stage = "Planning";
    if (completionRate >= 80) stage = "Wrapping Up";
    else if (completionRate >= 50) stage = "Execution";
    else if (completionRate >= 20) stage = "Active Development";
    else if (total > 0) stage = "Early Stage";

    const insights: Array<{
      type: "insight" | "warning" | "suggestion" | "status";
      title: string;
      detail: string;
      icon: string;
    }> = [];

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
      stats: { total, done, inProgress, todo, backlog, review, highRisk, overdue, completionRate },
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

// ─── SMART CONVERSATIONAL RESPONSES ──────────────────────────────────────────

/** Greeting patterns */
const greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "what's up", "sup", "yo", "howdy", "greetings"];

/** Detect the intent of the user's message */
function detectIntent(q: string): string {
  if (greetings.some((g) => q.startsWith(g) || q === g)) return "greeting";
  if (q.match(/^(who|what) are you|your name|tell me about yourself/)) return "identity";
  if (q.match(/help|what can you do|capabilities|features|commands/)) return "help";
  if (q.match(/progress|status|stage|how.*going|how.*project|completion/)) return "progress";
  if (q.match(/risk|block|issue|problem|stuck|danger|warning/)) return "risk";
  if (q.match(/suggest|recommend|improve|better|advice|tip|optimize/)) return "suggest";
  if (q.match(/sprint|plan|roadmap|backlog|milestone|release/)) return "sprint";
  if (q.match(/task|todo|create|add|make|new/)) return "task";
  if (q.match(/team|member|collaborat|assign|workload/)) return "team";
  if (q.match(/thank|thanks|thx|appreciate/)) return "thanks";
  if (q.match(/bye|goodbye|see you|later|exit/)) return "farewell";
  return "general";
}

/** Smart rule-based response generator that feels conversational */
function generateSmartResponse(
  intent: string,
  q: string,
  context: {
    projectName?: string;
    totalProjects: number;
    totalTasks: number;
    totalDone: number;
    totalInProgress: number;
    totalRisk: number;
    completionRate: number;
    tasks: Array<{ title: string; status: string; priority: string }>;
  }
): string {
  switch (intent) {
    case "greeting": {
      if (context.projectName) {
        return `Hey! 👋 I'm your AI copilot for **${context.projectName}**. ${context.totalTasks > 0 ? `Your project is at ${context.completionRate}% completion with ${context.totalTasks} tasks.` : "This project doesn't have any tasks yet — let's get started!"} What would you like to work on?`;
      }
      if (context.totalProjects > 0) {
        return `Hey there! 👋 Welcome back to KORTEX AI. You have **${context.totalProjects} project${context.totalProjects !== 1 ? "s" : ""}** with **${context.totalTasks} task${context.totalTasks !== 1 ? "s" : ""}** overall. ${context.totalInProgress > 0 ? `${context.totalInProgress} task${context.totalInProgress !== 1 ? "s are" : " is"} in progress.` : "No tasks in progress right now."} What can I help you with?`;
      }
      return "Hey there! 👋 I'm **KORTEX AI**, your intelligent project management copilot. I can help you with project planning, task management, risk analysis, sprint planning, and more. What would you like to do?";
    }

    case "identity":
      return "I'm **KORTEX AI** — your intelligent project management copilot. I'm designed to help software teams plan, execute, and deliver projects faster. I can:\n\n• Analyze your project health and progress\n• Detect risks and blockers early\n• Help plan sprints and prioritize tasks\n• Answer questions about project management and software development\n• Provide suggestions to improve your workflow\n\nWhat would you like to work on?";

    case "help": {
      const lines = [
        "Here's what I can help you with:",
        "",
        "**📊 Project Management**",
        "• \"What's the project progress?\" — Get a status overview",
        "• \"What are the risks?\" — Find blockers and issues",
        "• \"How can I improve?\" — Get actionable suggestions",
        "",
        "**🏃 Sprint Planning**",
        "• \"Help me plan a sprint\" — Sprint recommendations",
        "• \"What should we work on next?\" — Priority suggestions",
        "",
        "**💬 General Questions**",
        "• Ask me anything about software development, best practices, architecture, or productivity!",
        "",
        "Just type naturally — I'll understand what you need. 😊",
      ];
      return lines.join("\n");
    }

    case "progress": {
      if (context.totalTasks === 0) {
        return context.projectName
          ? `**${context.projectName}** doesn't have any tasks yet. Create some tasks from the project dashboard and I'll start tracking your progress!`
          : `You don't have any tasks across your ${context.totalProjects} project${context.totalProjects !== 1 ? "s" : ""} yet. Create a project and add some tasks to get started!`;
      }
      if (context.projectName) {
        const lines = [
          `**${context.projectName}** is at **${context.completionRate}% completion**.`,
          "",
          `• **${context.totalDone}** tasks completed`,
          `• **${context.totalInProgress}** tasks in progress`,
          `• **${context.totalTasks - context.totalDone - context.totalInProgress}** tasks remaining`,
        ];
        if (context.totalRisk > 0) lines.push(`• ⚠️ **${context.totalRisk}** high-risk task${context.totalRisk > 1 ? "s" : ""}`);
        return lines.join("\n");
      }
      const lines = [
        `Here's your workspace overview:`,
        "",
        `• **${context.totalTasks}** total tasks across ${context.totalProjects} project${context.totalProjects !== 1 ? "s" : ""}`,
        `• **${context.totalDone}** completed (${context.completionRate}%)`,
        `• **${context.totalInProgress}** in progress`,
      ];
      if (context.totalRisk > 0) lines.push(`• ⚠️ **${context.totalRisk}** at risk`);
      return lines.join("\n");
    }

    case "risk": {
      if (context.totalRisk === 0) {
        return "✅ **All clear!** No high-risk tasks detected in your workspace. Everything looks healthy! Keep monitoring your tasks and deadlines to maintain this status.";
      }
      const riskyTasks = context.tasks.filter((t) => t.priority === "high" || t.priority === "critical");
      const lines = [
        `⚠️ I've identified **${context.totalRisk} high-risk area${context.totalRisk > 1 ? "s" : ""}** in your workspace.`,
        "",
        "Here's what needs attention:",
      ];
      riskyTasks.slice(0, 5).forEach((t) => {
        lines.push(`• **"${t.title}"** — priority: ${t.priority}, status: ${t.status.replace("_", " ")}`);
      });
      lines.push("", "💡 **My recommendation:** Review these tasks, consider breaking them into smaller pieces, or add more buffer time to your estimates.");
      return lines.join("\n");
    }

    case "suggest": {
      const suggestions: string[] = [];
      if (context.totalTasks === 0) {
        suggestions.push("Create your first project and add tasks to start tracking progress.");
        suggestions.push("Define clear goals and milestones for your project.");
      } else {
        if (context.totalInProgress === 0 && context.totalTasks > 0) {
          suggestions.push("Move tasks to 'In Progress' to build momentum.");
        }
        if (context.completionRate > 80) {
          suggestions.push("Great progress! Consider starting a new sprint or project.");
          suggestions.push("Document what went well for future reference.");
        }
        if (context.completionRate < 30 && context.totalTasks > 5) {
          suggestions.push("Break large tasks into smaller, more manageable subtasks.");
        }
        if (context.totalRisk > 0) {
          suggestions.push(`Address the ${context.totalRisk} high-risk task${context.totalRisk > 1 ? "s" : ""} before they become blockers.`);
        }
        if (context.totalInProgress > 3) {
          suggestions.push("You have many tasks in progress — consider focusing on completing current work before starting new items.");
        }
        if (suggestions.length === 0) {
          suggestions.push("Your workflow looks solid! Keep up the great work.");
          suggestions.push("Consider setting up sprint goals if you haven't already.");
        }
      }
      return `**My Recommendations:**\n\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
    }

    case "sprint": {
      const readyTasks = context.tasks.filter((t) => t.status === "backlog" || t.status === "todo");
      const inProgress = context.tasks.filter((t) => t.status === "in_progress");
      const lines = [
        "**Sprint Planning Guide:**",
        "",
        `You have **${readyTasks.length} task${readyTasks.length !== 1 ? "s" : ""}** ready to pick up and **${inProgress.length} in progress**.`,
        "",
        "**Here's my recommended approach:**",
        "1. **Review** — Check the ${readyTasks.length} pending tasks and prioritize by importance",
        "2. **Scope** — Aim for 3-5 key deliverables per sprint",
        "3. **Balance** — Mix quick wins with larger features",
        "4. **Buffer** — Leave room for unexpected issues (20% buffer is ideal)",
        "5. **Commit** — Set clear sprint goals and stick to them",
      ];
      if (readyTasks.length > 0) {
        lines.push("", "**Top candidates for the next sprint:**");
        readyTasks.slice(0, 5).forEach((t) => {
          lines.push(`• "${t.title}" [${t.priority}]`);
        });
      }
      return lines.join("\n");
    }

    case "team":
      return "**Team Collaboration Tips:**\n\n• Assign tasks based on team members' strengths and availability\n• Keep work-in-progress limits to avoid burnout\n• Use the comments feature on tasks for async communication\n• Regular standups help catch blockers early\n• Consider pairing on high-risk or complex tasks";

    case "task": {
      const lines = ["Here's a quick overview of your tasks:"];
      const statusCounts: Record<string, number> = {};
      context.tasks.forEach((t) => {
        statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      });
      Object.entries(statusCounts).forEach(([status, count]) => {
        lines.push(`• **${status.replace("_", " ")}**: ${count}`);
      });
      if (context.totalTasks === 0) {
        lines.push("", "No tasks yet! Create your first task from the project dashboard.");
      } else {
        lines.push("", `**Total: ${context.totalTasks} tasks** — ${context.completionRate}% complete`);
      }
      return lines.join("\n");
    }

    case "thanks":
      return "You're welcome! 😊 I'm here whenever you need help. Just ask me anything about your project, sprint planning, or anything else!";

    case "farewell":
      return "See you later! 👋 Good luck with your projects. I'll be here when you need me!";

    case "general":
    default: {
      // For general questions, give a helpful contextual response
      if (context.totalProjects > 0) {
        return `Great question! As your project management copilot, I can help with both **project-specific tasks** and **general questions**.\n\n${context.projectName ? `For your project **${context.projectName}** (${context.completionRate}% complete), ` : ""}try asking me about:\n\n• Project progress and status\n• Risk analysis and blockers\n• Sprint planning\n• Task prioritization\n\nOr ask me anything about software development, best practices, or productivity! I'm here to help. 😊`;
      }
      return "I'm here to help! You can ask me about:\n\n• **Project management** — planning, tracking, and delivery\n• **Software development** — architecture, best practices, and debugging\n• **Productivity** — tips, techniques, and workflows\n\nWhat would you like to know?";
    }
  }
}

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

    const messages = [
      ...conversation.messages,
      { role: "user" as const, content: args.content, timestamp: now },
    ];

    const q = args.content.toLowerCase();

    // Gather context for smart responses
    let context = {
      projectName: undefined as string | undefined,
      totalProjects: 0,
      totalTasks: 0,
      totalDone: 0,
      totalInProgress: 0,
      totalRisk: 0,
      completionRate: 0,
      tasks: [] as Array<{ title: string; status: string; priority: string }>,
    };

    if (conversation.projectId) {
      const project = await ctx.db.get(conversation.projectId);
      if (project) context.projectName = project.name;

      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (r) => r.eq("projectId", conversation.projectId!))
        .collect();

      context.tasks = tasks.map((t) => ({ title: t.title, status: t.status, priority: t.priority }));
      context.totalTasks = tasks.length;
      context.totalDone = tasks.filter((t) => t.status === "done").length;
      context.totalInProgress = tasks.filter((t) => t.status === "in_progress").length;
      context.totalRisk = tasks.filter((t) => (t.aiRiskScore ?? 0) > 0.7).length;
      context.completionRate = context.totalTasks > 0 ? Math.round((context.totalDone / context.totalTasks) * 100) : 0;
      context.totalProjects = 1;
    } else {
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_owner", (r) => r.eq("ownerId", user._id))
        .collect();
      context.totalProjects = projects.length;

      for (const p of projects) {
        const tasks = await ctx.db
          .query("tasks")
          .withIndex("by_project", (r) => r.eq("projectId", p._id))
          .collect();
        context.totalTasks += tasks.length;
        context.totalDone += tasks.filter((t) => t.status === "done").length;
        context.totalInProgress += tasks.filter((t) => t.status === "in_progress").length;
        context.totalRisk += tasks.filter((t) => (t.aiRiskScore ?? 0) > 0.7).length;
        context.tasks = context.tasks.concat(tasks.map((t) => ({ title: t.title, status: t.status, priority: t.priority })));
      }
      context.completionRate = context.totalTasks > 0 ? Math.round((context.totalDone / context.totalTasks) * 100) : 0;
    }

    // Detect intent and generate smart response
    const intent = detectIntent(q);
    const response = generateSmartResponse(intent, q, context);

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
