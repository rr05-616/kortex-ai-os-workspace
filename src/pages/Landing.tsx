import { motion, useScroll } from "framer-motion";
import { useEffect, useRef } from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Showcase from "@/components/landing/Showcase";
import Integrations from "@/components/landing/Integrations";
import Testimonials from "@/components/landing/Testimonials";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";

export default function Landing() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { scrollY } = useScroll();

  useEffect(() => {
    document.title = "KORTEX AI — AI Operating System for Projects";
  }, []);

  // Sync scroll position to Flow Wave iframe
  useEffect(() => {
    const unsubscribe = scrollY.on("change", (latest) => {
      if (iframeRef.current?.contentWindow) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const fraction = max > 0 ? Math.max(0, Math.min(1, latest / max)) : 0;
        iframeRef.current.contentWindow.postMessage(
          { type: "kortex-scroll", value: fraction },
          "*"
        );
      }
    });
    return () => unsubscribe();
  }, [scrollY]);

  // Sync mouse position to Flow Wave iframe
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "kortex-mouse",
            x: (e.clientX / window.innerWidth) * 2 - 1,
            y: -((e.clientY / window.innerHeight) * 2 - 1),
            active: true,
          },
          "*"
        );
      }
    };
    const handleMouseOut = () => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: "kortex-mouse", x: 0, y: 0, active: false },
          "*"
        );
      }
    };
    window.addEventListener("mousemove", handleMouse, { passive: true });
    window.addEventListener("mouseout", handleMouseOut);
    return () => {
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("mouseout", handleMouseOut);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background"
    >
      {/* Flow Wave Three.js Background */}
      <iframe
        ref={iframeRef}
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
        <Showcase />
        <Integrations />
        <Testimonials />
        <Pricing />
        <Footer />
      </div>
    </motion.div>
  );
}
