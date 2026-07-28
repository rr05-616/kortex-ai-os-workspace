import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  AlertTriangle,
  Lightbulb,
  Activity,
  Clock,
  Target,
  TrendingUp,
  MessageSquare,
  Zap,
  X,
} from "lucide-react";

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
  stats: { total: number; done: number; inProgress: number; todo: number; backlog: number; review: number; highRisk: number; overdue: number; completionRate: number };
  stage: string;
  insights: Insight[];
}

interface GlobalInsightData {
  totalProjects: number;
  activeProjects: number;
  planningProjects: number;
  totalTasks: number;
  totalDone: number;
  totalInProgress: number;
  totalRisk: number;
  globalCompletion: number;
  insights: Insight[];
}

const iconMap: Record<string, React.ReactNode> = {
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

const typeColors: Record<string, string> = {
  status: "bg-[#0E9F6E]/10 text-[#0E9F6E] border-[#0E9F6E]/20",
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  suggestion: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  insight: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

const quickSuggestions = [
  "What's the project progress?",
  "What are the current risks?",
  "How can I improve?",
  "Help me plan a sprint",
  "Summarize recent activity",
];

export default function AICopilot({ projectId, onClose, expanded = false }: AICopilotProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Backend data
  const projectData = useQuery(api.ai.getProjectInsights, projectId ? { projectId } : "skip") as ProjectInsightData | null | undefined;
  const globalData = useQuery(api.ai.getGlobalInsights, {}) as GlobalInsightData | null | undefined;
  const createConversation = useMutation(api.ai.createConversation);
  const [conversationId, setConversationId] = useState<Id<"aiConversations"> | null>(null);

  // Use project-specific data when available, otherwise global
  const data = projectId ? projectData : globalData;

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const content = text || inputValue.trim();
    if (!content) return;

    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content }]);
    setIsTyping(true);

    try {
      if (!conversationId) {
        const convId = await createConversation({ projectId, title: content.slice(0, 50) });
        setConversationId(convId);
      }

      // Simulate AI response with real data
      setTimeout(() => {
        let response = "";
        const query = content.toLowerCase();

        if (projectId && projectData) {
          // Project-specific responses
          if (query.includes("progress") || query.includes("status") || query.includes("stage")) {
            response = `**${projectData.project.name}** is at **${projectData.stage}** with ${projectData.stats.completionRate}% completion. ${projectData.stats.done} tasks done, ${projectData.stats.inProgress} in progress, ${projectData.stats.backlog} in backlog.`;
          } else if (query.includes("risk") || query.includes("block")) {
            response = projectData.stats.highRisk > 0
              ? `⚠️ **${projectData.stats.highRisk} high-risk task${projectData.stats.highRisk > 1 ? "s" : ""}** detected. ${projectData.stats.overdue > 0 ? `${projectData.stats.overdue} overdue.` : "No overdue tasks."}`
              : "✅ No high-risk tasks detected. Your project is healthy!";
          } else if (query.includes("suggest") || query.includes("improve")) {
            const items = projectData.insights.filter((i) => i.type === "suggestion");
            response = items.length > 0
              ? `Here are my recommendations:\n\n${items.map((s, i) => `${i + 1}. **${s.title}** — ${s.detail}`).join("\n\n")}`
              : "Your project is on track! Keep up the great work.";
          } else if (query.includes("sprint") || query.includes("plan")) {
            response = `Sprint planning for **${projectData.project.name}**:\n\n• Remaining tasks: ${projectData.stats.total - projectData.stats.done}\n• In progress: ${projectData.stats.inProgress}\n• Sprint duration: ${projectData.project.sprintDuration} days\n\nI recommend focusing on high-priority items first.`;
          } else {
            response = `📊 **${projectData.project.name}** Overview:\n• Stage: ${projectData.stage}\n• Health: ${projectData.project.healthScore}%\n• Completion: ${projectData.stats.completionRate}%\n• Tasks: ${projectData.stats.done}/${projectData.stats.total} done`;
          }
        } else if (globalData) {
          // Global responses
          if (query.includes("progress") || query.includes("status")) {
            response = `Portfolio: **${globalData.totalProjects} projects** (${globalData.activeProjects} active), **${globalData.totalTasks} tasks** total, ${globalData.globalCompletion}% completion.`;
          } else if (query.includes("risk")) {
            response = globalData.totalRisk > 0
              ? `⚠️ ${globalData.totalRisk} high-risk task${globalData.totalRisk > 1 ? "s" : ""} across your portfolio.`
              : "✅ No high-risk tasks in your portfolio.";
          } else {
            response = "Select a project from the dashboard to get project-specific insights and suggestions!";
          }
        } else {
          response = "I'm loading your data... Ask me about project progress, risks, or suggestions!";
        }

        setMessages((prev) => [...prev, { role: "assistant", content: response }]);
        setIsTyping(false);
      }, 600);
    } catch {
      setIsTyping(false);
    }
  };

  const isLoading = data === undefined;
  const projectInsights = projectId ? projectData : null;
  const globalInsights = projectId ? null : globalData;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="glass-strong rounded-3xl overflow-hidden shadow-xl shadow-green-500/5"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0E9F6E]/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#0E9F6E]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">KORTEX AI Copilot</h3>
              <p className="text-[10px] text-muted-foreground">
                {projectId ? "Project insights & suggestions" : "Global workspace intelligence"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                chatOpen ? "bg-[#0E9F6E] text-white" : "glass hover:bg-[#0E9F6E]/10"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-red-500/10 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Insights Section */}
      <div className="px-5 py-4">
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center gap-2 py-8 justify-center">
            <div className="animate-pulse w-2 h-2 rounded-full bg-[#0E9F6E]" />
            <div className="animate-pulse w-2 h-2 rounded-full bg-[#0E9F6E]" style={{ animationDelay: "0.1s" }} />
            <div className="animate-pulse w-2 h-2 rounded-full bg-[#0E9F6E]" style={{ animationDelay: "0.2s" }} />
          </div>
        )}

        {/* Project-specific insights */}
        {projectInsights && (
          <>
            {/* Stage indicator */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0E9F6E]/10 border border-[#0E9F6E]/20">
                <Activity className="w-3 h-3 text-[#0E9F6E]" />
                <span className="text-[11px] font-medium text-[#0E9F6E]">
                  {projectInsights.stage}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {projectInsights.stats.completionRate}% complete
              </span>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: "Done", value: String(projectInsights.stats.done), color: "text-[#0E9F6E]" },
                { label: "Active", value: String(projectInsights.stats.inProgress), color: "text-amber-500" },
                { label: "Todo", value: String(projectInsights.stats.todo), color: "text-blue-500" },
                { label: "Risk", value: String(projectInsights.stats.highRisk), color: "text-red-500" },
              ].map((stat, i) => (
                <div key={i} className="text-center py-2 rounded-xl bg-white/30">
                  <p className={`text-base font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[9px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Insights List */}
            <div className="space-y-2">
              {projectInsights.insights.map((insight, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border ${typeColors[insight.type] || typeColors.insight}`}
                >
                  <div className="shrink-0 mt-0.5">
                    {iconMap[insight.icon || insight.type] || <Zap className="w-4 h-4" />}
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

        {/* Global insights */}
        {globalInsights && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0E9F6E]/10 border border-[#0E9F6E]/20">
                <Activity className="w-3 h-3 text-[#0E9F6E]" />
                <span className="text-[11px] font-medium text-[#0E9F6E]">
                  Portfolio Overview
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "Projects", value: String(globalInsights.totalProjects), color: "text-[#0E9F6E]" },
                { label: "Tasks", value: String(globalInsights.totalTasks), color: "text-amber-500" },
                { label: "Risk", value: String(globalInsights.totalRisk), color: "text-red-500" },
              ].map((stat, i) => (
                <div key={i} className="text-center py-2 rounded-xl bg-white/30">
                  <p className={`text-base font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[9px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {globalInsights.insights.map((insight, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border ${typeColors[insight.type] || typeColors.insight}`}
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

      {/* Chat Section */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/40">
              {/* Messages */}
              <div className="px-5 py-3 max-h-64 overflow-y-auto scrollbar-hide">
                {messages.length === 0 && (
                  <div className="py-4">
                    <p className="text-xs text-muted-foreground/60 text-center mb-4">
                      Ask me anything about your project
                    </p>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {quickSuggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(s)}
                          className="px-2.5 py-1.5 rounded-full text-[10px] text-muted-foreground glass hover:bg-[#0E9F6E]/10 hover:text-[#0E9F6E] transition-all"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mb-2 ${msg.role === "user" ? "text-right" : ""}`}
                  >
                    <div
                      className={`inline-block max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[#0E9F6E] text-white rounded-br-sm"
                          : "bg-white/60 text-foreground rounded-bl-sm"
                      }`}
                    >
                      {msg.content.split("\n").map((line, j) => (
                        <span key={j}>
                          {line}
                          {j < msg.content.split("\n").length - 1 && <br />}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}

                {isTyping && (
                  <div className="flex items-center gap-1.5 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0E9F6E] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0E9F6E] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0E9F6E] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 glass rounded-full pl-4 pr-1.5 py-1.5">
                  <input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ask about your project..."
                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 border-none outline-none"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!inputValue.trim()}
                    className="w-7 h-7 rounded-full bg-[#0E9F6E] flex items-center justify-center hover:bg-[#0C8A5F] transition-colors disabled:opacity-40"
                  >
                    <Send className="w-3 h-3 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
