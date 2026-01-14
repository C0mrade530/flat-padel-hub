import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  children: React.ReactNode;
  status?: "success" | "warning" | "error" | "info";
  className?: string;
}

const StatusBadge = ({ children, status = "success", className }: StatusBadgeProps) => {
  const variants = {
    success: "bg-success/20 text-success border-success/30",
    warning: "bg-warning/20 text-warning border-warning/30",
    error: "bg-destructive/20 text-destructive border-destructive/30",
    info: "bg-info/20 text-info border-info/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border",
        variants[status],
        className
      )}
    >
      {children}
    </span>
  );
};

export { StatusBadge };
