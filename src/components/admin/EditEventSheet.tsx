import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { GlassButton } from "@/components/ui/GlassButton";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/utils";

interface EventData {
  id: string;
  event_type?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  max_seats: number;
  level?: string;
  price: number;
  description?: string;
  status?: string;
}

interface EditEventSheetProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventData | null;
  onUpdated: () => void;
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

export const EditEventSheet = ({ isOpen, onClose, event, onUpdated }: EditEventSheetProps) => {
  const [form, setForm] = useState({
    event_type: "training",
    event_date: "",
    start_time: "18:00",
    end_time: "20:00",
    location: "",
    max_seats: 8,
    level: "any",
    price: 0,
    description: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event && isOpen) {
      // Parse date from event_date (could be timestamp or date string)
      let dateStr = "";
      if (event.event_date) {
        const date = new Date(event.event_date);
        dateStr = date.toISOString().split("T")[0];
      }
      
      setForm({
        event_type: event.event_type || "training",
        event_date: dateStr,
        start_time: event.start_time?.slice(0, 5) || "18:00",
        end_time: event.end_time?.slice(0, 5) || "20:00",
        location: event.location || "",
        max_seats: event.max_seats || 8,
        level: event.level || "any",
        price: event.price || 0,
        description: event.description || "",
      });
    }
  }, [event, isOpen]);

  const handleSave = async () => {
    if (!event) return;
    
    setSaving(true);
    haptic.impact("light");

    try {
      const { error } = await supabase
        .from("events")
        .update({
          event_date: form.event_date,
          location: form.location,
          max_seats: form.max_seats,
          level: form.level === "any" ? null : form.level,
          price: form.price,
          description: form.description || null,
        })
        .eq("id", event.id);

      if (error) throw error;

      haptic.notification("success");
      toast({ title: "✅ Событие обновлено!" });
      onUpdated();
      onClose();
    } catch (error: any) {
      console.error("Update event error:", error);
      haptic.notification("error");
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить событие",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] overflow-hidden bg-background border-t border-primary/10">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-foreground text-xl">Редактировать событие</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto pb-32 pr-2" style={{ maxHeight: "calc(90vh - 180px)" }}>
          {/* Event Type */}

          {/* Event Type */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Тип</label>
            <div className="flex gap-2 flex-wrap">
              {["training", "tournament", "stretching", "event"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    haptic.selection();
                    setForm({ ...form, event_type: type });
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm transition-all",
                    form.event_type === type
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/5 hover:bg-white/10"
                  )}
                >
                  {eventTypeEmoji[type]} {eventTypeLabel[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Дата</label>
            <input
              type="date"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary outline-none"
              style={{ colorScheme: "dark" }}
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Начало</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary outline-none"
                style={{ colorScheme: "dark" }}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Окончание</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary outline-none"
                style={{ colorScheme: "dark" }}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Локация</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="World Class Padel"
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary outline-none"
            />
          </div>

          {/* Max Seats */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Мест</label>
            <div className="flex gap-2 flex-wrap">
              {[4, 6, 8, 12, 16, 20].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    haptic.selection();
                    setForm({ ...form, max_seats: num });
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm transition-all",
                    form.max_seats === num
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/5 hover:bg-white/10"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Level */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Уровень</label>
            <div className="flex gap-2 flex-wrap">
              {["any", "D", "D+", "C", "C+", "B", "B+"].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    haptic.selection();
                    setForm({ ...form, level: lvl });
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm transition-all",
                    form.level === lvl
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/5 hover:bg-white/10"
                  )}
                >
                  {lvl === "any" ? "Любой" : lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Стоимость (₽)</label>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                value={form.price || ""}
                onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                placeholder="0"
                min="0"
                step="100"
                className="w-full p-3 pr-12 rounded-xl bg-white/5 border border-white/10 focus:border-primary outline-none text-lg font-semibold"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">₽</span>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {[1000, 2000, 3000, 5000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setForm({ ...form, price: amount })}
                  className={cn(
                    "px-3 py-1 rounded-lg text-sm transition-all",
                    form.price === amount
                      ? "bg-primary/20 text-primary border border-primary"
                      : "bg-white/5 hover:bg-white/10"
                  )}
                >
                  {amount.toLocaleString("ru-RU")}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Описание</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Описание события..."
              rows={3}
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary outline-none resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-white/10 space-y-2">
          <GlassButton
            variant="primary"
            fullWidth
            onClick={handleSave}
            loading={saving}
          >
            💾 Сохранить изменения
          </GlassButton>
          <GlassButton
            variant="ghost"
            fullWidth
            onClick={onClose}
          >
            Отмена
          </GlassButton>
        </div>
      </SheetContent>
    </Sheet>
  );
};
