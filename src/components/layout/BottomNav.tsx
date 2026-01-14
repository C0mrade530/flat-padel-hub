import { motion } from "framer-motion";
import { Home, ClipboardList, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAdmin?: boolean;
}

const BottomNav = ({ activeTab, onTabChange, isAdmin = false }: BottomNavProps) => {
  const navItems: NavItem[] = [
    { id: "home", icon: <Home className="w-6 h-6" />, label: "Главная" },
    { id: "bookings", icon: <ClipboardList className="w-6 h-6" />, label: "Записи" },
    { id: "profile", icon: <User className="w-6 h-6" />, label: "Профиль" },
    ...(isAdmin ? [{ id: "admin", icon: <Settings className="w-6 h-6" />, label: "Админ" }] : []),
  ];

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0f1a] backdrop-blur-xl border-t border-emerald-500/20 pb-[env(safe-area-inset-bottom)]"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.2 }}
    >
      <div className="flex items-center justify-around h-16 px-4">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-xl transition-colors",
              activeTab === item.id 
                ? "text-primary" 
                : "text-foreground-tertiary hover:text-foreground-secondary"
            )}
            onClick={() => onTabChange(item.id)}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div
              animate={{
                scale: activeTab === item.id ? 1.1 : 1,
              }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              {item.icon}
            </motion.div>
            <span className="text-[10px] font-medium">{item.label}</span>
            
            {/* Active indicator */}
            {activeTab === item.id && (
              <motion.div
                className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary"
                layoutId="activeIndicator"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            
            {/* Glow effect */}
            {activeTab === item.id && (
              <motion.div
                className="absolute inset-0 rounded-xl bg-primary/10 -z-10"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </motion.nav>
  );
};

export { BottomNav };
