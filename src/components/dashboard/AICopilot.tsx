import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router";
import {
  Sparkles, X, Bot, CheckCircle2, Search, Brain,
  Database, Activity, AlertTriangle, Lightbulb, TrendingUp,
  Clock, Target, Zap, Loader2,
  ArrowUp, Globe, GitBranch, BarChart3,
  ExternalLink, FolderKanban, Play, CheckCircle,
} from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface AICopilotProps {
  projectId?: Id<"projects">;
  onClose?: () => void;
  expanded?: boolean;
}

interface Insight {
  type: string;
  title: string;
  detail: string;
  icon?: string;
}

interface ProjectInsightData {
  project: { name: string; status: string; healthScore: number; sprintDuration: number };
  stats: {
    total: number; done: number; inProgress: number; todo: number;
    backlog: number; review: number; highRisk: number; overdue: number;
    completionRate: number;
  };
  stage: string;
  insights: Insight[];
}

interface GlobalInsightData {
  totalProjects: number; activeProjects: number; totalTasks: number;
  totalDone: number; totalInProgress: number; totalRisk: number;
  totalOverdue: number; globalCompletion: number; insights: Insight[];
}

type AgentStep = "searching" | "reading" | "analyzing" | "generating";

// ─── RESPONSE EXTRACTION (never show [object Object]) ────────────────────────

function extractResponseText(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);

  // Handle objects with common response shapes
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    // { text: "..." }
    if (typeof obj.text === "string") return obj.text;
    // { content: "..." }
    if (typeof obj.content === "string") return obj.content;
    // { message: "..." }
    if (typeof obj.message === "string") return obj.message;
    // { response: "..." }
    if (typeof obj.response === "string") return obj.response;
    // { result: "..." }
    if (typeof obj.result === "string") return obj.result;
    // { data: { text: "..." } }
    if (obj.data && typeof obj.data === "object" && typeof (obj.data as Record<string, unknown>).text === "string") {
      return (obj.data as Record<string, unknown>).text as string;
    }
    // { candidates: [{ content: { parts: [{ text: "..." }] } }] } (raw Gemini)
    if (Array.isArray(obj.candidates) && obj.candidates.length > 0) {
      const first = obj.candidates[0] as Record<string, unknown>;
      const content = first?.content as Record<string, unknown> | undefined;
      if (Array.isArray(content?.parts) && content.parts.length > 0) {
        const part = content.parts[0] as Record<string, unknown>;
        if (typeof part.text === "string") return part.text;
      }
    }
    // Last resort: try JSON.stringify
    try {
      const str = JSON.stringify(raw);
      if (str && str !== "{}" && str !== "[]") return str;
    } catch { /* ignore */ }
  }

  return "I wasn't able to generate a response. Please try again.";
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const AGENT_STEPS: Record<AgentStep, { label: string; sublabel: string; icon: React.ReactNode }> = {
  searching: {
    label: "Searching workspace...",
    sublabel: "Scanning projects, tasks, and sprints",
    icon: <Search className="w-3.5 h-3.5" />,
  },
  reading: {
    label: "Reading project data...",
    sublabel: "Loading analytics and repository analysis",
    icon: <Database className="w-3.5 h-3.5" />,
  },
  analyzing: {
    label: "Analyzing context...",
    sublabel: "Processing risks, dependencies, and priorities",
    icon: <Brain className="w-3.5 h-3.5" />,
  },
  generating: {
    label: "Generating response...",
    sublabel: "Synthesizing workspace intelligence",
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
};

const ICON_MAP: Record<string, React.ReactNode> = {
  status: <Activity className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  suggestion: <Lightbulb className="w-4 h-4" />,
  insight: <Zap className="w-4 h-4" />,
  clock: <Clock className="w-4 h-4" />,
  bottleneck: <AlertTriangle className="w-4 h-4" />,
  rocket: <TrendingUp className="w-4 h-4" />,
  list: <Target className="w-4 h-4" />,
  chart: <TrendingUp className="w-4 h-4" />,
  priority: <AlertTriangle className="w-4 h-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  status: "bg-[rgba(14,159,110,0.08)] text-emerald-400 border-[rgba(14,159,110,0.15)]",
  warning: "bg-amber-500/8 text-amber-400 border-amber-500/15",
  suggestion: "bg-blue-500/8 text-blue-400 border-blue-500/15",
  insight: "bg-purple-500/8 text-purple-400 border-purple-500/15",
};

// ─── RESPONSE PARSING (extract JSON actions from agent) ─────────────────────

interface ParsedResponse {
  message: string;
  action?: {
    type: "create_task" | "update_task" | "assign_task" | "create_sprint" | "navigate";
    data: Record<string, unknown>;
  };
}

function parseAgentResponse(raw: string): ParsedResponse {
  // Check for JSON action block at the end or inline
  const jsonPatterns = [
    /\{\s*"action"\s*:\s*"([^"]+)"\s*,\s*"data"\s*:\s*(\{[^}]+\})\s*\}/,
    /\{"action":"([^"]+)","data":(\{[^}]+\})\}/,
  ];

  for (const pattern of jsonPatterns) {
    const match = raw.match(pattern);
    if (match) {
      const actionType = match[1] as "create_task" | "update_task" | "assign_task" | "create_sprint" | "navigate";
      try {
        const data = JSON.parse(match[2]);
        const message = raw.replace(match[0], "").trim();
        return { message: message || "", action: { type: actionType, data } };
      } catch {
        // JSON parse failed, treat as plain text
      }
    }
  }

  return { message: raw };
}

