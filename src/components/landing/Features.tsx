import { motion } from "framer-motion";
import { Brain, Bot, Users, LineChart, Workflow, Blocks, Sparkles } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Planning",
    description: "Natural language project planning. Describe what you need and KORTEX builds the roadmap.",
  },
  {
    icon: Bot,
    title: "AI Copilot",
    description: "Your intelligent teammate that breaks down tasks, estimates sprints, and analyzes blockers.",
  },
  {
    icon: Workflow,
    title: "Smart Automation",
    description: "Automate repetitive workflows, sprint ceremonies, and project updates intelligently.",
  },
  {
    icon: Users,
    title: "Enterprise Collaboration",
    description: "Real-time collaboration with context-aware mentions, smart notifications, and more.",
  },
  {
    icon: LineChart,
    title: "Predictive Analytics",
    description: "AI-powered risk detection, deadline prediction, and velocity tracking across projects.",
  },
  {
    icon: Blocks,
    title: "Integrations",
    description: "Seamlessly connect with GitHub, Slack, Discord, Figma, and your entire toolchain.",
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-28 px-4">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[rgba(14,159,110,0.03)] blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-6">
            <Sparkles className="w-3 h-3 text-[#0E9F6E]" />
            <span className="text-xs font-medium text-[rgba(232,245,238,0.6)]">Everything you need</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-[#E8F5EE]">
            Intelligent Features for{" "}
            <span className="text-gradient-green">Modern Teams</span>
          </h2>
          <p className="text-[rgba(232,245,238,0.45)] text-lg max-w-2xl mx-auto">
            KORTEX combines AI intelligence with enterprise-grade project management to supercharge your workflow.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass-card rounded-2xl p-7 group"
            >
              <div className="w-11 h-11 rounded-xl bg-[rgba(14,159,110,0.1)] flex items-center justify-center mb-5 group-hover:bg-[rgba(14,159,110,0.15)] transition-colors">
                <feature.icon className="w-5 h-5 text-[#0E9F6E]" />
              </div>
              <h3 className="text-base font-semibold mb-2 text-[#E8F5EE]">
                {feature.title}
              </h3>
              <p className="text-sm text-[rgba(232,245,238,0.45)] leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
