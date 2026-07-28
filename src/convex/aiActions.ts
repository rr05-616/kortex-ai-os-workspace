"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
          .slice(-20) ?? [],
    });

    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  } catch (err) {
    console.error("Gemini API error:", err);
    return null;
  }
}

// ─── CONTEXT TYPES ───────────────────────────────────────────────────────────

interface TaskData {
  title: string;
  status: string;
  priority: string;
  description?: string;
  aiRiskScore?: number;
  dueDate?: number;
  estimatedHours?: number;
  tags?: string[];
}

interface SprintData {
  name: string;
  status: string;
  goal?: string;
  taskCount: number;
  completedTasks: number;
  startDate: number;
  endDate: number;
}

interface AnalysisData {
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
}

interface ContextData {
  userName?: string;
  projectName?: string;
  projectDescription?: string;
  projectStatus?: string;
  healthScore?: number;
  sprintDuration?: number;
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

// ─── FOLLOW-UP DETECTION ─────────────────────────────────────────────────────

/**
 * Detect if a short message is a follow-up to the previous assistant response.
 * If so, return the resolved full query. Otherwise return null.
 */
function detectFollowUp(
  message: string,
  history: Array<{ role: string; content: string }>
): string | null {
  const msg = message.toLowerCase().trim();

  // Only classify as follow-up if the message is short (< 15 words)
  const wordCount = msg.split(/\s+/).length;
  if (wordCount > 15) return null;

  // Must have a previous assistant message to reference
  const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
  if (!lastAssistant) return null;

  // Extract key topics from the last assistant response
  const prevContent = lastAssistant.content.toLowerCase();

  // Follow-up patterns
  const followUpPatterns: Array<{ patterns: string[]; resolver: (prev: string) => string }> = [
    {
      patterns: ["why", "why?", "why is that", "explain why", "tell me why"],
      resolver: (prev) => `Explain the reasoning behind: ${prev.slice(0, 200)}`,
    },
    {
      patterns: ["how", "how?", "how do i", "how does", "how can"],
      resolver: (prev) => `Provide implementation details for: ${prev.slice(0, 200)}`,
    },
    {
      patterns: ["continue", "go on", "keep going", "next", "what else", "and?"],
      resolver: (prev) => `Continue the previous analysis. What else should I know about: ${prev.slice(0, 200)}`,
    },
    {
      patterns: ["explain", "explain that", "explain it", "tell me more", "elaborate", "details"],
      resolver: (prev) => `Give more detail about: ${prev.slice(0, 200)}`,
    },
    {
      patterns: ["do it", "start", "begin", "let's do it", "proceed", "go ahead", "start now"],
      resolver: (prev) => `Execute the recommended action from: ${prev.slice(0, 200)}`,
    },
    {
      patterns: ["review", "review that", "review it", "check that", "check this"],
      resolver: (prev) => `Review and analyze in depth: ${prev.slice(0, 200)}`,
    },
    {
      patterns: ["improve", "improve it", "make it better", "optimize", "optimize it"],
      resolver: (prev) => `Suggest improvements for: ${prev.slice(0, 200)}`,
    },
    {
      patterns: ["create", "create it", "make it", "generate", "build it"],
      resolver: (prev) => `Generate a detailed plan for: ${prev.slice(0, 200)}`,
    },
    {
      patterns: ["move", "move it", "move this", "reorder"],
      resolver: (prev) => `Suggest reordering or moving based on: ${prev.slice(0, 200)}`,
    },
    {
      patterns: ["what about", "what about that", "what about this"],
      resolver: (prev) => `Address the follow-up regarding: ${prev.slice(0, 200)}`,
    },
  ];

  for (const { patterns, resolver } of followUpPatterns) {
    if (patterns.some((p) => msg === p || msg.startsWith(p))) {
      return resolver(prevContent);
    }
  }

  return null;
}

// ─── INTENT DETECTION ────────────────────────────────────────────────────────

const greetings = [
  "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
  "what's up", "sup", "yo", "howdy", "greetings",
];

function detectIntent(q: string): string {
  const msg = q.toLowerCase();
  if (greetings.some((g) => msg.startsWith(g) || msg === g)) return "greeting";
  if (msg.match(/^(who|what) are you|your name|tell me about yourself/)) return "identity";
  if (msg.match(/help|what can you do|capabilities|features|commands/)) return "help";
  if (msg.match(/progress|status|stage|how.*going|how.*project|completion|health/)) return "progress";
  if (msg.match(/risk|block|issue|problem|stuck|danger|warning|overdue|delayed/)) return "risk";
  if (msg.match(/suggest|recommend|improve|better|advice|tip|optimize/)) return "suggest";
  if (msg.match(/sprint|plan|roadmap|backlog|milestone|release|velocity|velocity/)) return "sprint";
  if (msg.match(/task|todo|create|add|make|new|breakdown|break down/)) return "task";
  if (msg.match(/team|member|collaborat|assign|workload/)) return "team";
  if (msg.match(/analy|metric|score|report|summary|dashboard/)) return "analytics";
  if (msg.match(/architect|structure|folder|file|component|service|module|tech stack/)) return "architecture";
  if (msg.match(/thank|thanks|thx|appreciate/)) return "thanks";
  if (msg.match(/bye|goodbye|see you|later|exit/)) return "farewell";
  if (msg.match(/explain|why|how does|what is/)) return "explain";
  if (msg.match(/create|generate|write|build|implement/)) return "create";
  if (msg.match(/review|check|inspect|audit/)) return "review";
  return "general";
}

// ─── SYSTEM PROMPT BUILDER ───────────────────────────────────────────────────

function buildAgentSystemPrompt(ctx: ContextData, conversationHistory: Array<{ role: string; content: string }>): string {
  const nl = (...lines: string[]) => lines.filter(Boolean).join("\n");

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
                `  Weaknesses: ${a.weaknesses.slice(0, 3).join("; ")}`
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
            (t) => `- "${t.title}" [${t.status}] — due ${new Date(t.dueDate!).toLocaleDateString()}`
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
            (t) => `- "${t.title}" [${t.status}] priority:${t.priority} risk:${Math.round((t.aiRiskScore ?? 0) * 100)}%`
          )
        )
      : "";

  // Build conversation history summary for context
  const recentConversation = conversationHistory.length > 0
    ? nl(
        "",
        "RECENT CONVERSATION (for context continuity):",
        ...conversationHistory.slice(-10).map(
          (m) => `[${m.role === "user" ? "User" : "Agent"}]: ${m.content.slice(0, 300)}${m.content.length > 300 ? "..." : ""}`
        )
      )
    : "";

  return nl(
    "You are KORTEX AI — an autonomous workspace intelligence agent embedded in the KORTEX AI Operating System.",
    "You are NOT a chatbot. You are an AI Senior Technical Program Manager + Software Architect + AI Engineer.",
    "",
    "═══ CRITICAL RULES ═══",
    "1. NEVER respond with generic text like 'You can ask me about...', 'I can help with...', 'Try asking me about...'",
    "2. NEVER advertise your capabilities or list what you can do.",
    "3. NEVER restart the conversation or treat follow-ups as new conversations.",
    "4. ALWAYS answer using the actual workspace data provided below.",
    "5. If the workspace has tasks/sprints/projects, reference them by NAME with specific numbers.",
    "6. For general knowledge questions, answer helpfully but tie back to workspace context when relevant.",
    "7. For follow-up questions ('why?', 'continue', 'explain that'), CONTINUE the previous analysis — do NOT restart.",
    "8. Be proactive — naturally mention overdue tasks, low completion, and blockers.",
    "9. Keep responses concise (3-8 sentences) unless the user asks for detail.",
    "10. Always end with a specific actionable next step or question.",
    "",
    "═══ RESPONSE STYLE ═══",
    "- Use markdown: bold for key terms, bullets for lists, numbered steps for plans",
    "- Reference specific task names, numbers, statuses, and dates from the data",
    "- Every response must include: what I found → my analysis → recommendation → next action",
    "- Tone: Professional, concise, technical, actionable — like a senior engineering manager",
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
          `  Backlog: ${ctx.totalBacklog} | In Review: ${ctx.totalReview}`
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
    "",
    "═══ CRITICAL METRICS ═══",
    `Completion: ${ctx.completionRate}% (${ctx.totalDone}/${ctx.totalTasks})`,
    `In Progress: ${ctx.totalInProgress}`,
    `Todo: ${ctx.totalTodo}`,
    `Backlog: ${ctx.totalBacklog}`,
    `In Review: ${ctx.totalReview}`,
    `High-Risk: ${ctx.totalRisk}`,
    `Overdue: ${ctx.totalOverdue}`,
    recentConversation,
    "",
    "═══ INTENT HANDLING ═══",
    "When the user asks a FOLLOW-UP question (like 'why?', 'continue', 'explain that', 'do it'):",
    "  - Check the CONVERSATION HISTORY above to understand what was just discussed",
    "  - Continue THAT specific analysis — do NOT restart or give a new overview",
    "  - Reference the specific topics/tasks/recommendations from your previous response",
    "",
    "When the user asks a NEW question:",
    "  - Investigate the workspace data above",
    "  - Generate a response grounded in actual numbers and task names",
    "  - Always end with a clear next step",
    "",
    "When the workspace is empty (no tasks/projects):",
    "  - Guide the user to create their first project and add tasks",
    "  - Be helpful but don't fabricate data",
    "",
    "When the user asks a GENERAL knowledge question:",
    "  - Answer it directly with your knowledge",
    "  - If it relates to the workspace, connect it to their actual project data",
    "  - Never say 'I don't have access to data' — you have full context"
  );
}

