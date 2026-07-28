import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const integrations = [
  { name: "GitHub", fallback: "GH" },
  { name: "Slack", fallback: "SL" },
  { name: "Discord", fallback: "DC" },
  { name: "Google Calendar", fallback: "GC" },
  { name: "Jira", fallback: "JR" },
  { name: "Notion", fallback: "NT" },
  { name: "Figma", fallback: "FG" },
  { name: "Vercel", fallback: "VC" },
];

export default function Integrations() {
  return (
    <section id="integrations" className="relative py-28 px-4">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[rgba(14,159,110,0.02)] blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-6">
            <Sparkles className="w-3 h-3 text-[#0E9F6E]" />
            <span className="text-xs font-medium text-[rgba(232,245,238,0.6)]">Native Integrations</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-[#E8F5EE]">
            Works with Your <span className="text-gradient-green">Toolchain</span>
          </h2>
          <p className="text-[rgba(232,245,238,0.45)] text-lg max-w-2xl mx-auto">
            Connect your favorite tools seamlessly. KORTEX integrates with your entire ecosystem.
          </p>
        </motion.div>

        <div className="flex flex-wrap items-center justify-center gap-4 max-w-3xl mx-auto">
          {integrations.map((integration, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              className="glass-card rounded-2xl px-6 py-5 flex items-center gap-3 min-w-[140px]"
            >
              <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.03)] flex items-center justify-center text-sm font-bold text-[rgba(232,245,238,0.35)] border border-[rgba(255,255,255,0.04)]">
                {integration.fallback}
              </div>
              <span className="text-xs font-medium text-[rgba(232,245,238,0.6)]">{integration.name}</span>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-10 text-xs text-[rgba(232,245,238,0.25)]"
        >
          + many more integrations · API access for custom tools
        </motion.p>
      </div>
    </section>
  );
}
