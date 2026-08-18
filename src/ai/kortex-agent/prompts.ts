/**
 * KORTEX AI Agent — System Prompts
 *
 * The agent prompt that instructs Gemini how to behave as a
 * project-management copilot with access to live workspace tools.
 */

import type { WorkspaceContext, ConversationMemory } from "./types";

// ─── AGENT SYSTEM PROMPT ─────────────────────────────────────────────────────

export function buildAgentPrompt(ctx: WorkspaceContext, memory: ConversationMemory): string {
  const nl = (...lines: string[]) => lines.filter(Boolean).join("\n");

  const taskLines =
    ctx.tasks.length > 0
      ? ctx.tasks
          .map((t) => {
            let line = `- "${t.title}" [${t.status.replace("_", " ")}] priority:${t.priority}`;
            if (t.aiRiskScore && t.aiRiskScore > 0.7) line += " ⚠️HIGH_RISK";
            if (t.dueDate && t.dueDate < Date.now() && t.status !== "done") line += " ⏰OVERDUE";
            if (t.estimatedHours) line += ` ~${t.estimatedHours}h`;
            if (t.assigneeId) line += ` assigned:${t.assigneeId}`;
            if (t.tags && t.tags.length > 0) line += ` [${t.tags.join(", ")}]`;
            if (t.description) line += ` — ${t.description.slice(0, 80)}`;
            return line;
          })
          .join("\n")
      : "No tasks yet.";

  const sprintLines =
    ctx.sprints.length > 0
      ? ctx.sprints
          .map(
            (s) =>
              `- ${s.name} [${s.status}] — ${s.completedTasks ?? 0}/${s.taskCount ?? 0} done` +
              `${s.goal ? ` — Goal: "${s.goal}"` : ""}` +
              ` (${new Date(s.startDate).toLocaleDateString()} → ${new Date(s.endDate).toLocaleDateString()})`
          )
          .join("\n")
      : "No sprints defined.";

  const analysisInfo =
    ctx.analyses.length > 0
      ? ctx.analyses
          .map(
            (a) =>
              nl(
                `- Repository: ${a.url}`,
                `  Type: ${a.type} | Score: ${a.score}/100 | Stage: ${a.stage}`,
                `  Architecture: ${a.architecture.slice(0, 120)}`,
                `  Tech: FE=[${a.techStack.frontend.join(", ")}] BE=[${a.techStack.backend.join(", ")}] DB=[${a.techStack.database.join(", ")}]`,
                `  Strengths: ${a.strengths.slice(0, 3).join("; ")}`,
                `  Weaknesses: ${a.weaknesses.slice(0, 3).join("; ")}`
              )
          )
          .join("\n")
      : "No repository analysis available.";

  const memoryContext = nl(
    memory.recentTopics.length > 0 ? `Recent topics: ${memory.recentTopics.join(", ")}` : "",
    memory.discussedProjects.length > 0 ? `Projects discussed: ${memory.discussedProjects.slice(0, 5).join(", ")}` : "",
    memory.discussedTasks.length > 0 ? `Tasks discussed: ${memory.discussedTasks.slice(0, 5).join(", ")}` : "",
    memory.lastAction ? `Last action: ${memory.lastAction}` : ""
  );

  return nl(
    "You are KORTEX AI — an intelligent project-management copilot. You are NOT a chatbot.",
    "You have access to the user's workspace data through tools and can perform actions.",
    "",
    "═══ CRITICAL RULES ═══",
    "1. NEVER respond with generic text like 'You can ask me about...', 'I can help with...', 'Try asking me about...'",
    "2. NEVER advertise capabilities. Just use them.",
    "3. NEVER restart conversations or treat follow-ups as new conversations.",
    "4. ALWAYS use the actual workspace data below to answer.",
    "5. When referencing data, use specific names and numbers.",
    "6. For follow-ups, CONTINUE the previous analysis — do NOT restart.",
    "7. Be proactive — naturally mention overdue tasks, blockers, low completion.",
    "8. Format: WHAT I found → WHY it matters → WHAT to do next.",
    "9. Every response must be specific, actionable, and grounded in real data.",
    "10. For questions you can answer from workspace data, answer directly.",
    "11. For action requests (create, assign, update), respond with a JSON action block.",
    "",
    "═══ ACTION FORMAT ═══",
    "When the user wants to perform an action, respond with:",
    '{"action":"<type>","data":{...}}',
    "",
    "Supported actions:",
    '- create_task: {"action":"create_task","data":{"title":"...","projectId":"...","priority":"...","status":"...","description":"..."}}',
    '- update_task: {"action":"update_task","data":{"taskId":"...","status":"...","priority":"..."}}',
    '- navigate: {"action":"navigate","data":{"route":"/projects"}}',
    "",
    "When performing an action, also include a natural-language message above the JSON.",
    "Example:",
    'I\'ll create that task for you.\n{"action":"create_task","data":{"title":"Fix login bug","projectId":"abc123","priority":"high"}}',
    "",
    "═══ RESPONSE STYLE ═══",
    "- Markdown: **bold** for key terms, • bullets for lists, numbered steps for plans",
    "- Reference specific task names, numbers, statuses from the data",
    "- Tone: Professional, concise, technical, actionable — like a senior engineering manager",
    "- Maximum 5-8 sentences unless the user asks for detail",
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
          `Completion: ${ctx.completionRate}%`
        )
      : nl(
          "═══ WORKSPACE OVERVIEW ═══",
          `Projects: ${ctx.totalProjects} total (${ctx.activeProjects} active)`,
          `Tasks: ${ctx.totalTasks} total`,
          `  Done: ${ctx.totalDone} | In Progress: ${ctx.totalInProgress} | Todo: ${ctx.totalTodo}`,
          `  Backlog: ${ctx.totalBacklog} | In Review: ${ctx.totalReview}`,
          `  High-Risk: ${ctx.totalRisk} | Overdue: ${ctx.totalOverdue}`
        ),
    "",
    "═══ TASKS ═══",
    taskLines,
    "",
    "═══ SPRINTS ═══",
    sprintLines,
    "",
    ctx.activeSprint
      ? nl(
          "═══ ACTIVE SPRINT ═══",
          `Name: ${ctx.activeSprint.name}`,
          `Goal: ${ctx.activeSprint.goal ?? "Not set"}`,
          `Progress: ${ctx.activeSprint.completedTasks}/${ctx.activeSprint.taskCount} tasks done`
        )
      : "No active sprint.",
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
    "",
    "═══ CONVERSATION MEMORY ═══",
    memoryContext || "Fresh conversation — no previous context.",
    "",
    "═══ INTENT HANDLING ═══",
    "For FOLLOW-UP questions:",
    "  - Continue the previous analysis, do NOT restart",
    "  - Reference specific topics from the previous response",
    "",
    "For ACTION requests (create task, assign, navigate):",
    "  - Parse the action parameters from the user's message",
    "  - If a required parameter is missing, ask for it",
    "  - Output a JSON action block above",
    "",
    "For NEW questions:",
    "  - Investigate the workspace data above",
    "  - Give a response grounded in actual numbers and task names",
    "  - Always end with a clear next step",
    "",
    "For GENERAL knowledge questions:",
    "  - Answer directly with your knowledge",
    "  - Connect to workspace context when relevant",
    "  - Never say 'I don't have access to data' — you have full context"
  );
}

