import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

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
  isRegistered?: boolean;
  isPaid?: boolean;
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

const EventCard = ({ event, onClick, index = 0, isRegistered = false, isPaid = false }: EventCardProps) => {
  const availableSeats = event.maxSeats - event.currentSeats;
  const fillPercentage = (event.currentSeats / event.maxSeats) * 100;
  const isAlmostFull = event.currentSeats >= event.maxSeats * 0.8;
  const isFull = event.currentSeats >= event.maxSeats;

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
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{eventTypeEmoji[event.type]}</span>
            <div>
              <h3 className="text-lg font-semibold text-foreground tracking-tight">
                {eventTypeLabel[event.type]}
              </h3>
              <p className="text-sm text-muted-foreground">
                Уровень {event.level}
              </p>
            </div>
          </div>
          <span className="text-xl font-semibold text-primary">
            {event.price.toLocaleString("ru-RU")} ₽
          </span>
        </div>

        {/* Time & Location */}
        <div className="flex flex-col gap-1.5 mb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm">
              {event.startTime} — {event.endTime}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm">{event.location}</span>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {isFull && (
            <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">
              Мест нет
            </span>
          )}
          
          {isAlmostFull && !isFull && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
              Осталось {availableSeats}
            </span>
          )}
          
          {isRegistered && !isPaid && (
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
              ✓ Записан
            </span>
          )}
          
          {isPaid && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
              💳 Оплачено
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Мест занято</span>
            <span className={cn(
              isFull 
                ? "text-destructive" 
                : isAlmostFull
                  ? "text-yellow-400"
                  : "text-emerald-400"
            )}>
              {event.currentSeats}/{event.maxSeats}
            </span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className={cn(
                "h-full rounded-full",
                isFull 
                  ? "bg-destructive" 
                  : isAlmostFull 
                    ? "bg-yellow-500" 
                    : "bg-gradient-to-r from-emerald-500 to-cyan-500"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${fillPercentage}%` }}
              transition={{ duration: 0.5, delay: index * 0.05 + 0.2 }}
            />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};

export { EventCard };
