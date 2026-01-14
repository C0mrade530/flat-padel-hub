import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Settings, Plus, CreditCard, ClipboardList, Users, ChevronRight, TrendingUp, AlertCircle } from "lucide-react";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useUser } from "@/contexts/UserContext";

const AdminScreen = () => {
  const { isAdmin, isDevMode } = useUser();
  const { stats, loading, error, refetch } = useAdminStats();

  const menuItems = [
    {
      id: "payments",
      icon: CreditCard,
      label: "Ожидают оплаты",
      badge: stats.pendingPayments,
      badgeType: "error" as const,
    },
    {
      id: "events",
      icon: ClipboardList,
      label: "Все события",
      badge: undefined,
      badgeType: undefined,
    },
    {
      id: "users",
      icon: Users,
      label: "Пользователи",
      badge: undefined,
      badgeType: undefined,
    },
  ];

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Доступ запрещён</h2>
          <p className="text-foreground-secondary">У вас нет прав для просмотра этой страницы</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-safe-top">
      {/* Dev mode indicator */}
      {isDevMode && (
        <motion.div
          className="mt-4 p-2 rounded-lg bg-warning/10 border border-warning/20 text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-xs text-warning">⚠️ DEV MODE: Тестовый администратор</span>
        </motion.div>
      )}

      {/* Header */}
      <motion.header
        className="pt-8 mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground text-tight">
            Управление
          </h1>
        </div>
      </motion.header>

      {/* Error state */}
      {error && (
        <div className="text-center py-6 mb-6">
          <p className="text-destructive mb-4">{error}</p>
          <button onClick={refetch} className="text-primary underline">
            Попробовать снова
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-2 gap-3 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard className="p-4" gradient>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <TrendingUp className="w-3 h-3 text-success" />
          </div>
          <div className="text-3xl font-bold text-foreground mb-1">
            {stats.playersToday}
          </div>
          <div className="text-xs text-foreground-tertiary uppercase tracking-wide">
            Игроков сегодня
          </div>
        </GlassCard>

        <GlassCard className="p-4" gradient>
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <TrendingUp className="w-3 h-3 text-success" />
          </div>
          <div className="text-3xl font-bold text-foreground mb-1">
            {stats.revenue.toLocaleString("ru-RU")}
            <span className="text-lg text-foreground-secondary ml-1">₽</span>
          </div>
          <div className="text-xs text-foreground-tertiary uppercase tracking-wide">
            Выручка
          </div>
        </GlassCard>
      </motion.div>

      {/* Create Event CTA */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlassButton 
          variant="primary" 
          size="lg" 
          fullWidth
          icon={<Plus className="w-5 h-5" />}
        >
          Создать событие
        </GlassButton>
      </motion.div>

      {/* Menu */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <GlassCard className="divide-y divide-primary/10 overflow-hidden" hover={false}>
          {menuItems.map((item, index) => (
            <motion.button
              key={item.id}
              className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-foreground">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.badge !== undefined && item.badge > 0 && (
                  <motion.span
                    className={`
                      px-2 py-0.5 text-xs font-medium rounded-full
                      ${item.badgeType === "error" 
                        ? "bg-destructive/20 text-destructive" 
                        : "bg-primary/20 text-primary"}
                    `}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    {item.badge}
                  </motion.span>
                )}
                <ChevronRight className="w-5 h-5 text-foreground-tertiary" />
              </div>
            </motion.button>
          ))}
        </GlassCard>
      </motion.div>

      {/* Quick actions hint */}
      <motion.div
        className="mt-8 p-4 rounded-2xl bg-primary/5 border border-primary/10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <p className="text-sm text-foreground-secondary text-center">
          💡 Совет: используйте быстрые действия свайпом влево на карточках событий
        </p>
      </motion.div>
    </div>
  );
};

export { AdminScreen };
