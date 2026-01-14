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
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Avatar } from "@/components/ui/GlassAvatar";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

interface UserItem {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  level: string | null;
  role: string;
  membership_status: string;
  created_at: string;
}

interface UsersSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UsersSheet = ({ isOpen, onClose }: UsersSheetProps) => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers((data || []) as UserItem[]);
    } catch (error) {
      console.error("Load users error:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить пользователей",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const getMembershipLabel = (status: string) => {
    switch (status) {
      case "paid":
        return { label: "Активно", type: "success" as const };
      case "pause":
        return { label: "Пауза", type: "warning" as const };
      default:
        return { label: "Не оплачено", type: "error" as const };
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto bg-background border-t border-primary/10">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-foreground text-xl">
            Пользователи ({users.length})
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-5xl mb-4 block">👥</span>
            <p className="text-foreground-secondary">Нет пользователей</p>
          </div>
        ) : (
          <div className="space-y-2 pb-6">
            {users.map((user, index) => {
              const membership = getMembershipLabel(user.membership_status);
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <GlassCard className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={user.display_name}
                        src={user.avatar_url || undefined}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {user.display_name}
                        </p>
                        <p className="text-sm text-foreground-secondary truncate">
                          {user.username ? `@${user.username}` : "Без username"} •{" "}
                          {user.level || "—"}
                        </p>
                      </div>
                      <StatusBadge status={membership.type}>
                        {membership.label}
                      </StatusBadge>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
