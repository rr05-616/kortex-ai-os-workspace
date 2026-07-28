import { motion } from "framer-motion";
import { 
  BarChart3, 
  Calendar, 
  Kanban, 
  Activity,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  GitPullRequest,
} from "lucide-react";

const showcaseItems = [
  {
    icon: Kanban,
    title: "Kanban Board",
    description: "Drag-and-drop with AI-powered priority suggestions",
    color: "bg-[#0E9F6E]/10 text-[#0E9F6E]",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Real-time velocity charts and sprint progress",
    color: "bg-[#0E9F6E]/10 text-[#0E9F6E]",
  },
  {
    icon: Calendar,
    title: "Sprint Calendar",
    description: "AI-optimized sprint scheduling and timeline view",
    color: "bg-[#0E9F6E]/10 text-[#0E9F6E]",
  },
  {
    icon: Activity,
    title: "Risk Detection",
    description: "Predictive alerts for deadline risks and blockers",
    color: "bg-[#0E9F6E]/10 text-[#0E9F6E]",
  },
];

export default function Showcase() {
  return (
    <section className="relative py-28 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Premium{" "}
            <span className="text-gradient-green">Dashboard</span>
          </h2>
          <p className="text-muted-foreground/70 text-lg max-w-2xl mx-auto">
            Everything you need to manage projects at a glance. Beautiful,
            intelligent, and completely customizable.
          </p>
        </motion.div>

        {/* Dashboard Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {/* Main Dashboard Glass Container */}
          <div className="glass-card rounded-[32px] p-1 overflow-hidden shadow-2xl shadow-green-500/5">
            <div className="rounded-[30px] overflow-hidden bg-white/40 backdrop-blur-sm">
              {/* Dashboard Header Bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                    <div className="w-3 h-3 rounded-full bg-[#0E9F6E]/60" />
                  </div>
                  <div className="h-6 w-px bg-border/40" />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Kanban className="w-3.5 h-3.5" />
                    <span>KORTEX OS — Workspace</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-5 rounded-full bg-[#0E9F6E]/10 border border-[#0E9F6E]/20" />
                  <div className="w-5 h-5 rounded-full bg-muted" />
                </div>
              </div>

              {/* Dashboard Content Grid */}
              <div className="p-5">
                {/* Top Row - Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Active Projects", value: "12", change: "+2", icon: Kanban },
                    { label: "Sprint Velocity", value: "47", change: "+8%", icon: TrendingUp },
                    { label: "Team Members", value: "8", change: "Online", icon: Users },
                    { label: "AI Insights", value: "5", change: "New", icon: Activity },
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.1 * i }}
                      className="glass rounded-xl p-3.5"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">{stat.label}</span>
                        <stat.icon className="w-3.5 h-3.5 text-[#0E9F6E]" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold text-foreground">{stat.value}</span>
                        <span className="text-[10px] font-medium text-[#0E9F6E]">{stat.change}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Bottom Row - Content Preview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Kanban Preview */}
                  <div className="glass rounded-xl p-4 md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-foreground">Sprint Board</h3>
                      <span className="text-[10px] text-[#0E9F6E]">AI Optimized</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { title: "To Do", count: 4, items: ["Auth flow", "API design"] },
                        { title: "In Progress", count: 3, items: ["Dashboard", "Analytics"] },
                        { title: "Done", count: 6, items: ["Setup", "Landing", "CI/CD"] },
                      ].map((col, i) => (
                        <div key={i} className="rounded-lg bg-white/40 p-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {col.title}
                            </span>
                            <span className="text-[10px] font-semibold text-foreground bg-background/40 px-1.5 py-0.5 rounded-full">
                              {col.count}
                            </span>
                          </div>
                          {col.items.map((item, j) => (
                            <div
                              key={j}
                              className="text-[10px] text-muted-foreground bg-white/60 rounded-md px-2 py-1.5 mb-1 last:mb-0"
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Insights Preview */}
                  <div className="glass rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-foreground">AI Insights</h3>
                      <BrainIcon className="w-3.5 h-3.5 text-[#0E9F6E]" />
                    </div>
                    <div className="space-y-2">
                      {[
                        { text: "Sprint at risk — 2 tasks delayed", type: "warning" },
                        { text: "Suggested: Reassign backend tasks", type: "info" },
                        { text: "Velocity trending +15% this sprint", type: "success" },
                      ].map((insight, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-[10px] text-muted-foreground bg-white/40 rounded-lg px-2.5 py-2"
                        >
                          {insight.type === "warning" ? (
                            <AlertCircle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                          ) : insight.type === "success" ? (
                            <CheckCircle2 className="w-3 h-3 text-[#0E9F6E] shrink-0 mt-0.5" />
                          ) : (
                            <BrainIcon className="w-3 h-3 text-[#0E9F6E] shrink-0 mt-0.5" />
                          )}
                          <span>{insight.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          {showcaseItems.map((item, i) => (
            <div
              key={i}
              className="glass rounded-full px-4 py-2 flex items-center gap-2"
            >
              <div className={`w-6 h-6 rounded-full ${item.color} flex items-center justify-center`}>
                <item.icon className="w-3 h-3" />
              </div>
              <span className="text-xs font-medium text-foreground">{item.title}</span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">— {item.description}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 4a4 4 0 0 1 3.5 2.1c.3.5.5 1 .5 1.6" />
      <path d="M12 20a4 4 0 0 1-3.5-2.1c-.3-.5-.5-1-.5-1.6" />
      <path d="M12 4v16" />
      <path d="M8 6.5a4 4 0 0 1 2-3.4" />
      <path d="M16 6.5a4 4 0 0 0-2-3.4" />
      <path d="M8 17.5a4 4 0 0 0 2 3.4" />
      <path d="M16 17.5a4 4 0 0 1-2 3.4" />
    </svg>
  );
}