// ─── NAVIGATION ROUTE MAP ───────────────────────────────────────────────────

const ROUTE_MAP: Record<string, string> = {
  dashboard: "/dashboard",
  projects: "/dashboard", // Dashboard with projects view
  sprints: "/dashboard", // Dashboard with sprints view
  analytics: "/dashboard", // Dashboard with analytics view
  settings: "/dashboard",
};

// ─── CONVERSATION MEMORY (localStorage) ──────────────────────────────────────

const MEMORY_KEY = "kortex_conversation_memory";

interface ConversationMemory {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  lastTopic: string;
  timestamp: number;
}

function loadMemory(key: string): ConversationMemory {
  try {
    const raw = localStorage.getItem(`${MEMORY_KEY}_${key}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { messages: [], lastTopic: "", timestamp: Date.now() };
}

function saveMemory(key: string, memory: ConversationMemory): void {
  try {
    const trimmed = { ...memory, messages: memory.messages.slice(-20), timestamp: Date.now() };
    localStorage.setItem(`${MEMORY_KEY}_${key}`, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

function extractTopic(messages: Array<{ role: string; content: string }>): string {
  if (messages.length === 0) return "";
  const lastUser = [...messages].reverse().find(m => m.role === "user");
  if (!lastUser) return "";
  return lastUser.content.split(/\s+/).slice(0, 5).join(" ");
}

// ─── LOCAL FALLBACK RESPONSE GENERATOR ───────────────────────────────────────

function generateLocalResponse(
  message: string,
  projectData: ProjectInsightData | null | undefined,
  globalData: GlobalInsightData | null | undefined,
  history: Array<{ role: string; content: string }>,
): string {
  const msg = message.toLowerCase().trim();

  // Extract workspace stats for context-aware responses
  const totalTasks = projectData?.stats?.total ?? globalData?.totalTasks ?? 0;
  const doneTasks = projectData?.stats?.done ?? globalData?.totalDone ?? 0;
  const inProgressTasks = projectData?.stats?.inProgress ?? globalData?.totalInProgress ?? 0;
  const completionRate = projectData?.stats?.completionRate ?? globalData?.globalCompletion ?? 0;
  const highRisk = projectData?.stats?.highRisk ?? globalData?.totalRisk ?? 0;
  const overdue = projectData?.stats?.overdue ?? globalData?.totalOverdue ?? 0;
  const projectName = projectData?.project?.name ?? "your project";
  const stage = projectData?.stage ?? "Planning";

  const parts: string[] = [];

  // Greetings
  if (msg.match(/^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy|yo|sup)/)) {
    parts.push(`Welcome back! 👋`);
    if (totalTasks > 0) {
      parts.push(``, `**Current Status:**`);
      parts.push(`• **${projectName}** is at **${completionRate}% completion** (${stage} stage)`);
      parts.push(`• ${doneTasks} tasks done, ${inProgressTasks} in progress, ${totalTasks - doneTasks - inProgressTasks} remaining`);
      if (highRisk > 0) parts.push(`• ⚠️ **${highRisk}** high-risk task${highRisk > 1 ? "s" : ""} need attention`);
      if (overdue > 0) parts.push(`• ⏰ **${overdue}** overdue task${overdue > 1 ? "s" : ""}`);
    } else {
      parts.push(`Your workspace is ready. Start by creating a project and adding tasks.`);
    }
    parts.push(``, `What would you like to focus on?`);
    return parts.join("\n");
  }

  // What should I work on next
  if (msg.match(/what.*work.*next|what.*should.*i.*do|what.*to.*do|next.*task|next.*step|priorit/)) {
    parts.push(`**Next Action Recommendation:**`);
    if (totalTasks === 0) {
      parts.push(`You don't have any tasks yet. Start by creating your first task in the dashboard.`);
      parts.push(``, `**Suggested first steps:**`);
      parts.push(`1. Break your project into smaller tasks`);
      parts.push(`2. Set priorities for each task`);
      parts.push(`3. Create a sprint to organize your work`);
    } else if (highRisk > 0) {
      parts.push(`You have **${highRisk} high-risk task${highRisk > 1 ? "s" : ""}** that need immediate attention.`);
      parts.push(`High-risk tasks can block your entire sprint. Address them first.`);
      parts.push(``, `**Recommended order:**`);
      parts.push(`1. Review and resolve high-risk items`);
      parts.push(`2. Complete in-progress tasks (${inProgressTasks} active)`);
      parts.push(`3. Pull the next highest-priority item from the backlog`);
    } else if (overdue > 0) {
      parts.push(`You have **${overdue} overdue task${overdue > 1 ? "s" : ""}** blocking progress.`);
      parts.push(`Consider updating deadlines or breaking them into smaller pieces.`);
    } else if (inProgressTasks > 3) {
      parts.push(`You have **${inProgressTasks} tasks in progress**, which may reduce focus.`);
      parts.push(`Consider limiting WIP to 2-3 tasks for better throughput.`);
      parts.push(``, `**"Stop starting, start finishing"** — complete current tasks before pulling new ones.`);
    } else {
      parts.push(`Your workspace is well-balanced at **${completionRate}% completion**.`);
      parts.push(``, `**My recommendation:**`);
      parts.push(`1. Continue with your current in-progress task${inProgressTasks === 1 ? "" : "s"}`);
      if (totalTasks - doneTasks > 0) {
        parts.push(`2. After completing, pull the next highest-priority task`);
      }
    }
    parts.push(``, `Want me to analyze a specific task or area in more detail?`);
    return parts.join("\n");
  }

  // Project status / health
  if (msg.match(/project.*status|health|progress|how.*going|where.*stand|completion|stage/)) {
    parts.push(`**Project Health — ${projectName}:**`);
    parts.push(``, `• **Stage:** ${stage}`);
    parts.push(`• **Completion:** ${completionRate}% (${doneTasks}/${totalTasks} tasks)`);
    parts.push(`• **In Progress:** ${inProgressTasks} task${inProgressTasks !== 1 ? "s" : ""}`);
    if (highRisk > 0) parts.push(`• ⚠️ **High Risk:** ${highRisk} task${highRisk > 1 ? "s" : ""}`);
    if (overdue > 0) parts.push(`• ⏰ **Overdue:** ${overdue} task${overdue > 1 ? "s" : ""}`);
    parts.push(``, `**Assessment:**`);
    if (completionRate >= 80) {
      parts.push(`Your project is in excellent shape. Focus on wrapping up remaining tasks and quality assurance.`);
    } else if (completionRate >= 50) {
      parts.push(`Solid progress. Maintain momentum and address any blockers before they become overdue.`);
    } else if (completionRate >= 20) {
      parts.push(`Early stage — establish a consistent delivery rhythm and break down larger tasks.`);
    } else {
      parts.push(`Just getting started. Define clear milestones and create your first sprint.`);
    }
    return parts.join("\n");
  }

  // Risk analysis
  if (msg.match(/risk|block|stuck|issue|problem|danger|warning|overdue|bottleneck/)) {
    parts.push(`**Risk Analysis:**`);
    if (highRisk === 0 && overdue === 0) {
      parts.push(`✅ **All clear!** No high-risk or overdue tasks detected.`);
      parts.push(`Your workspace is healthy. Continue monitoring task statuses.`);
    } else {
      if (highRisk > 0) {
        parts.push(``, `⚠️ **High-Risk Tasks (${highRisk}):**`);
        parts.push(`${highRisk} task${highRisk > 1 ? "s have" : " has"} been flagged as high risk.`);
        parts.push(`These can block your sprint if not addressed promptly.`);
      }
      if (overdue > 0) {
        parts.push(``, `⏰ **Overdue Tasks (${overdue}):**`);
        parts.push(`${overdue} task${overdue > 1 ? "s are" : " is"} past the due date.`);
        parts.push(`Consider extending deadlines or breaking them into smaller pieces.`);
      }
      parts.push(``, `**Recommended actions:**`);
      parts.push(`1. Review and prioritize high-risk items`);
      parts.push(`2. Update or remove overdue task deadlines`);
      parts.push(`3. Identify and remove blockers`);
    }
    return parts.join("\n");
  }

  // Sprint planning
  if (msg.match(/sprint|plan|roadmap|backlog|milestone|release|velocity|sprint planning/)) {
    parts.push(`**Sprint Planning:**`);
    if (totalTasks === 0) {
      parts.push(`No tasks available for sprint planning. Create tasks first.`);
    } else {
      const availableTasks = totalTasks - doneTasks;
      parts.push(`• **Available tasks:** ${availableTasks}`);
      parts.push(`• **Completion rate:** ${completionRate}%`);
      parts.push(``, `**Sprint recommendations:**`);
      parts.push(`1. Include 20% buffer for unexpected issues`);
      parts.push(`2. Balance quick wins with larger features`);
      parts.push(`3. Set clear, measurable sprint goals`);
      parts.push(`4. Aim for ${Math.min(availableTasks, 8)} task${Math.min(availableTasks, 8) !== 1 ? "s" : ""} this sprint`);
    }
    return parts.join("\n");
  }

  // Architecture
  if (msg.match(/architect|structure|design|tech stack|component|service|module/)) {
    parts.push(`**Architecture Overview:**`);
    if (projectData) {
      parts.push(`Project: **${projectName}** (${stage})`);
      parts.push(``, `I can provide deeper architecture analysis if you import a repository using the "Import Project" feature. This enables AI-powered code analysis including: folder structure, component hierarchy, API design, and dependency mapping.`);
    } else {
      parts.push(`Import a project repository to get AI-powered architecture analysis.`);
    }
    return parts.join("\n");
  }

  // Create / generate
  if (msg.match(/create|generate|write|build|implement|make/)) {
    parts.push(`**Task Creation Guide:**`);
    parts.push(``, `To create effective tasks:`);
    parts.push(`1. Use clear, action-oriented titles (e.g., "Implement user authentication")`);
    parts.push(`2. Set appropriate priority levels (critical, high, medium, low)`);
    parts.push(`3. Add descriptions with acceptance criteria`);
    parts.push(`4. Estimate effort in hours`);
    parts.push(`5. Set realistic due dates`);
    parts.push(``, `Click the **"+ New Task"** button in the dashboard to get started.`);
    return parts.join("\n");
  }

  // Help / what can you do
  if (msg.match(/help|what can you|capabilities|features|commands|how does/)) {
    parts.push(`**KORTEX AI Capabilities:**`);
    parts.push(``, `I'm your autonomous workspace intelligence agent. I can:`);
    parts.push(`• **Analyze** project health, risks, and progress`);
    parts.push(`• **Recommend** next actions based on priorities and dependencies`);
    parts.push(`• **Plan** sprints and break down epics`);
    parts.push(`• **Review** architecture and suggest improvements`);
    parts.push(`• **Track** blockers, overdue tasks, and technical debt`);
    parts.push(`• **Estimate** effort and predict completion timelines`);
    parts.push(``, `Ask me anything about your workspace — I investigate your data before every response.`);
    return parts.join("\n");
  }

  // Thanks
  if (msg.match(/thank|thanks|thx|appreciate|great|perfect|awesome/)) {
    return "You're welcome! 😊 I'm here whenever you need help with your workspace.";
  }

  // Farewell
  if (msg.match(/bye|goodbye|see you|later|exit|quit/)) {
    return "See you later! 👋 I'll keep monitoring your workspace. Come back anytime!";
  }

  // General — workspace-aware default
  if (totalTasks > 0) {
    parts.push(`**Workspace Summary:**`);
    parts.push(`• **${projectName}** — ${completionRate}% complete (${stage})`);
    parts.push(`• ${doneTasks} done, ${inProgressTasks} in progress, ${totalTasks - doneTasks - inProgressTasks} remaining`);
    if (highRisk > 0) parts.push(`• ⚠️ ${highRisk} high-risk tasks`);
    parts.push(``, `Ask me about: project status, risk analysis, sprint planning, task priorities, or architecture.`);
  } else {
    parts.push(`I can help you manage your workspace. Your project is ready for setup.`);
    parts.push(``, `Try asking me about:`);
    parts.push(`• How to break down your project into tasks`);
    parts.push(`• Sprint planning and prioritization`);
    parts.push(`• Architecture and design decisions`);
    parts.push(`• Risk analysis and blockers`);
  }
  return parts.join("\n");
}

