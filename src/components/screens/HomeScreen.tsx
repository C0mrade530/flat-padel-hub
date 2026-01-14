import { useState } from "react";
import { motion } from "framer-motion";
import { Search, RefreshCw } from "lucide-react";
import { GlassInput } from "@/components/ui/GlassInput";
import { GlassPill } from "@/components/ui/GlassPill";
import { EventCard } from "@/components/events/EventCard";
import { EventDetail } from "@/components/events/EventDetail";
import { EventCardSkeleton } from "@/components/ui/skeleton";
import { useEvents, TransformedEvent } from "@/hooks/useEvents";
import { useUser } from "@/contexts/UserContext";
import { haptic } from "@/lib/telegram";

const filters = [
  { id: "all", label: "Все" },
  { id: "d", label: "D/D+" },
  { id: "c", label: "C/C+" },
  { id: "b", label: "B/B+" },
];

const HomeScreen = () => {
  const { user } = useUser();
  const { events, loading, error, refetch } = useEvents();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<TransformedEvent | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const userName = user?.display_name?.split(' ')[0] || 'Игрок';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Доброе утро";
    if (hour < 17) return "Добрый день";
    return "Добрый вечер";
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    haptic.impact("light");
    await refetch();
    setRefreshing(false);
  };

  const filteredEvents = events.filter((event) => {
    if (activeFilter !== "all") {
      const levelLower = event.level.toLowerCase();
      if (!levelLower.includes(activeFilter)) return false;
    }
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

  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    
    let group = "Позже";
    if (event.date === today) group = "Сегодня";
    else if (event.date === tomorrow) group = "Завтра";
    
    if (!acc[group]) acc[group] = [];
    acc[group].push(event);
    return acc;
  }, {} as Record<string, TransformedEvent[]>);

  const handleEventClick = (event: TransformedEvent) => {
    haptic.impact("light");
    setSelectedEvent(event);
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
          <p className="text-foreground-secondary text-sm mb-1">
            {getGreeting()}, {userName} 👋
          </p>
          <h1 className="text-2xl font-semibold text-foreground text-tight">
            Найди свою игру
          </h1>
        </div>
        <motion.button
          onClick={handleRefresh}
          className="p-2 rounded-xl glass border border-primary/10"
          whileTap={{ scale: 0.95 }}
          animate={{ rotate: refreshing ? 360 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <RefreshCw className={`w-5 h-5 text-primary ${refreshing ? 'animate-spin' : ''}`} />
        </motion.button>
      </motion.header>

      {/* Search */}
      <motion.div
        className="mb-6"
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
          <GlassPill
            key={filter.id}
            active={activeFilter === filter.id}
            onClick={() => {
              haptic.selection();
              setActiveFilter(filter.id);
            }}
          >
            {filter.label}
          </GlassPill>
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
          {[1, 2, 3].map((i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <span className="text-5xl mb-4 block">🎾</span>
          <p className="text-foreground-secondary">Нет доступных событий</p>
        </div>
      )}

      {/* Events */}
      {!loading && Object.entries(groupedEvents).map(([group, groupEvents], groupIndex) => (
        <div key={group} className="mb-6">
          <motion.div
            className="flex items-center gap-4 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 + groupIndex * 0.1 }}
          >
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <span className="text-xs font-medium text-foreground-tertiary uppercase tracking-widest">
              {group}
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          </motion.div>

          <div className="space-y-4">
            {groupEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                index={index}
                onClick={() => handleEventClick(event)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Event Detail */}
      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEventsRefetch={refetch}
        />
      )}
    </div>
  );
};

export { HomeScreen };
