import { motion } from "framer-motion";
import { Sparkles, Star } from "lucide-react";

const testimonials = [
  {
    name: "Alex Chen",
    role: "Engineering Lead",
    company: "TechCorp",
    avatar: "AC",
    content:
      "KORTEX transformed how our team ships features. The AI sprint planning alone saved us 10 hours per week.",
    rating: 5,
    metric: "10x faster planning",
  },
  {
    name: "Sarah Williams",
    role: "VP of Engineering",
    company: "ScaleUp",
    avatar: "SW",
    content:
      "The risk detection is incredible. KORTEX identified blockers we didn't even know existed and suggested fixes instantly.",
    rating: 5,
    metric: "85% risk reduction",
  },
  {
    name: "Marcus Johnson",
    role: "CTO",
    company: "NexGen",
    avatar: "MJ",
    content:
      "We evaluated every project management tool out there. KORTEX is the only one that feels like an actual teammate.",
    rating: 5,
    metric: "47% faster delivery",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: rating }).map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5 fill-[#0E9F6E] text-[#0E9F6E]" />
      ))}
    </div>
  );
}

export default function Testimonials() {
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
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#0E9F6E]/10 text-[#0E9F6E] border border-[#0E9F6E]/20 mb-6">
            <Sparkles className="w-3 h-3 mr-1.5" />
            Testimonials
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Loved by{" "}
            <span className="text-gradient-green">Engineering Teams</span>
          </h2>
          <p className="text-muted-foreground/70 text-lg max-w-2xl mx-auto">
            See why engineering leaders choose KORTEX as their AI operating
            system.
          </p>
        </motion.div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className="glass-card rounded-3xl p-8 transition-all duration-300"
            >
              {/* Rating */}
              <StarRating rating={testimonial.rating} />

              {/* Quote */}
              <p className="mt-4 text-sm text-foreground/80 leading-relaxed">
                &ldquo;{testimonial.content}&rdquo;
              </p>

              {/* Metric */}
              <div className="mt-6 pt-4 border-t border-border/40">
                <p className="text-xs font-semibold text-[#0E9F6E]">{testimonial.metric}</p>
              </div>

              {/* Author */}
              <div className="mt-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#0E9F6E]/15 flex items-center justify-center text-xs font-semibold text-[#0E9F6E]">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
