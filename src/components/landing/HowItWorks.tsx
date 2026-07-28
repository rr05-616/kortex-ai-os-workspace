import { motion } from "framer-motion";
import { FolderPlus, Sparkles, Users, BarChart3, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: FolderPlus,
    title: "Create a Project",
    description:
      "Define your project scope, goals, and team. KORTEX AI instantly analyzes your requirements and sets up the optimal workspace structure.",
    detail: "Smart templates · AI analysis · Instant setup",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "AI Generates Tasks",
    description:
      "Your AI copilot automatically breaks down the project into actionable tasks, estimates effort, identifies dependencies, and suggests priorities.",
    detail: "Auto breakdown · Effort estimation · Dependency mapping",
  },
  {
    number: "03",
    icon: Users,
    title: "Collaborate & Execute",
    description:
      "Work together with real-time updates, intelligent sprint planning, and AI-powered risk detection that keeps your team ahead of blockers.",
    detail: "Real-time sync · Sprint planning · Risk alerts",
  },
  {
    number: "04",
    icon: BarChart3,
    title: "Analyze & Optimize",
    description:
      "Track velocity, burndown, and team health. KORTEX AI continuously learns from your workflow to suggest improvements and predict outcomes.",
    detail: "Velocity tracking · Predictive analytics · Continuous improvement",
  },
];

export default function HowItWorks() {
  return (
    <section className="relative py-28 px-4">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[rgba(14,159,110,0.02)] blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#0E9F6E] animate-pulse" />
            <span className="text-xs font-medium text-[rgba(232,245,238,0.6)]">How It Works</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-[#E8F5EE]">
            Four Steps to <span className="text-gradient-green">Smarter Delivery</span>
          </h2>
          <p className="text-[rgba(232,245,238,0.45)] text-lg max-w-2xl mx-auto">
            From idea to deployment — KORTEX AI guides every stage of your development lifecycle.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-[72px] left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-px bg-gradient-to-r from-transparent via-[rgba(14,159,110,0.15)] to-transparent" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="relative"
              >
                <motion.div
                  whileHover={{ y: -4 }}
                  className="glass-card rounded-2xl p-7 h-full flex flex-col"
                >
                  {/* Step number & icon */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-[rgba(14,159,110,0.1)] flex items-center justify-center border border-[rgba(14,159,110,0.15)]">
                        <step.icon className="w-5 h-5 text-[#0E9F6E]" />
                      </div>
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#040705] border border-[rgba(14,159,110,0.3)] flex items-center justify-center text-[10px] font-bold text-[#0E9F6E]">
                        {step.number}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className="hidden lg:flex absolute -right-3 top-[52px] z-10">
                        <ArrowRight className="w-4 h-4 text-[rgba(14,159,110,0.2)]" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <h3 className="text-base font-semibold text-[#E8F5EE] mb-3">{step.title}</h3>
                  <p className="text-sm text-[rgba(232,245,238,0.4)] leading-relaxed mb-5 flex-1">
                    {step.description}
                  </p>

                  {/* Detail chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {step.detail.split(" · ").map((chip, j) => (
                      <span
                        key={j}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-medium text-[rgba(14,159,110,0.7)] bg-[rgba(14,159,110,0.06)] border border-[rgba(14,159,110,0.08)]"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
