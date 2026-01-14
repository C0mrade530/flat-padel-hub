import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, Calendar } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassPill } from "@/components/ui/GlassPill";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { GlassButton } from "@/components/ui/GlassButton";
import { Clock, MapPin, Check, Timer } from "lucide-react";

// Mock data
const mockBookings = {
  confirmed: [
    {
      id: "1",
      type: "training" as const,
      title: "Тренировка",
      level: "D+",
      date: "2026-01-15",
      startTime: "18:00",
      endTime: "20:00",
      location: "Padel Arena Moscow",
      price: 2500,
      status: "confirmed" as const,
    },
    {
      id: "2",
      type: "stretching" as const,
      title: "Растяжка",
      level: "Все",
      date: "2026-01-15",
      startTime: "20:30",
      endTime: "21:30",
      location: "Padel Arena Moscow",
      price: 1500,
      status: "confirmed" as const,
    },
  ],
  waiting: [
    {
      id: "3",
      type: "tournament" as const,
      title: "Турнир",
      level: "C+",
      date: "2026-01-16",
      startTime: "10:00",
      endTime: "18:00",
      location: "Padel Club Premium",
      price: 5000,
      status: "waiting" as const,
      position: 2,
    },
  ],
};

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

const tabs = [
  { id: "upcoming", label: "Предстоящие" },
  { id: "history", label: "История" },
];

const BookingsScreen = () => {
  const [activeTab, setActiveTab] = useState("upcoming");

  const totalBookings = mockBookings.confirmed.length + mockBookings.waiting.length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", { 
      day: "numeric", 
      month: "short",
      weekday: "short"
    });
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-safe-top">
      {/* Header */}
      <motion.header
        className="pt-8 mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <ClipboardList className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground text-tight">
            Мои записи
          </h1>
        </div>
        <p className="text-foreground-secondary">
          {totalBookings} активных
        </p>
      </motion.header>

      {/* Tabs */}
      <motion.div
        className="flex gap-2 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {tabs.map((tab) => (
          <GlassPill
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </GlassPill>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === "upcoming" ? (
          <motion.div
            key="upcoming"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Confirmed section */}
            {mockBookings.confirmed.length > 0 && (
              <div className="mb-6">
                <motion.div
                  className="flex items-center gap-4 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-success/20 to-transparent" />
                  <span className="text-xs font-medium text-success uppercase tracking-widest flex items-center gap-2">
                    <Check className="w-3 h-3" />
                    Подтверждённые
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-success/20 to-transparent" />
                </motion.div>

                <div className="space-y-4">
                  {mockBookings.confirmed.map((booking, index) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                    >
                      <GlassCard className="p-4 border-success/20">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-success/10 text-xl">
                            {eventTypeEmoji[booking.type]}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-foreground">
                                {eventTypeLabel[booking.type]}
                              </h3>
                              <StatusBadge status="success">
                                <Check className="w-3 h-3 mr-1" />
                                Подтверждено
                              </StatusBadge>
                            </div>
                            <p className="text-sm text-foreground-secondary mb-2">
                              Уровень {booking.level}
                            </p>
                            <div className="flex flex-wrap gap-3 text-sm text-foreground-tertiary">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDate(booking.date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {booking.startTime}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {booking.location.split(" ")[0]}
                              </span>
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Waiting section */}
            {mockBookings.waiting.length > 0 && (
              <div className="mb-6">
                <motion.div
                  className="flex items-center gap-4 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-warning/20 to-transparent" />
                  <span className="text-xs font-medium text-warning uppercase tracking-widest flex items-center gap-2">
                    <Timer className="w-3 h-3" />
                    В очереди
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-warning/20 to-transparent" />
                </motion.div>

                <div className="space-y-4">
                  {mockBookings.waiting.map((booking, index) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                    >
                      <GlassCard className="p-4 border-warning/20">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-warning/10 text-xl">
                            {eventTypeEmoji[booking.type]}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-foreground">
                                {eventTypeLabel[booking.type]}
                              </h3>
                              <StatusBadge status="warning">
                                #{booking.position} в очереди
                              </StatusBadge>
                            </div>
                            <p className="text-sm text-foreground-secondary mb-2">
                              Уровень {booking.level}
                            </p>
                            <div className="flex flex-wrap gap-3 text-sm text-foreground-tertiary">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDate(booking.date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {booking.startTime}
                              </span>
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <span className="text-6xl mb-4">📜</span>
            <h3 className="text-lg font-medium text-foreground mb-2">
              История пуста
            </h3>
            <p className="text-foreground-secondary text-center mb-6">
              Здесь появятся ваши прошедшие события
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state for no bookings */}
      {totalBookings === 0 && activeTab === "upcoming" && (
        <motion.div
          className="flex flex-col items-center justify-center py-20"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-6xl mb-4">🎾</span>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Нет записей
          </h3>
          <p className="text-foreground-secondary text-center mb-6">
            Вы пока не записаны ни на одно событие
          </p>
          <GlassButton variant="primary" size="md">
            Найти игру
          </GlassButton>
        </motion.div>
      )}
    </div>
  );
};

export { BookingsScreen };
