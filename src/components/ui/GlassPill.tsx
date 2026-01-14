import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassPillProps {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

const GlassPill = ({ children, active = false, onClick, className }: GlassPillProps) => {
  return (
    <motion.button
      className={cn(
        "px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 whitespace-nowrap",
        active 
          ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-[0_0_20px_hsl(160_84%_39%_/_0.3)]" 
          : "glass text-foreground-secondary hover:text-foreground hover:border-primary/20",
        className
      )}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.button>
  );
};

export { GlassPill };
