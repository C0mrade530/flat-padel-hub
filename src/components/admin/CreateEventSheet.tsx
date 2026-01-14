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
import { GlassPill } from "@/components/ui/GlassPill";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/telegram";

interface CreateEventSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const eventTypes = [
  { value: "training", label: "🎾 Тренировка" },
  { value: "tournament", label: "🏆 Турнир" },
  { value: "stretching", label: "🧘 Растяжка" },
  { value: "other", label: "📅 Другое" },
];

const levels = ["any", "D", "D+", "C", "C+", "B", "B+"];
const seatOptions = [4, 6, 8, 12, 16];

export const CreateEventSheet = ({ isOpen, onClose, onCreated }: CreateEventSheetProps) => {
  const [form, setForm] = useState({
    event_type: "training",
    event_date: "",
    start_time: "18:00",
    end_time: "20:00",
    location: "Padel Arena Moscow",
    max_seats: 8,
    level: "any",
    price: 2500,
    description: "",
  });
  const [loading, setLoading] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setForm({
        event_type: "training",
        event_date: "",
        start_time: "18:00",
        end_time: "20:00",
        location: "Padel Arena Moscow",
        max_seats: 8,
        level: "any",
        price: 2500,
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
        event_type: form.event_type,
        event_date: form.event_date,
        start_time: form.start_time,
        end_time: form.end_time,
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
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto bg-background border-t border-primary/10">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-foreground text-xl">Новое событие</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {/* Event Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary">Тип</label>
            <div className="flex flex-wrap gap-2">
              {eventTypes.map((type) => (
                <GlassPill
                  key={type.value}
                  active={form.event_type === type.value}
                  onClick={() => {
                    haptic.selection();
                    setForm({ ...form, event_type: type.value });
                  }}
                >
                  {type.label}
                </GlassPill>
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
              className="w-full h-12 px-4 rounded-xl glass border border-primary/10 bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                className="w-full h-12 px-4 rounded-xl glass border border-primary/10 bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground-secondary">Окончание</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full h-12 px-4 rounded-xl glass border border-primary/10 bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
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
            <div className="flex gap-2">
              {seatOptions.map((num) => (
                <GlassPill
                  key={num}
                  active={form.max_seats === num}
                  onClick={() => {
                    haptic.selection();
                    setForm({ ...form, max_seats: num });
                  }}
                >
                  {num}
                </GlassPill>
              ))}
            </div>
          </div>

          {/* Level */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary">Уровень</label>
            <div className="flex flex-wrap gap-2">
              {levels.map((level) => (
                <GlassPill
                  key={level}
                  active={form.level === level}
                  onClick={() => {
                    haptic.selection();
                    setForm({ ...form, level });
                  }}
                >
                  {level === "any" ? "Любой" : level}
                </GlassPill>
              ))}
            </div>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary">Цена (₽)</label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
              min={0}
              step={100}
              className="w-full h-12 px-4 rounded-xl glass border border-primary/10 bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary">Описание</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Дополнительная информация..."
              rows={3}
              className="w-full p-4 rounded-xl glass border border-primary/10 bg-transparent text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Submit */}
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
