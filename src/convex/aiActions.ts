"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/** Build the system prompt with full project/workspace context */
function buildSystemPrompt(context: {
  projectName?: string;
  projectStatus?: string;
  tasks: Array<{ title: string; status: string; priority: string; description?: string; aiRiskScore?: number }>;
  totalProjects: number;
  totalTasks: number;
  totalDone: number;
  totalInProgress: number;
  totalRisk: number;
  completionRate: number;
  stage?: string;
}): string {
  const taskSummary = context.tasks.length > 0
    ? context.tasks.map((t) => `- "${t.title}" [${t.status}] priority:${t.priority}${t.aiRiskScore && t.aiRiskScore > 0.7 ? " ⚠️HIGH_RISK" : ""}`).join("\n")
    : "No tasks yet.";

  const projectInfo = context.projectName
    ? `You are assisting with project "${context.projectName}" (status: ${context.projectStatus}, stage: ${context.stage}).`
    : `You are assisting with the user's portfolio of ${context.totalProjects} projects.`;

  return `You are KORTEX AI, an intelligent project management copilot for software teams. You are a helpful, concise, and proactive AI assistant embedded inside a project management operating system.

${projectInfo}

CURRENT DATA:
- Completion: ${context.completionRate}% (${context.totalDone}/${context.totalTasks} tasks done)
- In progress: ${context.totalInProgress}
- High-risk tasks: ${context.totalRisk}

TASKS:
${taskSummary}

BEHAVIOR RULES:
1. Be concise but helpful — aim for 2-4 sentences unless the user asks for detail.
2. Always reference real data from the project. Never make up tasks or numbers.
3. Use markdown formatting: **bold** for emphasis, bullet points for lists.
4. For progress/status questions, give a clear summary with completion %.
5. For risk questions, list specific risky tasks and suggest mitigations.
6. For suggestions, give actionable, specific recommendations based on the actual task state.
7. For sprint planning, suggest task prioritization based on status and priority.
8. If asked something unrelated to project management, briefly answer and redirect to project topics.
9. You can suggest creating new tasks, changing priorities, or reorganizing work.
10. Never say "I don't have access to data" — you have full project context above.`;
}

/** Call Gemini API and return the response text */
async function callGemini(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent(userMessage);
  const response = result.response;
  return response.text();
}

/** Generate AI response using Gemini API with full project context */
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
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured. Add it in the Convex dashboard under Settings → Environment Variables.");
    }

    // Gather project context using runQuery (actions can call queries)
    let context = {
      projectName: undefined as string | undefined,
      projectStatus: undefined as string | undefined,
      stage: undefined as string | undefined,
      tasks: [] as Array<{ title: string; status: string; priority: string; description?: string; aiRiskScore?: number }>,
      totalProjects: 0,
      totalTasks: 0,
      totalDone: 0,
      totalInProgress: 0,
      totalRisk: 0,
      completionRate: 0,
    };

    if (args.projectId) {
      // Project-scoped context
      const project = await ctx.runQuery(
        (await import("./_generated/api")).api.projects.get,
        { projectId: args.projectId }
      );
      if (project) {
        context.projectName = project.name;
        context.projectStatus = project.status;
      }

      const tasks = await ctx.runQuery(
        (await import("./_generated/api")).api.tasks.list,
        { projectId: args.projectId }
      );

      context.tasks = tasks.map((t) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        description: t.description,
        aiRiskScore: t.aiRiskScore,
      }));
      context.totalTasks = tasks.length;
      context.totalDone = tasks.filter((t) => t.status === "done").length;
      context.totalInProgress = tasks.filter((t) => t.status === "in_progress").length;
      context.totalRisk = tasks.filter((t) => (t.aiRiskScore ?? 0) > 0.7).length;
      context.completionRate = context.totalTasks > 0 ? Math.round((context.totalDone / context.totalTasks) * 100) : 0;

      if (context.completionRate >= 80) context.stage = "Wrapping Up";
      else if (context.completionRate >= 50) context.stage = "Execution";
      else if (context.completionRate >= 20) context.stage = "Active Development";
      else if (context.totalTasks > 0) context.stage = "Early Stage";
      else context.stage = "Planning";
    } else {
      // Global workspace context
      const insights = await ctx.runQuery(
        (await import("./_generated/api")).api.ai.getGlobalInsights,
        {}
      );
      if (insights) {
        context.totalProjects = insights.totalProjects;
        context.totalTasks = insights.totalTasks;
        context.totalDone = insights.totalDone;
        context.totalInProgress = insights.totalInProgress;
        context.totalRisk = insights.totalRisk;
        context.completionRate = insights.globalCompletion;
      }
    }

    const systemPrompt = buildSystemPrompt(context);

    // Build the prompt with conversation history
    let prompt = args.userMessage;
    if (args.conversationHistory && args.conversationHistory.length > 0) {
      const historyText = args.conversationHistory
        .slice(-10) // Last 10 messages for context
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n\n");
      prompt = `Previous conversation:\n${historyText}\n\nUser: ${args.userMessage}`;
    }

    // Call Gemini
    const response = await callGemini(apiKey, systemPrompt, prompt);
    return response;
  },
});
