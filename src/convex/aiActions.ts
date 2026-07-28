"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * KORTEX AI Agent — Gemini-powered workspace intelligence.
 *
 * Before every LLM call, we gather ALL workspace data (projects, tasks,
 * sprints, analyses, comments, notifications) and inject it as system
 * context so the model never gives generic answers.
 */

// ─── GEMINI WRAPPER ──────────────────────────────────────────────────────────

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  history?: Array<{ role: string; content: string }>
): Promise<string | null> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({
      history:
        history
          ?.map((m) => ({
            role: m.role === "user" ? ("user" as const) : ("model" as const),
            parts: [{ text: m.content }],
          }))
          .slice(-10) ?? [],
    });

    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  } catch (err) {
    console.error("Gemini API error:", err);
    return null;
  }
}

// ─── CONTEXT BUILDER ─────────────────────────────────────────────────────────

function nl(...lines: string[]) {
  return lines.filter(Boolean).join("\n");
}

interface ContextData {
  userName?: string;
  projectName?: string;
  projectDescription?: string;
  projectStatus?: string;
  healthScore?: number;
  sprintDuration?: number;
  stage: string;
  tasks: Array<{
    title: string;
    status: string;
    priority: string;
    description?: string;
    aiRiskScore?: number;
    dueDate?: number;
    estimatedHours?: number;
    tags?: string[];
    aiGenerated?: boolean;
  }>;
  totalTasks: number;
  totalDone: number;
  totalInProgress: number;
  totalTodo: number;
  totalBacklog: number;
  totalReview: number;
  totalCancelled: number;
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
  activeSprint?: {
    name: string;
    goal?: string;
    taskCount: number;
    completedTasks: number;
  };
  analyses: Array<{
    url: string;
    name: string;
    type: string;
    score: number;
    stage: string;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    techStack: {
      frontend: string[];
      backend: string[];
      database: string[];
      cloud: string[];
      ai: string[];
    };
    architecture: string;
  }>;
  recentActivity: Array<{ title: string; type: string; timestamp: number }>;
  comments: Array<{ taskTitle: string; content: string; isAI: boolean }>;
}

function computeStage(completionRate: number, totalTasks: number): string {
  if (totalTasks === 0) return "Planning";
  if (completionRate >= 90) return "Wrapping Up";
  if (completionRate >= 70) return "Execution";
  if (completionRate >= 40) return "Active Development";
  if (completionRate >= 15) return "Early Stage";
  return "Kickoff";
}

