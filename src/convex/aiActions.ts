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
}

function buildConversationMemory(history: Array<{ role: string; content: string }>): ConversationMemory {
  const memory: ConversationMemory = { discussedTasks: [], discussedSprints: [] };
  
  // Get last 5 assistant responses to extract memory
  const assistantResponses = history
    .filter(m => m.role === "assistant")
    .slice(-5);

  for (const response of assistantResponses) {
    const content = response.content;
    
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

  // Weak follow-ups (short messages < 15 words that reference previous context)
  if (wordCount <= 15) {
    // Pronouns and references
    const referencePatterns = [
      "it", "this", "that", "them", "those", "these",
      "the task", "the sprint", "the project", "the issue",
      "can you", "could you", "would you", "please",
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
        result.primaryInsight = "✅ All clear! No high-risk or overdue tasks detected.";
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
    "═══ RESPONSE STYLE ═══",
    "- Use markdown: bold for key terms, bullets for lists, numbered steps for plans",
    "- Reference specific task names, numbers, statuses, and dates from the data",
    "- Every response must include: what I found → my analysis → recommendation → next action",
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
  // For follow-ups, always reference previous context
  const contextPrefix = isFollowUp && memory.lastTopic
    ? `Continuing our discussion about ${memory.lastTopic}:\n\n`
    : "";

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

    case "progress":
    case "suggest":
    case "risk":
    case "sprint": {
      const lines: string[] = [contextPrefix];
      
      lines.push(`**${reasoning.primaryInsight}**`);
      
      if (reasoning.supportingEvidence.length > 0) {
        lines.push("", "**What I found:**");
        reasoning.supportingEvidence.forEach(e => lines.push(`• ${e}`));
      }
      
      if (reasoning.recommendations.length > 0) {
        lines.push("", "**My recommendation:**");
        reasoning.recommendations.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
      }
      
      if (reasoning.nextActions.length > 0) {
        lines.push("", "**Next steps:**");
        reasoning.nextActions.slice(0, 2).forEach(a => lines.push(`• ${a}`));
      }
      
      return lines.join("\n");
    }

    case "architecture": {
      if (ctx.analyses.length > 0) {
        const a = ctx.analyses[0];
        return nl(
          contextPrefix,
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
          `**Weaknesses:** ${a.weaknesses.join("; ")}`,
          "",
          "**What to focus on:**",
          "1. Address the identified weaknesses",
          "2. Leverage the strengths for faster development",
          "3. Consider architectural improvements"
        );
      }
      return nl(
        "No repository analysis found.",
        "Import a project using the 'Import Project' button to get AI-powered architecture analysis."
      );
    }

    case "team":
      return nl(
        contextPrefix,
        "**Team Collaboration Analysis:**",
        "",
        `**Current Workload Distribution:**`,
        `• ${ctx.totalInProgress} task${ctx.totalInProgress !== 1 ? "s" : ""} in progress`,
        `• ${ctx.totalTodo} task${ctx.totalTodo !== 1 ? "s" : ""} waiting`,
        `• ${ctx.totalRisk} high-risk task${ctx.totalRisk !== 1 ? "s" : ""}`,
        "",
        "**Recommendations:**",
        "1. Limit work-in-progress to 2-3 tasks per person",
        "2. Pair on high-risk or complex tasks",
        "3. Use task comments for async communication",
        "4. Regular standups catch blockers early",
        "5. Balance quick wins with larger features"
      );

    case "deploy":
      return nl(
        contextPrefix,
        "**Deployment Planning:**",
        "",
        `**Current Status:** ${ctx.completionRate}% complete`,
        `**Ready for Deploy:** ${ctx.totalDone} task${ctx.totalDone !== 1 ? "s" : ""} completed`,
        "",
        "**Before deploying:**",
        "1. Ensure all critical tasks are completed",
        "2. Run full test suite",
        "3. Review security checklist",
        "4. Check performance benchmarks",
        "5. Prepare rollback plan"
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
      // For technical questions, provide workspace-aware responses
      const activeTasks = ctx.tasks.filter(t => t.status === "in_progress");
      const highPriority = ctx.tasks.filter(t => t.priority === "critical" || t.priority === "high");
      
      return nl(
        contextPrefix,
        `**${intent.charAt(0).toUpperCase() + intent.slice(1)} Analysis:**`,
        "",
        `Based on your workspace (${ctx.completionRate}% complete):`,
        "",
        activeTasks.length > 0
          ? `**Active work:** ${activeTasks.slice(0, 3).map(t => `"${t.title}"`).join(", ")}`
          : `**High-priority items:** ${highPriority.slice(0, 3).map(t => `"${t.title}" [${t.priority}]`).join(", ")}`,
        "",
        "**My recommendation:**",
        "1. Focus on the highest-priority item first",
        "2. Break down complex tasks into smaller pieces",
        "3. Test thoroughly before moving to the next task",
        "",
        "Want me to dive deeper into any specific aspect?"
      );
    }

    case "explain":
    case "create":
    case "review": {
      if (ctx.totalTasks > 0) {
        const highPriority = ctx.tasks.filter(t => t.priority === "critical" || t.priority === "high").slice(0, 3);
        return nl(
          contextPrefix,
          `**Analysis based on your workspace (${ctx.completionRate}% complete):**`,
          "",
          highPriority.length > 0
            ? `**High-priority items:** ${highPriority.map(t => `"${t.title}" [${t.status}]`).join(", ")}`
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

    case "thanks":
      return "You're welcome! 😊 I'm here whenever you need help with your workspace.";

    case "farewell":
      return "See you later! 👋 I'll keep monitoring your workspace. Come back anytime!";

    case "general":
    default: {
      // For general questions, provide workspace-aware responses
      if (ctx.totalTasks > 0) {
        return nl(
          contextPrefix,
          `**Workspace Overview:**`,
          "",
          `📊 **Status:** ${ctx.completionRate}% complete, ${ctx.totalTasks} tasks total`,
          ctx.totalInProgress > 0 ? `🔄 **Active:** ${ctx.tasks.filter(t => t.status === "in_progress").slice(0, 3).map(t => `"${t.title}"`).join(", ")}` : "",
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
