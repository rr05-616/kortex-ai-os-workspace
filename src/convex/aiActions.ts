"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/** Call Gemini API and return the response text, or null on failure */
async function callGemini(apiKey: string, systemPrompt: string, userMessage: string, history?: Array<{ role: string; content: string }>): Promise<string | null> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({
      history: history?.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      })).slice(-10) || [],
    });

    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  } catch (err) {
    console.error("Gemini API error:", err);
    return null;
  }
}

/** Build comprehensive system prompt with full workspace context */
function buildAgentPrompt(ctx: {
  userName?: string;
  projectName?: string;
  projectDescription?: string;
  projectStatus?: string;
  healthScore?: number;
  sprintDuration?: number;
  stage: string;
  tasks: Array<{ title: string; status: string; priority: string; description?: string; aiRiskScore?: number; dueDate?: number; estimatedHours?: number }>;
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
  sprints: Array<{ name: string; status: string; goal?: string; taskCount: number; completedTasks: number }>;
  activeSprint?: { name: string; goal?: string; taskCount: number; completedTasks: number };
  analyses: Array<{ name: string; type: string; score: number; stage: string; summary: string; strengths: string[]; weaknesses: string[]; recommendations: string[] }>;
  recentConversations: Array<{ summary: string; timestamp: number }>;
  comments: Array<{ taskTitle: string; content: string; isAI: boolean }>;
}): string {
  const taskLines = ctx.tasks.length > 0
    ? ctx.tasks.map((t) => `- "${t.title}" [${t.status}] priority:${t.priority}${t.aiRiskScore && t.aiRiskScore > 0.7 ? " ⚠️HIGH_RISK" : ""}${t.dueDate && t.dueDate < Date.now() && t.status !== "done" ? " ⏰OVERDUE" : ""}`).join("\n")
    : "No tasks yet.";

  const sprintInfo = ctx.sprints.length > 0
    ? ctx.sprints.map((s) => `- ${s.name} [${s.status}] — ${s.completedTasks}/${s.taskCount} tasks${s.goal ? ` — Goal: ${s.goal}` : ""}`).join("\n")
    : "No sprints defined.";

  const activeSprintInfo = ctx.activeSprint
    ? `\nACTIVE SPRINT: ${ctx.activeSprint.name} — ${ctx.activeSprint.completedTasks}/${ctx.activeSprint.taskCount} tasks done${ctx.activeSprint.goal ? ` — "${ctx.activeSprint.goal}"` : ""}`
    : "\nNo active sprint.";

  const analysisInfo = ctx.analyses.length > 0
    ? ctx.analyses.map((a) => `- ${a.name}: Score ${a.score}/100 [${a.stage}] — ${a.summary.slice(0, 100)}`).join("\n")
    : "No repository analysis available.";

  const overdueTasks = ctx.tasks.filter((t) => t.dueDate && t.dueDate < Date.now() && t.status !== "done");
  const overdueInfo = overdueTasks.length > 0
    ? `\nOVERDUE TASKS:\n${overdueTasks.map((t) => `- "${t.title}" [${t.status}] — due ${new Date(t.dueDate!).toLocaleDateString()}`).join("\n")}`
    : "";

  const riskTasks = ctx.tasks.filter((t) => (t.aiRiskScore ?? 0) > 0.7);
  const riskInfo = riskTasks.length > 0
    ? `\nHIGH-RISK TASKS:\n${riskTasks.map((t) => `- "${t.title}" [${t.status}] priority:${t.priority}`).join("\n")}`
    : "";

  return `You are **KORTEX AI**, an advanced AI Project Intelligence Agent embedded inside the KORTEX AI Operating System. You are NOT a generic chatbot — you are an AI teammate that deeply understands the user's entire workspace.

IDENTITY:
- You are a Senior Technical Program Manager + Senior Software Architect + AI Engineer
- You proactively recommend improvements, detect risks, and suggest next actions
- You always respond with specific data from the workspace, never generic answers
- Your tone is professional, concise, technical, and helpful

USER: ${ctx.userName || "User"}

${ctx.projectName ? `ACTIVE PROJECT: "${ctx.projectName}"
Description: ${ctx.projectDescription || "No description"}
Status: ${ctx.projectStatus}
Health Score: ${ctx.healthScore ?? "N/A"}%
Stage: ${ctx.stage}
Completion: ${ctx.completionRate}%
Sprint Duration: ${ctx.sprintDuration ?? 14} days` : `WORKSPACE OVERVIEW:
${ctx.totalProjects} project${ctx.totalProjects !== 1 ? "s" : ""} (${ctx.activeProjects} active)
Total Tasks: ${ctx.totalTasks} (${ctx.totalDone} done, ${ctx.totalInProgress} in progress, ${ctx.totalTodo} todo, ${ctx.totalBacklog} backlog, ${ctx.totalReview} in review)`}

TASKS (${ctx.totalTasks} total, ${ctx.completionRate}% complete):
${taskLines}
${overdueInfo}${riskInfo}

SPRINTS:
${sprintInfo}${activeSprintInfo}

REPOSITORY ANALYSIS:
${analysisInfo}

CRITICAL NUMBERS:
- Completion: ${ctx.completionRate}% (${ctx.totalDone}/${ctx.totalTasks})
- In Progress: ${ctx.totalInProgress}
- Todo: ${ctx.totalTodo}
- Backlog: ${ctx.totalBacklog}
- In Review: ${ctx.totalReview}
- High-Risk: ${ctx.totalRisk}
- Overdue: ${ctx.totalOverdue}

BEHAVIOR RULES:
1. NEVER respond with generic text like "You can ask me about..." or "I can help with..." — ALWAYS use the actual data above.
2. When asked "how is my project", give specific numbers: tasks, completion %, health, risks, overdue, sprint status.
3. When asked "what should I build next", analyze priorities, dependencies, and sprint capacity to give a specific recommendation.
4. When asked "explain my project", describe the tech stack, architecture, features, and current state using the data.
5. When asked to create a sprint, suggest which tasks to include based on priority and capacity.
6. When asked about risks, name the specific risky tasks and explain why.
7. Be proactive — if you see overdue tasks, mention them. If completion is low, suggest breaking tasks down.
8. Use markdown formatting: **bold** for emphasis, bullet points for lists, numbered steps for plans.
9. For general questions (coding, architecture), answer helpfully but always tie it back to the workspace context when relevant.
10. If the workspace is empty, guide the user to create their first project and tasks.
11. Never say "I don't have access to data" — you have full workspace context above.
12. Keep responses concise (3-6 sentences) unless the user asks for detail.
13. When detecting the user is asking about something specific to their project, always reference actual task names, numbers, and status.`;
}

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
    if (!apiKey) return null;

    const api = (await import("./_generated/api")).api;

    // Gather comprehensive workspace context
    let context = {
      userName: undefined as string | undefined,
      projectName: undefined as string | undefined,
      projectDescription: undefined as string | undefined,
      projectStatus: undefined as string | undefined,
      healthScore: undefined as number | undefined,
      sprintDuration: undefined as number | undefined,
      stage: "Planning",
      tasks: [] as Array<{ title: string; status: string; priority: string; description?: string; aiRiskScore?: number; dueDate?: number; estimatedHours?: number }>,
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
      sprints: [] as Array<{ name: string; status: string; goal?: string; taskCount: number; completedTasks: number }>,
      activeSprint: undefined as { name: string; goal?: string; taskCount: number; completedTasks: number } | undefined,
      analyses: [] as Array<{ name: string; type: string; score: number; stage: string; summary: string; strengths: string[]; weaknesses: string[]; recommendations: string[] }>,
      recentConversations: [] as Array<{ summary: string; timestamp: number }>,
      comments: [] as Array<{ taskTitle: string; content: string; isAI: boolean }>,
    };

    if (args.projectId) {
      // Project-scoped context
      const project = await ctx.runQuery(api.projects.get, { projectId: args.projectId });
      if (project) {
        context.userName = (await ctx.runQuery(api.users.currentUser))?.name;
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
      }));
      context.totalTasks = tasks.length;
      context.totalDone = tasks.filter((t) => t.status === "done").length;
      context.totalInProgress = tasks.filter((t) => t.status === "in_progress").length;
      context.totalTodo = tasks.filter((t) => t.status === "todo").length;
      context.totalBacklog = tasks.filter((t) => t.status === "backlog").length;
      context.totalReview = tasks.filter((t) => t.status === "in_review").length;
      context.totalRisk = tasks.filter((t) => (t.aiRiskScore ?? 0) > 0.7).length;
      context.totalOverdue = tasks.filter((t) => t.dueDate && t.dueDate < Date.now() && t.status !== "done").length;
      context.completionRate = context.totalTasks > 0 ? Math.round((context.totalDone / context.totalTasks) * 100) : 0;

      if (context.completionRate >= 80) context.stage = "Wrapping Up";
      else if (context.completionRate >= 50) context.stage = "Execution";
      else if (context.completionRate >= 20) context.stage = "Active Development";
      else if (context.totalTasks > 0) context.stage = "Early Stage";
      else context.stage = "Planning";

      // Gather sprints
      try {
        const sprints = await ctx.runQuery(api.sprints.list, { projectId: args.projectId });
        context.sprints = sprints.map((s) => ({
          name: s.name,
          status: s.status,
          goal: s.goal,
          taskCount: s.taskCount,
          completedTasks: s.completedTasks,
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

    } else {
      // Global workspace context
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
          context.totalRisk += tasks.filter((t) => (t.aiRiskScore ?? 0) > 0.7).length;
          context.totalOverdue += tasks.filter((t) => t.dueDate && t.dueDate < Date.now() && t.status !== "done").length;
          context.tasks = context.tasks.concat(tasks.map((t) => ({
            title: t.title,
            status: t.status,
            priority: t.priority,
            description: t.description,
            aiRiskScore: t.aiRiskScore,
            dueDate: t.dueDate,
            estimatedHours: t.estimatedHours,
          })));
        } catch { /* skip failed project */ }
      }
      context.completionRate = context.totalTasks > 0 ? Math.round((context.totalDone / context.totalTasks) * 100) : 0;
      if (context.completionRate >= 80) context.stage = "Wrapping Up";
      else if (context.completionRate >= 50) context.stage = "Execution";
      else if (context.completionRate >= 20) context.stage = "Active Development";
      else if (context.totalTasks > 0) context.stage = "Early Stage";
      else context.stage = "Planning";
    }

    const systemPrompt = buildAgentPrompt(context);

    // Build conversation history for Gemini chat
    const history = args.conversationHistory?.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    return await callGemini(apiKey, systemPrompt, args.userMessage, history);
  },
});
