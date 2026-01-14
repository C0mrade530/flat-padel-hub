import { useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { GlassInput } from "@/components/ui/GlassInput";
import { GlassPill } from "@/components/ui/GlassPill";
import { EventCard } from "@/components/events/EventCard";
import { EventDetail } from "@/components/events/EventDetail";

// Mock data
const mockEvents = [
  {
    id: "1",
    type: "training" as const,
    title: "Тренировка",
    level: "D+",
    date: "2026-01-15",
    startTime: "18:00",
    endTime: "20:00",
    location: "Padel Arena Moscow",
    maxSeats: 8,
    currentSeats: 6,
    price: 2500,
    description: "Тренировка для начинающих игроков. Отработка базовых ударов и тактики игры. Подходит для тех, кто недавно начал играть в падел.",
    participants: [
      { id: "1", name: "Леонид Т." },
      { id: "2", name: "Анна К." },
      { id: "3", name: "Михаил Р." },
      { id: "4", name: "Елена С." },
      { id: "5", name: "Дмитрий В." },
      { id: "6", name: "Ольга Н." },
    ],
  },
  {
    id: "2",
    type: "tournament" as const,
    title: "Турнир",
    level: "C+",
    date: "2026-01-16",
    startTime: "10:00",
    endTime: "18:00",
    location: "Padel Club Premium",
    maxSeats: 16,
    currentSeats: 14,
    price: 5000,
    description: "Еженедельный турнир для игроков среднего уровня. Формат: американка. Призы для топ-3.",
  },
  {
    id: "3",
    type: "stretching" as const,
    title: "Растяжка",
    level: "Все",
    date: "2026-01-15",
    startTime: "20:30",
    endTime: "21:30",
    location: "Padel Arena Moscow",
    maxSeats: 12,
    currentSeats: 4,
    price: 1500,
    description: "Восстановительная растяжка после игры. Подходит для всех уровней подготовки.",
  },
  {
    id: "4",
    type: "training" as const,
    title: "Тренировка",
    level: "C/C+",
    date: "2026-01-17",
    startTime: "19:00",
    endTime: "21:00",
    location: "World Class Padel",
    maxSeats: 8,
    currentSeats: 8,
    price: 3000,
    description: "Продвинутая тренировка с акцентом на тактику парной игры.",
  },
];

const filters = [
  { id: "all", label: "Все" },
  { id: "dd+", label: "D/D+" },
  { id: "cc+", label: "C/C+" },
  { id: "bb+", label: "B/B+" },
];

interface HomeScreenProps {
  userName?: string;
}

const HomeScreen = ({ userName = "Леонид" }: HomeScreenProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<typeof mockEvents[0] | null>(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Доброе утро";
    if (hour < 17) return "Добрый день";
    return "Добрый вечер";
  };

  const filteredEvents = mockEvents.filter((event) => {
    if (activeFilter === "all") return true;
    return event.level.toLowerCase().includes(activeFilter.replace("+", ""));
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
  }, {} as Record<string, typeof mockEvents>);

  return (
    <div className="min-h-screen pb-24 px-4 pt-safe-top">
      {/* Header */}
      <motion.header
        className="pt-8 mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <p className="text-foreground-secondary text-sm mb-1">
          {getGreeting()}, {userName} 👋
        </p>
        <h1 className="text-2xl font-semibold text-foreground text-tight">
          Найди свою игру
        </h1>
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
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.label}
          </GlassPill>
        ))}
      </motion.div>

      {/* Events */}
      {Object.entries(groupedEvents).map(([group, events], groupIndex) => (
        <div key={group} className="mb-6">
          {/* Date separator */}
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

          {/* Event cards */}
          <div className="space-y-4">
            {events.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                index={index}
                onClick={() => setSelectedEvent(event)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Event Detail */}
      <EventDetail
        event={selectedEvent || mockEvents[0]}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onRegister={() => {
          // Handle registration
          console.log("Register for event:", selectedEvent?.id);
        }}
      />
    </div>
  );
};

export { HomeScreen };
