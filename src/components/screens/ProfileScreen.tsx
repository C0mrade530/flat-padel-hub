import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, Target, Bell, Calendar, HelpCircle, ChevronRight, Star, AlertCircle, Trophy, Flame, RefreshCw, MapPin } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Avatar } from "@/components/ui/GlassAvatar";
import { useUser } from "@/contexts/UserContext";
import { LevelSelectModal } from "@/components/profile/LevelSelectModal";
import { PreferencesModal } from "@/components/profile/PreferencesModal";
import { supabase } from "@/lib/supabase";
import { haptic, openLink } from "@/lib/telegram";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PlayerStats {
  totalGames: number;
  monthGames: number;
  tournaments: number;
}

interface RecentGame {
  id: string;
  events: {
    event_type: string;
    event_date: string;
    location: string;
    level: string;
  };
}

const eventTypeEmoji: Record<string, string> = {
  training: "🎾",
  tournament: "🏆",
  stretching: "🧘",
  other: "📅",
};

const eventTypeLabel: Record<string, string> = {
  training: "Тренировка",
  tournament: "Турнир",
  stretching: "Растяжка",
  other: "Событие",
};

const LEVELS = ['D', 'D+', 'C', 'C+', 'B', 'B+', 'A'];
const GAMES_PER_LEVEL = 10;

