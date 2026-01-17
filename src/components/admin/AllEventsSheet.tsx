import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Pencil, Copy, X, RotateCcw, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EditEventSheet } from "./EditEventSheet";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/utils";

interface EventItem {
  id: string;
  title: string;
  event_type?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  max_seats: number;
  current_seats: number;
  price: number;
  level?: string;
  description?: string;
  status?: string;
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
  event: "📅",
};

const eventTypeLabel: Record<string, string> = {
  training: "Тренировка",
  tournament: "Турнир",
  stretching: "Растяжка",
  other: "Событие",
  event: "Событие",
};

export const AllEventsSheet = ({ isOpen, onClose }: AllEventsSheetProps) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState<"all" | "active" | "canceled">("active");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // Edit sheet
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: sortOrder === "asc" })
        .limit(100);

      if (eventFilter === "active") {
        query = query.in("status", ["scheduled", "published"]);
      } else if (eventFilter === "canceled") {
        query = query.eq("status", "canceled");
      }

      const { data, error } = await query;

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
  }, [isOpen, eventFilter, sortOrder]);

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

  const restoreEvent = async (eventId: string) => {
    haptic.impact("medium");
    
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: "scheduled" })
        .eq("id", eventId);

      if (error) throw error;

      haptic.notification("success");
      toast({ title: "Событие восстановлено" });
      loadEvents();
    } catch (error) {
      console.error("Restore event error:", error);
      haptic.notification("error");
      toast({
        title: "Ошибка",
        description: "Не удалось восстановить событие",
        variant: "destructive",
      });
    }
  };

  const duplicateEvent = async (event: EventItem) => {
    haptic.impact("medium");
    
    try {
      const { id, current_seats, status, ...eventData } = event;
      
      const { error } = await supabase
        .from("events")
        .insert({
          ...eventData,
          current_seats: 0,
          status: "scheduled",
        });

      if (error) throw error;

      haptic.notification("success");
      toast({ title: "✅ Событие скопировано!" });
      loadEvents();
    } catch (error) {
      console.error("Duplicate event error:", error);
      haptic.notification("error");
      toast({
        title: "Ошибка копирования",
        variant: "destructive",
      });
    }
  };

  const handleDeletePastEvents = async () => {
    const today = new Date().toISOString().split("T")[0];
    
    // Count past events
    const { count } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .lt("event_date", today);

    if (!count || count === 0) {
      toast({ title: "Нет прошедших событий" });
      return;
    }

    const confirmed = window.confirm(
      `Удалить ${count} прошедших событий? Это действие нельзя отменить.`
    );

    if (!confirmed) return;

    haptic.impact("heavy");

    try {
      // Get past event IDs
      const { data: pastEvents } = await supabase
        .from("events")
        .select("id")
        .lt("event_date", today);

      const eventIds = pastEvents?.map((e) => e.id) || [];

      if (eventIds.length > 0) {
        // Delete payments
        await supabase
          .from("payments")
          .delete()
          .in("event_id", eventIds);

        // Delete participants
        await supabase
          .from("event_participants")
          .delete()
          .in("event_id", eventIds);

        // Delete events
        await supabase
          .from("events")
          .delete()
          .in("id", eventIds);
      }

      haptic.notification("success");
      toast({ title: `✅ Удалено ${count} событий` });
      loadEvents();
    } catch (error: any) {
      console.error("Delete past events error:", error);
      haptic.notification("error");
      toast({ title: "Ошибка удаления", variant: "destructive" });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      weekday: "short",
    });
  };

  const handleEdit = (event: EventItem) => {
    setEditingEvent(event);
    setIsEditOpen(true);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto bg-background border-t border-primary/10">
          <SheetHeader className="mb-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-foreground text-xl">
                Все события ({events.length})
              </SheetTitle>
              <button
                onClick={handleDeletePastEvents}
                className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg hover:bg-destructive/20 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Удалить прошедшие
              </button>
            </div>
          </SheetHeader>

          {/* Filters */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { key: "active", label: "Активные" },
              { key: "canceled", label: "Отменённые" },
              { key: "all", label: "Все" },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setEventFilter(filter.key as any)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm transition-all",
                  eventFilter === filter.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/5 hover:bg-white/10"
                )}
              >
                {filter.label}
              </button>
            ))}
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-4 py-2 rounded-xl text-sm bg-white/5 hover:bg-white/10 transition-all ml-auto"
            >
              {sortOrder === "asc" ? "↑ Дата" : "↓ Дата"}
            </button>
          </div>

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
                          {eventTypeEmoji[event.event_type || "other"] || "📅"}{" "}
                          {event.title || eventTypeLabel[event.event_type || "other"] || "Событие"}
                        </p>
                        <p className="text-sm text-foreground-secondary">
                          {formatDate(event.event_date)} • {event.start_time?.slice(0, 5) || "—"}
                        </p>
                        <p className="text-sm text-foreground-tertiary">
                          {event.current_seats}/{event.max_seats} участников •{" "}
                          {event.price?.toLocaleString("ru-RU") || 0} ₽
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StatusBadge
                          status={event.status === "scheduled" || event.status === "published" ? "success" : "error"}
                        >
                          {event.status === "scheduled" || event.status === "published" ? "Активно" : "Отменено"}
                        </StatusBadge>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(event);
                            }}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Редактировать"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateEvent(event);
                            }}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Дублировать"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          {event.status === "scheduled" || event.status === "published" ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelEvent(event.id);
                              }}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              title="Отменить"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                restoreEvent(event.id);
                              }}
                              className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="Восстановить"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Event Sheet */}
      <EditEventSheet
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingEvent(null);
        }}
        event={editingEvent}
        onUpdated={loadEvents}
      />
    </>
  );
};