// ─── MAIN ACTION ─────────────────────────────────────────────────────────────

/**
 * Generate a response using Gemini with full workspace context and conversation memory.
 * If Gemini is unavailable, falls back to rule-based responses that are NEVER generic.
 */
export const generateResponse = action({
  args: {
    projectId: v.optional(v.string()),
    userMessage: v.string(),
    conversationHistory: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
      })
    ),
    context: v.object({
      userName: v.optional(v.string()),
      projectName: v.optional(v.string()),
      projectDescription: v.optional(v.string()),
      projectStatus: v.optional(v.string()),
      healthScore: v.optional(v.number()),
      sprintDuration: v.optional(v.number()),
      stage: v.string(),
      tasks: v.array(
        v.object({
          title: v.string(),
          status: v.string(),
          priority: v.string(),
          description: v.optional(v.string()),
          aiRiskScore: v.optional(v.number()),
          dueDate: v.optional(v.number()),
          estimatedHours: v.optional(v.number()),
          tags: v.optional(v.array(v.string())),
        })
      ),
      totalTasks: v.number(),
      totalDone: v.number(),
      totalInProgress: v.number(),
      totalTodo: v.number(),
      totalBacklog: v.number(),
      totalReview: v.number(),
      totalRisk: v.number(),
      totalOverdue: v.number(),
      completionRate: v.number(),
      totalProjects: v.number(),
      activeProjects: v.number(),
      sprints: v.array(
        v.object({
          name: v.string(),
          status: v.string(),
          goal: v.optional(v.string()),
          taskCount: v.number(),
          completedTasks: v.number(),
          startDate: v.number(),
          endDate: v.number(),
        })
      ),
      activeSprint: v.optional(
        v.object({
          name: v.string(),
          goal: v.optional(v.string()),
          taskCount: v.number(),
          completedTasks: v.number(),
        })
      ),
      analyses: v.array(
        v.object({
          url: v.string(),
          name: v.string(),
          type: v.string(),
          score: v.number(),
          stage: v.string(),
          summary: v.string(),
          strengths: v.array(v.string()),
          weaknesses: v.array(v.string()),
          techStack: v.object({
            frontend: v.array(v.string()),
            backend: v.array(v.string()),
            database: v.array(v.string()),
            cloud: v.array(v.string()),
            ai: v.array(v.string()),
          }),
          architecture: v.string(),
        })
      ),
    }),
  },
  handler: async (_, args) => {
    const ctxData = args.context as ContextData;
    const message = args.userMessage;
    const history = args.conversationHistory;

    // ── STEP 1: DETECT FOLLOW-UP ──
    const followUpQuery = detectFollowUp(message, history);
    const effectiveQuery = followUpQuery || message;
    const isFollowUp = followUpQuery !== null;

    // ── STEP 2: DETECT INTENT ──
    const intent = detectIntent(message.toLowerCase());

    // ── STEP 3: TRY GEMINI FIRST ──
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const systemPrompt = buildAgentSystemPrompt(ctxData, history);
      const result = await callGemini(apiKey, systemPrompt, effectiveQuery, history);
      if (result && result.length > 10) {
        return result;
      }
    }

    // ── STEP 4: RULE-BASED FALLBACK (NEVER GENERIC) ──
    return generateRuleBasedResponse(intent, message, ctxData, isFollowUp, history);
  },
});

