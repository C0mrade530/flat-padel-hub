import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Avatar } from "@/components/ui/GlassAvatar";
import { Target, Bell, Calendar, HelpCircle, ChevronRight, Star } from "lucide-react";

// Mock user data
const mockUser = {
  name: "Леонид Тарелкин",
  username: "@leonid",
  avatar: undefined,
  gamesPlayed: 47,
  level: "C+",
  rating: 4.8,
};

const menuItems = [
  {
    id: "level",
    icon: Target,
    label: "Уровень игры",
    value: "C+",
  },
  {
    id: "notifications",
    icon: Bell,
    label: "Уведомления",
    value: "Вкл",
  },
  {
    id: "preferences",
    icon: Calendar,
    label: "Предпочтения",
    value: undefined,
  },
  {
    id: "help",
    icon: HelpCircle,
    label: "Помощь",
    value: undefined,
  },
];

const ProfileScreen = () => {
  return (
    <div className="min-h-screen pb-24 px-4 pt-safe-top">
      {/* Header with Avatar */}
      <motion.div
        className="pt-8 flex flex-col items-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <motion.div
          className="relative mb-4"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.2 }}
        >
          <Avatar
            name={mockUser.name}
            src={mockUser.avatar}
            size="xl"
            glow
          />
          {/* Gradient border effect */}
          <div className="absolute inset-0 rounded-full p-1 -z-10">
            <div 
              className="w-full h-full rounded-full animate-spin"
              style={{
                background: "conic-gradient(from 0deg, hsl(160 84% 39%), hsl(187 96% 42%), hsl(160 84% 39%))",
                animationDuration: "3s",
              }}
            />
          </div>
        </motion.div>

        <motion.h1
          className="text-2xl font-semibold text-foreground text-tight mb-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {mockUser.name}
        </motion.h1>

        <motion.p
          className="text-foreground-secondary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {mockUser.username}
        </motion.p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-8"
      >
        <GlassCard className="p-4" hover={false}>
          <div className="grid grid-cols-3 divide-x divide-primary/10">
            <div className="text-center px-2">
              <div className="text-2xl font-bold text-foreground mb-1">
                {mockUser.gamesPlayed}
              </div>
              <div className="text-xs text-foreground-tertiary uppercase tracking-wide">
                Игр
              </div>
            </div>
            <div className="text-center px-2">
              <div className="text-2xl font-bold gradient-text mb-1">
                {mockUser.level}
              </div>
              <div className="text-xs text-foreground-tertiary uppercase tracking-wide">
                Уровень
              </div>
            </div>
            <div className="text-center px-2">
              <div className="text-2xl font-bold text-foreground mb-1 flex items-center justify-center gap-1">
                <Star className="w-5 h-5 text-warning fill-warning" />
                {mockUser.rating}
              </div>
              <div className="text-xs text-foreground-tertiary uppercase tracking-wide">
                Рейтинг
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Menu */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <GlassCard className="divide-y divide-primary/10 overflow-hidden" hover={false}>
          {menuItems.map((item, index) => (
            <motion.button
              key={item.id}
              className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + index * 0.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-foreground">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.value && (
                  <span className="text-sm text-foreground-secondary">{item.value}</span>
                )}
                <ChevronRight className="w-5 h-5 text-foreground-tertiary" />
              </div>
            </motion.button>
          ))}
        </GlassCard>
      </motion.div>

      {/* Footer */}
      <motion.div
        className="text-center mt-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 0.9 }}
      >
        <p className="text-xs text-foreground-tertiary">
          v1.0.0 • FLAT TEAM
        </p>
      </motion.div>
    </div>
  );
};

export { ProfileScreen };
