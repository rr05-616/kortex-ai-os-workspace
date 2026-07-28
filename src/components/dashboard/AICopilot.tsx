import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, X, Bot, CheckCircle2, Search, Brain,
  Database, Activity, AlertTriangle, Lightbulb, TrendingUp,
  Clock, Target, Zap, Loader2, MessageSquare,
  ArrowUp, Globe, GitBranch, BarChart3,
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

// ─── CONTEXT STATUS BAR ──────────────────────────────────────────────────────

function ContextStatus({
  projectId,
  projectData,
  globalData,
}: {
  projectId?: Id<"projects">;
  projectData?: ProjectInsightData | null;
  globalData?: GlobalInsightData | null;
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
        ]
      : globalData
        ? [
            { label: "Workspace", loaded: true, icon: <Globe className="w-2.5 h-2.5" /> },
            { label: "Projects", loaded: true, count: globalData.totalProjects, icon: <GitBranch className="w-2.5 h-2.5" /> },
            { label: "Tasks", loaded: true, count: globalData.totalTasks, icon: <Target className="w-2.5 h-2.5" /> },
            { label: "Analytics", loaded: true, icon: <BarChart3 className="w-2.5 h-2.5" /> },
            { label: "Memory", loaded: true, icon: <Brain className="w-2.5 h-2.5" /> },
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
    // Don't show suggestions if user has messages
    if (messages.length > 0) return [];

    if (projectId && projectData) {
      const s: string[] = [];
      if (projectData.stats.total === 0) {
        s.push("How do I start breaking down this project?");
        s.push("Create a sprint plan for this project");
      } else {
        if (projectData.stats.highRisk > 0)
          s.push(`What are the ${projectData.stats.highRisk} high-risk tasks?`);
        if (projectData.stats.overdue > 0)
          s.push(`Which ${projectData.stats.overdue} tasks are overdue?`);
        if (projectData.stats.inProgress === 0 && projectData.stats.total > 0)
          s.push("What should I work on first?");
        if (projectData.stats.completionRate > 80)
          s.push("What's left to finish the project?");
        if (s.length < 3) s.push("Summarize project progress");
        if (s.length < 3) s.push("What should I prioritize?");
        if (s.length < 3) s.push("Plan next sprint");
      }
      return s.slice(0, 4);
    }

    if (globalData) {
      if (globalData.totalProjects === 0)
        return ["How do I create my first project?", "What is KORTEX AI?"];
      const s: string[] = [];
      if (globalData.totalRisk > 0)
        s.push(`Analyze ${globalData.totalRisk} at-risk tasks`);
      s.push("What's my portfolio status?");
      if (globalData.totalInProgress === 0 && globalData.totalTasks > 0)
        s.push("What should I work on?");
      s.push("Give me an executive summary");
      return s.slice(0, 4);
    }

    return ["Hello!", "What can you do?", "Help me get started"];
  }, [projectId, projectData, globalData, messages.length]);
}

// ─── POST-MESSAGE SUGGESTIONS ────────────────────────────────────────────────

function usePostMessageSuggestions({
  lastMessage,
}: {
  projectData?: ProjectInsightData | null;
  globalData?: GlobalInsightData | null;
  lastMessage?: { role: string; content: string };
}) {
  return useMemo(() => {
    if (!lastMessage || lastMessage.role !== "assistant") return [];

    const content = lastMessage.content.toLowerCase();
    const s: string[] = [];

    if (content.includes("risk") || content.includes("block")) {
      s.push("How can we mitigate these risks?");
      s.push("Create tasks to address these issues");
    }
    if (content.includes("sprint") || content.includes("plan")) {
      s.push("Start this sprint");
      s.push("What dependencies should I check?");
    }
    if (content.includes("progress") || content.includes("status")) {
      s.push("What should I work on next?");
      s.push("Show me the risks");
    }
    if (content.includes("architecture") || content.includes("tech")) {
      s.push("What improvements do you suggest?");
      s.push("Review security concerns");
    }
    if (s.length === 0) {
      s.push("Tell me more about this");
      s.push("What should I do next?");
      s.push("Give me recommendations");
    }

    return s.slice(0, 3);
  }, [lastMessage]);
}