// ─── LOCAL RESPONSE FALLBACK ─────────────────────────────────────────────────

export function buildLocalFallback(
  message: string,
  ctx: WorkspaceContext,
  memory: ConversationMemory
): string {
  const nl = (...lines: string[]) => lines.filter(Boolean).join("\n");
  const msg = message.toLowerCase().trim();

  // Greetings
  if (msg.match(/^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy|yo|sup)/)) {
    if (ctx.projectName) {
      return nl(
        `Hey ${ctx.userName ?? "there"}! 👋`,
        "",
        `Working on **${ctx.projectName}** — currently at **${ctx.completionRate}% completion**.`,
        ctx.totalRisk > 0 ? `⚠️ **${ctx.totalRisk}** high-risk task${ctx.totalRisk !== 1 ? "s" : ""} need${ctx.totalRisk === 1 ? "s" : ""} attention.` : "",
        ctx.totalOverdue > 0 ? `⏰ **${ctx.totalOverdue}** overdue task${ctx.totalOverdue !== 1 ? "s" : ""}.` : "",
        "",
        "What would you like to focus on today?"
      );
    }
    if (ctx.totalProjects > 0) {
      return nl(
        `Welcome back, ${ctx.userName ?? "there"}! 👋`,
        "",
        `Your workspace has **${ctx.totalProjects} project${ctx.totalProjects !== 1 ? "s" : ""}** with **${ctx.totalTasks} task${ctx.totalTasks !== 1 ? "s" : ""}**.`,
        ctx.totalRisk > 0 ? `⚠️ **${ctx.totalRisk}** high-risk task${ctx.totalRisk !== 1 ? "s" : ""} need attention.` : "",
        "",
        "Ready to dive into your workspace?"
      );
    }
    return nl(
      `Welcome to KORTEX AI, ${ctx.userName ?? "there"}! 👋`,
      "",
      "I'm your workspace intelligence agent.",
      "Let's start by creating your first project.",
      "",
      "What are you building?"
    );
  }

  // What should I work on
  if (msg.match(/what.*work.*next|what.*should.*i.*do|what.*to.*do|next.*task|next.*step|priorit/)) {
    const parts: string[] = [];
    parts.push("**Next Action Recommendation:**");
    if (ctx.totalTasks === 0) {
      parts.push("No tasks yet. Create your first task to get started.");
    } else if (ctx.totalRisk > 0) {
      const riskTasks = ctx.tasks.filter((t) => (t.aiRiskScore ?? 0) > 0.7).slice(0, 3);
      parts.push(`You have **${ctx.totalRisk} high-risk task${ctx.totalRisk !== 1 ? "s" : ""}** that need immediate attention.`);
      parts.push("", "**Priority tasks:**");
      riskTasks.forEach((t) => parts.push(`• "${t.title}" [${t.status}] — Risk: ${Math.round((t.aiRiskScore ?? 0) * 100)}%`));
    } else if (ctx.totalOverdue > 0) {
      parts.push(`You have **${ctx.totalOverdue} overdue task${ctx.totalOverdue !== 1 ? "s" : ""}** blocking progress.`);
    } else if (ctx.totalInProgress > 3) {
      parts.push(`You have **${ctx.totalInProgress} tasks in progress**, which may reduce focus.`);
      parts.push(`Consider limiting WIP to 2-3 tasks for better throughput.`);
    } else {
      const nextTasks = ctx.tasks.filter((t) => t.status === "todo" || t.status === "backlog").slice(0, 3);
      parts.push(`Your workspace is well-balanced at **${ctx.completionRate}% completion**.`);
      if (nextTasks.length > 0) {
        parts.push("", "**Next up:**");
        nextTasks.forEach((t) => parts.push(`• "${t.title}" [${t.priority}]`));
      }
    }
    return parts.join("\n");
  }

  // Project status
  if (msg.match(/project.*status|health|progress|how.*going|where.*stand|completion|stage/)) {
    return nl(
      `**Project Health — ${ctx.projectName ?? "Workspace"}:**`,
      "",
      `• **Stage:** ${ctx.stage}`,
      `• **Completion:** ${ctx.completionRate}% (${ctx.totalDone}/${ctx.totalTasks} tasks)`,
      `• **In Progress:** ${ctx.totalInProgress} task${ctx.totalInProgress !== 1 ? "s" : ""}`,
      ctx.totalRisk > 0 ? `• ⚠️ **High Risk:** ${ctx.totalRisk} task${ctx.totalRisk !== 1 ? "s" : ""}` : "",
      ctx.totalOverdue > 0 ? `• ⏰ **Overdue:** ${ctx.totalOverdue} task${ctx.totalOverdue !== 1 ? "s" : ""}` : ""
    );
  }

  // Risk
  if (msg.match(/risk|block|stuck|issue|problem|danger|warning|overdue|bottleneck/)) {
    if (ctx.totalRisk === 0 && ctx.totalOverdue === 0) {
      return "**All clear!** ✅ No high-risk or overdue tasks detected.";
    }
    const parts: string[] = ["**Risk Analysis:**"];
    if (ctx.totalRisk > 0) {
      const riskTasks = ctx.tasks.filter((t) => (t.aiRiskScore ?? 0) > 0.7).slice(0, 5);
      parts.push("", `⚠️ **High-Risk Tasks (${ctx.totalRisk}):**`);
      riskTasks.forEach((t) => parts.push(`• "${t.title}" [${t.status}] — Risk: ${Math.round((t.aiRiskScore ?? 0) * 100)}%`));
    }
    if (ctx.totalOverdue > 0) {
      const overdueTasks = ctx.tasks.filter((t) => t.dueDate && t.dueDate < Date.now() && t.status !== "done").slice(0, 5);
      parts.push("", `⏰ **Overdue Tasks (${ctx.totalOverdue}):**`);
      overdueTasks.forEach((t) => parts.push(`• "${t.title}" — Due: ${new Date(t.dueDate!).toLocaleDateString()}`));
    }
    return parts.join("\n");
  }

  // Sprint
  if (msg.match(/sprint|plan|roadmap|backlog|milestone|release|velocity/)) {
    return nl(
      "**Sprint Planning:**",
      "",
      `• **Ready tasks:** ${ctx.tasks.filter((t) => t.status === "backlog" || t.status === "todo").length}`,
      `• **Completion rate:** ${ctx.completionRate}%`,
      ctx.activeSprint ? `• **Active sprint:** ${ctx.activeSprint.name} — ${ctx.activeSprint.completedTasks}/${ctx.activeSprint.taskCount} done` : "",
      "",
      "**Recommendation:**",
      "1. Include 20% buffer for unexpected issues",
      "2. Balance quick wins with larger features",
      "3. Set clear, measurable sprint goals"
    );
  }

  // Navigation
  if (msg.match(/open|go to|show|take me|navigate|take me to/)) {
    if (msg.match(/analytics|metrics|charts/)) return "I'll take you to the analytics page.";
    if (msg.match(/project/)) return "I'll navigate to your projects.";
    if (msg.match(/sprint/)) return "I'll open the sprints view.";
    if (msg.match(/dashboard|home|main/)) return "I'll take you to the dashboard.";
    return "Which area would you like me to open? I can navigate to: Dashboard, Projects, Sprints, or Analytics.";
  }

  // Help
  if (msg.match(/help|what can you|capabilities|features|commands/)) {
    return nl(
      `**Your Workspace:**`,
      `📊 ${ctx.totalTasks} tasks, ${ctx.completionRate}% complete`,
      ctx.activeSprint ? `🏃 Sprint: ${ctx.activeSprint.name}` : "",
      "",
      "Ask me anything — I investigate your data before every response.",
      "",
      "**I can:**",
      "• Analyze project health and risks",
      "• Recommend what to work on next",
      "• Create and assign tasks",
      "• Navigate the application",
      "• Sprint planning and prioritization"
    );
  }

  // Create task
  if (msg.match(/create|generate|add.*task|new.*task/)) {
    const title = message.replace(/create|generate|add|new|task/gi, "").trim();
    if (title.length > 3) {
      return nl(
        `I'll create a task called **"${title}"**.`,
        "",
        "Which project should I add it to?"
      );
    }
    return nl(
      "I can create tasks for you.",
      "Tell me the task title, and I'll add it to your current project.",
      "",
      "Example: \"Create a task for fixing the login bug\""
    );
  }

  // Thanks
  if (msg.match(/thank|thanks|thx|appreciate|great|perfect|awesome/)) {
    return "You're welcome! 😊 I'm here whenever you need help with your workspace.";
  }

  // Farewell
  if (msg.match(/bye|goodbye|see you|later|exit|quit/)) {
    return "See you later! 👋 I'll keep monitoring your workspace. Come back anytime!";
  }

  // Default
  if (ctx.totalTasks > 0) {
    return nl(
      `**Workspace Overview:**`,
      `• **${ctx.projectName ?? "Your projects"}** — ${ctx.completionRate}% complete (${ctx.stage})`,
      `• ${ctx.totalDone} done, ${ctx.totalInProgress} in progress, ${ctx.totalTasks - ctx.totalDone - ctx.totalInProgress} remaining`,
      ctx.totalRisk > 0 ? `• ⚠️ ${ctx.totalRisk} high-risk tasks` : "",
      "",
      "Ask me about: project status, risks, sprint planning, task priorities, or navigation."
    );
  }
  return nl(
    "I can help you manage your workspace.",
    "",
    "Try asking me:",
    "• What should I work on next?",
    "• How is my project doing?",
    "• Show me overdue tasks",
    "• Open analytics"
  );
}
