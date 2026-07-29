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
  subtasks?: Array<{ title: string; completed: boolean }>;
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
  components?: string[];
  routes?: string[];
  dependencies?: string[];
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

// ─── CONVERSATION MEMORY ─────────────────────────────────────────────────────

interface ConversationMemory {
  lastTopic?: string;
  lastRecommendation?: string;
  lastAction?: string;
  currentGoal?: string;
  discussedTasks: string[];
  discussedSprints: string[];
  discussedRecommendations: string[];
  previousResponse?: string;
  responseCount: number;
}

function buildConversationMemory(history: Array<{ role: string; content: string }>): ConversationMemory {
  const memory: ConversationMemory = { discussedTasks: [], discussedSprints: [], discussedRecommendations: [], responseCount: 0 };
  
  // Get last 8 assistant responses to extract memory
  const assistantResponses = history
    .filter(m => m.role === "assistant")
    .slice(-8);

  memory.responseCount = assistantResponses.length;

  for (const response of assistantResponses) {
    const content = response.content;
    memory.previousResponse = content;
    
    // Extract task names mentioned
    const taskMatches = content.match(/\*\*"([^"]+)"\*\*/g);
    if (taskMatches) {
      for (const match of taskMatches) {
        const taskName = match.replace(/\*\*"/g, "").replace(/"\*\*/g, "");
        if (!memory.discussedTasks.includes(taskName)) {
          memory.discussedTasks.push(taskName);
        }
      }
    }

    // Extract sprint names
    const sprintMatches = content.match(/Sprint \d+/gi);
    if (sprintMatches) {
      for (const match of sprintMatches) {
        if (!memory.discussedSprints.includes(match)) {
          memory.discussedSprints.push(match);
        }
      }
    }

    // Extract previously given recommendations to avoid repeating them
    const recMatches = content.match(/\*\*My recommendation:\*\*\n([\s\S]*?)(?=\n\*\*|$)/g);
    if (recMatches) {
      for (const rec of recMatches) {
        const normalized = rec.replace(/\*\*My recommendation:\*\*/g, '').trim().toLowerCase().slice(0, 100);
        if (normalized && !memory.discussedRecommendations.some(r => r.includes(normalized.slice(0, 50)))) {
          memory.discussedRecommendations.push(normalized);
        }
      }
    }

    // Also extract numbered recommendations
    const numRecs = content.match(/^\d+\.\s+(.+)$/gm);
    if (numRecs) {
      for (const rec of numRecs) {
        const normalized = rec.toLowerCase().replace(/^\d+\.\s+/, '').trim().slice(0, 100);
        if (normalized && !memory.discussedRecommendations.some(r => r.includes(normalized.slice(0, 50)))) {
          memory.discussedRecommendations.push(normalized);
        }
      }
    }

    // Detect last action type
    if (content.includes("I analyzed") || content.includes("I found")) {
      memory.lastAction = "analysis";
    } else if (content.includes("I recommend") || content.includes("My recommendation")) {
      memory.lastAction = "recommendation";
    } else if (content.includes("I created") || content.includes("generated")) {
      memory.lastAction = "creation";
    }
  }

  // Extract last topic from conversation
  const userMessages = history.filter(m => m.role === "user");
  if (userMessages.length > 0) {
    const lastUserMsg = userMessages[userMessages.length - 1].content.toLowerCase();
    if (lastUserMsg.includes("sprint")) memory.lastTopic = "sprint";
    else if (lastUserMsg.includes("task")) memory.lastTopic = "task";
    else if (lastUserMsg.includes("risk") || lastUserMsg.includes("block")) memory.lastTopic = "risk";
    else if (lastUserMsg.includes("architecture") || lastUserMsg.includes("tech")) memory.lastTopic = "architecture";
    else if (lastUserMsg.includes("progress") || lastUserMsg.includes("status")) memory.lastTopic = "progress";
  }

  return memory;
}

// ─── FOLLOW-UP DETECTION ─────────────────────────────────────────────────────

