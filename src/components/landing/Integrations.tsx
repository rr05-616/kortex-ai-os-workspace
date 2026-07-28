import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const integrations = [
  { name: "GitHub", icon: "/integrations/github.svg", fallback: "GH" },
  { name: "Slack", icon: "/integrations/slack.svg", fallback: "SL" },
  { name: "Discord", icon: "/integrations/discord.svg", fallback: "DC" },
  { name: "Google Calendar", icon: "/integrations/calendar.svg", fallback: "GC" },
  { name: "Jira", icon: "/integrations/jira.svg", fallback: "JR" },
  { name: "Notion", icon: "/integrations/notion.svg", fallback: "NT" },
  { name: "Figma", icon: "/integrations/figma.svg", fallback: "FG" },
  { name: "Vercel", icon: "/integrations/vercel.svg", fallback: "VC" },
];

function IntegrationLogo({ name, icon, fallback, index }: { name: string; icon: string; fallback: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="glass-card rounded-2xl p-5 flex flex-col items-center gap-3 min-w-[120px] transition-all duration-300 hover:shadow-lg hover:shadow-green-500/5"
    >
      <div className="w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center text-sm font-bold text-muted-foreground ring-1 ring-border/40">
        {fallback}
      </div>
      <span className="text-xs font-medium text-muted-foreground/80">{name}</span>
    </motion.div>
  );
}

export default function Integrations() {
  return (
    <section id="integrations" className="relative py-28 px-4">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#0E9F6E]/[0.02] blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#0E9F6E]/10 text-[#0E9F6E] border border-[#0E9F6E]/20 mb-6">
            <Sparkles className="w-3 h-3 mr-1.5" />
            Native Integrations
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Works with Your{" "}
            <span className="text-gradient-green">Toolchain</span>
          </h2>
          <p className="text-muted-foreground/70 text-lg max-w-2xl mx-auto">
            Connect your favorite tools seamlessly. KORTEX integrates with your
            entire development ecosystem.
          </p>
        </motion.div>

        {/* Integration Grid */}
        <div className="flex flex-wrap items-center justify-center gap-3 max-w-3xl mx-auto">
          {integrations.map((integration, i) => (
            <IntegrationLogo key={i} {...integration} index={i} />
          ))}
        </div>

        {/* Bottom text */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-10 text-xs text-muted-foreground"
        >
          + many more integrations · API access for custom tools
        </motion.p>
      </div>
    </section>
  );
}
