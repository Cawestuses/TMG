import { motion } from "motion/react";
import { ReactNode } from "react";
import { cn } from "@/src/lib/utils";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: "primary" | "accent" | "none";
  delay?: number;
}

export function GlowCard({ children, className, glowColor = "primary", delay = 0 }: GlowCardProps) {
  const glowClasses = {
    primary: "hover:shadow-[0_0_30px_-5px_var(--color-primary)] border-primary/10 hover:border-primary/30",
    accent: "hover:shadow-[0_0_30px_-5px_var(--color-accent)] border-accent/10 hover:border-accent/30",
    none: "border-white/5 hover:border-white/10"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "relative rounded-xl bg-surface border backdrop-blur-sm transition-all duration-300 overflow-hidden group",
        glowClasses[glowColor],
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
