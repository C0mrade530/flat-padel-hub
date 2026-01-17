import { useState } from "react";
import { motion } from "framer-motion";
import { Search, RefreshCw } from "lucide-react";
import { GlassInput } from "@/components/ui/GlassInput";
import { EventCard } from "@/components/events/EventCard";
import { EventDetail } from "@/components/events/EventDetail";
import { EventCardSkeleton } from "@/components/ui/skeleton";
import { useEvents, TransformedEvent } from "@/hooks/useEvents";
import { useUserRegistrations } from "@/hooks/useUserRegistrations";
import { useUser } from "@/contexts/UserContext";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/utils";

const filters = [
  { id: "all", label: "Все", icon: null },
  { id: "training", label: "Тренировки", icon: "🎾" },
  { id: "tournament", label: "Турниры", icon: "🏆" },
  { id: "stretching", label: "Растяжка", icon: "🧘" },
  { id: "myLevel", label: "Мой уровень", icon: "📊" },
];

const HomeScreen = () => {
  const { user } = useUser();
  const { events, loading, error, refetch } = useEvents();
  const { isRegistered, isPaid, refetch: refetchRegistrations } = useUserRegistrations();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<TransformedEvent | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const userName = user?.display_name?.split(' ')[0] || 'Игрок';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Доброе утро";
    if (hour < 18) return "Добрый день";
    return "Добрый вечер";
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    haptic.impact("light");
    await Promise.all([refetch(), refetchRegistrations()]);
    setRefreshing(false);
  };

  // Filter events by type/level and search
  const filteredEvents = events.filter((event) => {
    // Filter by type
    if (activeFilter === "myLevel") {
      const userLevel = user?.level?.toLowerCase();
      const eventLevel = event.level.toLowerCase();
      if (eventLevel !== 'все' && eventLevel !== 'any' && userLevel && !eventLevel.includes(userLevel.charAt(0))) {
        return false;
      }
    } else if (activeFilter !== "all") {
      if (event.type !== activeFilter) return false;
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        event.title.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query) ||
        event.level.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Group events by time period
  const today = new Date().toISOString().split("T")[0];
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const todayEvents = filteredEvents.filter(e => e.date === today);
  const weekEvents = filteredEvents.filter(e => e.date > today && e.date <= weekFromNow);
  const laterEvents = filteredEvents.filter(e => e.date > weekFromNow);

  const handleEventClick = (event: TransformedEvent) => {
    haptic.impact("light");
    setSelectedEvent(event);
  };

  const handleEventsRefetch = async () => {
    await Promise.all([refetch(), refetchRegistrations()]);
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-safe-top">
      {/* Header */}
      <motion.header
        className="pt-8 mb-6 flex items-start justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div>
          <p className="text-muted-foreground text-sm mb-1">
            {getGreeting()}, {userName}! 👋
          </p>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Найди свою игру
          </h1>
        </div>
        <motion.button
          onClick={handleRefresh}
          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          whileTap={{ scale: 0.95 }}
          animate={{ rotate: refreshing ? 360 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <RefreshCw className={`w-5 h-5 text-primary ${refreshing ? 'animate-spin' : ''}`} />
        </motion.button>
      </motion.header>

      {/* Search */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassInput
          placeholder="Поиск событий..."
          icon={<Search className="w-5 h-5" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </motion.div>

      {/* Filters */}
      <motion.div
        className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => {
              haptic.selection();
              setActiveFilter(filter.id);
            }}
            className={cn(
              "px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all flex items-center gap-1.5",
              activeFilter === filter.id 
                ? "bg-primary text-primary-foreground font-medium" 
                : "bg-white/5 hover:bg-white/10 text-foreground"
            )}
          >
            {filter.icon && <span>{filter.icon}</span>}
            {filter.label}
          </button>
        ))}
      </motion.div>

      {/* Error state */}
      {error && (
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{error}</p>
          <button onClick={refetch} className="text-primary underline">
            Попробовать снова
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <span className="text-5xl mb-4 block">🎾</span>
          <h3 className="text-lg font-semibold mb-2">Нет событий</h3>
          <p className="text-muted-foreground">Попробуйте изменить фильтры</p>
        </div>
      )}

      {/* Today's events */}
      {!loading && todayEvents.length > 0 && (
        <section className="mb-6">
          <motion.h2 
            className="text-lg font-semibold mb-3 flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Сегодня
          </motion.h2>
          <div className="space-y-4">
            {todayEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                index={index}
                onClick={() => handleEventClick(event)}
                isRegistered={isRegistered(event.id)}
                isPaid={isPaid(event.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* This week's events */}
      {!loading && weekEvents.length > 0 && (
        <section className="mb-6">
          <motion.h2 
            className="text-lg font-semibold mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            На этой неделе
          </motion.h2>
          <div className="space-y-4">
            {weekEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                index={index}
                onClick={() => handleEventClick(event)}
                isRegistered={isRegistered(event.id)}
                isPaid={isPaid(event.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Later events */}
      {!loading && laterEvents.length > 0 && (
        <section className="mb-6">
          <motion.h2 
            className="text-lg font-semibold mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Позже
          </motion.h2>
          <div className="space-y-4">
            {laterEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                index={index}
                onClick={() => handleEventClick(event)}
                isRegistered={isRegistered(event.id)}
                isPaid={isPaid(event.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Event Detail */}
      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEventsRefetch={handleEventsRefetch}
        />
      )}
    </div>
  );
};

export { HomeScreen };
