import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Shield, Zap, Brain, BarChart3, CheckCircle } from "lucide-react";

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large ambient orb */}
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.05, 0.95, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 -left-20 w-96 h-96 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(14,159,110,0.08) 0%, rgba(14,159,110,0.02) 50%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <motion.div
        animate={{
          x: [0, -40, 30, 0],
          y: [0, 30, -40, 0],
          scale: [1, 0.95, 1.05, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 -right-20 w-80 h-80 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(14,159,110,0.06) 0%, rgba(14,159,110,0.01) 50%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      {/* Small accent orb */}
      <motion.div
        animate={{
          y: [0, -60, 0],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(14,159,110,0.04) 0%, transparent 60%)",
          filter: "blur(40px)",
        }}
      />
    </div>
  );
}

function AnimatedGrid() {
  return (
    <div className="absolute inset-0 bg-dot-pattern opacity-50" />
  );
}

function FloatingElements() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[
        { icon: Brain, x: "15%", y: "25%", delay: 0 },
        { icon: BarChart3, x: "85%", y: "30%", delay: 2 },
        { icon: Shield, x: "80%", y: "65%", delay: 1 },
        { icon: Zap, x: "20%", y: "70%", delay: 3 },
      ].map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.5, 0.3, 0.5],
            scale: 1,
            y: [0, -15, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            delay: item.delay,
            ease: "easeInOut",
          }}
          className="absolute hidden lg:block"
          style={{ left: item.x, top: item.y }}
        >
          <div className="glass-card rounded-2xl p-3">
            <item.icon className="w-5 h-5 text-[#0E9F6E]" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-16">
      <FloatingOrbs />
      <AnimatedGrid />
      <FloatingElements />

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Badge
          variant="secondary"
          className="mb-8 px-4 py-1.5 text-xs font-medium rounded-full glass-card border-green-200/50 text-[#0E9F6E]"
        >
          <Sparkles className="w-3 h-3 mr-1.5" />
          AI-Powered Project Management OS
        </Badge>
      </motion.div>

      {/* Main Heading */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="max-w-4xl mx-auto text-center"
      >
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05]">
          <span className="text-foreground">Your AI</span>
          <br />
          <span className="text-gradient-green">Operating System</span>
          <br />
          <span className="text-foreground">for Projects</span>
        </h1>
      </motion.div>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-6 max-w-2xl text-center text-lg text-muted-foreground/80 leading-relaxed"
      >
        KORTEX AI is an intelligent teammate that understands your projects,
        plans sprints, predicts risks, and continuously assists throughout
        the entire development lifecycle.
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-10 flex items-center gap-4"
      >
        <Button
          size="lg"
          onClick={() => navigate("/auth")}
          className="rounded-full h-12 px-8 text-base font-medium bg-[#0E9F6E] hover:bg-[#0C8A5F] text-white shadow-lg shadow-green-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/30 hover:scale-[1.02]"
        >
          Start Building
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => navigate("/auth")}
          className="rounded-full h-12 px-8 text-base font-medium border-border/50 glass-card hover:glass-strong"
        >
          Watch Demo
        </Button>
      </motion.div>

      {/* Trusted by / Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="mt-20 flex flex-col items-center gap-4"
      >
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
          Trusted by engineering teams worldwide
        </p>
        <div className="flex items-center gap-8 flex-wrap justify-center">
          {["99.9%", "10x", "85%", "24/7"].map((metric, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.8 + i * 0.1 }}
              className="text-center"
            >
              <p className="text-lg font-bold text-foreground">{metric}</p>
              <p className="text-xs text-muted-foreground/60">
                {["Uptime", "Productivity", "Risk Detection", "AI Support"][i]}
              </p>
            </motion.div>
          ))}
        </div>
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
          className="w-5 h-8 rounded-full border border-border/40 flex items-start justify-center pt-1.5"
        >
          <motion.div className="w-1 h-2 rounded-full bg-[#0E9F6E]" />
        </motion.div>
      </motion.div>
    </section>
  );
}
