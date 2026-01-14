import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AvatarProps {
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  glow?: boolean;
  className?: string;
}

const Avatar = ({ src, name, size = "md", glow = false, className }: AvatarProps) => {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-24 h-24 text-2xl",
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      className={cn(
        "relative rounded-full flex items-center justify-center font-semibold",
        "bg-gradient-to-br from-primary to-secondary text-primary-foreground",
        glow && "animate-glow-pulse",
        sizes[size],
        className
      )}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
      {glow && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-secondary opacity-50 blur-md -z-10" />
      )}
    </motion.div>
  );
};

export { Avatar };
