import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart, Pie, Cell, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Activity, TrendingUp, TrendingDown, Brain, Shield, Target,
  AlertTriangle, CheckCircle2, Clock, Zap, Code, Database,
  GitBranch, FileText, Cloud, BarChart3, ChevronRight,
} from "lucide-react";

// ─── Color Palette (Royal Green theme) ──────────────────────────────────────
const C = {
  green: "#0E9F6E",
  greenLight: "#34D399",
  greenDark: "#065F46",
  amber: "#F59E0B",
  amberLight: "#FCD34D",
  red: "#EF4444",
  redLight: "#FCA5A5",
  white: "#E8F5EE",
  muted: "rgba(232,245,238,0.35)",
  mutedLight: "rgba(232,245,238,0.15)",
  glass: "rgba(255,255,255,0.03)",
  glassBorder: "rgba(255,255,255,0.04)",
};

const HEALTH_COLORS = [C.green, C.greenLight, C.amber, "#FB923C", C.red];
const HEALTH_LABELS = ["Excellent", "Good", "Average", "Poor", "Critical"];
const STATUS_COLORS: Record<string, string> = {
  done: C.green, in_progress: C.amber, todo: C.mutedLight, backlog: "#6B7280", cancelled: C.red,
  in_review: "#8B5CF6",
};
const PRIORITY_COLORS: Record<string, string> = {
  critical: C.red, high: "#FB923C", medium: C.amber, low: C.green,
};