const ProfileScreen = () => {
  const { user, loading, isDevMode, refetchUser } = useUser();
  const [levelModalOpen, setLevelModalOpen] = useState(false);
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const [stats, setStats] = useState<PlayerStats>({ totalGames: 0, monthGames: 0, tournaments: 0 });
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      setCurrentLevel(user.level || 'D');
      loadStats();
      loadRecentGames();
    }
  }, [user]);

  useEffect(() => {
    const saved = localStorage.getItem("flat_notifications");
    if (saved !== null) {
      setNotifications(saved === "true");
    }
  }, []);

  const loadStats = useCallback(async () => {
    if (!user) return;
    
    // Total games
    const { count: totalGames } = await supabase
      .from("event_participants")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "confirmed");

    // Games this month
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { count: monthGames } = await supabase
      .from("event_participants")
      .select("*, events!inner(event_date)", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "confirmed")
      .lte("events.event_date", new Date().toISOString())
      .gte("events.event_date", firstDayOfMonth);

    // Tournaments
    const { count: tournaments } = await supabase
      .from("event_participants")
      .select("*, events!inner(event_type)", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("events.event_type", "tournament");

    setStats({ 
      totalGames: totalGames || 0, 
      monthGames: monthGames || 0, 
      tournaments: tournaments || 0 
    });
  }, [user]);

  const loadRecentGames = useCallback(async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("event_participants")
      .select("id, events(event_type, event_date, location, level)")
      .eq("user_id", user.id)
      .eq("status", "confirmed")
      .order("registered_at", { ascending: false })
      .limit(5);
    
    setRecentGames((data as unknown as RecentGame[]) || []);
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    haptic.impact("light");
    await Promise.all([loadStats(), loadRecentGames(), refetchUser()]);
    setRefreshing(false);
    haptic.notification("success");
  };

  const handleNotificationsToggle = () => {
    haptic.selection();
    const newValue = !notifications;
    setNotifications(newValue);
    localStorage.setItem("flat_notifications", String(newValue));
    toast({ title: newValue ? "Уведомления включены" : "Уведомления выключены" });
  };

  const handleHelp = () => {
    haptic.impact("light");
    openLink("https://t.me/flatpadel_support");
  };

  // Level progress calculation
  const currentLevelIndex = LEVELS.indexOf(currentLevel || 'D');
  const nextLevel = LEVELS[Math.min(currentLevelIndex + 1, LEVELS.length - 1)];
  const gamesForNextLevel = (currentLevelIndex + 1) * GAMES_PER_LEVEL;
  const levelProgress = Math.min((stats.totalGames / gamesForNextLevel) * 100, 100);
  const gamesRemaining = Math.max(gamesForNextLevel - stats.totalGames, 0);

  // Achievements
  const achievements = [
    { id: 'first_game', icon: '🎾', title: 'Первая игра', description: 'Сыграйте первую игру', unlocked: stats.totalGames >= 1 },
    { id: 'five_games', icon: '🔥', title: 'Разогрев', description: '5 игр сыграно', unlocked: stats.totalGames >= 5 },
    { id: 'ten_games', icon: '⭐', title: 'Любитель', description: '10 игр сыграно', unlocked: stats.totalGames >= 10 },
    { id: 'first_tournament', icon: '🏆', title: 'Турнирный боец', description: 'Первый турнир', unlocked: stats.tournaments >= 1 },
    { id: 'twenty_games', icon: '💪', title: 'Постоянный игрок', description: '20 игр сыграно', unlocked: stats.totalGames >= 20 },
    { id: 'fifty_games', icon: '💎', title: 'Ветеран', description: '50 игр сыграно', unlocked: stats.totalGames >= 50 },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  const menuItems = [
    {
      id: "level",
      icon: Target,
      label: "Уровень игры",
      value: currentLevel || "—",
      onClick: () => {
        haptic.impact("light");
        setLevelModalOpen(true);
      },
    },
    {
      id: "notifications",
      icon: Bell,
      label: "Уведомления",
      value: notifications ? "Вкл" : "Выкл",
      onClick: handleNotificationsToggle,
    },
    {
      id: "preferences",
      icon: Calendar,
      label: "Предпочтения",
      value: undefined,
      onClick: () => {
        haptic.impact("light");
        setPreferencesModalOpen(true);
      },
    },
    {
      id: "help",
      icon: HelpCircle,
      label: "Помощь",
      value: undefined,
      onClick: handleHelp,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">Не удалось загрузить профиль</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-safe-top">
      {isDevMode && (
        <motion.div
          className="mt-4 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-xs text-yellow-400">⚠️ DEV MODE: Тестовый пользователь</span>
        </motion.div>
      )}

      {/* Header with refresh */}
      <motion.div
        className="pt-8 flex justify-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.button
          onClick={handleRefresh}
          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          whileTap={{ scale: 0.95 }}
        >
          <RefreshCw className={cn("w-5 h-5 text-primary", refreshing && "animate-spin")} />
        </motion.button>
      </motion.div>

      {/* Avatar & Name */}
      <motion.div
        className="flex flex-col items-center mb-6"
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
          <Avatar name={user.display_name} src={user.avatar_url || undefined} size="xl" glow />
          {/* Level badge */}
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground border-2 border-background">
            {currentLevel || 'D'}
          </div>
        </motion.div>

        <motion.h1
          className="text-2xl font-bold text-foreground tracking-tight mb-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {user.display_name}
        </motion.h1>

        <motion.p
          className="text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          @{user.username || "player"}
        </motion.p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-3 gap-3 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-2xl p-4 text-center border border-emerald-500/20">
          <motion.p 
            className="text-2xl font-bold text-emerald-400"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, type: "spring" }}
          >
            {stats.totalGames}
          </motion.p>
          <p className="text-xs text-muted-foreground mt-1">Всего игр</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 rounded-2xl p-4 text-center border border-cyan-500/20">
          <motion.p 
            className="text-2xl font-bold text-cyan-400"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7, type: "spring" }}
          >
            {stats.monthGames}
          </motion.p>
          <p className="text-xs text-muted-foreground mt-1">В этом месяце</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 rounded-2xl p-4 text-center border border-yellow-500/20">
          <motion.p 
            className="text-2xl font-bold text-yellow-400 flex items-center justify-center gap-1"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: "spring" }}
          >
            <Trophy className="w-5 h-5" />
            {stats.tournaments}
          </motion.p>
          <p className="text-xs text-muted-foreground mt-1">Турниров</p>
        </div>
      </motion.div>

      {/* Level Progress */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <GlassCard className="p-4" hover={false}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" />
              <span className="font-medium">Прогресс уровня</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="font-bold text-primary">{currentLevel || 'D'}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-muted-foreground">{nextLevel}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-primary font-bold">{stats.totalGames}</span>
            <span className="text-muted-foreground">/ {gamesForNextLevel} игр</span>
          </div>

          <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-2">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress}%` }}
              transition={{ duration: 0.8, delay: 0.6 }}
            />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {gamesRemaining > 0 
              ? `Ещё ${gamesRemaining} игр до уровня ${nextLevel}`
              : `🎉 Вы достигли уровня ${nextLevel}!`
            }
          </p>
        </GlassCard>
      </motion.div>

      {/* Achievements */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            Достижения
          </h2>
          <span className="text-xs text-muted-foreground">{unlockedCount}/{achievements.length}</span>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {achievements.map((achievement, index) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + index * 0.05 }}
              className={cn(
                "rounded-xl p-3 text-center transition-all",
                achievement.unlocked 
                  ? "bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30" 
                  : "bg-white/5 border border-white/10 opacity-50"
              )}
            >
              <span className={cn("text-2xl block mb-1", !achievement.unlocked && "grayscale")}>
                {achievement.icon}
              </span>
              <p className="text-xs font-medium truncate">{achievement.title}</p>
              {!achievement.unlocked && (
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{achievement.description}</p>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent Games */}
      {recentGames.length > 0 && (
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">История игр</h2>
            <span className="text-xs text-primary cursor-pointer">Все →</span>
          </div>
          
          <GlassCard className="divide-y divide-white/10" hover={false}>
            {recentGames.map((game, index) => (
              <motion.div
                key={game.id}
                className="flex items-center gap-3 p-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.05 }}
              >
                <span className="text-xl">{eventTypeEmoji[game.events.event_type] || '📅'}</span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{eventTypeLabel[game.events.event_type] || 'Событие'}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {formatDate(game.events.event_date)} • {game.events.location}
                  </p>
                </div>
                <span className="text-xs bg-white/10 px-2 py-1 rounded-full">
                  {game.events.level || 'any'}
                </span>
              </motion.div>
            ))}
          </GlassCard>
        </motion.div>
      )}

      {/* Membership Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mb-6"
      >
        <GlassCard 
          className={cn(
            "p-4",
            user.membership_status === "paid" ? "border-emerald-500/20" : "border-yellow-500/20"
          )} 
          hover={false}
        >
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Членство</span>
            <span className={cn(
              "font-medium",
              user.membership_status === "paid" ? "text-emerald-400" : "text-yellow-400"
            )}>
              {user.membership_status === "paid" 
                ? "✓ Активно" 
                : user.membership_status === "pause" 
                  ? "⏸ Пауза" 
                  : "⏳ Не оплачено"
              }
            </span>
          </div>
        </GlassCard>
      </motion.div>

      {/* Menu Items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75 }}
      >
        <GlassCard className="divide-y divide-white/10 overflow-hidden" hover={false}>
          {menuItems.map((item, index) => (
            <motion.button
              key={item.id}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + index * 0.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={item.onClick}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-foreground">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.value && <span className="text-sm text-muted-foreground">{item.value}</span>}
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
        <p className="text-xs text-muted-foreground">v1.0.0 • FLAT TEAM</p>
      </motion.div>

      <LevelSelectModal
        isOpen={levelModalOpen}
        onClose={() => setLevelModalOpen(false)}
        currentLevel={currentLevel}
        onSelect={(level) => {
          setCurrentLevel(level);
          refetchUser();
        }}
      />
      <PreferencesModal isOpen={preferencesModalOpen} onClose={() => setPreferencesModalOpen(false)} />
    </div>
  );
};

export { ProfileScreen };
