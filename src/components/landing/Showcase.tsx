import { motion } from "framer-motion";
import { Kanban, BarChart3, Brain, Users, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

export default function Showcase() {
  return (
    <section className="relative py-28 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-[#E8F5EE]">
            Premium <span className="text-gradient-green">Dashboard</span>
          </h2>
          <p className="text-[rgba(232,245,238,0.45)] text-lg max-w-2xl mx-auto">
            Everything you need to manage projects at a glance. Beautiful, intelligent, and modular.
          </p>
        </motion.div>

        {/* Dashboard Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card rounded-3xl p-1 overflow-hidden"
        >
          <div className="rounded-[28px] overflow-hidden glass-strong p-4">
            {/* Window controls */}
            <div className="flex items-center gap-2 mb-4 px-2">
              <div className="w-3 h-3 rounded-full bg-[rgba(255,255,255,0.06)]" />
              <div className="w-3 h-3 rounded-full bg-[rgba(255,255,255,0.06)]" />
              <div className="w-3 h-3 rounded-full bg-[rgba(14,159,110,0.3)]" />
              <div className="flex-1 h-6 rounded-full glass mx-8" />
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[rgba(14,159,110,0.15)]" />
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "Active Projects", value: "12", icon: Kanban },
                { label: "Sprint Velocity", value: "47", icon: BarChart3 },
                { label: "Team Members", value: "8", icon: Users },
                { label: "AI Insights", value: "5", icon: Brain },
              ].map((stat, i) => (
                <div key={i} className="glass rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-[rgba(232,245,238,0.35)]">{stat.label}</span>
                    <stat.icon className="w-3.5 h-3.5 text-[#0E9F6E]" />
                  </div>
                  <p className="text-lg font-bold text-[#E8F5EE]">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Main content */}
            <div className="grid grid-cols-3 gap-3">
              {/* Kanban */}
              <div className="col-span-2 glass rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#E8F5EE]">Sprint Board</span>
                  <span className="text-[10px] text-[#0E9F6E]">AI Optimized</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["To Do", "In Progress", "Done"].map((col, i) => (
                    <div key={i} className="rounded-lg bg-[rgba(255,255,255,0.02)] p-2">
                      <span className="text-[9px] text-[rgba(232,245,238,0.35)] block mb-2">{col}</span>
                      {[1, 2, 3].slice(0, 3 - i).map((_, j) => (
                        <div key={j} className="h-6 rounded bg-[rgba(255,255,255,0.02)] mb-1" />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insights */}
              <div className="glass rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#E8F5EE]">AI Insights</span>
                  <Sparkles className="w-3.5 h-3.5 text-[#0E9F6E]" />
                </div>
                <div className="space-y-2">
                  {[
                    { text: "Sprint at risk", icon: AlertCircle, color: "text-amber-500" },
                    { text: "Reassign tasks", icon: Brain, color: "text-[#0E9F6E]" },
                    { text: "Velocity +15%", icon: CheckCircle2, color: "text-[#0E9F6E]" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-[10px] text-[rgba(232,245,238,0.45)] bg-[rgba(255,255,255,0.02)] rounded-lg px-2.5 py-2">
                      <item.icon className={`w-3 h-3 ${item.color} shrink-0 mt-0.5`} />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
