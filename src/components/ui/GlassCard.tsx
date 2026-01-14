import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  gradient?: boolean;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, hover = true, glow = false, gradient = false, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "glass-card",
          gradient && "bg-gradient-to-b from-primary/10 to-transparent",
          glow && "glow",
          className
        )}
        whileHover={hover ? { 
          y: -4, 
          boxShadow: "0 0 0 1px hsl(0 0% 100% / 0.1) inset, 0 25px 60px -12px hsl(0 0% 0% / 0.6), 0 0 50px hsl(160 84% 39% / 0.15)"
        } : undefined}
        whileTap={hover ? { scale: 0.98 } : undefined}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = "GlassCard";

export { GlassCard };
