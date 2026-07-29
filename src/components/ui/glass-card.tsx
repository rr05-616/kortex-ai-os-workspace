"use client";

import React, { useRef, useCallback, memo } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────
export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Enable pointer-follow glow border. Default: true */
  glow?: boolean;
  /** AI state triggers breathing glow effect */
  aiState?: "idle" | "thinking" | "scanning" | "generating" | "analyzing";
  /** Extra className */
  className?: string;
}

// ─── GlassCard with pointer-follow glow ─────────────────────────────────────
const GlassCard = memo(function GlassCard({
  children,
  glow = true,
  aiState = "idle",
  className = "",
  onMouseMove,
  onMouseLeave,
  ...props
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!glow || !ref.current) {
        onMouseMove?.(e);
        return;
      }

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const card = ref.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty("--glow-x", `${x}px`);
        card.style.setProperty("--glow-y", `${y}px`);
      });

      onMouseMove?.(e);
    },
    [glow, onMouseMove]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (glow && ref.current) {
        cancelAnimationFrame(rafRef.current);
        ref.current.style.setProperty("--glow-x", "-100px");
        ref.current.style.setProperty("--glow-y", "-100px");
      }
      onMouseLeave?.(e);
    },
    [glow, onMouseLeave]
  );

  const aiClass =
    aiState && aiState !== "idle" ? `glass-ai-${aiState}` : "";

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`glass-card-glow ${glow ? "glow-active" : ""} ${aiClass} ${className}`}
      style={{
        ["--glow-x" as string]: "-100px",
        ["--glow-y" as string]: "-100px",
      }}
      {...props}
    >
      {children}
    </div>
  );
});

export default GlassCard;
