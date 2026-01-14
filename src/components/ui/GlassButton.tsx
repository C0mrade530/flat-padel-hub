import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

interface GlassButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ 
    children, 
    className, 
    variant = "primary", 
    size = "md", 
    fullWidth = false, 
    loading = false,
    icon,
    disabled,
    ...props 
  }, ref) => {
    const variants = {
      primary: "bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:shadow-[0_0_40px_hsl(160_84%_39%_/_0.3)]",
      secondary: "glass border-primary/20 text-foreground hover:bg-primary/10",
      ghost: "bg-transparent text-foreground-secondary hover:text-foreground hover:bg-muted/50",
      danger: "bg-destructive/20 border-destructive/30 text-destructive hover:bg-destructive/30",
    };

    const sizes = {
      sm: "h-9 px-4 text-sm rounded-lg",
      md: "h-11 px-6 text-base rounded-xl",
      lg: "h-14 px-8 text-lg rounded-2xl",
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-all duration-300",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className
        )}
        whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : icon ? (
          icon
        ) : null}
        {children}
      </motion.button>
    );
  }
);

GlassButton.displayName = "GlassButton";

export { GlassButton };