// ─── RULE-BASED RESPONSES (NEVER GENERIC) ────────────────────────────────────

function nl(...lines: string[]) {
  return lines.filter(Boolean).join("\n");
}

function generateRuleBasedResponse(
  intent: string,
  message: string,
  ctx: ContextData,
  isFollowUp: boolean,
  history: Array<{ role: string; content: string }>
): string {
  // For follow-ups, always reference previous context
  const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
  const contextPrefix = isFollowUp && lastAssistant
    ? `Based on our previous discussion:\n\n`
    : "";

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
        "Ask me anything about your workspace — I'll give you specific answers with real numbers."
      );

    case "help":
      return nl(
        `**${ctx.projectName ? "Project" : "Workspace"} Intelligence Active:**`,
        "",
        `📊 **Status:** ${ctx.totalTasks} tasks, ${ctx.completionRate}% complete, ${ctx.totalRisk} at risk`,
        ctx.activeSprint ? `🏃 **Sprint:** ${ctx.activeSprint.name} — ${ctx.activeSprint.completedTasks}/${ctx.activeSprint.taskCount} done` : "",
        ctx.analyses.length > 0 ? `🏗️ **Repository:** ${ctx.analyses[0].name} — Score: ${ctx.analyses[0].score}/100` : "",
        "",
        "Ask me anything — I'll investigate your data and give you specific, actionable answers."
      );

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
          "Your workspace is healthy. Keep monitoring deadlines and task priorities to maintain this status."
        );
      }
      const lines: string[] = [];
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
          suggestions.push("Your workflow looks solid! Consider setting up sprint goals if you haven't already.");
        }
      }
      return `**My Recommendations:**\n\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
    }

    case "sprint": {
      const readyTasks = ctx.tasks.filter((t) => t.status === "backlog" || t.status === "todo");
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
      return nl(
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

    case "explain":
    case "create":
    case "review": {
      // For explain/create/review intents, provide workspace-specific guidance
      if (ctx.totalTasks > 0) {
        const highPriority = ctx.tasks.filter((t) => t.priority === "critical" || t.priority === "high").slice(0, 3);
        return nl(
          contextPrefix,
          `Based on your current workspace (${ctx.completionRate}% complete):`,
          "",
          highPriority.length > 0
            ? `**High-priority items:** ${highPriority.map((t) => `"${t.title}" [${t.status}]`).join(", ")}`
            : `**Current tasks:** ${ctx.totalTasks} total, ${ctx.totalInProgress} in progress`,
          "",
          "What specific aspect would you like me to focus on?"
        );
      }
      return nl(
        "I'd be happy to help! Your workspace is currently empty.",
        "Create a project and add tasks, and I'll be able to give you specific, data-driven answers."
      );
    }

    case "general":
    default: {
      // For general questions, provide workspace-aware responses
      if (ctx.totalTasks > 0) {
        const activeTasks = ctx.tasks.filter((t) => t.status === "in_progress");
        return nl(
          contextPrefix,
          `I can help with that! Here's what I see in your workspace:`,
          "",
          `📊 **Current State:** ${ctx.completionRate}% complete, ${ctx.totalTasks} tasks total`,
          activeTasks.length > 0 ? `🔄 **Active:** ${activeTasks.map((t) => `"${t.title}"`).join(", ")}` : "",
          ctx.totalRisk > 0 ? `⚠️ **Risks:** ${ctx.totalRisk} high-risk tasks` : "",
          ctx.totalOverdue > 0 ? `⏰ **Overdue:** ${ctx.totalOverdue} tasks` : "",
          "",
          "What would you like me to investigate or explain?"
        );
      }
      return nl(
        `I can help with that! Your workspace has ${ctx.totalProjects} project${ctx.totalProjects !== 1 ? "s" : ""}.`,
        "",
        "Ask me about:",
        "• Project progress and health status",
        "• Risk analysis and blockers",
        "• Sprint planning and task prioritization",
        "• Architecture and tech stack",
        "• Or any software development question"
      );
    }
  }
}