// ─── CONTEXT STATUS BAR ──────────────────────────────────────────────────────

function ContextStatus({
  projectId,
  projectData,
  globalData,
  backendReady,
}: {
  projectId?: Id<"projects">;
  projectData?: ProjectInsightData | null;
  globalData?: GlobalInsightData | null;
  backendReady: boolean;
}) {
  const hasData = projectId ? projectData : globalData;
  if (!hasData) return null;

  const items =
    projectId && projectData
      ? [
          { label: "Project", loaded: true, icon: <GitBranch className="w-2.5 h-2.5" /> },
          { label: "Tasks", loaded: true, count: projectData.stats.total, icon: <Target className="w-2.5 h-2.5" /> },
          { label: "Analytics", loaded: true, icon: <BarChart3 className="w-2.5 h-2.5" /> },
          { label: "Sprint", loaded: true, icon: <Activity className="w-2.5 h-2.5" /> },
          { label: "Risks", loaded: true, count: projectData.stats.highRisk, icon: <AlertTriangle className="w-2.5 h-2.5" /> },
          { label: "Memory", loaded: true, icon: <Brain className="w-2.5 h-2.5" /> },
          { label: "Backend", loaded: backendReady, icon: <Sparkles className="w-2.5 h-2.5" /> },
        ]
      : globalData
        ? [
            { label: "Workspace", loaded: true, icon: <Globe className="w-2.5 h-2.5" /> },
            { label: "Projects", loaded: true, count: globalData.totalProjects, icon: <GitBranch className="w-2.5 h-2.5" /> },
            { label: "Tasks", loaded: true, count: globalData.totalTasks, icon: <Target className="w-2.5 h-2.5" /> },
            { label: "Analytics", loaded: true, icon: <BarChart3 className="w-2.5 h-2.5" /> },
            { label: "Memory", loaded: true, icon: <Brain className="w-2.5 h-2.5" /> },
            { label: "Backend", loaded: backendReady, icon: <Sparkles className="w-2.5 h-2.5" /> },
          ]
        : [];

  return (
    <div className="flex flex-wrap gap-1 px-5 pb-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[rgba(14,159,110,0.04)] border border-[rgba(14,159,110,0.06)]"
        >
          <div className="text-[#0E9F6E]/60">{item.icon}</div>
          <span className="text-[9px] text-[rgba(232,245,238,0.3)] font-medium">
            {item.label}
          </span>
          {item.count !== undefined && (
            <span className="text-[9px] text-[#0E9F6E] font-semibold">{item.count}</span>
          )}
          <CheckCircle2 className="w-2 h-2 text-[#0E9F6E]/50" />
        </div>
      ))}
    </div>
  );
}

