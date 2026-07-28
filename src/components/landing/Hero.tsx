import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

const words = ["Think", "Plan", "Build", "Deploy"];

function CyclingWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="inline-flex items-baseline relative overflow-hidden"
      style={{ height: "1.15em", minWidth: "6em", verticalAlign: "baseline" }}
    >
      <AnimatePresence mode="popLayout">
        <motion.span
          key={words[index]}
          initial={{ y: "100%", opacity: 0, filter: "blur(8px)" }}
          animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "-100%", opacity: 0, filter: "blur(8px)" }}
          transition={{
            y: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
            opacity: { duration: 0.35 },
            filter: { duration: 0.4 },
          }}
          className="text-gradient-green absolute bottom-0 left-0 whitespace-nowrap"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function AmbientOrb({ delay, x, y, size }: { delay: number; x: string; y: string; size: number }) {
  return (
    <motion.div
      animate={{
        x: [0, 30, -20, 0],
        y: [0, -40, 20, 0],
        scale: [1, 1.05, 0.95, 1],
      }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay }}
      className="absolute pointer-events-none"
      style={{ left: x, top: y, width: size, height: size }}
    >
      <div
        className="w-full h-full rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(14,159,110,0.06) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
    </motion.div>
  );
}

export default function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-16">
      {/* Ambient background orbs */}
      <AmbientOrb delay={0} x="15%" y="25%" size={400} />
      <AmbientOrb delay={2} x="75%" y="35%" size={350} />
      <AmbientOrb delay={4} x="50%" y="60%" size={300} />

      {/* Dot grid pattern */}
      <div className="absolute inset-0 bg-dot-pattern opacity-30" />

      {/* Subtle grid lines */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="text-center max-w-4xl mx-auto"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-8"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#0E9F6E] animate-pulse" />
          <span className="text-xs font-medium text-[rgba(232,245,238,0.6)]">
            AI-Powered Project Management OS
          </span>
        </motion.div>

        {/* Hero heading with cycling words — properly aligned */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-tight">
          <span className="text-[#E8F5EE]">You&nbsp;</span>
          <CyclingWord />
        </h1>

        <p className="text-lg sm:text-xl text-[rgba(232,245,238,0.45)] max-w-2xl mx-auto mb-10 leading-relaxed">
          Your AI teammate that understands projects, plans sprints,
          predicts risks, and accelerates your entire development lifecycle.
        </p>

        {/* CTA */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigate("/auth")}
            className="btn-liquid btn-liquid-solid h-12 px-8 text-base font-medium"
          >
            Start Building
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          <button
            onClick={() => navigate("/auth")}
            className="btn-liquid h-12 px-8 text-base font-medium"
          >
            Watch Demo
          </button>
        </div>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="mt-20 flex items-center gap-12"
      >
        {[
          { value: "99.9%", label: "Uptime" },
          { value: "10x", label: "Productivity" },
          { value: "85%", label: "Risk Detection" },
          { value: "24/7", label: "AI Support" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.9 + i * 0.1 }}
            className="text-center"
          >
            <p className="text-lg font-bold text-[#E8F5EE]">{stat.value}</p>
            <p className="text-xs text-[rgba(232,245,238,0.3)]">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-5 h-8 rounded-full border border-[rgba(255,255,255,0.08)] flex items-start justify-center pt-1.5"
        >
          <motion.div className="w-1 h-2 rounded-full bg-[#0E9F6E]" />
        </motion.div>
      </motion.div>
    </section>
  );
}
