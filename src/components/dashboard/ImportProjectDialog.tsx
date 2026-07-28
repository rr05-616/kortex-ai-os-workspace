import { useState, useEffect } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  X,
  Globe,
  GitBranch,
  Rocket,
  BarChart3,
  Shield,
  FileText,
  Zap,
  FolderKanban,
  Cpu,
  Database,
  Cloud,
  Brain,
  ChevronRight,
} from "lucide-react";

interface ImportProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ScanStage = "input" | "scanning" | "analyzing" | "generating" | "results" | "creating" | "done";

interface ScanResult {
  urlType: string;
  repoInfo: {
    name: string;
    description: string | undefined;
    language: string | undefined;
    framework: string | undefined;
    stars: number;
    forks: number;
    readme: string;
    fileStructure: string[];
    dependencies: string[];
    topics: string[];
  };
  analysis: {
    projectType: string;
    executiveSummary: string;
    keyFeatures: string[];
    missingFeatures: string[];
    architecture: string;
  };
  scores: {
    overall: number;
    codeQuality: number;
    uiUx: number;
    performance: number;
    security: number;
    documentation: number;
    aiReadiness: number;
    devOps: number;
    productQuality: number;
  };
  recommendations: {
    immediate: string[];
    nextSprint: string[];
    futureRoadmap: string[];
    strengths: string[];
    weaknesses: string[];
    riskLevel: string;
    developmentStage: string;
    technicalDebt: string;
  };
  tasks: Array<{
    title: string;
    description: string;
    priority: string;
    tags: string[];
    estimatedHours: number;
  }>;
}

const scanStages = [
  { id: "scanning", label: "Validating URL", icon: Search, duration: 2000 },
  { id: "scanning", label: "Reading repository", icon: GitBranch, duration: 3000 },
  { id: "analyzing", label: "Detecting technologies", icon: Cpu, duration: 2500 },
  { id: "analyzing", label: "Analyzing architecture", icon: Database, duration: 3000 },
  { id: "analyzing", label: "Evaluating security", icon: Shield, duration: 2000 },
  { id: "generating", label: "Generating insights", icon: Sparkles, duration: 2500 },
  { id: "generating", label: "Building workspace", icon: FolderKanban, duration: 2000 },
  { id: "generating", label: "Creating tasks", icon: FileText, duration: 1500 },
];

const scoreLabels: Record<string, { label: string; weight: string; icon: React.ReactNode }> = {
  codeQuality: { label: "Code Quality", weight: "20%", icon: <FileText className="w-3 h-3" /> },
  uiUx: { label: "UI / UX", weight: "15%", icon: <Globe className="w-3 h-3" /> },
  performance: { label: "Performance", weight: "15%", icon: <Zap className="w-3 h-3" /> },
  security: { label: "Security", weight: "15%", icon: <Shield className="w-3 h-3" /> },
  documentation: { label: "Documentation", weight: "10%", icon: <FileText className="w-3 h-3" /> },
  aiReadiness: { label: "AI Readiness", weight: "10%", icon: <Brain className="w-3 h-3" /> },
  devOps: { label: "DevOps", weight: "10%", icon: <Cloud className="w-3 h-3" /> },
  productQuality: { label: "Product Quality", weight: "5%", icon: <BarChart3 className="w-3 h-3" /> },
};

function ScoreBar({ score, label, weight, icon }: { score: number; label: string; weight: string; icon: React.ReactNode }) {
  const color = score >= 80 ? "bg-[#0E9F6E]" : score >= 60 ? "bg-amber-400" : "bg-red-400";
  const textColor = score >= 80 ? "text-[#0E9F6E]" : score >= 60 ? "text-amber-400" : "text-red-400";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[rgba(232,245,238,0.5)]">{icon}<span className="text-[10px]">{label}</span></div>
        <div className="flex items-center gap-2"><span className="text-[9px] text-[rgba(232,245,238,0.2)]">{weight}</span><span className={`text-[11px] font-bold ${textColor}`}>{score}</span></div>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[rgba(255,255,255,0.04)]">
        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1, ease: "easeOut" }} className={`h-full rounded-full ${color}`} />
      </div>
    </div>
  );
}

