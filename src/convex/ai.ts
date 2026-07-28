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
        detail:
          "Move tasks from backlog to 'In Progress' to start building momentum.",
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

// ─── TOOL-CALLING CONTEXT BUILDER ────────────────────────────────────────────

/**
 * Gather comprehensive workspace context for the agent.
 * This is called by sendMessage before generating any response.
 * The agent NEVER answers without this context.
 */
 
async function gatherWorkspaceContext(
  ctx: any,
  userId: any,
  projectId?: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    comments: [],
  };

  if (projectId) {
    // Project-scoped
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

    // Sprints
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

    // Analyses
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
    // Global workspace
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

// ─── INTENT DETECTION ────────────────────────────────────────────────────────

const greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "what's up", "sup", "yo", "howdy", "greetings"];

function detectIntent(q: string): string {
  if (greetings.some((g) => q.startsWith(g) || q === g)) return "greeting";
  if (q.match(/^(who|what) are you|your name|tell me about yourself/)) return "identity";
  if (q.match(/help|what can you do|capabilities|features|commands/)) return "help";
  if (q.match(/progress|status|stage|how.*going|how.*project|completion|health/)) return "progress";
  if (q.match(/risk|block|issue|problem|stuck|danger|warning|overdue|delayed/)) return "risk";
  if (q.match(/suggest|recommend|improve|better|advice|tip|optimize/)) return "suggest";
  if (q.match(/sprint|plan|roadmap|backlog|milestone|release|velocity/)) return "sprint";
  if (q.match(/task|todo|create|add|make|new|breakdown/)) return "task";
  if (q.match(/team|member|collaborat|assign|workload/)) return "team";
  if (q.match(/analy|metric|score|report|summary|dashboard/)) return "analytics";
  if (q.match(/architect|structure|folder|file|component|service|module/)) return "architecture";
  if (q.match(/thank|thanks|thx|appreciate/)) return "thanks";
  if (q.match(/bye|goodbye|see you|later|exit/)) return "farewell";
  return "general";
}

// ─── SMART RESPONSE GENERATOR ────────────────────────────────────────────────

