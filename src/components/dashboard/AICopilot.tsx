import { useState, useRef, useEffect, useMemo } from "react";
import { api } from "@/convex/_generated/api";
import { useLocalQuery, useLocalMutation, useLocalAction } from "@/lib/convex-local";
import type { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { sendToBackend, checkBackendHealth } from "@/lib/backend";
import {
  Sparkles, X, Bot, CheckCircle2, Search, Brain,
  Database, Activity, AlertTriangle, Lightbulb, TrendingUp,
  Clock, Target, Zap, Loader2,
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
  backendReady,
}: {
  projectId?: Id<"projects">;
  projectData?: ProjectInsightData | null;
  globalData?: GlobalInsightData | null;
  backendReady: boolean | null;
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
          { label: "Backend", loaded: backendReady === true, icon: <Database className="w-2.5 h-2.5" /> },
        ]
      : globalData
        ? [
            { label: "Workspace", loaded: true, icon: <Globe className="w-2.5 h-2.5" /> },
            { label: "Projects", loaded: true, count: globalData.totalProjects, icon: <GitBranch className="w-2.5 h-2.5" /> },
            { label: "Tasks", loaded: true, count: globalData.totalTasks, icon: <Target className="w-2.5 h-2.5" /> },
            { label: "Analytics", loaded: true, icon: <BarChart3 className="w-2.5 h-2.5" /> },
            { label: "Memory", loaded: true, icon: <Brain className="w-2.5 h-2.5" /> },
            { label: "Backend", loaded: backendReady === true, icon: <Database className="w-2.5 h-2.5" /> },
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
        s.push("What tasks should I create first?");
      } else {
        if (projectData.stats.highRisk > 0) {
          s.push("What are the high-risk tasks?");
        }
        if (projectData.stats.overdue > 0) {
          s.push("Which tasks are overdue?");
        }
        if (projectData.stats.inProgress === 0 && projectData.stats.todo > 0) {
          s.push("What should I work on next?");
        }
        if (projectData.stage === "Planning") {
          s.push("Help me plan the next sprint");
        }
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
        if (globalData.totalRisk > 0) {
          s.push("Show me all high-risk tasks");
        }
        if (globalData.totalOverdue > 0) {
          s.push("What tasks are overdue?");
        }
        s.push("Give me a portfolio overview");
      }
      return s.slice(0, 3);
    }

    return ["What can you help me with?", "How does KORTEX AI work?", "Show me my workspace"];
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
  // Handle bold text with ** or __
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
  return parts.map((part, i) => {
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      return (
        <strong key={i} className="font-semibold text-[rgba(232,245,238,0.9)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Handle inline code with `
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
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Queries
  const projectData = useLocalQuery<ProjectInsightData>(
    api.ai.getProjectInsights,
    projectId ? { projectId } : "skip"
  );
  const globalData = useLocalQuery<GlobalInsightData>(api.ai.getGlobalInsights);
  const conversations = useLocalQuery<Array<{ _id: string; projectId?: string; messages: Array<{ role: string; content: string }> }>>(api.ai.getConversations);

  // Mutations
  const createConversation = useLocalMutation(api.ai.createConversation);
  const sendMessageMutation = useLocalMutation(api.ai.sendMessage);
  const saveAssistantResponse = useLocalMutation(api.ai.saveAssistantResponse);

  // Actions
  const generateResponse = useLocalAction(api.aiActions.generateResponse);

  // Check backend health on mount
  const [backendReady, setBackendReady] = useState<boolean | null>(null);
  useEffect(() => {
    checkBackendHealth().then(setBackendReady);
  }, []);

  // Dynamic suggestions
  const suggestions = useDynamicSuggestions({
    projectId,
    projectData,
    globalData,
    messages,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Initialize conversation
  useEffect(() => {
    const initConversation = async () => {
      if (!conversationId && conversations !== undefined) {
        const existing = projectId
          ? conversations.find((c) => c.projectId === projectId)
          : conversations[0];

        if (existing) {
          setConversationId(existing._id);
          setMessages(
            existing.messages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            }))
          );
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const id: any = await createConversation({
            projectId,
            title: projectId && projectData ? projectData.project.name : "Global Chat",
          });
          setConversationId(id as string);
        }
      }
    };
    initConversation();
  }, [conversations, projectId, projectData, createConversation, conversationId]);

  // Handle send message — fully self-contained, builds conversation history locally
  const handleSend = async (message?: string) => {
    const text = message || input.trim();
    if (!text || isThinking) return;

    setInput("");
    const userMsg = { role: "user" as const, content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);
    setShowInsights(false);

    try {
      // Simulate reasoning steps
      setCurrentStep("searching");
      await new Promise((r) => setTimeout(r, 400));
      setCurrentStep("reading");
      await new Promise((r) => setTimeout(r, 400));
      setCurrentStep("analyzing");
      await new Promise((r) => setTimeout(r, 400));
      setCurrentStep("generating");

      // Build conversation history from local messages state (not from backend)
      const conversationHistory = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Try FastAPI Python backend first
      let response: string;
      if (backendReady) {
        try {
          const backendResponse = await sendToBackend(
            text,
            conversationId ?? undefined,
            projectId as unknown as string,
            conversationHistory,
          );
          response = backendResponse.response;
        } catch {
          // FastAPI unavailable — use local fallback
          response = generateLocalResponse(text, conversationHistory);
        }
      } else {
        // No backend — use local fallback
        response = generateLocalResponse(text, conversationHistory);
      }

      // Add assistant response directly to local state
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      console.error("AI response error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I encountered an error processing your request. Please try again.",
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // Local response generator — works without any backend
  const generateLocalResponse = (text: string, history: Array<{ role: string; content: string }>): string => {
    const lower = text.toLowerCase();
    const taskCount = projectData?.stats?.total ?? 0;
    const doneCount = projectData?.stats?.done ?? 0;
    const completionRate = projectData?.stats?.completionRate ?? 0;
    const riskCount = projectData?.stats?.highRisk ?? 0;

    if (lower.includes("what should i work on next") || lower.includes("next task")) {
      if (riskCount > 0) return `I see ${riskCount} high-risk task${riskCount > 1 ? 's' : ''} in your project. I recommend addressing those first to prevent blockers. Check the risk indicators in your task list.`;
      if (completionRate < 50) return `You're at ${completionRate}% completion with ${taskCount - doneCount} tasks remaining. Focus on the highest-priority items in your current sprint.`;
      return `Great progress! You're at ${completionRate}% completion. Consider starting the next sprint planning or tackling any remaining backlog items.`;
    }
    if (lower.includes("project status") || lower.includes("how are we doing")) {
      return `Your project is ${projectData?.project?.status ?? 'active'} with ${completionRate}% completion. ${doneCount}/${taskCount} tasks are done.${riskCount > 0 ? ` There are ${riskCount} high-risk items to watch.` : ' No high-risk items.'}`;
    }
    if (lower.includes("sprint")) {
      return `Your current sprint has a ${completionRate}% completion rate with ${taskCount} total tasks. ${doneCount} completed, ${taskCount - doneCount} remaining.`;
    }
    if (lower.includes("risk") || lower.includes("blocker")) {
      if (riskCount > 0) return `I've identified ${riskCount} high-risk task${riskCount > 1 ? 's' : ''} that could impact your timeline. Review these tasks and consider reassigning priorities or adding resources.`;
      return `No high-risk items detected in your current workspace. Your project health looks good.`;
    }
    if (lower.includes("help") || lower.includes("what can you do")) {
      return `I can help you with:\n\n• **Project status** — "What's the project status?"\n• **Next actions** — "What should I work on next?"\n• **Risk analysis** — "Are there any blockers?"\n• **Sprint planning** — "How's the sprint going?"\n• **Task recommendations** — "Suggest task priorities"\n\nTry asking about your project!`;
    }
    return `Here's what I can see in your workspace:\n\n• **${taskCount} tasks** tracked, **${doneCount} completed** (${completionRate}% done)${riskCount > 0 ? `\n• **${riskCount} high-risk items** need attention` : ''}\n\nTry asking me about:\n• "What should I work on next?"\n• "What's the project status?"\n• "Are there any blockers?"\n• "How's the sprint going?"`;
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Get insight data
  const insightData = projectId ? projectData : globalData;
  const insights = insightData?.insights ?? [];

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
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[rgba(14,159,110,0.08)] transition-colors"
          >
            <X className="w-4 h-4 text-[rgba(232,245,238,0.4)]" />
          </button>
        )}
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
              Workspace Intelligence Active
            </h4>
            <p className="text-sm text-[rgba(232,245,238,0.4)] max-w-xs mx-auto">
              I investigate your entire workspace before answering. Ask me anything about your projects, tasks, or architecture.
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
                  <div className="space-y-1">{renderMarkdown(msg.content)}</div>
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
              onKeyPress={handleKeyPress}
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
