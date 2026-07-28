import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
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
  Bot,
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
  status: "bg-[rgba(14,159,110,0.08)] text-[#0E9F6E] border-[rgba(14,159,110,0.15)]",
  warning: "bg-amber-500/8 text-amber-400 border-amber-500/15",
  suggestion: "bg-blue-500/8 text-blue-400 border-blue-500/15",
  insight: "bg-purple-500/8 text-purple-400 border-purple-500/15",
};

const quickSuggestions = [
  "What's the project progress?",
  "What are the risks?",
  "Help me plan a sprint",
  "How can I improve?",
  "Hello!",
];

/** Simple markdown renderer for AI responses */
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    let processed: React.ReactNode = line;
    const boldRegex = /\*\*(.+?)\*\*/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    while ((match = boldRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }
      parts.push(<strong key={`b-${i}-${match.index}`} className="text-[#E8F5EE] font-semibold">{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }
    if (parts.length > 0) {
      processed = parts;
    }

    if (line.startsWith("• ") || line.startsWith("- ")) {
      return <div key={i} className="flex gap-1.5 ml-1"><span className="text-[#0E9F6E] shrink-0">•</span><span>{processed}</span></div>;
    }

    const numMatch = line.match(/^(\d+)\.\s/);
    if (numMatch) {
      return <div key={i} className="flex gap-1.5 ml-1"><span className="text-[#0E9F6E] shrink-0 font-medium">{numMatch[1]}.</span><span>{line.slice(numMatch[0].length)}</span></div>;
    }

    return <span key={i}>{processed}{i < lines.length - 1 && <br />}</span>;
  });
}

