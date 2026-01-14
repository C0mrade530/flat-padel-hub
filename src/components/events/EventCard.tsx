import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Clock, MapPin } from "lucide-react";

interface EventCardProps {
  event: {
    id: string;
    type: "training" | "tournament" | "stretching" | "other";
    title: string;
    level: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    maxSeats: number;
    currentSeats: number;
    price: number;
  };
  onClick?: () => void;
  index?: number;
}

const eventTypeEmoji = {
  training: "🎾",
  tournament: "🏆",
  stretching: "🧘",
  other: "📅",
};

const eventTypeLabel = {
  training: "Тренировка",
  tournament: "Турнир",
  stretching: "Растяжка",
  other: "Событие",
};

const EventCard = ({ event, onClick, index = 0 }: EventCardProps) => {
  const availableSeats = event.maxSeats - event.currentSeats;
  const seatsStatus = 
    availableSeats === 0 ? "error" : 
    availableSeats <= 2 ? "warning" : "success";

  const seatsLabel = 
    availableSeats === 0 ? "Мест нет" :
    availableSeats <= 2 ? `Осталось ${availableSeats}` :
    `${availableSeats} мест`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 30,
        delay: index * 0.05 
      }}
    >
      <GlassCard
        className="p-5 cursor-pointer"
        onClick={onClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{eventTypeEmoji[event.type]}</span>
            <div>
              <h3 className="text-lg font-semibold text-foreground text-tight">
                {eventTypeLabel[event.type]}
              </h3>
              <p className="text-sm text-foreground-secondary">
                Уровень {event.level}
              </p>
            </div>
          </div>
          <StatusBadge status={seatsStatus}>
            {seatsLabel}
          </StatusBadge>
        </div>

        {/* Time & Location */}
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-2 text-foreground-secondary">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm">
              {event.startTime} — {event.endTime}
            </span>
          </div>
          <div className="flex items-center gap-2 text-foreground-secondary">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm">{event.location}</span>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1 mb-4">
          {Array.from({ length: event.maxSeats }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < event.currentSeats
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
          ))}
          <span className="ml-auto text-sm text-foreground-secondary">
            {event.currentSeats}/{event.maxSeats}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent mb-4" />

        {/* Price */}
        <div className="flex items-center justify-end">
          <span className="text-xl font-semibold text-primary">
            {event.price.toLocaleString("ru-RU")} ₽
          </span>
        </div>
      </GlassCard>
    </motion.div>
  );
};

export { EventCard };