function detectFollowUp(
  message: string,
  history: Array<{ role: string; content: string }>
): { isFollowUp: boolean; resolvedQuery: string; context: string } | null {
  const msg = message.toLowerCase().trim();
  const wordCount = msg.split(/\s+/).length;

  // Must have a previous assistant message to reference
  const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
  if (!lastAssistant) return null;

  // Extract key topics from the last assistant response
  const prevContent = lastAssistant.content;

  // Strong follow-up patterns (always resolve)
  const strongFollowUps: Array<{ patterns: string[]; resolver: () => string }> = [
    {
      patterns: ["why", "why?", "why is that", "explain why", "tell me why", "reason", "reasoning"],
      resolver: () => `Explain the detailed reasoning behind your previous recommendation. Focus on: ${prevContent.slice(0, 300)}`,
    },
    {
      patterns: ["how", "how?", "how do i", "how does", "how can", "implementation", "steps"],
      resolver: () => `Provide detailed implementation steps for: ${prevContent.slice(0, 300)}`,
    },
    {
      patterns: ["continue", "go on", "keep going", "what else", "and?", "more", "else"],
      resolver: () => `Continue the previous analysis. What else should the user know about: ${prevContent.slice(0, 300)}`,
    },
    {
      patterns: ["explain", "explain that", "explain it", "tell me more", "elaborate", "details", "detail"],
      resolver: () => `Provide more detailed explanation about: ${prevContent.slice(0, 300)}`,
    },
    {
      patterns: ["do it", "start", "begin", "let's do it", "proceed", "go ahead", "start now", "execute", "run"],
      resolver: () => `Execute the recommended action from: ${prevContent.slice(0, 300)}`,
    },
    {
      patterns: ["review", "review that", "review it", "check that", "check this", "analyze", "investigate"],
      resolver: () => `Perform a detailed review and analysis of: ${prevContent.slice(0, 300)}`,
    },
    {
      patterns: ["improve", "improve it", "make it better", "optimize", "optimize it", "enhance"],
      resolver: () => `Suggest specific improvements for: ${prevContent.slice(0, 300)}`,
    },
    {
      patterns: ["create", "create it", "make it", "generate", "build it", "add", "new"],
      resolver: () => `Generate a detailed plan and implementation for: ${prevContent.slice(0, 300)}`,
    },
    {
      patterns: ["move", "move it", "move this", "reorder", "change", "update"],
      resolver: () => `Suggest reordering or modifications based on: ${prevContent.slice(0, 300)}`,
    },
    {
      patterns: ["what about", "what about that", "what about this", "consider", "should i"],
      resolver: () => `Address the follow-up question regarding: ${prevContent.slice(0, 300)}`,
    },
  ];

  // Check for strong follow-ups (any length)
  for (const { patterns, resolver } of strongFollowUps) {
    if (patterns.some((p) => msg === p || msg.startsWith(p) || msg.endsWith(p))) {
      return { isFollowUp: true, resolvedQuery: resolver(), context: prevContent };
    }
  }

  // Weak follow-ups (very short messages < 8 words that clearly reference previous context)
  if (wordCount <= 8) {
    const referencePatterns = [
      "the task", "the sprint", "the project", "the issue",
      "can you", "could you", "would you",
    ];

    if (referencePatterns.some(p => msg.startsWith(p) || msg === p)) {
      return {
        isFollowUp: true,
        resolvedQuery: `Continue discussing: ${prevContent.slice(0, 300)}. The user is asking about "${message}"`,
        context: prevContent,
      };
    }
  }

  return null;
}

// ─── INTENT DETECTION ────────────────────────────────────────────────────────

type Intent = 
  | "greeting" | "identity" | "help" | "progress" | "risk" 
  | "suggest" | "sprint" | "task" | "team" | "analytics" 
  | "architecture" | "explain" | "create" | "review" | "general"
  | "thanks" | "farewell" | "deploy" | "code" | "bug" | "test"
  | "performance" | "security" | "database" | "api" | "ui" | "devops";

const greetings = [
  "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
  "what's up", "sup", "yo", "howdy", "greetings", "hola",
];

function detectIntent(q: string): Intent {
  const msg = q.toLowerCase();
  
  if (greetings.some((g) => msg.startsWith(g) || msg === g)) return "greeting";
  if (msg.match(/^(who|what) are you|your name|tell me about yourself|what do you do/)) return "identity";
  if (msg.match(/help|what can you do|capabilities|features|commands/)) return "help";
  if (msg.match(/progress|status|stage|how.*going|how.*project|completion|health|where.*stand/)) return "progress";
  if (msg.match(/risk|block|issue|problem|stuck|danger|warning|overdue|delayed|bottleneck|critical/)) return "risk";
  if (msg.match(/suggest|recommend|improve|better|advice|tip|optimize|should i|what should/)) return "suggest";
  if (msg.match(/sprint|plan|roadmap|backlog|milestone|release|velocity|sprint planning/)) return "sprint";
  if (msg.match(/task|todo|create|add|make|new|breakdown|break down|subtask/)) return "task";
  if (msg.match(/team|member|collaborat|assign|workload|resource/)) return "team";
  if (msg.match(/analy|metric|score|report|summary|dashboard|insight|trend/)) return "analytics";
  if (msg.match(/architect|structure|folder|file|component|service|module|tech stack|design/)) return "architecture";
  if (msg.match(/explain|why|how does|what is|reason|because/)) return "explain";
  if (msg.match(/create|generate|write|build|implement|setup|initialize/)) return "create";
  if (msg.match(/review|check|inspect|audit|examine|look at/)) return "review";
  if (msg.match(/deploy|deployment|release|ship|publish|ci\/cd|pipeline/)) return "deploy";
  if (msg.match(/code|coding|program|implement|function|class|method/)) return "code";
  if (msg.match(/bug|error|fix|broken|crash|exception|debug|issue/)) return "bug";
  if (msg.match(/test|testing|unit test|integration|e2e|coverage|spec/)) return "test";
  if (msg.match(/performance|speed|fast|slow|optimiz|cache|latency/)) return "performance";
  if (msg.match(/security|auth|authentication|authorization|encrypt|vulnerability/)) return "security";
  if (msg.match(/database|db|sql|mongo|query|schema|migration|model/)) return "database";
  if (msg.match(/api|endpoint|rest|graphql|request|response|route/)) return "api";
  if (msg.match(/ui|ux|design|界面|layout|component|css|style|tailwind/)) return "ui";
  if (msg.match(/devops|docker|kubernetes|k8s|aws|azure|cloud|infrastructure/)) return "devops";
  if (msg.match(/thank|thanks|thx|appreciate|great|perfect|awesome/)) return "thanks";
  if (msg.match(/bye|goodbye|see you|later|exit|quit/)) return "farewell";
  
  return "general";
}

