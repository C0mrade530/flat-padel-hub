import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GlassButton } from "@/components/ui/GlassButton";
import { haptic } from "@/lib/telegram";
import { toast } from "@/hooks/use-toast";

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const days = [
  { id: "mon", label: "Пн" },
  { id: "tue", label: "Вт" },
  { id: "wed", label: "Ср" },
  { id: "thu", label: "Чт" },
  { id: "fri", label: "Пт" },
  { id: "sat", label: "Сб" },
  { id: "sun", label: "Вс" },
];

const timeSlots = [
  { id: "morning", label: "Утро", time: "6:00 — 12:00" },
  { id: "afternoon", label: "День", time: "12:00 — 18:00" },
  { id: "evening", label: "Вечер", time: "18:00 — 23:00" },
];

export const PreferencesModal = ({ isOpen, onClose }: PreferencesModalProps) => {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);

  // Load from localStorage
  useEffect(() => {
    if (isOpen) {
      const savedDays = localStorage.getItem("flat_preferred_days");
      const savedTimes = localStorage.getItem("flat_preferred_times");
      if (savedDays) setSelectedDays(JSON.parse(savedDays));
      if (savedTimes) setSelectedTimes(JSON.parse(savedTimes));
    }
  }, [isOpen]);

  const toggleDay = (dayId: string) => {
    haptic.selection();
    setSelectedDays((prev) =>
      prev.includes(dayId)
        ? prev.filter((d) => d !== dayId)
        : [...prev, dayId]
    );
  };

  const toggleTime = (timeId: string) => {
    haptic.selection();
    setSelectedTimes((prev) =>
      prev.includes(timeId)
        ? prev.filter((t) => t !== timeId)
        : [...prev, timeId]
    );
  };

  const handleSave = () => {
    localStorage.setItem("flat_preferred_days", JSON.stringify(selectedDays));
    localStorage.setItem("flat_preferred_times", JSON.stringify(selectedTimes));
    haptic.notification("success");
    toast({ title: "Предпочтения сохранены" });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-primary/10 max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-center">
            Предпочтения
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Days */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground-secondary">
              Предпочитаемые дни
            </label>
            <div className="flex gap-2 flex-wrap">
              {days.map((day, index) => (
                <motion.button
                  key={day.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => toggleDay(day.id)}
                  className={`
                    w-10 h-10 rounded-xl text-sm font-medium transition-all
                    ${
                      selectedDays.includes(day.id)
                        ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground"
                        : "glass border border-primary/10 text-foreground-secondary hover:bg-primary/10"
                    }
                  `}
                >
                  {day.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Time slots */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground-secondary">
              Предпочитаемое время
            </label>
            <div className="space-y-2">
              {timeSlots.map((slot, index) => (
                <motion.button
                  key={slot.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => toggleTime(slot.id)}
                  className={`
                    w-full p-3 rounded-xl text-left transition-all
                    ${
                      selectedTimes.includes(slot.id)
                        ? "bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30"
                        : "glass border border-primary/10 hover:bg-primary/5"
                    }
                  `}
                >
                  <div className="font-medium text-foreground">{slot.label}</div>
                  <div className="text-sm text-foreground-secondary">{slot.time}</div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <GlassButton variant="primary" fullWidth onClick={handleSave}>
          Сохранить
        </GlassButton>
      </DialogContent>
    </Dialog>
  );
};