function buildAgentSystemPrompt(ctx: ContextData): string {
  const taskLines =
    ctx.tasks.length > 0
      ? ctx.tasks
          .map(
            (t) =>
              `- "${t.title}" [${t.status.replace("_", " ")}] priority:${t.priority}` +
              `${t.aiRiskScore && t.aiRiskScore > 0.7 ? " ⚠️HIGH_RISK" : ""}` +
              `${t.dueDate && t.dueDate < Date.now() && t.status !== "done" ? " ⏰OVERDUE" : ""}` +
              `${t.estimatedHours ? ` ~${t.estimatedHours}h` : ""}` +
              `${t.tags && t.tags.length > 0 ? ` [${t.tags.join(", ")}]` : ""}` +
              `${t.description ? ` — ${t.description.slice(0, 80)}` : ""}`
          )
          .join("\n")
      : "No tasks yet.";

  const sprintLines =
    ctx.sprints.length > 0
      ? ctx.sprints
          .map(
            (s) =>
              `- ${s.name} [${s.status}] — ${s.completedTasks}/${s.taskCount} done` +
              `${s.goal ? ` — Goal: "${s.goal}"` : ""}` +
              ` (${new Date(s.startDate).toLocaleDateString()} → ${new Date(s.endDate).toLocaleDateString()})`
          )
          .join("\n")
      : "No sprints defined.";

  const activeSprintInfo = ctx.activeSprint
    ? nl(
        "",
        "ACTIVE SPRINT:",
        `  Name: ${ctx.activeSprint.name}`,
        `  Goal: ${ctx.activeSprint.goal ?? "Not set"}`,
        `  Progress: ${ctx.activeSprint.completedTasks}/${ctx.activeSprint.taskCount} tasks done`
      )
    : "\nNo active sprint.";

  const analysisInfo =
    ctx.analyses.length > 0
      ? ctx.analyses
          .map(
            (a) =>
              nl(
                `- Repository: ${a.url}`,
                `  Type: ${a.type} | Score: ${a.score}/100 | Stage: ${a.stage}`,
                `  Architecture: ${a.architecture.slice(0, 120)}`,
                `  Tech: FE=[${a.techStack.frontend.join(", ")}] BE=[${a.techStack.backend.join(", ")}] DB=[${a.techStack.database.join(", ")}] Cloud=[${a.techStack.cloud.join(", ")}]`,
                `  Strengths: ${a.strengths.slice(0, 3).join("; ")}`,
                `  Weaknesses: ${a.weaknesses.slice(0, 3).join("; ")}`,
                `  Recommendations: ${a.recommendations.slice(0, 3).join("; ")}`
              )
          )
          .join("\n")
      : "No repository analysis available.";

  const overdueTasks = ctx.tasks.filter(
    (t) => t.dueDate && t.dueDate < Date.now() && t.status !== "done"
  );
  const overdueInfo =
    overdueTasks.length > 0
      ? nl(
          "",
          "⏰ OVERDUE TASKS:",
          ...overdueTasks.map(
            (t) =>
              `- "${t.title}" [${t.status}] — due ${new Date(t.dueDate!).toLocaleDateString()}`
          )
        )
      : "";

  const riskTasks = ctx.tasks.filter((t) => (t.aiRiskScore ?? 0) > 0.7);
  const riskInfo =
    riskTasks.length > 0
      ? nl(
          "",
          "⚠️ HIGH-RISK TASKS:",
          ...riskTasks.map(
            (t) =>
              `- "${t.title}" [${t.status}] priority:${t.priority} risk:${Math.round((t.aiRiskScore ?? 0) * 100)}%`
          )
        )
      : "";

  const activityInfo =
    ctx.recentActivity.length > 0
      ? nl(
          "",
          "RECENT ACTIVITY:",
          ...ctx.recentActivity.slice(0, 10).map(
            (a) =>
              `- [${a.type}] ${a.title} (${new Date(a.timestamp).toLocaleDateString()})`
          )
        )
      : "";

  return nl(
    "You are KORTEX AI — an autonomous workspace intelligence agent embedded in the KORTEX AI Operating System.",
    "You are NOT a chatbot. You are an AI Senior Technical Program Manager + Software Architect + AI Engineer.",
    "",
    "═══ IDENTITY ═══",
    "- Proactively identify risks, suggest improvements, and recommend next actions",
    "- Every response MUST use actual workspace data — NEVER generic filler",
    "- Reference specific task names, numbers, statuses, and dates",
    "- Tone: Professional, concise, technical, actionable",
    "- Format: Use markdown (bold, bullets, numbered steps, code blocks when relevant)",
    "",
    "═══ USER ═══",
    `Name: ${ctx.userName ?? "User"}`,
    "",
    ctx.projectName
      ? nl(
          "═══ ACTIVE PROJECT ═══",
          `Name: "${ctx.projectName}"`,
          `Description: ${ctx.projectDescription ?? "No description"}`,
          `Status: ${ctx.projectStatus}`,
          `Health Score: ${ctx.healthScore ?? "N/A"}%`,
          `Stage: ${ctx.stage}`,
          `Completion: ${ctx.completionRate}%`,
          `Sprint Duration: ${ctx.sprintDuration ?? 14} days`
        )
      : nl(
          "═══ WORKSPACE OVERVIEW ═══",
          `Projects: ${ctx.totalProjects} total (${ctx.activeProjects} active)`,
          `Tasks: ${ctx.totalTasks} total`,
          `  Done: ${ctx.totalDone} | In Progress: ${ctx.totalInProgress} | Todo: ${ctx.totalTodo}`,
          `  Backlog: ${ctx.totalBacklog} | In Review: ${ctx.totalReview} | Cancelled: ${ctx.totalCancelled}`
        ),
    "",
    "═══ TASKS ═══",
    taskLines,
    overdueInfo,
    riskInfo,
    "",
    "═══ SPRINTS ═══",
    sprintLines,
    activeSprintInfo,
    "",
    "═══ REPOSITORY ANALYSIS ═══",
    analysisInfo,
    activityInfo,
    "",
    "═══ CRITICAL METRICS ═══",
    `Completion: ${ctx.completionRate}% (${ctx.totalDone}/${ctx.totalTasks})`,
    `In Progress: ${ctx.totalInProgress}`,
    `Todo: ${ctx.totalTodo}`,
    `Backlog: ${ctx.totalBacklog}`,
    `In Review: ${ctx.totalReview}`,
    `High-Risk: ${ctx.totalRisk}`,
    `Overdue: ${ctx.totalOverdue}`,
    "",
    "═══ BEHAVIOR RULES ═══",
    "1. NEVER respond with generic text like 'You can ask me about...' — ALWAYS use the actual data above.",
    "2. When asked about progress, give specific numbers: tasks, completion %, health, risks, overdue.",
    "3. When asked what to build next, analyze priorities, dependencies, and sprint capacity.",
    "4. When asked to explain the project, describe tech stack, architecture, features, current state.",
    "5. When asked about risks, name specific risky tasks and explain why they're risky.",
    "6. When asked to create a sprint, suggest specific tasks based on priority and capacity.",
    "7. Be proactive — mention overdue tasks, low completion, and blockers naturally.",
    "8. For general coding/architecture questions, answer helpfully but tie back to workspace when relevant.",
    "9. If the workspace is empty, guide the user to create their first project and add tasks.",
    "10. Never say 'I don't have access to data' — you have full workspace context.",
    "11. Keep responses concise (3-8 sentences) unless the user asks for detail.",
    "12. When detecting project-specific questions, always reference actual task names and numbers.",
    "13. Detect intent: progress/status, risk/blockers, suggestions, sprint planning, task management, general help.",
    "14. For sprint planning: recommend which tasks to include, estimate velocity, identify dependencies.",
    "15. For risk analysis: identify high-risk tasks, overdue items, blocked work, and suggest mitigations."
  );
}