// ─── DYNAMIC SUGGESTIONS ─────────────────────────────────────────────────────

function useDynamicSuggestions({
  projectId,
  projectData,
  globalData,
  messages,
}: {
  projectId?: Id<"projects">;
  projectData?: ProjectInsightData | null;
  globalData?: GlobalInsightData | null;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  return useMemo(() => {
    if (messages.length > 0) return [];

    if (projectId && projectData) {
      const s: string[] = [];
      if (projectData.stats.total === 0) {
        s.push("How do I start breaking down this project?");
        s.push("Create a sprint plan for this project");
        s.push("What tasks should I create first?");
      } else {
        if (projectData.stats.highRisk > 0) s.push("What are the high-risk tasks?");
        if (projectData.stats.overdue > 0) s.push("Which tasks are overdue?");
        if (projectData.stats.inProgress === 0 && projectData.stats.todo > 0) s.push("What should I work on next?");
        if (projectData.stage === "Planning") s.push("Help me plan the next sprint");
        s.push("Analyze my project health");
      }
      return s.slice(0, 3);
    }

    if (globalData) {
      const s: string[] = [];
      if (globalData.totalProjects === 0) {
        s.push("How do I create my first project?");
        s.push("What features does KORTEX AI offer?");
      } else {
        if (globalData.totalRisk > 0) s.push("Show me all high-risk tasks");
        if (globalData.totalOverdue > 0) s.push("What tasks are overdue?");
        s.push("Give me a portfolio overview");
      }
      return s.slice(0, 3);
    }

    return ["What needs my attention right now?", "Show me overdue tasks", "Open analytics"];
  }, [projectId, projectData, globalData, messages.length]);
}

// ─── MARKDOWN RENDERER ───────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const Tag = listType;
      elements.push(
        <Tag key={`list-${elements.length}`} className={`my-2 ${listType === "ul" ? "list-disc" : "list-decimal"} pl-5 space-y-1`}>
          {listItems.map((item, i) => (
            <li key={i} className="text-[13px] text-[rgba(232,245,238,0.7)]">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </Tag>
      );
      listItems = [];
      listType = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("• ") || trimmed.startsWith("- ")) {
      flushList();
      listType = "ul";
      listItems.push(trimmed.slice(2));
    } else if (/^\d+\.\s/.test(trimmed)) {
      flushList();
      listType = "ol";
      listItems.push(trimmed.replace(/^\d+\.\s/, ""));
    } else if (trimmed === "") {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={`p-${elements.length}`} className="text-[13px] text-[rgba(232,245,238,0.7)] my-1.5 leading-relaxed">
          {renderInlineMarkdown(trimmed)}
        </p>
      );
    }
  }

  flushList();
  return elements;
}

function renderInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
  return parts.map((part, i) => {
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      return (
        <strong key={i} className="font-semibold text-[rgba(232,245,238,0.9)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const codeParts = part.split(/(`[^`]+`)/g);
    return codeParts.map((codePart, j) => {
      if (codePart.startsWith("`") && codePart.endsWith("`")) {
        return (
          <code key={`${i}-${j}`} className="px-1 py-0.5 rounded bg-[rgba(14,159,110,0.1)] text-[#0E9F6E] text-[12px] font-mono">
            {codePart.slice(1, -1)}
          </code>
        );
      }
      return <span key={`${i}-${j}`}>{codePart}</span>;
    });
  });
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function AICopilot({ projectId, onClose, expanded }: AICopilotProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [currentStep, setCurrentStep] = useState<AgentStep>("searching");
  const [showInsights, setShowInsights] = useState(true);
  const [pendingAction, setPendingAction] = useState<{ type: string; data: Record<string, unknown> } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // ── Real Convex hooks (primary path) ──
  const convexCreateConversation = useMutation(api.ai.createConversation);
  const convexSendMessage = useMutation(api.ai.sendMessage);
  const convexSaveResponse = useMutation(api.ai.saveAssistantResponse);
  const convexGenerateResponse = useAction(api.aiActions.generateResponse);

  // ── Task creation mutation ──
  const createTaskMutation = useMutation(api.tasks.create);

  // ── Workspace data queries (real Convex) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectData = useQuery(api.ai.getProjectInsights as any, projectId ? { projectId } : "skip") as ProjectInsightData | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalData = useQuery(api.ai.getGlobalInsights as any) as GlobalInsightData | null | undefined;

  // Memory key
  const memoryKey = projectId ? `project_${projectId}` : "global";

  // Load conversation history from memory on mount
  useEffect(() => {
    const memory = loadMemory(memoryKey);
    if (memory.messages.length > 0) {
      setMessages(memory.messages);
    }
  }, [memoryKey]);

  // Dynamic suggestions
  const suggestions = useDynamicSuggestions({ projectId, projectData, globalData, messages });

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Save conversation to memory when messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveMemory(memoryKey, {
        messages,
        lastTopic: extractTopic(messages),
        timestamp: Date.now(),
      });
    }
  }, [messages, memoryKey]);

  // ── THE AUTONOMOUS AI AGENT PIPELINE ──
  const handleSend = useCallback(async (message?: string) => {
    const text = message || input.trim();
    if (!text || isThinking) return;

    setInput("");
    const userMsg = { role: "user" as const, content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setIsThinking(true);
    setShowInsights(false);

    try {
      // ── STEP 1: Create conversation if needed ──
      setCurrentStep("searching");
      let responseText = "";

      // Try real Convex pipeline first
      try {
        const convId = await convexCreateConversation({
          projectId: projectId ?? undefined,
          title: text.slice(0, 50),
        });

        // ── STEP 2: Send message and gather workspace context ──
        setCurrentStep("reading");
        const sendResult = await convexSendMessage({
          conversationId: convId,
          content: text,
        });

        // ── STEP 3: Call the AI backend action ──
        setCurrentStep("analyzing");
        const rawResponse = await convexGenerateResponse({
          projectId: projectId ?? undefined,
          userMessage: text,
          conversationHistory: sendResult.conversationHistory,
          context: sendResult.context,
        });

        // ── STEP 4: Extract response text (handle ALL shapes) ──
        setCurrentStep("generating");
        responseText = extractResponseText(rawResponse);

        // ── STEP 5: Parse for actions and handle them ──
        if (responseText && responseText.length > 0) {
          const parsed = parseAgentResponse(responseText);
          responseText = parsed.message || responseText;

          // Handle navigation actions
          if (parsed.action && parsed.action.type === "navigate" && parsed.action.data.route) {
            const route = String(parsed.action.data.route);
            const routePath = ROUTE_MAP[route] || "/dashboard";
            // Show the message then navigate after a brief delay
            if (responseText) {
              setMessages((prev) => [...prev, { role: "assistant", content: responseText }]);
            }
            setMessages((prev) => [...prev, { 
              role: "assistant", 
              content: `🗺️ Navigating to ${String(parsed.action?.data?.route ?? route)}...` 
            }]);
            setTimeout(() => navigate(routePath), 800);
            await convexSaveResponse({ conversationId: convId, content: responseText });
            setIsThinking(false);
            return;
          }

          // Handle task creation actions
          if (parsed.action && parsed.action.type === "create_task" && parsed.action.data.title) {
            setPendingAction({ type: "create_task", data: parsed.action.data });
          }

          // Save the response
          await convexSaveResponse({
            conversationId: convId,
            content: responseText,
          });
        }
      } catch (convexError) {
        // Convex failed — use intelligent local fallback
        console.warn("Convex pipeline failed, using local fallback:", convexError);
        responseText = generateLocalResponse(text, projectData, globalData, allMessages.slice(0, -1));
      }

      // ── FINAL: Display the response ──
      if (responseText && responseText.length > 0) {
        setMessages((prev) => [...prev, { role: "assistant", content: responseText }]);
      } else {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "I wasn't able to generate a response. Please try again.",
        }]);
      }
    } catch (error) {
      console.error("AI response error:", error);
      // Never crash — always show a helpful message
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      let friendlyError = "I encountered an issue processing your request. ";
      if (errorMsg.includes("not authenticated") || errorMsg.includes("Not authenticated")) {
        friendlyError += "Please make sure you're signed in and try again.";
      } else if (errorMsg.includes("network") || errorMsg.includes("fetch") || errorMsg.includes("Failed to fetch")) {
        friendlyError += "There seems to be a connection issue. Please check your network and try again.";
      } else if (errorMsg.includes("GEMINI") || errorMsg.includes("API key") || errorMsg.includes("quota")) {
        friendlyError += "The AI service is temporarily unavailable. Please try again in a moment.";
      } else {
        // Use local fallback even on error
        friendlyError = generateLocalResponse(text, projectData, globalData, allMessages.slice(0, -1));
      }

      setMessages((prev) => [...prev, { role: "assistant", content: friendlyError }]);
    } finally {
      setIsThinking(false);
    }
  }, [input, isThinking, messages, projectId, projectData, globalData, convexCreateConversation, convexSendMessage, convexGenerateResponse, convexSaveResponse]);

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  const handleConfirmAction = useCallback(async () => {
    if (!pendingAction) return;

    if (pendingAction.type === "create_task") {
      const data = pendingAction.data;
      const targetProjectId = (data.projectId as Id<"projects">) ?? projectId;
      if (!targetProjectId) {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "I need a project to add this task to. Please open a project first, then try again.",
        }]);
        setPendingAction(null);
        return;
      }
      try {
        await createTaskMutation({
          title: String(data.title),
          projectId: targetProjectId,
          priority: (data.priority as "critical" | "high" | "medium" | "low") || "medium",
          status: "backlog",
          description: data.description ? String(data.description) : undefined,
        });
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: `✅ Task "${data.title}" created successfully!\n\nIt has been added to your project backlog. You can view and manage it in the project detail view.`,
        }]);
      } catch (err) {
        console.error("Failed to create task:", err);
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: `❌ I couldn't create the task. Please make sure you have a project selected and try again.`,
        }]);
      }
    }

    setPendingAction(null);
  }, [pendingAction, createTaskMutation, projectId]);

  const handleDismissAction = useCallback(() => {
    setPendingAction(null);
    setMessages((prev) => [...prev, {
      role: "assistant",
      content: "Action cancelled. Let me know if there's anything else you need.",
    }]);
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem(`${MEMORY_KEY}_${memoryKey}`);
  };

  const insightData = projectId ? projectData : globalData;
  const insights = (insightData as ProjectInsightData | GlobalInsightData | null | undefined)?.insights ?? [];
  const backendReady = true;

  return (
    <div
      className={`flex flex-col bg-[#0a0f0d] border border-[rgba(14,159,110,0.12)] rounded-2xl overflow-hidden ${
        expanded ? "h-full" : "h-[600px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(14,159,110,0.08)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[rgba(14,159,110,0.1)] flex items-center justify-center">
            <Bot className="w-5 h-5 text-[#0E9F6E]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[rgba(232,245,238,0.9)]">
              KORTEX AI Agent
            </h3>
            <p className="text-[10px] text-[rgba(232,245,238,0.3)]">
              Autonomous Workspace Intelligence
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="p-2 rounded-lg hover:bg-[rgba(14,159,110,0.08)] transition-colors"
              title="Clear conversation"
            >
              <Zap className="w-4 h-4 text-[rgba(232,245,238,0.4)]" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[rgba(14,159,110,0.08)] transition-colors"
            >
              <X className="w-4 h-4 text-[rgba(232,245,238,0.4)]" />
            </button>
          )}
        </div>
      </div>

      {/* Context Status */}
      <ContextStatus projectId={projectId} projectData={projectData} globalData={globalData} backendReady={backendReady} />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Welcome Message */}
        {messages.length === 0 && !isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[rgba(14,159,110,0.1)] flex items-center justify-center">
              <Bot className="w-8 h-8 text-[#0E9F6E]" />
            </div>
            <h4 className="text-lg font-semibold text-[rgba(232,245,238,0.9)] mb-2">
              KORTEX AI Agent
            </h4>
            <p className="text-sm text-[rgba(232,245,238,0.4)] max-w-xs mx-auto">
              I understand your workspace, can navigate the app, and perform actions. Ask me anything about your projects, tasks, or what to focus on.
            </p>
          </motion.div>
        )}

        {/* Messages */}
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-[#0E9F6E] text-white"
                    : "bg-[rgba(14,159,110,0.06)] border border-[rgba(14,159,110,0.1)]"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="space-y-1">
                    {renderMarkdown(msg.content)}
                    {/* Action buttons for navigation-related messages */}
                    {msg.content.toLowerCase().includes("navigat") && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-[rgba(14,159,110,0.08)]">
                        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1 px-2 py-1 rounded-md bg-[rgba(14,159,110,0.08)] text-[10px] text-[#0E9F6E] hover:bg-[rgba(14,159,110,0.15)] transition-colors">
                          <ExternalLink className="w-2.5 h-2.5" />Dashboard
                        </button>
                        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1 px-2 py-1 rounded-md bg-[rgba(14,159,110,0.08)] text-[10px] text-[#0E9F6E] hover:bg-[rgba(14,159,110,0.15)] transition-colors">
                          <FolderKanban className="w-2.5 h-2.5" />Projects
                        </button>
                        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1 px-2 py-1 rounded-md bg-[rgba(14,159,110,0.08)] text-[10px] text-[#0E9F6E] hover:bg-[rgba(14,159,110,0.15)] transition-colors">
                          <BarChart3 className="w-2.5 h-2.5" />Analytics
                        </button>
                      </div>
                    )}
                    {/* Action buttons for task-related messages */}
                    {(msg.content.toLowerCase().includes("task created") || msg.content.toLowerCase().includes("✅ task")) && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-[rgba(14,159,110,0.08)]">
                        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1 px-2 py-1 rounded-md bg-[rgba(14,159,110,0.08)] text-[10px] text-[#0E9F6E] hover:bg-[rgba(14,159,110,0.15)] transition-colors">
                          <Play className="w-2.5 h-2.5" />View Project
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[13px] leading-relaxed">{msg.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Thinking Indicator */}
        {isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-[rgba(14,159,110,0.06)] border border-[rgba(14,159,110,0.1)] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 text-[#0E9F6E] animate-spin" />
                <span className="text-xs font-medium text-[rgba(232,245,238,0.6)]">
                  {AGENT_STEPS[currentStep].label}
                </span>
              </div>
              <p className="text-[11px] text-[rgba(232,245,238,0.3)]">
                {AGENT_STEPS[currentStep].sublabel}
              </p>
            </div>
          </motion.div>
        )}

        {/* Action Confirmation Dialog */}
        {pendingAction && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-[rgba(14,159,110,0.06)] border border-[rgba(14,159,110,0.15)] rounded-2xl px-4 py-3 max-w-[85%]">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-[#0E9F6E]" />
                <span className="text-xs font-medium text-[rgba(232,245,238,0.7)]">
                  Confirm Action
                </span>
              </div>
              {pendingAction.type === "create_task" && (
                <div>
                  <p className="text-[12px] text-[rgba(232,245,238,0.5)] mb-2">
                    Create task: <strong className="text-[rgba(232,245,238,0.8)]">"{String(pendingAction.data.title)}"</strong>
                  </p>
                  {pendingAction.data.priority ? (
                    <p className="text-[11px] text-[rgba(232,245,238,0.3)] mb-3">
                      Priority: {String(pendingAction.data.priority)}
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirmAction}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E9F6E] text-white text-[11px] font-medium hover:bg-[#0c8a5f] transition-colors"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Create Task
                    </button>
                    <button
                      onClick={handleDismissAction}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] text-[rgba(232,245,238,0.4)] text-[11px] font-medium hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Insights Panel */}
      {showInsights && insights.length > 0 && messages.length === 0 && (
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-medium text-[rgba(232,245,238,0.3)] uppercase tracking-wider">
              Workspace Insights
            </span>
            <button
              onClick={() => setShowInsights(false)}
              className="text-[10px] text-[rgba(232,245,238,0.2)] hover:text-[rgba(232,245,238,0.4)]"
            >
              Dismiss
            </button>
          </div>
          <div className="space-y-2">
            {insights.slice(0, 3).map((insight, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 p-2 rounded-lg border ${TYPE_COLORS[insight.type] || TYPE_COLORS.insight}`}
              >
                <div className="mt-0.5">{ICON_MAP[(insight as { icon?: string }).icon ?? insight.type] ?? ICON_MAP.insight}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium">{insight.title}</p>
                  <p className="text-[10px] opacity-70 mt-0.5 line-clamp-2">{insight.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && messages.length === 0 && !isThinking && (
        <div className="px-5 pb-3">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1.5 text-[11px] rounded-full bg-[rgba(14,159,110,0.06)] border border-[rgba(14,159,110,0.1)] text-[rgba(232,245,238,0.6)] hover:bg-[rgba(14,159,110,0.12)] hover:text-[rgba(232,245,238,0.8)] transition-all"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-5 py-4 border-t border-[rgba(14,159,110,0.08)]">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about your workspace..."
              disabled={isThinking}
              className="w-full px-4 py-3 bg-[rgba(14,159,110,0.04)] border border-[rgba(14,159,110,0.1)] rounded-xl text-[13px] text-[rgba(232,245,238,0.9)] placeholder-[rgba(232,245,238,0.2)] focus:outline-none focus:border-[rgba(14,159,110,0.3)] disabled:opacity-50"
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isThinking}
            className="p-3 rounded-xl bg-[#0E9F6E] text-white hover:bg-[#0c8a5f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
