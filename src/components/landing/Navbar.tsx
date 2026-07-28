import { cn } from "@/lib/utils";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router";
import logo from "@/assets/logo.svg";

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
          ? "mt-3 mx-auto max-w-5xl rounded-2xl glass-strong"
          : "mt-6 mx-auto max-w-5xl rounded-2xl glass",
      )}
    >
      <nav className="flex items-center justify-between px-5">
        {/* Logo */}
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5 group">
          <img src={logo} alt="KORTEX" className="w-8 h-8 rounded-lg" />
          <span className="font-semibold text-sm tracking-tight text-[#E8F5EE]">
            KORTEX
          </span>
        </button>

        {/* Nav Links - Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="px-3.5 py-1.5 text-sm text-[rgba(232,245,238,0.5)] hover:text-[#E8F5EE] rounded-full hover:bg-[rgba(255,255,255,0.03)] transition-all duration-200"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/auth")}
            className="btn-liquid btn-liquid-ghost text-sm h-9 px-4"
          >
            Sign in
          </button>
          <button
            onClick={() => navigate("/auth")}
            className="btn-liquid btn-liquid-solid text-sm h-9 px-5"
          >
            Get Started
          </button>
        </div>
      </nav>
    </motion.header>
  );
}
