import { motion } from "framer-motion";
import { useEffect } from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Showcase from "@/components/landing/Showcase";
import Integrations from "@/components/landing/Integrations";
import Footer from "@/components/landing/Footer";

export default function Landing() {
  useEffect(() => {
    document.title = "KORTEX AI — AI Operating System for Projects";
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-[#040705]"
    >
      {/* Flow Wave Three.js Background */}
      <iframe
        src="/flow-wave.html"
        className="fixed inset-0 w-full h-full border-0 pointer-events-none z-0"
        style={{ background: "#000" }}
        title="Flow Wave Background"
      />

      {/* Content overlay */}
      <div className="relative z-10">
        <Navbar />
        <Hero />
        <Features />
        <HowItWorks />
        <Showcase />
        <Integrations />
        <Footer />
      </div>
    </motion.div>
  );
}