// ─── REASONING ENGINE ────────────────────────────────────────────────────────

interface ReasoningResult {
  primaryInsight: string;
  supportingEvidence: string[];
  riskFactors: string[];
  recommendations: string[];
  nextActions: string[];
  confidence: number;
}

function analyzeWorkspace(ctx: ContextData, intent: Intent): ReasoningResult {
  const result: ReasoningResult = {
    primaryInsight: "",
    supportingEvidence: [],
    riskFactors: [],
    recommendations: [],
    nextActions: [],
    confidence: 0.8,
  };

  // Calculate critical metrics
  const criticalTasks = ctx.tasks.filter(t => t.priority === "critical" || t.priority === "high");
  const blockedTasks = ctx.tasks.filter(t => t.status === "blocked" || (t.aiRiskScore ?? 0) > 0.7);
  const overdueTasks = ctx.tasks.filter(t => t.dueDate && t.dueDate < Date.now() && t.status !== "done");
  const inProgressTasks = ctx.tasks.filter(t => t.status === "in_progress");
  const readyTasks = ctx.tasks.filter(t => t.status === "todo" || t.status === "backlog");

  // Intent-specific reasoning
  switch (intent) {
    case "suggest": {
      if (criticalTasks.length > 0) {
        result.primaryInsight = `You have ${criticalTasks.length} critical/high-priority task${criticalTasks.length !== 1 ? "s" : ""} that need immediate attention.`;
        result.supportingEvidence = criticalTasks.slice(0, 3).map(t => 
          `"${t.title}" [${t.status}] — Priority: ${t.priority}`
        );
        result.recommendations = [
          `Focus on completing "${criticalTasks[0].title}" first as it has the highest priority`,
          "Break down any large critical tasks into smaller, manageable subtasks",
          "Consider assigning additional resources to high-priority items",
        ];
        result.nextActions = [
          "Review the critical task details and dependencies",
          "Create a focused work plan for the next 24-48 hours",
          "Set up daily check-ins to track progress on critical items",
        ];
      } else if (overdueTasks.length > 0) {
        result.primaryInsight = `You have ${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? "s" : ""} that are blocking progress.`;
        result.supportingEvidence = overdueTasks.slice(0, 3).map(t => 
          `"${t.title}" — Due: ${new Date(t.dueDate!).toLocaleDateString()}`
        );
        result.recommendations = [
          "Re-prioritize overdue tasks immediately",
          "Consider extending deadlines or breaking tasks into smaller pieces",
          "Communicate with stakeholders about revised timelines",
        ];
        result.nextActions = [
          "Update due dates for overdue tasks",
          "Identify and remove blockers",
          "Create a recovery plan to get back on track",
        ];
      } else if (inProgressTasks.length > 3) {
        result.primaryInsight = `You have ${inProgressTasks.length} tasks in progress, which may be reducing focus.`;
        result.supportingEvidence = inProgressTasks.slice(0, 3).map(t => 
          `"${t.title}" — Status: ${t.status}`
        );
        result.recommendations = [
          "Limit work-in-progress to 2-3 tasks for better focus",
          "Complete current tasks before starting new ones",
          "Use the 'stop starting, start finishing' principle",
        ];
        result.nextActions = [
          "Choose 1-2 tasks to complete today",
          "Move other in-progress tasks back to todo",
          "Set clear completion criteria for each task",
        ];
      } else {
        result.primaryInsight = "Your workspace is well-balanced. Here's what I recommend focusing on next.";
        result.supportingEvidence = [
          `Completion rate: ${ctx.completionRate}%`,
          `In progress: ${inProgressTasks.length} tasks`,
          `Ready to start: ${readyTasks.length} tasks`,
        ];
        result.recommendations = [
          "Consider starting the next highest-priority task",
          "Review and refine task descriptions for clarity",
          "Set up sprint goals if you haven't already",
        ];
        result.nextActions = [
          "Pick one task from the backlog to start",
          "Review upcoming deadlines",
          "Update task statuses as you work",
        ];
      }
      break;
    }

    case "progress": {
      if (ctx.totalTasks === 0) {
        result.primaryInsight = "Your workspace is ready for action. Let's start by creating some tasks.";
        result.supportingEvidence = ["No tasks created yet"];
        result.recommendations = [
          "Create your first project and break it down into tasks",
          "Start with high-level epic tasks, then break into smaller items",
          "Set realistic deadlines and priorities from the start",
        ];
        result.nextActions = [
          "Click 'New Task' to create your first task",
          "Define clear acceptance criteria for each task",
          "Set up a sprint to organize your work",
        ];
      } else {
        const healthStatus = ctx.completionRate >= 70 ? "healthy" : ctx.completionRate >= 40 ? "moderate" : "needs attention";
        result.primaryInsight = `Your project is in ${healthStatus} state with ${ctx.completionRate}% completion.`;
        result.supportingEvidence = [
          `${ctx.totalDone} tasks completed`,
          `${ctx.totalInProgress} tasks in progress`,
          `${ctx.totalTodo} tasks waiting`,
          `${ctx.totalRisk} high-risk tasks`,
        ];
        result.recommendations = [
          ctx.totalRisk > 0 ? "Address high-risk tasks before they become blockers" : "Maintain current momentum",
          ctx.totalInProgress > 3 ? "Focus on completing in-progress tasks" : "Good work-life balance",
          "Set up regular progress reviews",
        ];
        result.nextActions = [
          "Review task completion status",
          "Update progress on in-progress tasks",
          "Plan next steps based on current velocity",
        ];
      }
      break;
    }

    case "risk": {
      if (blockedTasks.length === 0 && overdueTasks.length === 0) {
        result.primaryInsight = "All clear! No high-risk or overdue tasks detected.";
        result.supportingEvidence = ["No blocked tasks", "No overdue tasks", "Workspace is healthy"];
        result.recommendations = [
          "Continue monitoring task statuses",
          "Set up early warning systems for potential issues",
          "Review dependencies to prevent future blockers",
        ];
        result.nextActions = [
          "Keep tracking task progress",
          "Review upcoming deadlines",
          "Maintain current workflow",
        ];
      } else {
        result.primaryInsight = `Found ${blockedTasks.length + overdueTasks.length} task${(blockedTasks.length + overdueTasks.length) !== 1 ? "s" : ""} requiring immediate attention.`;
        result.supportingEvidence = [
          ...blockedTasks.slice(0, 2).map(t => `"${t.title}" — Risk: ${Math.round((t.aiRiskScore ?? 0) * 100)}%`),
          ...overdueTasks.slice(0, 2).map(t => `"${t.title}" — Overdue since: ${new Date(t.dueDate!).toLocaleDateString()}`),
        ];
        result.recommendations = [
          "Address blocked tasks by identifying and removing blockers",
          "Re-prioritize overdue tasks or adjust deadlines",
          "Break down complex tasks into smaller, manageable pieces",
          "Consider assigning additional resources to high-risk items",
        ];
        result.nextActions = [
          "Review the root cause of each blocked task",
          "Create an action plan to unblock critical work",
          "Communicate timeline changes to stakeholders",
        ];
      }
      break;
    }

    case "sprint": {
      const readyForSprint = ctx.tasks.filter(t => t.status === "backlog" || t.status === "todo");
      const currentVelocity = ctx.totalDone / Math.max(ctx.sprints.length, 1);
      
      result.primaryInsight = `You have ${readyForSprint.length} task${readyForSprint.length !== 1 ? "s" : ""} ready for sprint planning.`;
      result.supportingEvidence = [
        `Current velocity: ${Math.round(currentVelocity)} tasks/sprint`,
        `Ready tasks: ${readyForSprint.length}`,
        `Active sprint: ${ctx.activeSprint ? ctx.activeSprint.name : "None"}`,
      ];
      result.recommendations = [
        `Aim for ${Math.min(readyForSprint.length, Math.max(currentVelocity, 3))} tasks this sprint`,
        "Balance quick wins with larger features",
        "Include 20% buffer for unexpected issues",
        "Set clear, measurable sprint goals",
      ];
      result.nextActions = [
        "Review and prioritize the ready tasks",
        "Estimate effort for each task",
        "Set sprint goal and duration",
        "Assign tasks to team members",
      ];
      break;
    }

    default: {
      // General analysis
      if (ctx.totalTasks > 0) {
        result.primaryInsight = `Your workspace has ${ctx.totalTasks} tasks with ${ctx.completionRate}% completion.`;
        result.supportingEvidence = [
          `${ctx.totalDone} done`,
          `${ctx.totalInProgress} in progress`,
          `${ctx.totalRisk} at risk`,
        ];
        result.recommendations = [
          "Keep tracking progress regularly",
          "Address any high-risk tasks promptly",
          "Maintain clear task descriptions and priorities",
        ];
        result.nextActions = [
          "Review current task status",
          "Update progress on active work",
          "Plan next steps",
        ];
      } else {
        result.primaryInsight = "Let me help you get started with your workspace.";
        result.supportingEvidence = ["Workspace is ready for setup"];
        result.recommendations = [
          "Create a project to organize your work",
          "Break down work into manageable tasks",
          "Set priorities and deadlines",
        ];
        result.nextActions = [
          "Create your first project",
          "Add initial tasks",
          "Set up your workflow",
        ];
      }
    }
  }

  return result;
}

