import { motion } from "framer-motion";
import { 
  Brain, 
  Bot, 
  Users, 
  LineChart, 
  Workflow,
  Blocks,
  Sparkles,
  Shield,
  Zap,
  Timer,
  BarChart3,
  GitBranch,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Planning",
    description: "Natural language project planning. Describe what you need and KORTEX builds the roadmap.",
    gradient: "from-[#0E9F6E]/20 to-transparent",
  },
  {
    icon: Bot,
    title: "AI Copilot",
    description: "Your intelligent teammate that helps break down tasks, estimate sprints, and analyze blockers.",
    gradient: "from-[#0E9F6E]/20 to-transparent",
  },
  {
    icon: Workflow,
    title: "Smart Automation",
    description: "Automate repetitive workflows, sprint ceremonies, and project updates intelligently.",
    gradient: "from-[#0E9F6E]/20 to-transparent",
  },
  {
    icon: Users,
    title: "Enterprise Collaboration",
    description: "Real-time collaboration with your team. Context-aware mentions, smart notifications, and more.",
    gradient: "from-[#0E9F6E]/20 to-transparent",
  },
  {
    icon: LineChart,
    title: "Predictive Analytics",
    description: "AI-powered risk detection, deadline prediction, and velocity tracking across all projects.",
    gradient: "from-[#0E9F6E]/20 to-transparent",
  },
  {
    icon: Blocks,
    title: "Integrations",
    description: "Seamlessly connect with GitHub, Slack, Discord, Figma, and your entire toolchain.",
    gradient: "from-[#0E9F6E]/20 to-transparent",
  },
];

export default function Features() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  return (
    <section id="features" className="relative py-28 px-4">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#0E9F6E]/[0.03] blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge className="mb-4">Everything you need</Badge>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Intelligent Features for{" "}
            <span className="text-gradient-green">Modern Teams</span>
          </h2>
          <p className="text-muted-foreground/70 text-lg max-w-2xl mx-auto">
            KORTEX combines AI intelligence with enterprise-grade project
            management to supercharge your engineering workflow.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((feature, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="group relative glass-card rounded-3xl p-8 transition-all duration-500 hover:shadow-xl hover:shadow-green-500/5"
            >
              {/* Icon */}
              <div className="relative mb-5 w-12 h-12 rounded-2xl bg-[#0E9F6E]/10 flex items-center justify-center ring-1 ring-[#0E9F6E]/10 group-hover:bg-[#0E9F6E]/15 transition-colors duration-300">
                <feature.icon className="w-5 h-5 text-[#0E9F6E]" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold mb-2 text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground/70 leading-relaxed">
                {feature.description}
              </p>

              {/* Hover shimmer */}
              <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[#0E9F6E]/5 to-transparent rotate-45" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#0E9F6E]/10 text-[#0E9F6E] border border-[#0E9F6E]/20 mb-6 ${className || ""}`}>
      <Sparkles className="w-3 h-3 mr-1.5" />
      {children}
    </span>
  );
}
