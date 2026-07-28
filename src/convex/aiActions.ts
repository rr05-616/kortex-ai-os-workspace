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
    : context.totalProjects > 0
      ? `You are assisting with the user's portfolio of ${context.totalProjects} projects.`
      : "The user is new and hasn't created any projects yet.";

  return `You are KORTEX AI, an intelligent and friendly project management copilot for software teams. You are embedded inside the KORTEX AI Operating System.

${projectInfo}

CURRENT WORKSPACE DATA:
- Completion: ${context.completionRate}% (${context.totalDone}/${context.totalTasks} tasks done)
- In progress: ${context.totalInProgress}
- High-risk tasks: ${context.totalRisk}

${context.tasks.length > 0 ? `TASKS:\n${taskSummary}` : ""}

YOUR CAPABILITIES:
- Project management advice and best practices
- Sprint planning and agile coaching
- Task breakdown and prioritization
- Risk analysis and mitigation strategies
- General software development guidance
- Code architecture discussions
- Team productivity tips
- Any general question the user has

BEHAVIOR RULES:
1. Be conversational, friendly, and helpful — like a knowledgeable colleague.
2. Keep responses concise (2-5 sentences) unless the user asks for detail.
3. When asked about the project/workspace, reference the real data above.
4. When asked general questions (coding, architecture, best practices), answer naturally and helpfully.
5. For greetings, respond warmly and offer to help.
6. Use markdown formatting: **bold** for emphasis, bullet points for lists.
7. Be proactive — if you notice potential issues in the data, mention them.
8. Never say "I can't help with that" — always try to be useful.
9. You can help with anything: coding questions, project advice, career guidance, etc.
10. Sign off as KORTEX AI when appropriate.`;
}

/** Call Gemini API and return the response text, or null on failure */
async function callGemini(apiKey: string, systemPrompt: string, userMessage: string): Promise<string | null> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    });
    const result = await model.generateContent(userMessage);
    return result.response.text();
  } catch (err) {
    console.error("Gemini API error:", err);
    return null;
  }
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
      // No API key — return null so frontend uses built-in intelligence
      return null;
    }

    // Gather project context using runQuery
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
      const projects = await ctx.runQuery(
        (await import("./_generated/api")).api.projects.list,
        {}
      );
      context.totalProjects = projects.length;

      // Gather task stats across all projects
      for (const p of projects) {
        const tasks = await ctx.runQuery(
          (await import("./_generated/api")).api.tasks.list,
          { projectId: p._id }
        );
        context.totalTasks += tasks.length;
        context.totalDone += tasks.filter((t) => t.status === "done").length;
        context.totalInProgress += tasks.filter((t) => t.status === "in_progress").length;
        context.totalRisk += tasks.filter((t) => (t.aiRiskScore ?? 0) > 0.7).length;
      }
      context.completionRate = context.totalTasks > 0 ? Math.round((context.totalDone / context.totalTasks) * 100) : 0;
    }

    const systemPrompt = buildSystemPrompt(context);

    // Build prompt with conversation history
    let prompt = args.userMessage;
    if (args.conversationHistory && args.conversationHistory.length > 0) {
      const historyText = args.conversationHistory
        .slice(-10)
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n\n");
      prompt = `Previous conversation:\n${historyText}\n\nUser: ${args.userMessage}`;
    }

    return await callGemini(apiKey, systemPrompt, prompt);
  },
});