// ─── SYSTEM PROMPT BUILDER ───────────────────────────────────────────────────

function buildAgentSystemPrompt(ctx: ContextData, memory: ConversationMemory): string {
  const nl = (...lines: string[]) => lines.filter(Boolean).join("\n");

  const taskLines = ctx.tasks.length > 0
    ? ctx.tasks.map(t => {
        let line = `- "${t.title}" [${t.status.replace("_", " ")}] priority:${t.priority}`;
        if (t.aiRiskScore && t.aiRiskScore > 0.7) line += " ⚠️HIGH_RISK";
        if (t.dueDate && t.dueDate < Date.now() && t.status !== "done") line += " ⏰OVERDUE";
        if (t.estimatedHours) line += ` ~${t.estimatedHours}h`;
        if (t.tags && t.tags.length > 0) line += ` [${t.tags.join(", ")}]`;
        if (t.description) line += ` — ${t.description.slice(0, 80)}`;
        return line;
      }).join("\n")
    : "No tasks yet.";

  const sprintLines = ctx.sprints.length > 0
    ? ctx.sprints.map(s => 
        `- ${s.name} [${s.status}] — ${s.completedTasks}/${s.taskCount} done` +
        `${s.goal ? ` — Goal: "${s.goal}"` : ""}` +
        ` (${new Date(s.startDate).toLocaleDateString()} → ${new Date(s.endDate).toLocaleDateString()})`
      ).join("\n")
    : "No sprints defined.";

  const analysisInfo = ctx.analyses.length > 0
    ? ctx.analyses.map(a => 
        nl(
          `- Repository: ${a.url}`,
          `  Type: ${a.type} | Score: ${a.score}/100 | Stage: ${a.stage}`,
          `  Architecture: ${a.architecture.slice(0, 120)}`,
          `  Tech: FE=[${a.techStack.frontend.join(", ")}] BE=[${a.techStack.backend.join(", ")}] DB=[${a.techStack.database.join(", ")}]`,
          `  Strengths: ${a.strengths.slice(0, 3).join("; ")}`,
          `  Weaknesses: ${a.weaknesses.slice(0, 3).join("; ")}`
        )
      ).join("\n")
    : "No repository analysis available.";

  const memoryContext = nl(
    memory.lastTopic ? `Last discussed topic: ${memory.lastTopic}` : "",
    memory.discussedTasks.length > 0 ? `Tasks discussed: ${memory.discussedTasks.slice(0, 5).join(", ")}` : "",
    memory.discussedSprints.length > 0 ? `Sprints discussed: ${memory.discussedSprints.join(", ")}` : "",
    memory.lastAction ? `Last action type: ${memory.lastAction}` : "",
    `Previous responses in conversation: ${memory.responseCount}`,
    memory.discussedRecommendations.length > 0 ? `ALREADY GIVEN recommendations (DO NOT REPEAT):\n${memory.discussedRecommendations.slice(-6).map((r, i) => `  ${i + 1}. ${r}`).join("\n")}` : "",
  );

  return nl(
    "You are KORTEX AI — an autonomous workspace intelligence agent. You are NOT a chatbot.",
    "You are an AI Senior Technical Program Manager + Software Architect + AI Engineer.",
    "",
    "═══ CRITICAL RULES ═══",
    "1. NEVER respond with generic text like 'You can ask me about...', 'I can help with...', 'Try asking me about...'",
    "2. NEVER advertise your capabilities or list what you can do.",
    "3. NEVER restart the conversation or treat follow-ups as new conversations.",
    "4. ALWAYS answer using the actual workspace data provided below.",
    "5. If the workspace has tasks/sprints/projects, reference them by NAME with specific numbers.",
    "6. For general knowledge questions, answer helpfully but tie back to workspace context when relevant.",
    "7. For follow-up questions, CONTINUE the previous analysis — do NOT restart.",
    "8. Be proactive — naturally mention overdue tasks, low completion, and blockers.",
    "9. Always include: WHAT I found → WHY it matters → WHAT to do next",
    "10. Every response must be specific, actionable, and grounded in real data.",
    "",
    "═══ ANTI-REPETITION RULES ═══",
    "- NEVER repeat the same recommendation you already gave in this conversation.",
    "- Check CONVERSATION MEMORY — if a recommendation is listed in discussedRecommendations, do NOT repeat it.",
    "- Vary your response structure: sometimes lead with data, sometimes with a question, sometimes with a direct action.",
    "- Do NOT use the same opening phrases repeatedly (e.g. don't always start with 'Based on your workspace').",
    "- If you already analyzed something, go DEEPER — new insights, trade-offs, alternatives — don't surface the same points.",
    "- Each response should feel like a fresh perspective, not a recitation of the same data.",
    "- NEVER repeat the exact same numbers/stats unless they have genuinely changed.",
    "",
    "═══ RESPONSE STYLE ═══",
    "- Use markdown: bold for key terms, bullets for lists, numbered steps for plans",
    "- Reference specific task names, numbers, statuses, and dates from the data",
    "- Vary the response format — sometimes use a direct answer, sometimes a comparison, sometimes a ranked list",
    "- Tone: Professional, concise, technical, actionable — like a senior engineering manager",
    "- Maximum 5-8 sentences unless the user asks for detail",
    "- Do NOT always follow the same template. Mix: direct answers, trade-off analysis, ranked lists, one-liners, etc.",
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
    "For FOLLOW-UP questions (why?, continue, explain that, do it):",
    "  - Check CONVERSATION MEMORY above to understand what was just discussed",
    "  - Continue THAT specific analysis — do NOT restart or give a new overview",
    "  - Reference the specific topics/tasks/recommendations from your previous response",
    "",
    "For NEW questions:",
    "  - Investigate the workspace data above",
    "  - Generate a response grounded in actual numbers and task names",
    "  - Always end with a clear next step",
    "",
    "For empty workspace (no tasks/projects):",
    "  - Guide the user to create their first project and add tasks",
    "  - Be helpful but don't fabricate data",
    "",
    "For GENERAL knowledge questions:",
    "  - Answer it directly with your knowledge",
    "  - If it relates to the workspace, connect it to their actual project data",
    "  - Never say 'I don't have access to data' — you have full context"
  );
}