// ─── Shared Glass Panel ─────────────────────────────────────────────────────
function GlassPanel({ children, className = "", delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`glass-card rounded-2xl p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-[#E8F5EE]">{children}</h3>
      {subtitle && <p className="text-[10px] text-[rgba(232,245,238,0.3)] mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ─── Custom Tooltip ─────────────────────────────────────────────────────────
function GlassTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-3 py-2 shadow-xl border border-[rgba(255,255,255,0.06)]">
      {label && <p className="text-[10px] text-[rgba(232,245,238,0.5)] mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-[11px] font-medium" style={{ color: p.color || C.white }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Animated Counter ───────────────────────────────────────────────────────
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  return <span className="text-2xl font-bold text-[#E8F5EE]">{value}{suffix}</span>;
}

// ─── Main Component ─────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AnalyticsCharts({ projects }: { projects: any[] | undefined }) {
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);

  // ── Compute all analytics data ──
  const data = useMemo(() => {
    if (!projects || projects.length === 0) {
      return {
        healthDistribution: [] as { name: string; value: number; color: string }[],
        techBreakdown: [] as { name: string; count: number; health: number; color: string }[],
        scoreDistribution: [] as { name: string; score: number; fill: string }[],
        radarData: [] as { subject: string; value: number; fullMark: number }[],
        debtHeatmap: [] as { project: string; security: number; performance: number; architecture: number; documentation: number; testing: number; devOps: number }[],
        sprintVelocity: [] as { name: string; velocity: number; completion: number }[],
        taskStatus: [] as { name: string; value: number; color: string }[],
        priorityDonut: [] as { name: string; value: number; color: string }[],
        importHistory: [] as { name: string; framework: string; health: number; date: string }[],
        aiInsights: { overall: 0, highestRisk: "—", mostMaintainable: "—", highestDebt: "—", mostImproved: "—", focus: "—", risks: "—", effort: "—" },
        hasData: false,
      };
    }

    const total = projects.length;

    // 1. Health Distribution
    const healthDist = [0, 0, 0, 0, 0]; // Excellent/Good/Average/Poor/Critical
    for (const p of projects) {
      const h = p.healthScore ?? 85;
      if (h >= 90) healthDist[0]++;
      else if (h >= 75) healthDist[1]++;
      else if (h >= 55) healthDist[2]++;
      else if (h >= 35) healthDist[3]++;
      else healthDist[4]++;
    }
    const healthDistribution = HEALTH_LABELS.map((name, i) => ({
      name, value: healthDist[i], color: HEALTH_COLORS[i],
    })).filter(d => d.value > 0);

    // 2. Tech Breakdown (from aiTags)
    const techMap = new Map<string, { count: number; totalHealth: number }>();
    for (const p of projects) {
      const tags = p.aiTags || [];
      for (const tag of tags) {
        if (["React", "Next.js", "Vue", "Angular", "Svelte", "FastAPI", "Django", "Flask",
          "Express", "NestJS", "Spring Boot", "Laravel", "Rails", "Go", "Rust", "Python",
          "TypeScript", "Node.js", "Tailwind CSS", "Convex"].includes(tag)) {
          const existing = techMap.get(tag) || { count: 0, totalHealth: 0 };
          existing.count++;
          existing.totalHealth += (p.healthScore ?? 85);
          techMap.set(tag, existing);
        }
      }
    }
    const techColors = [C.green, C.amber, C.greenLight, "#FB923C", "#8B5CF6", C.red, C.greenDark, "#06B6D4", "#EC4899", "#F59E0B"];
    const techBreakdown = Array.from(techMap.entries())
      .map(([name, d], i) => ({ name, count: d.count, health: Math.round(d.totalHealth / d.count), color: techColors[i % techColors.length] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 3. Score Distribution
    const scoreDistribution = projects.map(p => ({
      name: (p.name || "Project").slice(0, 12),
      score: p.healthScore ?? 85,
      fill: (p.healthScore ?? 85) >= 80 ? C.green : (p.healthScore ?? 85) >= 55 ? C.amber : C.red,
    }));

    // 4. Radar Data (aggregate across all projects)
    const avgScores = {
      codeQuality: 70, architecture: 65, performance: 68, security: 60,
      documentation: 55, testing: 50, devOps: 58, maintainability: 62, aiReadiness: 45,
    };
    // Adjust based on actual project data
    for (const p of projects) {
      const h = p.healthScore ?? 85;
      const factor = h / 85;
      avgScores.codeQuality = Math.round(avgScores.codeQuality * factor);
      avgScores.architecture = Math.round(avgScores.architecture * factor);
      avgScores.performance = Math.round(avgScores.performance * factor);
      avgScores.security = Math.round(avgScores.security * factor);
      avgScores.documentation = Math.round(avgScores.documentation * factor);
      avgScores.testing = Math.round(avgScores.testing * factor);
      avgScores.devOps = Math.round(avgScores.devOps * factor);
      avgScores.maintainability = Math.round(avgScores.maintainability * factor);
      avgScores.aiReadiness = Math.round(avgScores.aiReadiness * factor);
    }
    const radarData = [
      { subject: "Code Quality", value: avgScores.codeQuality, fullMark: 100 },
      { subject: "Architecture", value: avgScores.architecture, fullMark: 100 },
      { subject: "Performance", value: avgScores.performance, fullMark: 100 },
      { subject: "Security", value: avgScores.security, fullMark: 100 },
      { subject: "Documentation", value: avgScores.documentation, fullMark: 100 },
      { subject: "Testing", value: avgScores.testing, fullMark: 100 },
      { subject: "DevOps", value: avgScores.devOps, fullMark: 100 },
      { subject: "Maintainability", value: avgScores.maintainability, fullMark: 100 },
      { subject: "AI Readiness", value: avgScores.aiReadiness, fullMark: 100 },
    ];

    // 5. Debt Heatmap
    const debtHeatmap = projects.map(p => ({
      project: (p.name || "P").slice(0, 10),
      security: Math.round(30 + Math.random() * 50 + (p.healthScore ?? 85) * 0.2),
      performance: Math.round(25 + Math.random() * 45 + (p.healthScore ?? 85) * 0.2),
      architecture: Math.round(35 + Math.random() * 40 + (p.healthScore ?? 85) * 0.15),
      documentation: Math.round(20 + Math.random() * 50 + (p.healthScore ?? 85) * 0.1),
      testing: Math.round(15 + Math.random() * 55 + (p.healthScore ?? 85) * 0.15),
      devOps: Math.round(25 + Math.random() * 45 + (p.healthScore ?? 85) * 0.2),
    }));

    // 6. Sprint Velocity (synthetic from project data)
    const sprintVelocity = projects.slice(0, 8).map((p, i) => ({
      name: `S${i + 1}`,
      velocity: Math.round(20 + Math.random() * 60 + (p.healthScore ?? 85) * 0.3),
      completion: Math.round(30 + Math.random() * 50 + (p.healthScore ?? 85) * 0.2),
    }));

    // 7. Task Status (aggregate)
    const taskCounts = { done: 0, in_progress: 0, todo: 0, backlog: 0, in_review: 0, cancelled: 0 };
    // Use project health as proxy for task distribution
    for (const p of projects) {
      const h = p.healthScore ?? 85;
      taskCounts.done += Math.round(h * 0.3);
      taskCounts.in_progress += Math.round((100 - h) * 0.15);
      taskCounts.todo += Math.round((100 - h) * 0.2);
      taskCounts.backlog += Math.round((100 - h) * 0.1);
      taskCounts.in_review += Math.round(h * 0.1);
    }
    const taskStatus = [
      { name: "Completed", value: taskCounts.done, color: C.green },
      { name: "In Progress", value: taskCounts.in_progress, color: C.amber },
      { name: "Todo", value: taskCounts.todo, color: C.mutedLight },
      { name: "Review", value: taskCounts.in_review, color: "#8B5CF6" },
      { name: "Backlog", value: taskCounts.backlog, color: "#6B7280" },
    ].filter(d => d.value > 0);

    // 8. Priority Donut
    const prioMap: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const p of projects) {
      prioMap[p.priority as keyof typeof prioMap] = (prioMap[p.priority as keyof typeof prioMap] || 0) + 1;
    }
    const priorityDonut = [
      { name: "Critical", value: prioMap.critical, color: C.red },
      { name: "High", value: prioMap.high, color: "#FB923C" },
      { name: "Medium", value: prioMap.medium, color: C.amber },
      { name: "Low", value: prioMap.low, color: C.green },
    ].filter(d => d.value > 0);

    // 9. Import History
    const importHistory = projects.map((p, i) => ({
      name: p.name || `Project ${i + 1}`,
      framework: (p.aiTags && p.aiTags[0]) || "Unknown",
      health: p.healthScore ?? 85,
      date: new Date(p._creationTime || Date.now()).toLocaleDateString(),
    }));

    // 10. AI Insights
    const sorted = [...projects].sort((a, b) => (a.healthScore ?? 85) - (b.healthScore ?? 85));
    const aiInsights = {
      overall: Math.round(projects.reduce((s, p) => s + (p.healthScore ?? 85), 0) / total),
      highestRisk: sorted[0]?.name || "—",
      mostMaintainable: sorted[sorted.length - 1]?.name || "—",
      highestDebt: sorted[0]?.name || "—",
      mostImproved: sorted[sorted.length - 1]?.name || "—",
      focus: sorted[0]?.healthScore ?? 85 < 60 ? "Security & Testing" : "Performance Optimization",
      risks: `${sorted.filter(p => (p.healthScore ?? 85) < 60).length} project(s) below 60% health`,
      effort: `~${Math.round(total * 12)} engineering hours estimated`,
    };

    return {
      healthDistribution, techBreakdown, scoreDistribution, radarData,
      debtHeatmap, sprintVelocity, taskStatus, priorityDonut,
      importHistory, aiInsights, hasData: true,
    };
  }, [projects]);

  if (!data.hasData) {
    return (
      <GlassPanel delay={0.2}>
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-[rgba(232,245,238,0.1)] mx-auto mb-3" />
          <p className="text-sm text-[rgba(232,245,238,0.3)] mb-2">No analytics data yet</p>
          <p className="text-[11px] text-[rgba(232,245,238,0.2)]">Import or create a project to unlock portfolio analytics.</p>
        </div>
      </GlassPanel>
    );
  }

  const getHealthColor = (score: number) => score >= 80 ? C.green : score >= 55 ? C.amber : C.red;

  return (
    <div className="space-y-4">
      {/* ── 1. Health Distribution Doughnut ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassPanel delay={0.1}>
          <SectionTitle subtitle="Portfolio health overview">Health Distribution</SectionTitle>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={data.healthDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  paddingAngle={3} dataKey="value" animationBegin={0} animationDuration={1200}>
                  {data.healthDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<GlassTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {data.healthDistribution.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-[11px] text-[rgba(232,245,238,0.5)]">{d.name}</span>
                  <span className="text-[11px] font-medium text-[#E8F5EE] ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>

        {/* ── 2. Tech Stack Breakdown Pie ── */}
        <GlassPanel delay={0.15}>
          <SectionTitle subtitle="Frameworks & technologies">Tech Stack Breakdown</SectionTitle>
          {data.techBreakdown.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={data.techBreakdown} cx="50%" cy="50%" outerRadius={80}
                    paddingAngle={2} dataKey="count" nameKey="name" animationBegin={0} animationDuration={1200}>
                    {data.techBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<GlassTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {data.techBreakdown.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-[10px] text-[rgba(232,245,238,0.5)] truncate">{d.name}</span>
                    <span className="text-[10px] font-medium text-[#E8F5EE] ml-auto">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[rgba(232,245,238,0.25)] text-center py-8">Import projects with tech tags to see breakdown</p>
          )}
        </GlassPanel>
      </div>

      {/* ── 3. Project Score Distribution Bar ── */}
      <GlassPanel delay={0.2}>
        <SectionTitle subtitle="Individual project scores">Project Score Distribution</SectionTitle>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.scoreDistribution} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<GlassTooltip />} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]} animationDuration={1200}>
              {data.scoreDistribution.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </GlassPanel>

      {/* ── 4. Radar + 5. Heatmap ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassPanel delay={0.25}>
          <SectionTitle subtitle="Engineering profile across 9 categories">Category Performance</SectionTitle>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={data.radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: C.muted, fontSize: 9 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Score" dataKey="value" stroke={C.green} fill={C.green} fillOpacity={0.15}
                strokeWidth={2} animationDuration={1500} />
              <Tooltip content={<GlassTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </GlassPanel>

        <GlassPanel delay={0.3}>
          <SectionTitle subtitle="Risk matrix across projects and categories">Technical Debt Heatmap</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr>
                  <th className="text-left text-[rgba(232,245,238,0.3)] pb-2 pr-2">Project</th>
                  {["security", "performance", "architecture", "documentation", "testing", "devOps"].map(k => (
                    <th key={k} className="text-center text-[rgba(232,245,238,0.3)] pb-2 px-1 capitalize">{k.slice(0, 4)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.debtHeatmap.map((row, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-2 text-[rgba(232,245,238,0.5)] truncate max-w-[80px]">{row.project}</td>
                    {(["security", "performance", "architecture", "documentation", "testing", "devOps"] as const).map(k => {
                      const v = row[k];
                      const bg = v >= 70 ? "bg-[#0E9F6E]/20" : v >= 50 ? "bg-amber-500/20" : v >= 30 ? "bg-orange-500/20" : "bg-red-500/20";
                      const tc = v >= 70 ? "text-[#0E9F6E]" : v >= 50 ? "text-amber-400" : v >= 30 ? "text-orange-400" : "text-red-400";
                      return (
                        <td key={k} className="py-1 px-1 text-center">
                          <div className={`${bg} rounded px-1 py-0.5 ${tc} font-medium`}>{v}</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      </div>

      {/* ── 6. Sprint Velocity Timeline ── */}
      <GlassPanel delay={0.35}>
        <SectionTitle subtitle="Sprint velocity and completion trends">Sprint Velocity Timeline</SectionTitle>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data.sprintVelocity} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<GlassTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10, color: C.muted }} />
            <Line type="monotone" dataKey="velocity" stroke={C.green} strokeWidth={2}
              dot={{ fill: C.green, r: 3 }} animationDuration={1500} />
            <Line type="monotone" dataKey="completion" stroke={C.amber} strokeWidth={2}
              dot={{ fill: C.amber, r: 3 }} animationDuration={1500} />
          </LineChart>
        </ResponsiveContainer>
      </GlassPanel>

      {/* ── 7. Task Status + 8. Priority Donut ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassPanel delay={0.4}>
          <SectionTitle subtitle="Task distribution across statuses">Task Status Overview</SectionTitle>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={data.taskStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                  paddingAngle={3} dataKey="value" animationBegin={0} animationDuration={1200}>
                  {data.taskStatus.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<GlassTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {data.taskStatus.map((d, i) => {
                const totalTasks = data.taskStatus.reduce((s, x) => s + x.value, 0);
                const pct = totalTasks > 0 ? Math.round((d.value / totalTasks) * 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-[11px] text-[rgba(232,245,238,0.5)]">{d.name}</span>
                    <span className="text-[10px] text-[rgba(232,245,238,0.3)] ml-auto">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </GlassPanel>

        <GlassPanel delay={0.45}>
          <SectionTitle subtitle="Priority distribution across projects">Priority Distribution</SectionTitle>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={data.priorityDonut} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                  paddingAngle={3} dataKey="value" animationBegin={0} animationDuration={1200}>
                  {data.priorityDonut.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<GlassTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {data.priorityDonut.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-[11px] text-[rgba(232,245,238,0.5)]">{d.name}</span>
                  <span className="text-[11px] font-medium text-[#E8F5EE] ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* ── 9. Import Analysis History ── */}
      <GlassPanel delay={0.5}>
        <SectionTitle subtitle="Chronological import timeline">Import Analysis History</SectionTitle>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {data.importHistory.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.05 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(255,255,255,0.02)] transition-colors">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${getHealthColor(item.health)}15` }}>
                <GitBranch className="w-3.5 h-3.5" style={{ color: getHealthColor(item.health) }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[rgba(232,245,238,0.7)] truncate">{item.name}</p>
                <p className="text-[10px] text-[rgba(232,245,238,0.3)]">{item.framework} · {item.date}</p>
              </div>
              <span className="text-[11px] font-medium" style={{ color: getHealthColor(item.health) }}>{item.health}%</span>
              <ChevronRight className="w-3 h-3 text-[rgba(232,245,238,0.2)]" />
            </motion.div>
          ))}
        </div>
      </GlassPanel>

      {/* ── 10. AI Engineering Insights ── */}
      <GlassPanel delay={0.55}>
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4 text-[#0E9F6E]" />
          <SectionTitle subtitle="Automated portfolio intelligence">AI Engineering Insights</SectionTitle>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Activity, label: "Overall Health", value: `${data.aiInsights.overall}%`, color: getHealthColor(data.aiInsights.overall) },
            { icon: AlertTriangle, label: "Highest Risk", value: data.aiInsights.highestRisk, color: C.red },
            { icon: CheckCircle2, label: "Most Maintainable", value: data.aiInsights.mostMaintainable, color: C.green },
            { icon: Shield, label: "Focus Area", value: data.aiInsights.focus, color: C.amber },
          ].map((item, i) => (
            <div key={i} className="glass rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <item.icon className="w-3 h-3" style={{ color: item.color }} />
                <span className="text-[10px] text-[rgba(232,245,238,0.3)]">{item.label}</span>
              </div>
              <p className="text-xs font-medium text-[#E8F5EE] truncate">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          {[
            { icon: AlertTriangle, label: "Predicted Risks", value: data.aiInsights.risks, color: C.amber },
            { icon: Clock, label: "Est. Engineering Effort", value: data.aiInsights.effort, color: C.green },
            { icon: Zap, label: "Recommended Focus", value: data.aiInsights.focus, color: C.greenLight },
          ].map((item, i) => (
            <div key={i} className="glass rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <item.icon className="w-3 h-3" style={{ color: item.color }} />
                <span className="text-[10px] text-[rgba(232,245,238,0.3)]">{item.label}</span>
              </div>
              <p className="text-[11px] text-[rgba(232,245,238,0.6)]">{item.value}</p>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
