import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/utils";

interface CreateEventSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const eventTypes = [
  { value: "training", label: "🎾 Тренировка" },
  { value: "tournament", label: "🏆 Турнир" },
  { value: "stretching", label: "🧘 Растяжка" },
  { value: "event", label: "📅 Другое" },
];

const eventTypeLabel: Record<string, string> = {
  training: "Тренировка",
  tournament: "Турнир",
  stretching: "Растяжка",
  event: "Событие",
  other: "Событие",
};

const levels = ["any", "D", "D+", "C", "C+", "B", "B+"];
const seatOptions = [4, 6, 8, 12, 16, 20];

export const CreateEventSheet = ({ isOpen, onClose, onCreated }: CreateEventSheetProps) => {
  const [form, setForm] = useState({
    title: "",
    event_type: "training",
    event_date: "",
    start_time: "18:00",
    end_time: "20:00",
    location: "Padel Arena Moscow",
    max_seats: 8,
    level: "any",
    price: 0,
    description: "",
  });
  const [loading, setLoading] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const defaultDate = tomorrow.toISOString().split("T")[0];

      setForm({
        title: "",
        event_type: "training",
        event_date: defaultDate,
        start_time: "18:00",
        end_time: "20:00",
        location: "Padel Arena Moscow",
        max_seats: 8,
        level: "any",
        price: 0,
        description: "",
      });
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!form.event_date) {
      toast({
        title: "Ошибка",
        description: "Выберите дату события",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    haptic.impact("light");

    try {
      const { error } = await supabase.from("events").insert({
        title: form.title || eventTypeLabel[form.event_type] || "Событие",
        event_date: form.event_date,
        location: form.location,
        max_seats: form.max_seats,
        current_seats: 0,
        level: form.level === "any" ? null : form.level,
        price: form.price,
        description: form.description || null,
        status: "scheduled",
      });

      if (error) throw error;

      haptic.notification("success");
      toast({ title: "Событие создано!" });
      onCreated();
      onClose();
    } catch (error: any) {
      console.error("Create event error:", error);
      haptic.notification("error");
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать событие",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] overflow-hidden bg-background border-t border-primary/10">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-foreground text-xl">Новое событие</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 overflow-y-auto pb-32 pr-2" style={{ maxHeight: "calc(90vh - 180px)" }}>
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary">Название</label>
            <GlassInput
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={eventTypeLabel[form.event_type] || "Название события"}
            />
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary">Тип</label>
            <div className="flex flex-wrap gap-2">
              {eventTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    haptic.selection();
                    setForm({ ...form, event_type: type.value });
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm transition-all",
                    form.event_type === type.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/5 hover:bg-white/10"
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary">Дата</label>
            <input
              type="date"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              min={new Date().toISOString().split("T")[0]}
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 focus:border-primary outline-none cursor-pointer"
              style={{ colorScheme: "dark" }}
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground-secondary">Начало</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-primary outline-none"
                style={{ colorScheme: "dark" }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground-secondary">Окончание</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-primary outline-none"
                style={{ colorScheme: "dark" }}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary">Место</label>
            <GlassInput
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Padel Arena Moscow"
            />
          </div>

          {/* Max Seats */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary">Макс. участников</label>
            <div className="flex gap-2 flex-wrap">
              {seatOptions.map((num) => (
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
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary">Уровень</label>
            <div className="flex flex-wrap gap-2">
              {levels.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    haptic.selection();
                    setForm({ ...form, level });
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm transition-all",
                    form.level === level
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/5 hover:bg-white/10"
                  )}
                >
                  {level === "any" ? "Любой" : level}
                </button>
              ))}
            </div>
          </div>

          {/* Price - Improved with input + quick buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary">Стоимость участия (₽)</label>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                value={form.price || ""}
                onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                placeholder="0"
                min="0"
                step="100"
                className="w-full p-4 pr-12 rounded-xl bg-white/5 border border-white/10 focus:border-primary outline-none text-xl font-bold"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">₽</span>
            </div>
            {/* Quick price buttons */}
            <div className="flex gap-2 flex-wrap">
              {[0, 1000, 2000, 3000, 5000].map((amount) => (
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
                  {amount === 0 ? "Бесплатно" : amount.toLocaleString("ru-RU")}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary">Описание</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Дополнительная информация..."
              rows={3}
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 focus:border-primary outline-none resize-none"
            />
          </div>
        </div>

        {/* Submit - Fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-white/10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassButton
              variant="primary"
              fullWidth
              size="lg"
              onClick={handleSubmit}
              loading={loading}
            >
              Создать событие
            </GlassButton>
          </motion.div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