// ─── MAIN ACTION ─────────────────────────────────────────────────────────────

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
          subtasks: v.optional(v.array(v.object({
            title: v.string(),
            completed: v.boolean(),
          }))),
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
          components: v.optional(v.array(v.string())),
          routes: v.optional(v.array(v.string())),
          dependencies: v.optional(v.array(v.string())),
        })
      ),
    }),
  },
  handler: async (_, args) => {
    const ctxData = args.context as ContextData;
    const message = args.userMessage;
    const history = args.conversationHistory;

    // ── STEP 1: BUILD CONVERSATION MEMORY ──
    const memory = buildConversationMemory(history);

    // ── STEP 2: DETECT FOLLOW-UP ──
    const followUpResult = detectFollowUp(message, history);
    const effectiveQuery = followUpResult?.resolvedQuery || message;
    const isFollowUp = followUpResult?.isFollowUp || false;

    // ── STEP 3: DETECT INTENT ──
    const intent = detectIntent(message.toLowerCase());

    // ── STEP 4: ANALYZE WORKSPACE ──
    const reasoning = analyzeWorkspace(ctxData, intent);

    // ── STEP 5: TRY GEMINI FIRST ──
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const systemPrompt = buildAgentSystemPrompt(ctxData, memory);
      const result = await callGemini(apiKey, systemPrompt, effectiveQuery, history);
      if (result && result.length > 10) {
        return result;
      }
    }

    // ── STEP 6: RULE-BASED FALLBACK (NEVER GENERIC) ──
    return generateReasonedResponse(intent, message, ctxData, reasoning, isFollowUp, memory);
  },
});