// ─── INTENT DETECTION ────────────────────────────────────────────────────────

const greetings = [
  "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
  "what's up", "sup", "yo", "howdy", "greetings",
];

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

// ─── SMART RULE-BASED RESPONSES (FALLBACK) ───────────────────────────────────

function nl2(...lines: string[]) {
  return lines.filter(Boolean).join("\n");
}

function generateSmartResponse(
  intent: string,
  q: string,
  ctx: ContextData
): string {
  switch (intent) {
    case "greeting": {
      if (ctx.projectName) {
        return nl2(
          `Hey! 👋 I'm your AI workspace agent for **${ctx.projectName}**.`,
          ctx.totalTasks > 0
            ? `Currently at **${ctx.completionRate}% completion** with **${ctx.totalTasks} tasks** — ${ctx.totalInProgress} in progress, ${ctx.totalRisk} at risk.`
            : "This project doesn't have any tasks yet — let's get started!",
          "",
          "I deeply understand your project. Ask me anything about progress, risks, sprints, architecture, or next steps."
        );
      }
      if (ctx.totalProjects > 0) {
        return nl2(
          `Hey there! 👋 Welcome back to KORTEX AI.`,
          `Your workspace has **${ctx.totalProjects} project${ctx.totalProjects !== 1 ? "s" : ""}** with **${ctx.totalTasks} task${ctx.totalTasks !== 1 ? "s" : ""}**.`,
          ctx.totalInProgress > 0 ? `${ctx.totalInProgress} task${ctx.totalInProgress !== 1 ? "s are" : " is"} in progress.` : "No tasks in progress right now.",
          ctx.totalRisk > 0 ? `⚠️ **${ctx.totalRisk}** high-risk tasks need attention.` : "",
          "",
          "I'm your autonomous workspace agent. Ask me anything — I'll investigate your data first."
        );
      }
      return nl2(
        "Hey there! 👋 I'm **KORTEX AI** — your autonomous workspace intelligence agent.",
        "",
        "I'm not a chatbot. I investigate your entire workspace before answering every question.",
        "Create your first project and I'll start tracking everything automatically."
      );
    }

    case "identity":
      return nl2(
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
      return nl2(
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
          ? nl2(
              `**${ctx.projectName}** has no tasks yet.`,
              "Create some tasks from the project dashboard and I'll start tracking your progress automatically."
            )
          : nl2(
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
      return nl2(
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
        return nl2(
          "✅ **All clear!** No high-risk or overdue tasks detected.",
          "Your workspace is healthy. Keep monitoring deadlines and task priorities to maintain this status."
        );
      }
      const lines = [];
      if (ctx.totalOverdue > 0) {
        lines.push(`⏰ **${ctx.totalOverdue} Overdue Task${ctx.totalOverdue !== 1 ? "s" : ""}:**`);
        ctx.tasks
          .filter((t) => t.dueDate && t.dueDate < Date.now() && t.status !== "done")
          .slice(0, 5)
          .forEach((t) => {
            lines.push(`• **"${t.title}"** — ${t.status.replace("_", " ")}, due ${new Date(t.dueDate!).toLocaleDateString()}`);
          });
      }
      if (ctx.totalRisk > 0) {
        lines.push("", `⚠️ **${ctx.totalRisk} High-Risk Task${ctx.totalRisk !== 1 ? "s" : ""}:**`);
        ctx.tasks
          .filter((t) => (t.aiRiskScore ?? 0) > 0.7)
          .slice(0, 5)
          .forEach((t) => {
            lines.push(`• **"${t.title}"** — ${t.status.replace("_", " ")}, priority:${t.priority}, risk:${Math.round((t.aiRiskScore ?? 0) * 100)}%`);
          });
      }
      lines.push(
        "",
        "**My recommendation:** Review these tasks immediately. Consider breaking them into smaller pieces, adding buffer time, or escalating blockers."
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
          suggestions.push("Document what went well for future reference.");
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
          suggestions.push(`Re-prioritize the ${ctx.totalOverdue} overdue task${ctx.totalOverdue !== 1 ? "s" : ""} — they may block other work.`);
        }
        if (suggestions.length === 0) {
          suggestions.push("Your workflow looks solid! Keep up the great work.");
          suggestions.push("Consider setting up sprint goals if you haven't already.");
        }
      }
      return `**My Recommendations:**\n\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
    }

    case "sprint": {
      const readyTasks = ctx.tasks.filter(
        (t) => t.status === "backlog" || t.status === "todo"
      );
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
        readyTasks.slice(0, 5).forEach((t) => {
          lines.push(`• "${t.title}" [${t.priority}]`);
        });
      }
      return lines.join("\n");
    }

    case "task": {
      const statusCounts: Record<string, number> = {};
      ctx.tasks.forEach((t) => {
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
      return nl2(
        "**Workspace Analytics:**",
        "",
        `📊 **Completion Rate: ${ctx.completionRate}%**`,
        `• Total Tasks: ${ctx.totalTasks}`,
        `• Completed: ${ctx.totalDone}`,
        `• In Progress: ${ctx.totalInProgress}`,
        `• Risk Score: ${ctx.totalRisk > 0 ? `⚠️ ${ctx.totalRisk} high-risk tasks` : "✅ Low risk"}`,
        `• Velocity: ${ctx.totalDone > 0 ? `${ctx.totalDone} tasks completed` : "No completed tasks yet"}`,
        ctx.sprints.length > 0 ? `\n🏃 **Sprints: ${ctx.sprints.length}** (${ctx.sprints.filter((s) => s.status === "active").length} active)` : ""
      );
    }

    case "architecture": {
      if (ctx.analyses.length > 0) {
        const a = ctx.analyses[0];
        return nl2(
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
          `• AI: ${a.techStack.ai.join(", ") || "Not detected"}`,
          "",
          `**Strengths:** ${a.strengths.join("; ")}`,
          `**Weaknesses:** ${a.weaknesses.join("; ")}`
        );
      }
      return nl2(
        "**No repository analysis found.**",
        "Import a project using the 'Import Project' button to get AI-powered architecture analysis."
      );
    }

    case "team":
      return nl2(
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
        return nl2(
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
      return nl2(
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

// ─── PUBLIC ACTION ────────────────────────────────────────────────────────────

/** Generate AI response using Gemini with full workspace context */
export const generateResponse = action({
  args: {
    projectId: v.optional(v.id("projects")),
    userMessage: v.string(),
    conversationHistory: v.optional(
      v.array(
        v.object({
          role: v.union(v.literal("user"), v.literal("assistant")),
          content: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const api = (await import("./_generated/api")).api;

    // ── GATHER FULL WORKSPACE CONTEXT ──────────────────────────────────
    const context: ContextData = {
      stage: "Planning",
      tasks: [],
      totalTasks: 0,
      totalDone: 0,
      totalInProgress: 0,
      totalTodo: 0,
      totalBacklog: 0,
      totalReview: 0,
      totalCancelled: 0,
      totalRisk: 0,
      totalOverdue: 0,
      completionRate: 0,
      totalProjects: 0,
      activeProjects: 0,
      sprints: [],
      analyses: [],
      recentActivity: [],
      comments: [],
    };

    if (args.projectId) {
      // ── PROJECT-SCOPED CONTEXT ──
      const project = await ctx.runQuery(api.projects.get, { projectId: args.projectId });
      const user = await ctx.runQuery(api.users.currentUser);
      if (project) {
        context.userName = user?.name;
        context.projectName = project.name;
        context.projectDescription = project.description;
        context.projectStatus = project.status;
        context.healthScore = project.healthScore;
        context.sprintDuration = project.sprintDuration;
        context.totalProjects = 1;
        context.activeProjects = project.status === "active" ? 1 : 0;
      }

      const tasks = await ctx.runQuery(api.tasks.list, { projectId: args.projectId });
      context.tasks = tasks.map((t) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        description: t.description,
        aiRiskScore: t.aiRiskScore,
        dueDate: t.dueDate,
        estimatedHours: t.estimatedHours,
        tags: t.tags,
        aiGenerated: t.aiGenerated,
      }));
      context.totalTasks = tasks.length;
      context.totalDone = tasks.filter((t) => t.status === "done").length;
      context.totalInProgress = tasks.filter((t) => t.status === "in_progress").length;
      context.totalTodo = tasks.filter((t) => t.status === "todo").length;
      context.totalBacklog = tasks.filter((t) => t.status === "backlog").length;
      context.totalReview = tasks.filter((t) => t.status === "in_review").length;
      context.totalCancelled = tasks.filter((t) => t.status === "cancelled").length;
      context.totalRisk = tasks.filter((t) => (t.aiRiskScore ?? 0) > 0.7).length;
      context.totalOverdue = tasks.filter(
        (t) => t.dueDate && t.dueDate < Date.now() && t.status !== "done"
      ).length;
      context.completionRate =
        context.totalTasks > 0 ? Math.round((context.totalDone / context.totalTasks) * 100) : 0;

      context.stage = computeStage(context.completionRate, context.totalTasks);

      // Gather sprints
      try {
        const sprints = await ctx.runQuery(api.sprints.list, { projectId: args.projectId });
        context.sprints = sprints.map((s) => ({
          name: s.name,
          status: s.status,
          goal: s.goal,
          taskCount: s.taskCount,
          completedTasks: s.completedTasks,
          startDate: s.startDate,
          endDate: s.endDate,
        }));
        const activeSprint = sprints.find((s) => s.status === "active");
        if (activeSprint) {
          context.activeSprint = {
            name: activeSprint.name,
            goal: activeSprint.goal,
            taskCount: activeSprint.taskCount,
            completedTasks: activeSprint.completedTasks,
          };
        }
      } catch { /* sprints may not exist */ }

      // Gather project analyses
      try {
        const analyses = await ctx.runQuery(
          // @ts-expect-error query may not be generated yet
          api.projectScanner?.listByProject ?? (() => []),
          { projectId: args.projectId }
        );
        if (analyses && analyses.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          context.analyses = analyses.map((a: any) => ({
            url: a.url,
            name: a.repoInfo?.name ?? "Repository",
            type: a.urlType,
            score: a.scores?.overall ?? 0,
            stage: a.recommendations?.developmentStage ?? "Unknown",
            summary: a.analysis?.executiveSummary ?? "",
            strengths: a.recommendations?.strengths ?? [],
            weaknesses: a.recommendations?.weaknesses ?? [],
            recommendations: a.recommendations?.immediate ?? [],
            techStack: a.analysis?.techStack ?? { frontend: [], backend: [], database: [], cloud: [], ai: [] },
            architecture: a.analysis?.architecture ?? "Not analyzed",
          }));
        }
      } catch { /* analyses may not exist */ }
    } else {
      // ── GLOBAL WORKSPACE CONTEXT ──
      const user = await ctx.runQuery(api.users.currentUser);
      context.userName = user?.name;

      const projects = await ctx.runQuery(api.projects.list, {});
      context.totalProjects = projects.length;
      context.activeProjects = projects.filter((p) => p.status === "active").length;

      for (const p of projects) {
        try {
          const tasks = await ctx.runQuery(api.tasks.list, { projectId: p._id });
          context.totalTasks += tasks.length;
          context.totalDone += tasks.filter((t) => t.status === "done").length;
          context.totalInProgress += tasks.filter((t) => t.status === "in_progress").length;
          context.totalTodo += tasks.filter((t) => t.status === "todo").length;
          context.totalBacklog += tasks.filter((t) => t.status === "backlog").length;
          context.totalReview += tasks.filter((t) => t.status === "in_review").length;
          context.totalCancelled += tasks.filter((t) => t.status === "cancelled").length;
          context.totalRisk += tasks.filter((t) => (t.aiRiskScore ?? 0) > 0.7).length;
          context.totalOverdue += tasks.filter(
            (t) => t.dueDate && t.dueDate < Date.now() && t.status !== "done"
          ).length;
          context.tasks = context.tasks.concat(
            tasks.map((t) => ({
              title: t.title,
              status: t.status,
              priority: t.priority,
              description: t.description,
              aiRiskScore: t.aiRiskScore,
              dueDate: t.dueDate,
              estimatedHours: t.estimatedHours,
              tags: t.tags,
              aiGenerated: t.aiGenerated,
            }))
          );

          // Gather sprints per project
          try {
            const sprints = await ctx.runQuery(api.sprints.list, { projectId: p._id });
            context.sprints = context.sprints.concat(
              sprints.map((s) => ({
                name: `${p.name} / ${s.name}`,
                status: s.status,
                goal: s.goal,
                taskCount: s.taskCount,
                completedTasks: s.completedTasks,
                startDate: s.startDate,
                endDate: s.endDate,
              }))
            );
          } catch { /* skip */ }
        } catch { /* skip failed project */ }
      }

      context.completionRate =
        context.totalTasks > 0 ? Math.round((context.totalDone / context.totalTasks) * 100) : 0;
      context.stage = computeStage(context.completionRate, context.totalTasks);
    }

    // ── TRY GEMINI FIRST ──────────────────────────────────────────────
    if (apiKey) {
      const systemPrompt = buildAgentSystemPrompt(context);
      const history = args.conversationHistory?.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const geminiResponse = await callGemini(apiKey, systemPrompt, args.userMessage, history);
      if (geminiResponse) return geminiResponse;
    }

    // ── FALLBACK: SMART RULE-BASED RESPONSES ──────────────────────────
    const intent = detectIntent(args.userMessage.toLowerCase());
    return generateSmartResponse(intent, args.userMessage.toLowerCase(), context);
  },
});