export default function ImportProjectDialog({ open, onOpenChange }: ImportProjectDialogProps) {
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<ScanStage>("input");
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<Id<"projects"> | null>(null);

  const analyzeProject = useAction(api.projectScanner.analyzeProject);
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const createTask = useMutation(api.tasks.create);

  const reset = () => {
    setUrl("");
    setStage("input");
    setCurrentStageIndex(0);
    setResult(null);
    setError(null);
    setCreatedProjectId(null);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  // Animated scanning stages
  useEffect(() => {
    if (stage !== "scanning" && stage !== "analyzing" && stage !== "generating") return;
    if (currentStageIndex >= scanStages.length - 1) return;

    const timer = setTimeout(() => {
      setCurrentStageIndex((prev) => Math.min(prev + 1, scanStages.length - 1));
    }, scanStages[currentStageIndex].duration);

    return () => clearTimeout(timer);
  }, [stage, currentStageIndex]);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setStage("scanning");
    setCurrentStageIndex(0);
    setError(null);

    try {
      // Create project first
      const projectId = await createProject({
        name: "Analyzing...",
        description: `Importing from ${url}`,
        priority: "medium",
        sprintDuration: 14,
      });
      setCreatedProjectId(projectId);

      // Run analysis (this takes time due to API calls)
      const analysisResult = await analyzeProject({ url: url.trim(), projectId });
      setResult(analysisResult);

      // Update project with real info
      await updateProject({
        projectId,
        name: analysisResult.repoInfo.name,
        description: analysisResult.analysis.executiveSummary,
        healthScore: analysisResult.scores.overall,
        aiSummary: analysisResult.analysis.executiveSummary,
        aiTags: [
          analysisResult.analysis.projectType,
          ...analysisResult.repoInfo.topics.slice(0, 5),
          ...analysisResult.repoInfo.fileStructure.filter((f) => f.endsWith(".json")).slice(0, 3),
        ],
        status: "active",
      });

      setStage("results");
    } catch (err) {
      console.error("Analysis failed:", err);
      setError(err instanceof Error ? err.message : "Analysis failed. Please check the URL and try again.");
      setStage("input");
    }
  };

  const handleCreateWorkspace = async () => {
    if (!result || !createdProjectId) return;
    setStage("creating");

    try {
      // Create tasks from analysis
      for (let i = 0; i < result.tasks.length; i++) {
        const task = result.tasks[i];
        await createTask({
          title: task.title,
          description: task.description,
          projectId: createdProjectId,
          status: i < 3 ? "todo" : "backlog",
          priority: task.priority as "critical" | "high" | "medium" | "low",
          tags: task.tags,
          aiGenerated: true,
          estimatedHours: task.estimatedHours,
        });
      }

      setStage("done");
    } catch (err) {
      console.error("Workspace creation failed:", err);
      setStage("results");
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.7)] backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleClose}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide"
          onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.04)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[rgba(14,159,110,0.1)] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#0E9F6E]" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#E8F5EE]">AI Project Scanner</h2>
                <p className="text-[10px] text-[rgba(232,245,238,0.3)]">
                  {stage === "input" ? "Paste a URL to analyze" : stage === "results" ? "Analysis complete" : stage === "done" ? "Workspace created!" : "Analyzing project..."}
                </p>
              </div>
            </div>
            <button onClick={handleClose} className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-red-500/10 transition-colors">
              <X className="w-3.5 h-3.5 text-[rgba(232,245,238,0.3)]" />
            </button>
          </div>

          {/* Input Stage */}
          {stage === "input" && (
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[rgba(232,245,238,0.5)]">Project URL</label>
                <div className="flex items-center gap-2 glass rounded-xl pl-4 pr-1.5 py-1.5">
                  <Link className="w-3.5 h-3.5 text-[rgba(232,245,238,0.3)]" />
                  <input value={url} onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    placeholder="github.com/owner/repo or any project URL..."
                    className="flex-1 bg-transparent text-sm text-[#E8F5EE] placeholder:text-[rgba(232,245,238,0.15)] border-none outline-none"
                    autoFocus />
                  <button onClick={handleAnalyze} disabled={!url.trim()}
                    className="btn-liquid btn-liquid-solid h-8 px-4 text-xs disabled:opacity-30">
                    Analyze
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-[rgba(232,245,238,0.25)]">Supported platforms:</p>
                <div className="flex flex-wrap gap-1.5">
                  {["GitHub", "GitLab", "Bitbucket", "Vercel", "Netlify", "Any Website"].map((p) => (
                    <span key={p} className="px-2.5 py-1 rounded-lg text-[10px] text-[rgba(232,245,238,0.35)] glass border border-[rgba(255,255,255,0.04)]">{p}</span>
                  ))}
                </div>
              </div>

              {error && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  <AlertCircle className="w-3 h-3 inline mr-1.5" />{error}
                </div>
              )}
            </div>
          )}

          {/* Scanning / Analyzing / Generating Stages */}
          {(stage === "scanning" || stage === "analyzing" || stage === "generating") && (
            <div className="p-6 space-y-4">
              {/* Progress bar */}
              <div className="w-full h-1 rounded-full bg-[rgba(255,255,255,0.04)]">
                <motion.div initial={{ width: "0%" }} animate={{ width: `${((currentStageIndex + 1) / scanStages.length) * 100}%` }}
                  transition={{ duration: 0.5 }} className="h-full rounded-full bg-[#0E9F6E]" />
              </div>

              {/* Stage logs */}
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
                {scanStages.slice(0, currentStageIndex + 1).map((s, i) => {
                  const isComplete = i < currentStageIndex;
                  const isCurrent = i === currentStageIndex;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                        isCurrent ? "bg-[rgba(14,159,110,0.08)] border border-[rgba(14,159,110,0.15)]" :
                        isComplete ? "bg-[rgba(255,255,255,0.02)]" : ""
                      }`}>
                      {isComplete ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0E9F6E] shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-3.5 h-3.5 text-[#0E9F6E] animate-spin shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-[rgba(255,255,255,0.1)] shrink-0" />
                      )}
                      <s.icon className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? "text-[#0E9F6E]" : isComplete ? "text-[rgba(232,245,238,0.3)]" : "text-[rgba(232,245,238,0.15)]"}`} />
                      <span className={`text-xs ${isCurrent ? "text-[#E8F5EE] font-medium" : isComplete ? "text-[rgba(232,245,238,0.4)]" : "text-[rgba(232,245,238,0.15)]"}`}>
                        {s.label}
                      </span>
                      {isComplete && <span className="text-[10px] text-[#0E9F6E] ml-auto">Done</span>}
                      {isCurrent && <span className="text-[10px] text-[rgba(232,245,238,0.3)] ml-auto animate-pulse">Processing...</span>}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Results Stage */}
          {stage === "results" && result && (
            <div className="p-6 space-y-5">
              {/* Project Header */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[rgba(14,159,110,0.1)] flex items-center justify-center shrink-0">
                  <FolderKanban className="w-5 h-5 text-[#0E9F6E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-[#E8F5EE] truncate">{result.repoInfo.name}</h3>
                  <p className="text-xs text-[rgba(232,245,238,0.4)] mt-0.5 line-clamp-2">{result.analysis.executiveSummary}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {result.repoInfo.language && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-[rgba(14,159,110,0.1)] text-[#0E9F6E]">{result.repoInfo.language}</span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-blue-500/10 text-blue-400">{result.analysis.projectType}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-purple-500/10 text-purple-400">{result.recommendations.developmentStage}</span>
                    {result.repoInfo.stars > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-amber-500/10 text-amber-400">⭐ {result.repoInfo.stars}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Overall Score */}
              <div className="glass rounded-xl p-4 flex items-center gap-4">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2.5" />
                    <motion.path initial={{ strokeDasharray: "0, 100" }} animate={{ strokeDasharray: `${result.scores.overall}, 100` }}
                      transition={{ duration: 1.5, ease: "easeOut" }} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#0E9F6E" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-[#E8F5EE]">{result.scores.overall}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#E8F5EE]">Overall Score</p>
                  <p className="text-[10px] text-[rgba(232,245,238,0.3)]">
                    Risk: <span className={result.recommendations.riskLevel === "low" ? "text-[#0E9F6E]" : result.recommendations.riskLevel === "medium" ? "text-amber-400" : "text-red-400"}>
                      {result.recommendations.riskLevel}
                    </span> · Tech Debt: <span className={result.recommendations.technicalDebt === "low" ? "text-[#0E9F6E]" : result.recommendations.technicalDebt === "medium" ? "text-amber-400" : "text-red-400"}>
                      {result.recommendations.technicalDebt}
                    </span>
                  </p>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-semibold text-[rgba(232,245,238,0.3)] uppercase tracking-wider">Score Breakdown</h4>
                {Object.entries(scoreLabels).map(([key, info]) => (
                  <ScoreBar key={key} score={result.scores[key as keyof typeof result.scores]} label={info.label} weight={info.weight} icon={info.icon} />
                ))}
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass rounded-xl p-3">
                  <h4 className="text-[10px] font-semibold text-[#0E9F6E] mb-2">Strengths</h4>
                  <div className="space-y-1">
                    {result.recommendations.strengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-1.5"><CheckCircle2 className="w-2.5 h-2.5 text-[#0E9F6E] shrink-0 mt-0.5" /><span className="text-[10px] text-[rgba(232,245,238,0.5)]">{s}</span></div>
                    ))}
                  </div>
                </div>
                <div className="glass rounded-xl p-3">
                  <h4 className="text-[10px] font-semibold text-amber-400 mb-2">Weaknesses</h4>
                  <div className="space-y-1">
                    {result.recommendations.weaknesses.map((w, i) => (
                      <div key={i} className="flex items-start gap-1.5"><AlertCircle className="w-2.5 h-2.5 text-amber-400 shrink-0 mt-0.5" /><span className="text-[10px] text-[rgba(232,245,238,0.5)]">{w}</span></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tech Stack */}
              <div className="glass rounded-xl p-3">
                <h4 className="text-[10px] font-semibold text-[rgba(232,245,238,0.3)] uppercase tracking-wider mb-2">Detected Tech Stack</h4>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    ...result.repoInfo.framework ? [result.repoInfo.framework] : [],
                    ...result.repoInfo.language ? [result.repoInfo.language] : [],
                  ].map((tech, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-[rgba(14,159,110,0.08)] text-[#0E9F6E] border border-[rgba(14,159,110,0.1)]">{tech}</span>
                  ))}
                </div>
              </div>

              {/* Immediate Actions */}
              <div className="glass rounded-xl p-3">
                <h4 className="text-[10px] font-semibold text-[rgba(232,245,238,0.3)] uppercase tracking-wider mb-2">Immediate Improvements</h4>
                <div className="space-y-1">
                  {result.recommendations.immediate.map((item, i) => (
                    <div key={i} className="flex items-start gap-1.5"><ChevronRight className="w-2.5 h-2.5 text-[#0E9F6E] shrink-0 mt-0.5" /><span className="text-[10px] text-[rgba(232,245,238,0.5)]">{item}</span></div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex gap-2 pt-2">
                <button onClick={handleClose} className="btn-liquid h-10 px-4 text-xs flex-1">Cancel</button>
                <button onClick={handleCreateWorkspace} className="btn-liquid btn-liquid-solid h-10 px-6 text-xs flex-1 flex items-center justify-center gap-2">
                  <Rocket className="w-3.5 h-3.5" />Create Workspace ({result.tasks.length} tasks)
                </button>
              </div>
            </div>
          )}

          {/* Creating Stage */}
          {stage === "creating" && (
            <div className="p-6 text-center py-12">
              <Loader2 className="w-8 h-8 text-[#0E9F6E] animate-spin mx-auto mb-4" />
              <p className="text-sm font-medium text-[#E8F5EE]">Creating your workspace...</p>
              <p className="text-xs text-[rgba(232,245,238,0.3)] mt-1">Generating tasks, milestones, and sprint plan</p>
            </div>
          )}

          {/* Done Stage */}
          {stage === "done" && (
            <div className="p-6 text-center py-12">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
                <CheckCircle2 className="w-12 h-12 text-[#0E9F6E] mx-auto mb-4" />
              </motion.div>
              <p className="text-lg font-semibold text-[#E8F5EE] mb-1">Workspace Ready!</p>
              <p className="text-xs text-[rgba(232,245,238,0.4)] mb-6">
                Created {result?.tasks.length || 0} tasks with AI-generated insights and recommendations.
              </p>
              <button onClick={handleClose} className="btn-liquid btn-liquid-solid h-10 px-8 text-xs">Open Project</button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