// ─── REASONED RESPONSE GENERATOR ─────────────────────────────────────────────

function nl(...lines: string[]) {
  return lines.filter(Boolean).join("\n");
}

function generateReasonedResponse(
  intent: Intent,
  message: string,
  ctx: ContextData,
  reasoning: ReasoningResult,
  isFollowUp: boolean,
  memory: ConversationMemory
): string {
  // Compute derived task lists used across multiple intents
  const criticalTasks = ctx.tasks.filter(t => t.priority === "critical" || t.priority === "high");
  const blockedTasks = ctx.tasks.filter(t => t.status === "blocked" || (t.aiRiskScore ?? 0) > 0.7);
  const overdueTasks = ctx.tasks.filter(t => t.dueDate && t.dueDate < Date.now() && t.status !== "done");
  // For follow-ups, always reference previous context
  const _contextPrefix = isFollowUp && memory.lastTopic
    ? `Continuing our discussion about ${memory.lastTopic}:\n\n`
    : "";
  void _contextPrefix; // available for future use when follow-ups need explicit context

  // Helper to vary opening phrases based on response count to reduce repetition
  const openers = [
    "Here's what I see:", "Looking at the data:", "My analysis:",
    "After reviewing your workspace:", "From what I can tell:",
    "Checking the numbers:", "In your current setup:",
  ];
  const opener = openers[memory.responseCount % openers.length] || openers[0];

  switch (intent) {
    case "greeting": {
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
          ctx.totalInProgress > 0 ? `${ctx.totalInProgress} task${ctx.totalInProgress !== 1 ? "s are" : " is"} in progress.` : "",
          ctx.totalRisk > 0 ? `⚠️ **${ctx.totalRisk}** high-risk task${ctx.totalRisk !== 1 ? "s" : ""} need attention.` : "",
          "",
          "Ready to dive into your workspace?"
        );
      }
      return nl(
        `Welcome to KORTEX AI, ${ctx.userName ?? "there"}! 👋`,
        "",
        "I'm your autonomous workspace intelligence agent.",
        "Let's start by creating your first project.",
        "",
        "What are you building?"
      );
    }

    case "identity":
      return nl(
        "I'm **KORTEX AI** — your autonomous workspace intelligence agent.",
        "",
        "Unlike a chatbot, I **always investigate your workspace data** before answering.",
        "I analyze your projects, tasks, sprints, risks, and architecture to give you specific, actionable recommendations.",
        "",
        "Ask me anything — I'll give you real answers based on your actual workspace."
      );

    case "help":
      return nl(
        `**Your Workspace Intelligence:**`,
        "",
        `📊 **Status:** ${ctx.totalTasks} tasks, ${ctx.completionRate}% complete`,
        ctx.activeSprint ? `🏃 **Sprint:** ${ctx.activeSprint.name} — ${ctx.activeSprint.completedTasks}/${ctx.activeSprint.taskCount} done` : "",
        ctx.analyses.length > 0 ? `🏗️ **Repository:** ${ctx.analyses[0].name} — Score: ${ctx.analyses[0].score}/100` : "",
        "",
        "Ask me anything — I'll investigate your data and give you specific, actionable answers."
      );

    case "progress": {
      // Vary response format: sometimes lead with the number, sometimes with a question
      if (ctx.totalTasks === 0) {
        return nl(
          "No tasks yet — your workspace is a blank canvas.",
          "Create a project and break it into tasks, and I'll start tracking progress for you."
        );
      }
      const healthEmoji = ctx.completionRate >= 70 ? "🟢" : ctx.completionRate >= 40 ? "🟡" : "🔴";
      if (memory.responseCount % 3 === 0) {
        // Format: direct data dump
        return nl(
          `${healthEmoji} **${ctx.completionRate}%** complete — ${ctx.totalDone}/${ctx.totalTasks} tasks done.`,
          ctx.totalInProgress > 0 ? `${ctx.totalInProgress} in progress right now.` : "",
          ctx.totalOverdue > 0 ? `⚠️ ${ctx.totalOverdue} overdue.` : "",
          "",
          "What's your next move?"
        );
      }
      if (memory.responseCount % 3 === 1) {
        // Format: question-led
        return nl(
          `Where do things stand? ${healthEmoji}`,
          "",
          `**${ctx.completionRate}%** of your ${ctx.totalTasks} tasks are done.`,
          ctx.totalRisk > 0 ? `**${ctx.totalRisk}** flagged as high-risk — worth tackling soon.` : "No blockers in sight.",
          ctx.activeSprint ? `Current sprint: **${ctx.activeSprint.name}** — ${ctx.activeSprint.completedTasks}/${ctx.activeSprint.taskCount}.` : "",
        );
      }
      // Format: comparison/balance
      return nl(
        `**Task breakdown:** ${ctx.totalDone} done · ${ctx.totalInProgress} active · ${ctx.totalTodo} waiting · ${ctx.totalBacklog} backlog`,
        "",
        ctx.completionRate >= 50 ? "You're past the halfway mark — keep the momentum." : "Still building up — focus on finishing started tasks first.",
        ctx.totalRisk > 0 ? `⚠️ **${ctx.totalRisk}** high-risk items need a look.` : "",
      );
    }

    case "suggest": {
      if (criticalTasks.length > 0) {
        const topTask = criticalTasks[0];
        // Check if we already recommended this exact task
        const alreadyRecommended = memory.discussedRecommendations.some(r => r.includes(topTask.title));
        if (alreadyRecommended) {
          // Don't repeat — dig deeper
          return nl(
            `We already discussed **"${topTask.title}"** — let me go deeper.`,
            "",
            `**Deeper analysis:**`,
            `• Status: ${topTask.status} | Est: ${topTask.estimatedHours ? topTask.estimatedHours + 'h' : 'unknown'}`,
            topTask.description ? `• Context: ${topTask.description.slice(0, 120)}` : "",
            "",
            "Consider breaking this into smaller subtasks or pairing with another engineer to unblock faster."
          );
        }
        return nl(
          opener,
          "",
          `**"${topTask.title}"** is your highest-priority item right now.`,
          `It's currently **${topTask.status.replace('_', ' ')}**${topTask.estimatedHours ? ` with ~${topTask.estimatedHours}h estimated` : ''}.`,
          "",
          "That's where I'd start."
        );
      }
      if (overdueTasks.length > 0) {
        return nl(
          `${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? 's' : ''} need attention:`,
          "",
          ...overdueTasks.slice(0, 3).map(t =>
            `• **"${t.title}"** — due ${new Date(t.dueDate!).toLocaleDateString()}`
          ),
          "",
          "Re-schedule or break these down before they compound."
        );
      }
      // Balanced workspace — give a specific next action
      const nextTask = ctx.tasks.find(t => t.status === 'todo' || t.status === 'backlog');
      if (nextTask) {
        return nl(
          `Workspace looks balanced. I'd pick up **"${nextTask.title}"** next.`,
          `Priority: ${nextTask.priority}${nextTask.estimatedHours ? ` · ~${nextTask.estimatedHours}h` : ''}.`,
        );
      }
      return nl(
        "Everything's in progress or done — nice. Review completed work or set up the next sprint goal."
      );
    }

    case "risk": {
      if (blockedTasks.length === 0 && overdueTasks.length === 0) {
        return nl(
          "🟢 All clear — no blocked or overdue tasks.",
          ctx.totalRisk > 0 ? `There are ${ctx.totalRisk} flagged as high-risk, but none are stuck.` : "Workspace is clean.",
        );
      }
      const allRisk = [...blockedTasks, ...overdueTasks];
      return nl(
        `⚠️ **${allRisk.length} task${allRisk.length !== 1 ? 's' : ''} need attention:**`,
        "",
        ...allRisk.slice(0, 4).map(t => {
          const riskPct = t.aiRiskScore ? Math.round(t.aiRiskScore * 100) : null;
          const overdue = t.dueDate && t.dueDate < Date.now();
          return `• **"${t.title}"** — ${overdue ? `overdue since ${new Date(t.dueDate!).toLocaleDateString()}` : `risk: ${riskPct ?? 'unknown'}%`}`;
        }),
        "",
        "Start with the one blocking the most other work."
      );
    }

    case "sprint": {
      const readyForSprint = ctx.tasks.filter(t => t.status === "backlog" || t.status === "todo");
      if (ctx.activeSprint) {
        return nl(
          `**${ctx.activeSprint.name}** is running — ${ctx.activeSprint.completedTasks}/${ctx.activeSprint.taskCount} tasks done.`,
          ctx.activeSprint.goal ? `Goal: "${ctx.activeSprint.goal}"` : "",
          "",
          `${readyForSprint.length} tasks are ready if you want to add more to the sprint.`,
        );
      }
      return nl(
        `No active sprint. **${readyForSprint.length} tasks** are ready for planning.`,
        "",
        readyForSprint.length > 0
          ? `Top candidates: ${readyForSprint.slice(0, 3).map(t => `**"${t.title}"**`).join(', ')}`
          : "Create some tasks first, then start a sprint.",
      );
    }

    case "architecture": {
      if (ctx.analyses.length > 0) {
        const a = ctx.analyses[0];
        return nl(
          `**${a.name}** — ${a.architecture}`,
          `Score: **${a.score}/100** · Stage: ${a.stage}`,
          "",
          `**Stack:** ${[...a.techStack.frontend, ...a.techStack.backend].join(', ') || 'Not detected'}`,
          a.strengths.length > 0 ? `**Strong at:** ${a.strengths.slice(0, 2).join('; ')}` : "",
          a.weaknesses.length > 0 ? `**Needs work:** ${a.weaknesses.slice(0, 2).join('; ')}` : "",
        );
      }
      return "No repository analysis yet. Import a project to get architecture insights.";
    }

    case "team":
      return nl(
        `${ctx.totalInProgress} tasks in progress · ${ctx.totalTodo} waiting · ${ctx.totalRisk} high-risk`,
        "",
        ctx.totalInProgress > 3 ? "WIP is high — finishing before starting would improve flow." : "Workload looks manageable.",
      );

    case "deploy":
      return nl(
        `${ctx.completionRate}% complete — ${ctx.totalDone} tasks done.`,
        "",
        ctx.totalRisk > 0 ? `${ctx.totalRisk} high-risk items should be resolved before deploying.` : "Looks ready for a deploy.",
      );

    case "code":
    case "bug":
    case "test":
    case "performance":
    case "security":
    case "database":
    case "api":
    case "ui":
    case "devops": {
      const activeTasks = ctx.tasks.filter(t => t.status === "in_progress");
      if (activeTasks.length > 0) {
        return nl(
          `**${intent.charAt(0).toUpperCase() + intent.slice(1)}** — relevant active work:`,
          ...activeTasks.slice(0, 3).map(t => `• "${t.title}" [${t.status}]`),
          "",
          "Want me to focus on any of these?"
        );
      }
      if (ctx.totalTasks > 0) {
        return nl(
          `No in-progress ${intent} tasks. Your ${ctx.totalTasks} tasks are mostly ${ctx.totalDone > 0 ? 'done' : 'waiting'}.`,
          "Start something and I'll track it."
        );
      }
      return "No tasks yet. Create some and I'll give you context-aware ${intent} analysis.";
    }

    case "explain":
    case "create":
    case "review": {
      if (ctx.totalTasks > 0) {
        const highPriority = ctx.tasks.filter(t => t.priority === "critical" || t.priority === "high").slice(0, 3);
        return nl(
          highPriority.length > 0
            ? `**Top items:** ${highPriority.map(t => `"${t.title}" [${t.status}]`).join(', ')}`
            : `**${ctx.totalTasks} tasks** at ${ctx.completionRate}% complete.`,
          "",
          "What specifically do you want me to ${intent}?"
        );
      }
      return "Workspace is empty — create tasks first and I'll have data to work with.";
    }

    case "thanks":
      return "Anytime! 👋";

    case "farewell":
      return "See you! 👋";

    case "general":
    default: {
      if (ctx.totalTasks > 0) {
        return nl(
          `${ctx.completionRate}% complete · ${ctx.totalTasks} tasks`,
          ctx.totalInProgress > 0 ? `· ${ctx.totalInProgress} active` : "",
          ctx.totalRisk > 0 ? `· ⚠️ ${ctx.totalRisk} at risk` : "",
          "",
          "What do you need?"
        );
      }
      return "No projects yet — create one and I'll have context to help.";
    }
  }
}
