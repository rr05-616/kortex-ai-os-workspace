import { motion } from "framer-motion";
import { Sparkles, Star } from "lucide-react";

const testimonials = [
  {
    name: "Alex Chen",
    role: "Engineering Lead",
    company: "TechCorp",
    avatar: "AC",
    content: "KORTEX transformed how our team ships features. The AI sprint planning alone saved us 10 hours per week.",
    rating: 5,
    metric: "10x faster planning",
  },
  {
    name: "Sarah Williams",
    role: "VP of Engineering",
    company: "ScaleUp",
    avatar: "SW",
    content: "The risk detection is incredible. KORTEX identified blockers we didn't even know existed and suggested fixes.",
    rating: 5,
    metric: "85% risk reduction",
  },
  {
    name: "Marcus Johnson",
    role: "CTO",
    company: "NexGen",
    avatar: "MJ",
    content: "We evaluated every tool out there. KORTEX is the only one that feels like an actual AI teammate, not just software.",
    rating: 5,
    metric: "47% faster delivery",
  },
];

export default function Testimonials() {
  return (
    <section className="relative py-28 px-4">
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
            <span className="text-xs font-medium text-[rgba(232,245,238,0.6)]">Testimonials</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-[#E8F5EE]">
            Loved by <span className="text-gradient-green">Engineering Teams</span>
          </h2>
          <p className="text-[rgba(232,245,238,0.45)] text-lg max-w-2xl mx-auto">
            See why engineering leaders choose KORTEX as their AI operating system.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="glass-card rounded-2xl p-7"
            >
              <div className="flex items-center gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-3.5 h-3.5 fill-[#0E9F6E] text-[#0E9F6E]" />
                ))}
              </div>
              <p className="text-sm text-[rgba(232,245,238,0.7)] leading-relaxed mb-4">
                &ldquo;{t.content}&rdquo;
              </p>
              <div className="pt-4 border-t border-[rgba(255,255,255,0.04)]">
                <p className="text-xs font-semibold text-[#0E9F6E] mb-3">{t.metric}</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[rgba(14,159,110,0.1)] flex items-center justify-center text-xs font-semibold text-[#0E9F6E]">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#E8F5EE]">{t.name}</p>
                    <p className="text-xs text-[rgba(232,245,238,0.35)]">{t.role}, {t.company}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
