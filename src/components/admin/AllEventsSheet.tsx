import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/telegram";

interface EventItem {
  id: string;
  event_type: string;
  event_date: string;
  start_time: string;
  location: string;
  max_seats: number;
  current_seats: number;
  price: number;
  status: string;
}

interface AllEventsSheetProps {
  isOpen: boolean;
  onClose: () => void;
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

export const AllEventsSheet = ({ isOpen, onClose }: AllEventsSheetProps) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: false })
        .limit(50);

      if (error) throw error;
      setEvents((data || []) as EventItem[]);
    } catch (error) {
      console.error("Load events error:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить события",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadEvents();
    }
  }, [isOpen]);

  const cancelEvent = async (eventId: string) => {
    haptic.impact("medium");
    
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: "canceled" })
        .eq("id", eventId);

      if (error) throw error;

      haptic.notification("success");
      toast({ title: "Событие отменено" });
      loadEvents();
    } catch (error) {
      console.error("Cancel event error:", error);
      haptic.notification("error");
      toast({
        title: "Ошибка",
        description: "Не удалось отменить событие",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      weekday: "short",
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto bg-background border-t border-primary/10">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-foreground text-xl">
            Все события ({events.length})
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-5xl mb-4 block">📅</span>
            <p className="text-foreground-secondary">Нет событий</p>
          </div>
        ) : (
          <div className="space-y-3 pb-6">
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <GlassCard className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {eventTypeEmoji[event.event_type] || "📅"}{" "}
                        {eventTypeLabel[event.event_type] || "Событие"}
                      </p>
                      <p className="text-sm text-foreground-secondary">
                        {formatDate(event.event_date)} • {event.start_time?.slice(0, 5)}
                      </p>
                      <p className="text-sm text-foreground-tertiary">
                        {event.current_seats}/{event.max_seats} участников •{" "}
                        {event.price.toLocaleString("ru-RU")} ₽
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge
                        status={event.status === "scheduled" ? "success" : "error"}
                      >
                        {event.status === "scheduled" ? "Активно" : "Отменено"}
                      </StatusBadge>
                      {event.status === "scheduled" && (
                        <GlassButton
                          size="sm"
                          variant="danger"
                          onClick={() => cancelEvent(event.id)}
                        >
                          ✕
                        </GlassButton>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
