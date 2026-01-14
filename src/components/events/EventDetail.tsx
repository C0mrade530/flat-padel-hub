import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Avatar } from "@/components/ui/GlassAvatar";
import { Calendar, Clock, MapPin, Users, X } from "lucide-react";

interface EventDetailProps {
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
    description?: string;
    participants?: { id: string; name: string; avatar?: string }[];
  };
  isOpen: boolean;
  onClose: () => void;
  onRegister?: () => void;
  isRegistered?: boolean;
  isLoading?: boolean;
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

const EventDetail = ({ 
  event, 
  isOpen, 
  onClose, 
  onRegister,
  isRegistered = false,
  isLoading = false 
}: EventDetailProps) => {
  const availableSeats = event.maxSeats - event.currentSeats;
  const isFull = availableSeats === 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString("ru-RU", { month: "short" });
    const weekday = date.toLocaleDateString("ru-RU", { weekday: "short" });
    return { day, month, weekday };
  };

  const { day, month, weekday } = formatDate(event.date);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <div className="glass-card rounded-t-3xl p-6 pt-4 safe-bottom">
              {/* Drag handle */}
              <div className="flex justify-center mb-4">
                <div className="w-12 h-1.5 rounded-full bg-foreground-tertiary/30" />
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full glass hover:bg-primary/10 transition-colors"
              >
                <X className="w-5 h-5 text-foreground-secondary" />
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <span className="text-4xl mb-2 block">{eventTypeEmoji[event.type]}</span>
                <h2 className="text-2xl font-bold text-foreground text-tight uppercase tracking-wide">
                  {eventTypeLabel[event.type]}
                </h2>
                <p className="text-foreground-secondary">Уровень: {event.level}</p>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <GlassCard className="p-4 text-center" hover={false}>
                  <Calendar className="w-6 h-6 text-primary mx-auto mb-2" />
                  <div className="text-lg font-semibold text-foreground">
                    {day} {month}
                  </div>
                  <div className="text-sm text-foreground-secondary capitalize">
                    {weekday}
                  </div>
                </GlassCard>

                <GlassCard className="p-4 text-center" hover={false}>
                  <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
                  <div className="text-lg font-semibold text-foreground">
                    {event.startTime}
                  </div>
                  <div className="text-sm text-foreground-secondary">2 часа</div>
                </GlassCard>

                <GlassCard className="p-4 text-center" hover={false}>
                  <MapPin className="w-6 h-6 text-primary mx-auto mb-2" />
                  <div className="text-lg font-semibold text-foreground">
                    {event.location.split(" ")[0]}
                  </div>
                  <div className="text-sm text-foreground-secondary">
                    {event.location.split(" ").slice(1).join(" ")}
                  </div>
                </GlassCard>

                <GlassCard className="p-4 text-center" hover={false}>
                  <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                  <div className="text-lg font-semibold text-foreground">
                    {event.currentSeats} / {event.maxSeats}
                  </div>
                  <div className="text-sm text-foreground-secondary">мест</div>
                </GlassCard>
              </div>

              {/* Participants */}
              {event.participants && event.participants.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wide">
                    Участники
                  </h3>
                  <GlassCard className="p-4" hover={false}>
                    <div className="flex items-center">
                      <div className="flex -space-x-2">
                        {event.participants.slice(0, 6).map((p) => (
                          <Avatar key={p.id} name={p.name} src={p.avatar} size="md" />
                        ))}
                      </div>
                      {event.participants.length > 6 && (
                        <span className="ml-3 text-sm text-foreground-secondary">
                          +{event.participants.length - 6} ждут
                        </span>
                      )}
                    </div>
                  </GlassCard>
                </div>
              )}

              {/* Description */}
              {event.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-foreground-secondary mb-3 uppercase tracking-wide">
                    Описание
                  </h3>
                  <p className="text-foreground-secondary leading-relaxed">
                    {event.description}
                  </p>
                </div>
              )}

              {/* CTA */}
              <GlassButton
                variant={isRegistered ? "secondary" : isFull ? "ghost" : "primary"}
                size="lg"
                fullWidth
                loading={isLoading}
                onClick={onRegister}
                disabled={isRegistered}
              >
                {isRegistered 
                  ? "Вы записаны ✓" 
                  : isFull 
                    ? "Встать в очередь" 
                    : `Записаться • ${event.price.toLocaleString("ru-RU")} ₽`}
              </GlassButton>

              {isRegistered && (
                <GlassButton
                  variant="danger"
                  size="md"
                  fullWidth
                  className="mt-3"
                  onClick={onClose}
                >
                  Отменить запись
                </GlassButton>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export { EventDetail };
