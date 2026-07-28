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

    if (review > inProgress && review > 0) {
      insights.push({
        type: "warning",
        title: "Review Bottleneck",
        detail: `${review} tasks waiting for review but only ${inProgress} in progress. Consider reviewing pending items.`,
        icon: "bottleneck",
      });
    }

    if (total > 0 && done === 0 && inProgress === 0) {
      insights.push({
        type: "suggestion",
        title: "Kickstart Development",
        detail: "Move tasks from backlog to 'In Progress' to start building momentum. Start with high-priority items.",
        icon: "rocket",
      });
    }

    if (backlog > total * 0.5 && total > 3) {
      insights.push({
        type: "suggestion",
        title: "Backlog Cleanup",
        detail: `${backlog} of ${total} tasks are in backlog (${Math.round((backlog / total) * 100)}%). Consider reviewing and prioritizing to keep the backlog manageable.`,
        icon: "list",
      });
    }

    if (total > 0 && completionRate > 0 && completionRate < 100) {
      const remaining = total - done;
      insights.push({
        type: "suggestion",
        title: `${remaining} Task${remaining !== 1 ? "s" : ""} Remaining`,
        detail: `At current pace, focus on completing ${inProgress > 0 ? inProgress : "the next"} task${inProgress !== 1 ? "s" : ""} to maintain velocity.`,
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

/** Helper to build a newline-separated string */
function nl(...lines: string[]): string {
  return lines.join("\n");
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

    let response = "";
    const q = args.content.toLowerCase();

    if (conversation.projectId) {
      // ── PROJECT-SCOPED RESPONSES ──────────────────────────────────────
      const project = await ctx.db.get(conversation.projectId);
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (r) => r.eq("projectId", conversation.projectId!))
        .collect();

      const total = tasks.length;
      const done = tasks.filter((t) => t.status === "done").length;
      const inProgress = tasks.filter((t) => t.status === "in_progress").length;
      const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

      if (q.includes("progress") || q.includes("status") || q.includes("stage")) {
        response = nl(
          `**${project?.name ?? "Project"}** is at **${completionRate}% completion**.`,
          "",
          `• ${done} completed tasks`,
          `• ${inProgress} in progress`,
          `• ${total - done - inProgress} remaining`,
          "",
          completionRate >= 80 ? "The project is wrapping up nicely!" :
          completionRate >= 40 ? "Good momentum — keep pushing!" :
          "There's still work ahead, stay focused.",
        );
      } else if (q.includes("risk") || q.includes("block") || q.includes("issue")) {
        const highRisk = tasks.filter((t) => (t.aiRiskScore ?? 0) > 0.7);
        if (highRisk.length > 0) {
          const taskList = highRisk.map((t) => `• "${t.title}"`).join("\n");
          response = nl(
            `I've identified **${highRisk.length} high-risk task${highRisk.length > 1 ? "s" : ""}**:`,
            "",
            taskList,
            "",
            "I recommend reviewing these tasks, adding buffer time, or breaking them into smaller pieces.",
          );
        } else {
          response = "Your project looks healthy! No high-risk tasks detected. All tasks are progressing well. Keep monitoring dependencies and deadlines.";
        }
      } else if (q.includes("suggest") || q.includes("recommend") || q.includes("improve")) {
        const suggestions: string[] = [];
        if (inProgress === 0) suggestions.push("Move some tasks from backlog/todo to 'In Progress' to start building momentum.");
        if (tasks.length < 3) suggestions.push("Consider breaking down your project into more specific tasks for better tracking.");
        if (completionRate > 80) suggestions.push("The project is nearly done — start planning the next sprint or project.");
        if (suggestions.length === 0) suggestions.push("Keep up the great work! Consider setting up sprint goals if you haven't already.");
        response = nl("Here are my recommendations:", "", ...suggestions.map((s, i) => `${i + 1}. ${s}`));
      } else if (q.includes("sprint") || q.includes("plan")) {
        response = nl(
          "For sprint planning, I recommend:",
          "",
          "1. **Review backlog** — Prioritize the remaining " + (total - done) + " tasks",
          "2. **Set goals** — Aim for 3-5 key deliverables",
          "3. **Assign work** — Distribute tasks based on team capacity",
          "4. **Set timeline** — Your sprint duration is " + (project?.sprintDuration ?? 14) + " days",
        );
      } else {
        response = nl(
          "I can help you with:",
          "",
          '• **Project status** — "What\'s the progress?"',
          '• **Risk analysis** — "What are the risks?"',
          '• **Suggestions** — "How can I improve?"',
          '• **Sprint planning** — "Help me plan a sprint"',
          "",
          "Try asking about any of these topics!",
        );
      }
    } else {
      // ── GLOBAL / NO-PROJECT RESPONSES ─────────────────────────────────
      const allProjects = await ctx.db
        .query("projects")
        .withIndex("by_owner", (r) => r.eq("ownerId", user._id))
        .collect();

      let allTasks: Array<{ projectId: string; status: string; aiRiskScore?: number; dueDate?: number; title: string }> = [];
      for (const p of allProjects) {
        const projTasks = await ctx.db
          .query("tasks")
          .withIndex("by_project", (r) => r.eq("projectId", p._id))
          .collect();
        allTasks = allTasks.concat(projTasks);
      }

      const totalProjects = allProjects.length;
      const totalTasks = allTasks.length;
      const totalDone = allTasks.filter((t) => t.status === "done").length;
      const totalInProgress = allTasks.filter((t) => t.status === "in_progress").length;
      const totalRisk = allTasks.filter((t) => (t.aiRiskScore ?? 0) > 0.7).length;
      const totalOverdue = allTasks.filter((t) => t.dueDate && t.dueDate < Date.now() && t.status !== "done").length;
      const globalCompletion = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

      if (q.includes("progress") || q.includes("status") || q.includes("overview") || q.includes("summary")) {
        if (totalProjects === 0) {
          response = "You don't have any projects yet. Create your first project from the Dashboard to get started!";
        } else {
          const projectLines = allProjects.map((p) => {
            const projTasks = allTasks.filter((t) => t.projectId === p._id);
            const d = projTasks.filter((t) => t.status === "done").length;
            const t = projTasks.length;
            const pct = t > 0 ? Math.round((d / t) * 100) : 0;
            return `• **${p.name}** — ${p.status}, ${pct}% complete (${d}/${t} tasks)`;
          });
          response = nl(
            "**Your Portfolio Overview**",
            "",
            `You have **${totalProjects} project${totalProjects !== 1 ? "s" : ""}** with **${totalTasks} total task${totalTasks !== 1 ? "s" : ""}** and **${globalCompletion}% completion**.`,
            "",
            ...projectLines,
          );
        }
      } else if (q.includes("risk") || q.includes("block") || q.includes("issue") || q.includes("problem")) {
        if (totalRisk === 0 && totalOverdue === 0) {
          response = "✅ **All clear!** No high-risk or overdue tasks across your portfolio. Everything is on track.";
        } else {
          const riskLines: string[] = [];
          if (totalRisk > 0) riskLines.push(`**${totalRisk} high-risk task${totalRisk > 1 ? "s" : ""}** need attention.`);
          if (totalOverdue > 0) riskLines.push(`**${totalOverdue} overdue task${totalOverdue > 1 ? "s" : ""}** past their deadline.`);
          const atRisk = allTasks.filter((t) => (t.aiRiskScore ?? 0) > 0.7 || (t.dueDate && t.dueDate < Date.now() && t.status !== "done"));
          if (atRisk.length > 0) {
            riskLines.push("", "**Tasks needing attention:**");
            atRisk.slice(0, 5).forEach((t) => {
              const reasons: string[] = [];
              if ((t.aiRiskScore ?? 0) > 0.7) reasons.push("high risk");
              if (t.dueDate && t.dueDate < Date.now() && t.status !== "done") reasons.push("overdue");
              riskLines.push(`• "${t.title}" — ${reasons.join(", ")}`);
            });
          }
          response = nl(
            "⚠️ **Risk Report**",
            "",
            ...riskLines,
            "",
            "I recommend prioritizing these tasks and considering adding buffer time or additional resources.",
          );
        }
      } else if (q.includes("suggest") || q.includes("recommend") || q.includes("improve") || q.includes("better")) {
        const suggestions: string[] = [];
        if (totalProjects === 0) {
          suggestions.push("Create your first project to start tracking progress.");
        } else {
          if (totalTasks === 0) suggestions.push("Add tasks to your projects for better tracking and AI analysis.");
          if (totalInProgress === 0 && totalTasks > 0) suggestions.push("Move tasks to 'In Progress' to build momentum.");
          if (globalCompletion > 80) suggestions.push("Great progress! Consider starting a new sprint or project.");
          if (globalCompletion < 30 && totalTasks > 5) suggestions.push("Break large tasks into smaller subtasks for better visibility.");
          if (totalRisk > 0) suggestions.push(`Address the ${totalRisk} high-risk task${totalRisk > 1 ? "s" : ""} before they become blockers.`);
          if (suggestions.length === 0) suggestions.push("Keep up the great work! Your portfolio is healthy.");
        }
        response = nl("**My Recommendations**", "", ...suggestions.map((s, i) => `${i + 1}. ${s}`));
      } else if (q.includes("sprint") || q.includes("plan")) {
        const activeTasks = allTasks.filter((t) => t.status === "in_progress" || t.status === "todo" || t.status === "backlog");
        response = nl(
          "**Sprint Planning Overview**",
          "",
          `You have **${activeTasks.length} task${activeTasks.length !== 1 ? "s" : ""}** ready for sprint planning across **${totalProjects} project${totalProjects !== 1 ? "s" : ""}**.`,
          "",
          "To plan an effective sprint:",
          "1. **Prioritize** — Focus on high-priority items first",
          "2. **Estimate** — Consider effort and dependencies",
          "3. **Scope** — Don't overcommit — aim for achievable goals",
          "4. **Review** — Select a project to start sprint planning there",
        );
      } else if (q.includes("task") || q.includes("what") || q.includes("help")) {
        if (totalProjects === 0) {
          response = nl(
            "I'm KORTEX AI Copilot! I can help you with:",
            "",
            "• **Portfolio overview** — See all your projects and progress",
            "• **Risk detection** — Identify blockers and overdue tasks",
            "• **Suggestions** — Get recommendations to improve your workflow",
            "• **Sprint planning** — Help plan and structure sprints",
            "",
            "**Create a project first**, then I can provide detailed analysis!",
          );
        } else {
          const pendingTasks = totalTasks - totalDone;
          const lines = [
            "Here's what I know about your workspace:",
            "",
            `• **${totalProjects}** project${totalProjects !== 1 ? "s" : ""} active`,
            `• **${totalTasks}** total task${totalTasks !== 1 ? "s" : ""} (${totalDone} done, ${pendingTasks} remaining)`,
            `• **${globalCompletion}%** completion rate`,
          ];
          if (totalInProgress > 0) {
            lines.push(`• **${totalInProgress}** task${totalInProgress !== 1 ? "s" : ""} currently in progress`);
          }
          lines.push("", "Ask me about **progress**, **risks**, **suggestions**, or **sprint planning** for deeper analysis!");
          response = nl(...lines);
        }
      } else {
        if (totalProjects > 0) {
          const lines = [
            "**Your Workspace Summary**",
            "",
            `${totalProjects} project${totalProjects !== 1 ? "s" : ""}, ${totalTasks} task${totalTasks !== 1 ? "s" : ""}, ${globalCompletion}% completion.`,
          ];
          if (totalInProgress > 0) lines.push(`${totalInProgress} task${totalInProgress !== 1 ? "s" : ""} in progress.`);
          if (totalRisk > 0) lines.push(`⚠️ ${totalRisk} high-risk task${totalRisk > 1 ? "s" : ""} flagged.`);
          lines.push("", "Try asking about **progress**, **risks**, **suggestions**, or **sprint planning**!");
          response = nl(...lines);
        } else {
          response = "I can provide insights on your projects. **Create a project from the Dashboard** to get started with AI-powered analysis!";
        }
      }
    }

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