// ─── MARKDOWN RENDERER ───────────────────────────────────────────────────────

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const boldRegex = /\*\*(.+?)\*\*/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    while ((match = boldRegex.exec(line)) !== null) {
      if (match.index > lastIndex) parts.push(line.slice(lastIndex, match.index));
      parts.push(
        <strong key={`b-${i}-${match.index}`} className="text-[#E8F5EE] font-semibold">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length) parts.push(line.slice(lastIndex));
    const processed = parts.length > 0 ? parts : line;

    if (line.startsWith("• ") || line.startsWith("- "))
      return (
        <div key={i} className="flex gap-2 ml-1 my-0.5">
          <span className="text-[#0E9F6E] shrink-0 mt-0.5">•</span>
          <span className="leading-relaxed">{processed}</span>
        </div>
      );

    const numMatch = line.match(/^(\d+)\.\s/);
    if (numMatch)
      return (
        <div key={i} className="flex gap-2 ml-1 my-0.5">
          <span className="text-[#0E9F6E] shrink-0 font-semibold">{numMatch[1]}.</span>
          <span className="leading-relaxed">{line.slice(numMatch[0].length)}</span>
        </div>
      );

    if (line.trim() === "") return <div key={i} className="h-2" />;

    if (line.startsWith("═"))
      return (
        <div key={i} className="text-[10px] text-[#0E9F6E]/40 font-mono mt-2 mb-1 tracking-widest">
          {line}
        </div>
      );

    return (
      <span key={i} className="leading-relaxed">
        {processed}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function AICopilot({
  projectId,
  onClose,
  expanded = false,
}: AICopilotProps) {
  const [chatOpen, setChatOpen] = useState(expanded);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [isTyping, setIsTyping] = useState(false);
  const [agentStep, setAgentStep] = useState<AgentStep | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Convex hooks
  const projectData = useQuery(
    api.ai.getProjectInsights,
    projectId ? { projectId } : "skip"
  ) as ProjectInsightData | null | undefined;
  const globalData = useQuery(
    api.ai.getGlobalInsights,
    {}
  ) as GlobalInsightData | null | undefined;
  const createConversation = useMutation(api.ai.createConversation);
  const sendMessageMutation = useMutation(api.ai.sendMessage);
  const saveAssistantResponse = useMutation(api.ai.saveAssistantResponse);
  const generateAIResponse = useAction(api.aiActions.generateResponse);

  const conversationIdRef = useRef<Id<"aiConversations"> | null>(null);
  const [conversationId, setConversationId] = useState<Id<"aiConversations"> | null>(null);

  const quickSuggestions = useDynamicSuggestions({
    projectId,
    projectData,
    globalData,
    messages,
  });

  const postMessageSuggestions = usePostMessageSuggestions({
    projectData,
    globalData,
    lastMessage: messages[messages.length - 1],
  });

  // Sync ref
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── BUILD CONTEXT FROM QUERIED DATA ──
  const buildContext = () => {
    if (projectId && projectData) {
      return {
        userName: undefined,
        projectName: projectData.project.name,
        projectDescription: undefined,
        projectStatus: projectData.project.status,
        healthScore: projectData.project.healthScore,
        sprintDuration: projectData.project.sprintDuration,
        stage: projectData.stage,
        tasks: [],
        totalTasks: projectData.stats.total,
        totalDone: projectData.stats.done,
        totalInProgress: projectData.stats.inProgress,
        totalTodo: projectData.stats.todo,
        totalBacklog: projectData.stats.backlog,
        totalReview: projectData.stats.review,
        totalRisk: projectData.stats.highRisk,
        totalOverdue: projectData.stats.overdue,
        completionRate: projectData.stats.completionRate,
        totalProjects: 1,
        activeProjects: projectData.project.status === "active" ? 1 : 0,
        sprints: [],
        activeSprint: undefined,
        analyses: [],
      };
    }
    if (globalData) {
      return {
        userName: undefined,
        projectName: undefined,
        projectDescription: undefined,
        projectStatus: undefined,
        healthScore: undefined,
        sprintDuration: undefined,
        stage: "Planning",
        tasks: [],
        totalTasks: globalData.totalTasks,
        totalDone: globalData.totalDone,
        totalInProgress: globalData.totalInProgress,
        totalTodo: 0,
        totalBacklog: 0,
        totalReview: 0,
        totalRisk: globalData.totalRisk,
        totalOverdue: globalData.totalOverdue,
        completionRate: globalData.globalCompletion,
        totalProjects: globalData.totalProjects,
        activeProjects: globalData.activeProjects,
        sprints: [],
        activeSprint: undefined,
        analyses: [],
      };
    }
    return {
      userName: undefined,
      projectName: undefined,
      projectDescription: undefined,
      projectStatus: undefined,
      healthScore: undefined,
      sprintDuration: undefined,
      stage: "Planning",
      tasks: [],
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
      sprints: [],
      activeSprint: undefined,
      analyses: [],
    };
  };

  // ── SEND MESSAGE HANDLER ──
  const handleSend = async (text?: string) => {
    const content = text || inputValue.trim();
    if (!content) return;
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content }]);
    setIsTyping(true);

    // Agent thinking animation
    const steps: AgentStep[] = ["searching", "reading", "analyzing", "generating"];
    let stepIdx = 0;
    const stepTimer = setInterval(() => {
      if (stepIdx < steps.length) {
        setAgentStep(steps[stepIdx]);
        stepIdx++;
      }
    }, 400);

    try {
      // Step 1: Create conversation if needed
      let convId = conversationIdRef.current;
      if (!convId) {
        convId = await createConversation({
          projectId,
          title: content.slice(0, 50),
        });
        conversationIdRef.current = convId;
        setConversationId(convId);
      }

      // Step 2: Save user message via mutation (this updates the DB)
      const result = await sendMessageMutation({
        conversationId: convId,
        content,
      });

      // Step 3: Call the AI action with full context + conversation history
      const context = buildContext();
      const conversationHistory = (result?.conversationHistory ?? []).concat([
        { role: "user", content },
      ]);

      let response: string | null = null;
      try {
        response = await generateAIResponse({
          projectId,
          userMessage: content,
          conversationHistory,
          context,
        });
      } catch (actionErr) {
        console.error("AI action error:", actionErr);
        // If action fails, try to get from the saved conversation
        const updatedMessages = result?.messages;
        if (updatedMessages && updatedMessages.length > 0) {
          const assistantMsg = updatedMessages[updatedMessages.length - 1];
          if (assistantMsg.role === "assistant") {
            response = assistantMsg.content;
          }
        }
      }

      // Step 4: Save the assistant response to the conversation
      if (response) {
        await saveAssistantResponse({
          conversationId: convId,
          content: response,
        });
        setMessages((prev) => [...prev, { role: "assistant", content: response! }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I encountered an issue processing your request. Please try again.",
          },
        ]);
      }
    } catch (err) {
      console.error("AI Agent error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I encountered an error connecting to the workspace. Please try again.",
        },
      ]);
    } finally {
      clearInterval(stepTimer);
      setAgentStep(null);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isLoading = projectData === undefined && globalData === undefined;
  const hasProjectData = projectId && projectData;
  const hasGlobalData = !projectId && globalData;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card rounded-2xl overflow-hidden flex flex-col"
      style={{ maxHeight: expanded ? "80vh" : "600px" }}
    >
      {/* ── HEADER ── */}
      <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.04)] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(14,159,110,0.1)] flex items-center justify-center relative">
              <Sparkles className="w-5 h-5 text-[#0E9F6E]" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#0E9F6E] border-2 border-[#040705] animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#E8F5EE]">
                KORTEX AI Agent
              </h3>
              <p className="text-[10px] text-[rgba(232,245,238,0.3)]">
                {projectId
                  ? "Autonomous project intelligence"
                  : "Autonomous workspace intelligence"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                chatOpen
                  ? "bg-[#0E9F6E] text-white"
                  : "glass hover:bg-[rgba(14,159,110,0.1)]"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-red-500/10 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-[rgba(232,245,238,0.3)]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTEXT STATUS ── */}
      <ContextStatus
        projectId={projectId}
        projectData={projectData}
        globalData={globalData}
      />

      {/* ── INSIGHTS DASHBOARD ── */}
      {!chatOpen && (
        <div className="px-5 py-4 overflow-y-auto scrollbar-hide">
          {isLoading && (
            <div className="flex items-center gap-2 py-8 justify-center">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse w-2 h-2 rounded-full bg-[#0E9F6E]"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}

          {hasProjectData && projectData && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass">
                  <Activity className="w-3 h-3 text-[#0E9F6E]" />
                  <span className="text-[11px] font-medium text-[#0E9F6E]">
                    {projectData.stage}
                  </span>
                </div>
                <span className="text-[11px] text-[rgba(232,245,238,0.3)]">
                  {projectData.stats.completionRate}% complete
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label: "Done", value: String(projectData.stats.done), color: "text-emerald-400" },
                  { label: "Active", value: String(projectData.stats.inProgress), color: "text-amber-400" },
                  { label: "Todo", value: String(projectData.stats.todo), color: "text-blue-400" },
                  { label: "Risk", value: String(projectData.stats.highRisk), color: "text-red-400" },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="text-center py-2.5 rounded-xl glass"
                  >
                    <p className={`text-lg font-bold ${stat.color}`}>
                      {stat.value}
                    </p>
                    <p className="text-[9px] text-[rgba(232,245,238,0.25)]">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {projectData.insights.map((insight, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border ${
                      TYPE_COLORS[insight.type] || TYPE_COLORS.insight
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {ICON_MAP[insight.icon || insight.type] || (
                        <Zap className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{insight.title}</p>
                      <p className="text-[11px] opacity-80 mt-0.5 leading-relaxed">
                        {insight.detail}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {hasGlobalData && globalData && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass">
                  <Activity className="w-3 h-3 text-[#0E9F6E]" />
                  <span className="text-[11px] font-medium text-[#0E9F6E]">
                    Portfolio Overview
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "Projects", value: String(globalData.totalProjects), color: "text-emerald-400" },
                  { label: "Tasks", value: String(globalData.totalTasks), color: "text-amber-400" },
                  { label: "Risk", value: String(globalData.totalRisk), color: "text-red-400" },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="text-center py-2.5 rounded-xl glass"
                  >
                    <p className={`text-lg font-bold ${stat.color}`}>
                      {stat.value}
                    </p>
                    <p className="text-[9px] text-[rgba(232,245,238,0.25)]">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {globalData.insights.map((insight, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border ${
                      TYPE_COLORS[insight.type] || TYPE_COLORS.insight
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{insight.title}</p>
                      <p className="text-[11px] opacity-80 mt-0.5 leading-relaxed">
                        {insight.detail}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── CHAT INTERFACE ── */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden flex flex-col"
          >
            <div className="border-t border-[rgba(255,255,255,0.04)] flex flex-col">
              {/* Messages */}
              <div className="px-5 py-3 flex-1 overflow-y-auto scrollbar-hide" style={{ maxHeight: "400px" }}>
                {messages.length === 0 && (
                  <div className="py-6">
                    <div className="flex items-center gap-2 justify-center mb-4">
                      <Bot className="w-5 h-5 text-[#0E9F6E]" />
                      <p className="text-sm text-[rgba(232,245,238,0.5)] font-medium">
                        KORTEX AI Agent
                      </p>
                    </div>
                    <p className="text-xs text-center text-[rgba(232,245,238,0.3)] mb-4">
                      {projectId
                        ? "I understand your project deeply. Ask me anything — I'll investigate first."
                        : "I'm your autonomous workspace agent. I investigate your data before every answer."}
                    </p>

                    {/* Agent status indicators */}
                    <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                      {[
                        { label: "Context Loaded", icon: <CheckCircle2 className="w-2.5 h-2.5" /> },
                        { label: "Workspace Indexed", icon: <Database className="w-2.5 h-2.5" /> },
                        { label: "Memory Active", icon: <Brain className="w-2.5 h-2.5" /> },
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-[rgba(14,159,110,0.04)] border border-[rgba(14,159,110,0.08)]"
                        >
                          <div className="text-[#0E9F6E]/60">{item.icon}</div>
                          <span className="text-[9px] text-[rgba(232,245,238,0.3)]">
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Quick suggestions */}
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {quickSuggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(s)}
                          className="px-3 py-1.5 rounded-full text-[11px] text-[rgba(232,245,238,0.35)] glass hover:bg-[rgba(14,159,110,0.08)] hover:text-[#0E9F6E] transition-all border border-transparent hover:border-[rgba(14,159,110,0.15)]"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message list */}
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`mb-3 ${msg.role === "user" ? "text-right" : ""}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <Bot className="w-3 h-3 text-[#0E9F6E]" />
                        <span className="text-[9px] text-[rgba(232,245,238,0.2)] font-medium">
                          KORTEX AI
                        </span>
                      </div>
                    )}
                    <div
                      className={`inline-block max-w-[85%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[#0E9F6E] text-white rounded-br-sm"
                          : "bg-[rgba(255,255,255,0.03)] text-[rgba(232,245,238,0.7)] rounded-bl-sm border border-[rgba(255,255,255,0.04)]"
                      }`}
                    >
                      {msg.role === "assistant"
                        ? renderMarkdown(msg.content)
                        : msg.content}
                    </div>
                  </motion.div>
                ))}

                {/* Agent thinking indicator */}
                {isTyping && agentStep && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-3"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Bot className="w-3 h-3 text-[#0E9F6E]" />
                      <span className="text-[9px] text-[rgba(232,245,238,0.2)] font-medium">
                        KORTEX AI
                      </span>
                    </div>
                    <div className="inline-flex flex-col gap-1 px-4 py-3 rounded-2xl rounded-bl-sm bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)]">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 text-[#0E9F6E] animate-spin" />
                        <span className="text-[11px] text-[#0E9F6E] font-medium">
                          {AGENT_STEPS[agentStep].label}
                        </span>
                      </div>
                      <span className="text-[10px] text-[rgba(232,245,238,0.25)] ml-5.5">
                        {AGENT_STEPS[agentStep].sublabel}
                      </span>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Post-message suggestions */}
              {postMessageSuggestions.length > 0 && !isTyping && (
                <div className="px-5 pb-2 flex flex-wrap gap-1.5">
                  {postMessageSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="px-2.5 py-1 rounded-full text-[10px] text-[rgba(232,245,238,0.3)] glass hover:bg-[rgba(14,159,110,0.08)] hover:text-[#0E9F6E] transition-all border border-transparent hover:border-[rgba(14,159,110,0.15)]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="px-5 pb-4 pt-2 shrink-0">
                <div className="flex items-center gap-2 glass rounded-xl px-4 py-2.5 border border-[rgba(255,255,255,0.04)] focus-within:border-[rgba(14,159,110,0.3)] transition-colors">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      projectId
                        ? "Ask about your project..."
                        : "Ask anything about your workspace..."
                    }
                    className="flex-1 bg-transparent text-xs text-[#E8F5EE] placeholder:text-[rgba(232,245,238,0.2)] outline-none"
                    disabled={isTyping}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!inputValue.trim() || isTyping}
                    className="w-8 h-8 rounded-lg bg-[#0E9F6E] flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#18C37E] transition-colors shrink-0"
                  >
                    {isTyping ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowUp className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[9px] text-[rgba(232,245,238,0.15)] text-center mt-2">
                  Powered by KORTEX AI — Workspace Intelligence Agent
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