export default function AICopilot({ projectId, onClose, expanded = false }: AICopilotProps) {
  const [chatOpen, setChatOpen] = useState(expanded);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const projectData = useQuery(api.ai.getProjectInsights, projectId ? { projectId } : "skip") as ProjectInsightData | null | undefined;
  const globalData = useQuery(api.ai.getGlobalInsights, {}) as GlobalInsightData | null | undefined;
  const createConversation = useMutation(api.ai.createConversation);
  const generateAIResponse = useAction(api.aiActions.generateResponse);
  const sendMessageMutation = useMutation(api.ai.sendMessage);

  const conversationIdRef = useRef<Id<"aiConversations"> | null>(null);
  const [conversationId, setConversationId] = useState<Id<"aiConversations"> | null>(null);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    if (expanded) setChatOpen(true);
  }, [expanded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (text?: string) => {
    const content = text || inputValue.trim();
    if (!content) return;
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content }]);
    setIsTyping(true);

    try {
      let convId = conversationIdRef.current;

      if (!convId) {
        convId = await createConversation({ projectId, title: content.slice(0, 50) });
        conversationIdRef.current = convId;
        setConversationId(convId);
      }

      // Try Gemini AI first — if it returns null, fall back to smart rule-based
      let response: string | null = null;
      try {
        response = await generateAIResponse({
          projectId,
          userMessage: content,
          conversationHistory: messages.slice(-10),
        });
      } catch {
        // Gemini not available — continue with null
      }

      if (response) {
        // Gemini gave us a response — use it directly
        setMessages((prev) => [...prev, { role: "assistant", content: response! }]);
      } else {
        // Fall back to smart rule-based response
        const updatedMessages = await sendMessageMutation({
          conversationId: convId,
          content,
        });
        if (updatedMessages && updatedMessages.length > 0) {
          const assistantMsg = updatedMessages[updatedMessages.length - 1];
          setMessages((prev) => [...prev, { role: assistantMsg.role, content: assistantMsg.content }]);
        }
      }
    } catch (err) {
      console.error("AI Copilot error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Oops! Something went wrong. Please try again." },
      ]);
    } finally {
      setIsTyping(false);
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
      className="glass-card rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[rgba(14,159,110,0.1)] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#0E9F6E]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#E8F5EE]">KORTEX AI</h3>
              <p className="text-[10px] text-[rgba(232,245,238,0.3)]">
                {projectId ? "Project assistant" : "Your AI copilot"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setChatOpen(!chatOpen)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${chatOpen ? "bg-[#0E9F6E] text-white" : "glass hover:bg-[rgba(14,159,110,0.1)]"}`}>
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
            {onClose && (
              <button onClick={onClose} className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-red-500/10 transition-colors">
                <X className="w-3.5 h-3.5 text-[rgba(232,245,238,0.3)] hover:text-red-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Insights Dashboard */}
      <div className="px-5 py-4">
        {isLoading && (
          <div className="flex items-center gap-2 py-8 justify-center">
            <div className="animate-pulse w-2 h-2 rounded-full bg-[#0E9F6E]" />
            <div className="animate-pulse w-2 h-2 rounded-full bg-[#0E9F6E]" style={{ animationDelay: "0.1s" }} />
            <div className="animate-pulse w-2 h-2 rounded-full bg-[#0E9F6E]" style={{ animationDelay: "0.2s" }} />
          </div>
        )}

        {hasProjectData && projectData && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass">
                <Activity className="w-3 h-3 text-[#0E9F6E]" />
                <span className="text-[11px] font-medium text-[#0E9F6E]">{projectData.stage}</span>
              </div>
              <span className="text-[11px] text-[rgba(232,245,238,0.3)]">{projectData.stats.completionRate}% complete</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: "Done", value: String(projectData.stats.done), color: "text-[#0E9F6E]" },
                { label: "Active", value: String(projectData.stats.inProgress), color: "text-amber-400" },
                { label: "Todo", value: String(projectData.stats.todo), color: "text-blue-400" },
                { label: "Risk", value: String(projectData.stats.highRisk), color: "text-red-400" },
              ].map((stat, i) => (
                <div key={i} className="text-center py-2 rounded-lg bg-[rgba(255,255,255,0.02)]">
                  <p className={`text-base font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[9px] text-[rgba(232,245,238,0.25)]">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {projectData.insights.map((insight, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border ${typeColors[insight.type] || typeColors.insight}`}>
                  <div className="shrink-0 mt-0.5">{iconMap[insight.icon || insight.type] || <Zap className="w-4 h-4" />}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{insight.title}</p>
                    <p className="text-[11px] opacity-80 mt-0.5 leading-relaxed">{insight.detail}</p>
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
                <span className="text-[11px] font-medium text-[#0E9F6E]">Portfolio Overview</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "Projects", value: String(globalData.totalProjects), color: "text-[#0E9F6E]" },
                { label: "Tasks", value: String(globalData.totalTasks), color: "text-amber-400" },
                { label: "Risk", value: String(globalData.totalRisk), color: "text-red-400" },
              ].map((stat, i) => (
                <div key={i} className="text-center py-2 rounded-lg bg-[rgba(255,255,255,0.02)]">
                  <p className={`text-base font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[9px] text-[rgba(232,245,238,0.25)]">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {globalData.insights.map((insight, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border ${typeColors[insight.type] || typeColors.insight}`}>
                  <div className="shrink-0 mt-0.5"><Zap className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{insight.title}</p>
                    <p className="text-[11px] opacity-80 mt-0.5 leading-relaxed">{insight.detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Chat */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="border-t border-[rgba(255,255,255,0.04)]">
              <div className="px-5 py-3 max-h-72 overflow-y-auto scrollbar-hide">
                {messages.length === 0 && (
                  <div className="py-4">
                    <div className="flex items-center gap-2 justify-center mb-3">
                      <Bot className="w-4 h-4 text-[#0E9F6E]" />
                      <p className="text-xs text-[rgba(232,245,238,0.4)]">Hi! I'm your AI copilot. Ask me anything.</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {quickSuggestions.map((s, i) => (
                        <button key={i} onClick={() => handleSend(s)} className="px-2.5 py-1.5 rounded-full text-[10px] text-[rgba(232,245,238,0.35)] glass hover:bg-[rgba(14,159,110,0.08)] hover:text-[#0E9F6E] transition-all">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`mb-2 ${msg.role === "user" ? "text-right" : ""}`}>
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <Bot className="w-3 h-3 text-[#0E9F6E]" />
                        <span className="text-[9px] text-[rgba(232,245,238,0.2)]">KORTEX AI</span>
                      </div>
                    )}
                    <div className={`inline-block max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                      msg.role === "user" ? "bg-[#0E9F6E] text-white rounded-br-sm" : "bg-[rgba(255,255,255,0.03)] text-[rgba(232,245,238,0.7)] rounded-bl-sm border border-[rgba(255,255,255,0.04)]"
                    }`}>
                      {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)]">
                      <Sparkles className="w-3 h-3 text-[#0E9F6E] animate-pulse" />
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0E9F6E] animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0E9F6E] animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0E9F6E] animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 glass rounded-xl pl-4 pr-1.5 py-1.5">
                  <input value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Ask me anything..."
                    className="flex-1 bg-transparent text-xs text-[#E8F5EE] placeholder:text-[rgba(232,245,238,0.2)] border-none outline-none" />
                  <button onClick={() => handleSend()} disabled={!inputValue.trim() || isTyping}
                    className="w-7 h-7 rounded-lg bg-[#0E9F6E] flex items-center justify-center hover:bg-[#18C37E] transition-colors disabled:opacity-30">
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