function generateSmartResponse(
  intent: string,
  q: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any
): string {
  const nl = (...lines: string[]) => lines.filter(Boolean).join("\n");

  switch (intent) {
    case "greeting": {
      if (ctx.projectName) {
        return nl(
          `Hey! 👋 I'm your AI workspace agent for **${ctx.projectName}**.`,
          ctx.totalTasks > 0
            ? `Currently at **${ctx.completionRate}% completion** with **${ctx.totalTasks} tasks** — ${ctx.totalInProgress} in progress, ${ctx.totalRisk} at risk.`
            : "This project doesn't have any tasks yet — let's get started!",
          "",
          "I deeply understand your project. Ask me anything about progress, risks, sprints, architecture, or next steps."
        );
      }
      if (ctx.totalProjects > 0) {
        return nl(
          `Hey there! 👋 Welcome back to KORTEX AI.`,
          `Your workspace has **${ctx.totalProjects} project${ctx.totalProjects !== 1 ? "s" : ""}** with **${ctx.totalTasks} task${ctx.totalTasks !== 1 ? "s" : ""}**.`,
          ctx.totalInProgress > 0 ? `${ctx.totalInProgress} task${ctx.totalInProgress !== 1 ? "s are" : " is"} in progress.` : "No tasks in progress right now.",
          ctx.totalRisk > 0 ? `⚠️ **${ctx.totalRisk}** high-risk tasks need attention.` : "",
          "",
          "I'm your autonomous workspace agent. Ask me anything — I'll investigate your data first."
        );
      }
      return nl(
        "Hey there! 👋 I'm **KORTEX AI** — your autonomous workspace intelligence agent.",
        "",
        "I'm not a chatbot. I investigate your entire workspace before answering every question.",
        "Create your first project and I'll start tracking everything automatically."
      );
    }

    case "identity":
      return nl(
        "I'm **KORTEX AI** — an autonomous workspace intelligence agent.",
        "",
        "Unlike a chatbot, I **always investigate your workspace data** before answering.",
        "I understand your projects, tasks, sprints, risks, architecture, and analytics.",
        "",
        "**What I can do:**",
        "• Analyze project health and progress with real numbers",
        "• Detect risks, blockers, and overdue tasks",
        "• Plan sprints based on velocity and dependencies",
        "• Explain your project architecture and tech stack",
        "• Recommend what to build next based on priorities",
        "• Generate task breakdowns and sprint plans",
        "• Answer any software development question with workspace context",
        "",
        "Just ask naturally — I'll investigate your data first."
      );

    case "help": {
      return nl(
        "**Here's what I can do as your workspace agent:**",
        "",
        "📊 **Project Intelligence**",
        "• \"How is my project doing?\" — Full status with real numbers",
        "• \"What are the risks?\" — Specific risky tasks and mitigations",
        "• \"Explain my project\" — Architecture, tech stack, features",
        "",
        "🏃 **Sprint Planning**",
        "• \"What should I work on next?\" — Priority-based recommendations",
        "• \"Plan a sprint\" — Task selection based on velocity",
        "• \"We are delayed\" — Recovery plan with task reordering",
        "",
        "🔍 **Risk & Analysis**",
        "• \"What's blocking us?\" — Dependencies and blockers",
        "• \"Which tasks are overdue?\" — Specific overdue items",
        "• \"Give me an executive summary\" — Portfolio-wide overview",
        "",
        "💬 **General Knowledge**",
        "• Ask me anything about software development, architecture, best practices!",
        "",
        "I investigate your workspace data **before every response**."
      );
    }

    case "progress": {
      if (ctx.totalTasks === 0) {
        return ctx.projectName
          ? nl(
              `**${ctx.projectName}** has no tasks yet.`,
              "Create some tasks from the project dashboard and I'll start tracking your progress automatically."
            )
          : nl(
              `You have ${ctx.totalProjects} project${ctx.totalProjects !== 1 ? "s" : ""} but no tasks yet.`,
              "Create a project and add some tasks to unlock AI-powered tracking."
            );
      }
      if (ctx.projectName) {
        const lines = [
          `**${ctx.projectName}** — ${ctx.stage}`,
          "",
          `📊 **Completion: ${ctx.completionRate}%** (${ctx.totalDone}/${ctx.totalTasks})`,
          `• ✅ Done: ${ctx.totalDone}`,
          `• 🔄 In Progress: ${ctx.totalInProgress}`,
          `• 📋 Todo: ${ctx.totalTodo}`,
          `• 📦 Backlog: ${ctx.totalBacklog}`,
          `• 👁️ In Review: ${ctx.totalReview}`,
        ];
        if (ctx.totalRisk > 0) lines.push(`• ⚠️ High-Risk: ${ctx.totalRisk}`);
        if (ctx.totalOverdue > 0) lines.push(`• ⏰ Overdue: ${ctx.totalOverdue}`);
        if (ctx.activeSprint) {
          lines.push("", `🏃 **Active Sprint: ${ctx.activeSprint.name}**`);
          lines.push(`   Progress: ${ctx.activeSprint.completedTasks}/${ctx.activeSprint.taskCount} tasks`);
          if (ctx.activeSprint.goal) lines.push(`   Goal: ${ctx.activeSprint.goal}`);
        }
        return lines.join("\n");
      }
      return nl(
        "**Workspace Overview:**",
        "",
        `• **${ctx.totalProjects}** projects (${ctx.activeProjects} active)`,
        `• **${ctx.totalTasks}** total tasks`,
        `• **${ctx.completionRate}%** overall completion`,
        `• **${ctx.totalDone}** done, **${ctx.totalInProgress}** in progress`,
        ctx.totalRisk > 0 ? `• ⚠️ **${ctx.totalRisk}** high-risk tasks` : "",
        ctx.totalOverdue > 0 ? `• ⏰ **${ctx.totalOverdue}** overdue tasks` : ""
      );
    }

    case "risk": {
      if (ctx.totalRisk === 0 && ctx.totalOverdue === 0) {
        return nl(
          "✅ **All clear!** No high-risk or overdue tasks detected.",
          "Your workspace is healthy. Keep monitoring deadlines to maintain this status."
        );
      }
      const lines: string[] = [];
      if (ctx.totalOverdue > 0) {
        lines.push(`⏰ **${ctx.totalOverdue} Overdue Task${ctx.totalOverdue !== 1 ? "s" : ""}:**`);
        ctx.tasks
          .filter((t: any) => t.dueDate && t.dueDate < Date.now() && t.status !== "done")
          .slice(0, 5)
          .forEach((t: any) => {
            lines.push(`• **"${t.title}"** — ${t.status.replace("_", " ")}, due ${new Date(t.dueDate).toLocaleDateString()}`);
          });
      }
      if (ctx.totalRisk > 0) {
        lines.push("", `⚠️ **${ctx.totalRisk} High-Risk Task${ctx.totalRisk !== 1 ? "s" : ""}:**`);
        ctx.tasks
          .filter((t: any) => (t.aiRiskScore ?? 0) > 0.7)
          .slice(0, 5)
          .forEach((t: any) => {
            lines.push(`• **"${t.title}"** — ${t.status.replace("_", " ")}, priority:${t.priority}, risk:${Math.round((t.aiRiskScore ?? 0) * 100)}%`);
          });
      }
      lines.push(
        "",
        "**My recommendation:** Review these tasks immediately. Consider breaking them into smaller pieces or escalating blockers."
      );
      return lines.join("\n");
    }

    case "suggest": {
      const suggestions: string[] = [];
      if (ctx.totalTasks === 0) {
        suggestions.push("Create your first project and add tasks to start tracking progress.");
        suggestions.push("Define clear goals and milestones for your project.");
      } else {
        if (ctx.totalInProgress === 0 && ctx.totalTasks > 0) {
          suggestions.push("Move tasks from backlog/todo to 'In Progress' to build momentum.");
        }
        if (ctx.completionRate > 80) {
          suggestions.push("Great progress! Consider starting a new sprint or closing this project.");
        }
        if (ctx.completionRate < 30 && ctx.totalTasks > 5) {
          suggestions.push("Break large tasks into smaller, more manageable subtasks (aim for 2-4h each).");
        }
        if (ctx.totalRisk > 0) {
          suggestions.push(`Address the ${ctx.totalRisk} high-risk task${ctx.totalRisk !== 1 ? "s" : ""} before they become blockers.`);
        }
        if (ctx.totalInProgress > 3) {
          suggestions.push("Focus on completing current work before starting new items — limit WIP to 3.");
        }
        if (ctx.totalOverdue > 0) {
          suggestions.push(`Re-prioritize the ${ctx.totalOverdue} overdue task${ctx.totalOverdue !== 1 ? "s" : ""}.`);
        }
        if (suggestions.length === 0) {
          suggestions.push("Your workflow looks solid! Consider setting up sprint goals.");
        }
      }
      return `**My Recommendations:**\n\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
    }

    case "sprint": {
      const readyTasks = ctx.tasks.filter((t: any) => t.status === "backlog" || t.status === "todo");
      const lines = [
        "**Sprint Planning Analysis:**",
        "",
        `• **${readyTasks.length}** tasks ready to pick up`,
        `• **${ctx.totalInProgress}** currently in progress`,
        ctx.activeSprint ? `• Active sprint: **${ctx.activeSprint.name}** — ${ctx.activeSprint.completedTasks}/${ctx.activeSprint.taskCount} done` : "• No active sprint",
        "",
        "**Recommended approach:**",
        "1. **Review** — Check priority and dependencies",
        "2. **Scope** — Aim for 3-5 key deliverables per sprint",
        "3. **Balance** — Mix quick wins with larger features",
        "4. **Buffer** — Leave 20% for unexpected issues",
        "5. **Commit** — Set clear sprint goals",
      ];
      if (readyTasks.length > 0) {
        lines.push("", "**Top candidates:**");
        readyTasks.slice(0, 5).forEach((t: any) => {
          lines.push(`• "${t.title}" [${t.priority}]`);
        });
      }
      return lines.join("\n");
    }

    case "task": {
      const statusCounts: Record<string, number> = {};
      ctx.tasks.forEach((t: any) => {
        statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      });
      const lines = ["**Task Overview:**", ""];
      Object.entries(statusCounts).forEach(([status, count]) => {
        lines.push(`• **${status.replace("_", " ")}**: ${count}`);
      });
      if (ctx.totalTasks === 0) {
        lines.push("", "No tasks yet! Create your first task from the project dashboard.");
      } else {
        lines.push("", `**Total: ${ctx.totalTasks} tasks** — ${ctx.completionRate}% complete`);
      }
      return lines.join("\n");
    }

    case "analytics": {
      return nl(
        "**Workspace Analytics:**",
        "",
        `📊 **Completion Rate: ${ctx.completionRate}%**`,
        `• Total Tasks: ${ctx.totalTasks}`,
        `• Completed: ${ctx.totalDone}`,
        `• In Progress: ${ctx.totalInProgress}`,
        `• Risk Score: ${ctx.totalRisk > 0 ? `⚠️ ${ctx.totalRisk} high-risk tasks` : "✅ Low risk"}`,
        ctx.sprints.length > 0 ? `\n🏃 **Sprints: ${ctx.sprints.length}** (${ctx.sprints.filter((s: any) => s.status === "active").length} active)` : ""
      );
    }

    case "architecture": {
      if (ctx.analyses.length > 0) {
        const a = ctx.analyses[0];
        return nl(
          `**Project Architecture — ${a.name}:**`,
          "",
          `🏗️ **Architecture:** ${a.architecture}`,
          `📊 **Score: ${a.score}/100** | Stage: ${a.stage}`,
          "",
          "**Tech Stack:**",
          `• Frontend: ${a.techStack.frontend.join(", ") || "Not detected"}`,
          `• Backend: ${a.techStack.backend.join(", ") || "Not detected"}`,
          `• Database: ${a.techStack.database.join(", ") || "Not detected"}`,
          `• Cloud: ${a.techStack.cloud.join(", ") || "Not detected"}`,
          "",
          `**Strengths:** ${a.strengths.join("; ")}`,
          `**Weaknesses:** ${a.weaknesses.join("; ")}`
        );
      }
      return nl(
        "**No repository analysis found.**",
        "Import a project using the 'Import Project' button to get AI-powered architecture analysis."
      );
    }

    case "team":
      return nl(
        "**Team Collaboration Tips:**",
        "",
        "• Assign tasks based on strengths and availability",
        "• Limit work-in-progress to avoid burnout",
        "• Use task comments for async communication",
        "• Regular standups catch blockers early",
        "• Pair on high-risk or complex tasks"
      );

    case "thanks":
      return "You're welcome! 😊 I'm here whenever you need help with your workspace.";

    case "farewell":
      return "See you later! 👋 I'll keep monitoring your workspace. Come back anytime!";

    case "general":
    default: {
      if (ctx.totalProjects > 0) {
        return nl(
          "Great question! As your workspace intelligence agent, I can answer both **project-specific** and **general** questions.",
          ctx.projectName
            ? `For your project **${ctx.projectName}** (${ctx.completionRate}% complete), try asking about:`
            : "Try asking me about:",
          "",
          "• Project progress and status",
          "• Risk analysis and blockers",
          "• Sprint planning",
          "• Task prioritization",
          "• Architecture and tech stack",
          "",
          "Or ask me anything about software development!"
        );
      }
      return nl(
        "I'm your autonomous workspace agent! I investigate your data before every answer.",
        "",
        "Try asking me about:",
        "• **Project management** — planning, tracking, delivery",
        "• **Software development** — architecture, best practices, debugging",
        "• **Sprint planning** — velocity, task selection, capacity",
        "",
        "Or create a project and I'll start tracking everything for you."
      );
    }
  }
}

// ─── SEND MESSAGE (AGENT ORCHESTRATOR) ───────────────────────────────────────

/** Send a message and get a response — always uses workspace context */
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

    // ── STEP 1: GATHER FULL WORKSPACE CONTEXT ──
    const context = await gatherWorkspaceContext(ctx, user._id, conversation.projectId ?? undefined);

    // ── STEP 2: DETECT INTENT ──
    const intent = detectIntent(q);

    // ── STEP 3: GENERATE CONTEXTUAL RESPONSE ──
    const response = generateSmartResponse(intent, q, context);

    messages.push({
      role: "assistant" as const,
      content: response,
      timestamp: Date.now(),
    });

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
