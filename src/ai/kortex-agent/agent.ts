/**
 * KORTEX AI Agent — Main Agent Loop
 *
 * The core reasoning engine that processes user messages through:
 * INTENT → ENTITY DETECTION → CONTEXT → TOOL SELECTION → REASONING → RESPONSE
 */

import type {
  WorkspaceContext,
  ConversationMemory,
  Intent,
  AgentResponse,
  AgentStep,
} from "./types";
import { detectIntent } from "./planner";
import { selectToolsForIntent, searchWorkspace } from "./tools";
import { extractMemoryFromHistory } from "./memory";

// ─── AGENT PIPELINE ──────────────────────────────────────────────────────────

export interface AgentInput {
  userMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
  context: WorkspaceContext;
  currentRoute?: string;
}

export interface AgentOutput {
  response: AgentResponse;
  steps: AgentStep[];
  intent: Intent;
  memory: ConversationMemory;
}

/**
 * Run the full agent pipeline for a user message.
 *
 * 1. Detect intent from the message
 * 2. Extract conversational memory from history
 * 3. Select relevant tools based on intent
 * 4. Gather workspace context summary
 * 5. Build the reasoning payload for the AI backend
 * 6. The AI backend (Gemini) handles the final response generation
 *    with the agent system prompt + workspace context + tools
 */
export function runAgentPipeline(input: AgentInput): AgentOutput {
  const { userMessage, conversationHistory, context, currentRoute } = input;
  const steps: AgentStep[] = [];

  // ── STEP 1: DETECT INTENT ──
  steps.push({ type: "searching", label: "Detecting intent..." });
  const intent = detectIntent(userMessage);

  // ── STEP 2: EXTRACT CONVERSATIONAL MEMORY ──
  steps.push({ type: "reading", label: "Reading conversation history..." });
  const memory = extractMemoryFromHistory(conversationHistory);

  // ── STEP 3: SELECT TOOLS ──
  const selectedTools = selectToolsForIntent(intent);

  // ── STEP 4: BUILD CONTEXT SUMMARY ──
  steps.push({ type: "analyzing", label: "Analyzing workspace context..." });
  const contextSummary = buildContextSummary(context, intent, memory);

  // ── STEP 5: CHECK FOR NAVIGATION ──
  if (intent === "navigate") {
    const navResult = detectNavigation(userMessage);
    if (navResult) {
      steps.push({ type: "generating", label: "Preparing navigation..." });
      return {
        response: {
          type: "navigation",
          message: `I'll take you to ${navResult.label}.`,
          route: navResult.route,
          routeLabel: navResult.label,
        },
        steps,
        intent,
        memory,
      };
    }
  }

  // ── STEP 6: CHECK FOR ACTION ──
  if (intent === "task_create") {
    const actionResult = detectTaskCreation(userMessage, context);
    if (actionResult) {
      steps.push({ type: "tool_call", label: "Creating task..." });
      return {
        response: {
          type: "action",
          message: `I'll create a task called "${actionResult.title}"${actionResult.priority ? ` with ${actionResult.priority} priority` : ""}.`,
          action: "create_task",
          data: actionResult,
          requiresConfirmation: false,
        },
        steps,
        intent,
        memory,
      };
    }
  }

  // ── STEP 7: FOR ALL OTHER INTENTS, RETURN CONTEXT FOR AI BACKEND ──
  // The actual response generation happens in the AI backend (Gemini action)
  // This pipeline prepares everything the backend needs
  steps.push({ type: "generating", label: "Generating response..." });

  // Return a special "pending" response that tells the caller to use the AI backend
  return {
    response: {
      type: "answer",
      message: "", // Empty — the AI backend will generate the actual response
    },
    steps,
    intent,
    memory,
  };
}

// ─── CONTEXT SUMMARY ─────────────────────────────────────────────────────────

