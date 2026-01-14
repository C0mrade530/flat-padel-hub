import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GlassPill } from "@/components/ui/GlassPill";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/telegram";
import { useUser } from "@/contexts/UserContext";

interface LevelSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: string | null;
  onSelect: (level: string) => void;
}

const levels = ["D", "D+", "C", "C+", "B", "B+"];

export const LevelSelectModal = ({
  isOpen,
  onClose,
  currentLevel,
  onSelect,
}: LevelSelectModalProps) => {
  const { user } = useUser();

  const handleSelect = async (level: string) => {
    if (!user) return;

    haptic.selection();

    try {
      const { error } = await supabase
        .from("users")
        .update({ level })
        .eq("id", user.id);

      if (error) throw error;

      haptic.notification("success");
      toast({ title: "Уровень обновлён" });
      onSelect(level);
      onClose();
    } catch (error) {
      console.error("Update level error:", error);
      haptic.notification("error");
      toast({
        title: "Ошибка",
        description: "Не удалось обновить уровень",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-primary/10 max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-center">
            Выберите уровень
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-4">
          {levels.map((level, index) => (
            <motion.div
              key={level}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassPill
                active={currentLevel === level}
                onClick={() => handleSelect(level)}
                className="w-full justify-center py-3"
              >
                {level}
              </GlassPill>
            </motion.div>
          ))}
        </div>

        <p className="text-xs text-foreground-tertiary text-center">
          D — начинающий • C — средний • B — продвинутый
        </p>
      </DialogContent>
    </Dialog>
  );
};
