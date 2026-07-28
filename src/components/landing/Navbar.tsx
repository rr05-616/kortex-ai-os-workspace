import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Integrations", href: "#integrations" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 40);
  });

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 py-3 transition-all duration-500",
        scrolled
          ? "mt-3 mx-auto max-w-5xl rounded-full glass-strong"
          : "mt-6 mx-auto max-w-5xl rounded-full glass",
      )}
    >
      <nav className="flex items-center justify-between px-5">
        {/* Logo */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 group"
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-[#0E9F6E]">
            <span className="text-white font-bold text-sm tracking-tight">K</span>
            <div className="absolute inset-0 rounded-lg ring-1 ring-white/20 ring-inset" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-foreground">
            KORTEX
          </span>
        </button>

        {/* Nav Links - Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="px-3.5 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-full hover:bg-black/5 transition-all duration-200"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/auth")}
            className="text-sm text-muted-foreground hover:text-foreground rounded-full"
          >
            Sign in
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/auth")}
            className="text-sm rounded-full bg-[#0E9F6E] hover:bg-[#0C8A5F] text-white shadow-lg shadow-green-500/20"
          >
            Get Started
          </Button>
        </div>
      </nav>
    </motion.header>
  );
}
