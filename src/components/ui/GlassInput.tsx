import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { forwardRef, InputHTMLAttributes } from "react";

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, icon, ...props }, ref) => {
    return (
      <motion.div 
        className={cn(
          "relative flex items-center glass rounded-2xl transition-all duration-300",
          "focus-within:border-primary/30 focus-within:shadow-[0_0_20px_hsl(160_84%_39%_/_0.1)]"
        )}
        whileFocus={{ scale: 1.01 }}
      >
        {icon && (
          <span className="absolute left-4 text-foreground-tertiary">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full h-12 bg-transparent text-foreground placeholder:text-foreground-tertiary",
            "focus:outline-none",
            icon ? "pl-12 pr-4" : "px-4",
            className
          )}
          {...props}
        />
      </motion.div>
    );
  }
);

GlassInput.displayName = "GlassInput";

export { GlassInput };