function buildContextSummary(
  ctx: WorkspaceContext,
  intent: Intent,
  memory: ConversationMemory
): string {
  const parts: string[] = [];

  // Always include the essential stats
  parts.push(`Workspace: ${ctx.totalProjects} projects, ${ctx.totalTasks} tasks, ${ctx.completionRate}% complete`);

  if (ctx.totalRisk > 0) parts.push(`High-risk: ${ctx.totalRisk}`);
  if (ctx.totalOverdue > 0) parts.push(`Overdue: ${ctx.totalOverdue}`);

  // Intent-specific context
  switch (intent) {
    case "risk":
      parts.push(`Stage: ${ctx.stage}`);
      if (ctx.totalRisk > 0) {
        const riskTasks = ctx.tasks.filter((t) => (t.aiRiskScore ?? 0) > 0.7).slice(0, 3);
        parts.push(`Risk tasks: ${riskTasks.map((t) => `"${t.title}"`).join(", ")}`);
      }
      break;

    case "sprint":
      if (ctx.activeSprint) {
        parts.push(`Active sprint: ${ctx.activeSprint.name} (${ctx.activeSprint.completedTasks}/${ctx.activeSprint.taskCount})`);
      }
      parts.push(`Ready for sprint: ${ctx.tasks.filter((t) => t.status === "backlog" || t.status === "todo").length}`);
      break;

    case "task_list":
    case "task_create":
      const inProgress = ctx.tasks.filter((t) => t.status === "in_progress");
      const todo = ctx.tasks.filter((t) => t.status === "todo");
      parts.push(`In progress: ${inProgress.map((t) => `"${t.title}"`).join(", ") || "none"}`);
      parts.push(`To do: ${todo.map((t) => `"${t.title}"`).join(", ") || "none"}`);
      break;

    case "team":
      parts.push(`Total assigned: ${ctx.tasks.filter((t) => t.assigneeId).length}`);
      parts.push(`Unassigned: ${ctx.tasks.filter((t) => !t.assigneeId).length}`);
      break;

    case "analytics":
      if (ctx.analyses.length > 0) {
        const a = ctx.analyses[0];
        parts.push(`Repo score: ${a.score}/100, Stage: ${a.stage}`);
      }
      break;
  }

  // Memory context
  if (memory.recentTopics.length > 0) {
    parts.push(`Recent topics: ${memory.recentTopics.join(", ")}`);
  }

  return parts.join("\n");
}

// ─── NAVIGATION DETECTOR ─────────────────────────────────────────────────────

function detectNavigation(message: string): { route: string; label: string } | null {
  const msg = message.toLowerCase();

  if (msg.match(/analytics|metrics|charts|insights|report/)) {
    return { route: "analytics", label: "Analytics" };
  }
  if (msg.match(/project|projects/)) {
    return { route: "projects", label: "Projects" };
  }
  if (msg.match(/sprint|sprints/)) {
    return { route: "sprints", label: "Sprints" };
  }
  if (msg.match(/dashboard|home|main/)) {
    return { route: "dashboard", label: "Dashboard" };
  }
  if (msg.match(/setting|config/)) {
    return { route: "settings", label: "Settings" };
  }

  return null;
}

// ─── TASK CREATION DETECTOR ──────────────────────────────────────────────────

function detectTaskCreation(
  message: string,
  ctx: WorkspaceContext
): { title: string; projectId?: string; priority?: string; description?: string } | null {
  const msg = message.toLowerCase();

  // Extract task title from common patterns
  let title = "";

  // "create a task called X" / "create task X"
  const patterns = [
    /create\s+(?:a\s+)?(?:task|todo|item)\s+(?:called|named|titled|for|to)\s+(.+)/i,
    /add\s+(?:a\s+)?(?:task|todo|item)\s+(?:called|named|titled|for|to)\s+(.+)/i,
    /new\s+(?:task|todo)\s+(?:called|named|titled|for|to)\s+(.+)/i,
    /generate\s+(?:a\s+)?(?:task|todo|item)\s+(?:called|named|titled|for|to)\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      title = match[1].trim();
      break;
    }
  }

  if (!title) return null;

  // Clean up the title
  title = title.replace(/["']/g, "").trim();
  if (title.length < 3) return null;

  // Detect priority
  let priority: string | undefined;
  if (msg.match(/high.?priority|urgent|important|critical/)) priority = "high";
  else if (msg.match(/low.?priority|minor|trivial/)) priority = "low";
  else if (msg.match(/medium.?priority|normal/)) priority = "medium";

  // Detect assignee mention
  // (would need user lookup for real assignment)

  return {
    title,
    priority,
    projectId: ctx.projectName, // Use current project if available
  };
}
