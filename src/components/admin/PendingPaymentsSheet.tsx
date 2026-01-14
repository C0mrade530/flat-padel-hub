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
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/telegram";

interface PendingPayment {
  id: string;
  amount: number;
  created_at: string;
  users: {
    display_name: string;
    username: string | null;
  } | null;
  events: {
    event_type: string;
    event_date: string;
    start_time: string;
  } | null;
}


interface PendingPaymentsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const eventTypeEmoji: Record<string, string> = {
  training: "🎾",
  tournament: "🏆",
  stretching: "🧘",
  other: "📅",
};

export const PendingPaymentsSheet = ({ isOpen, onClose }: PendingPaymentsSheetProps) => {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          id,
          amount,
          created_at,
          users (display_name, username),
          events (event_type, event_date, start_time)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Transform the data to match our interface
      const transformed = (data || []).map((item: any) => ({
        ...item,
        users: Array.isArray(item.users) ? item.users[0] : item.users,
        events: Array.isArray(item.events) ? item.events[0] : item.events,
      }));
      setPayments(transformed as PendingPayment[]);
    } catch (error) {
      console.error("Load payments error:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить платежи",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPayments();
    }
  }, [isOpen]);

  const markAsPaid = async (paymentId: string) => {
    haptic.impact("light");
    
    try {
      const { error } = await supabase
        .from("payments")
        .update({ status: "paid" })
        .eq("id", paymentId);

      if (error) throw error;

      haptic.notification("success");
      toast({ title: "Отмечено как оплаченное" });
      loadPayments();
    } catch (error) {
      console.error("Mark as paid error:", error);
      haptic.notification("error");
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] overflow-y-auto bg-background border-t border-primary/10">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-foreground text-xl">
            Ожидают оплаты ({payments.length})
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-5xl mb-4 block">🎉</span>
            <p className="text-foreground-secondary">Все оплачено!</p>
          </div>
        ) : (
          <div className="space-y-3 pb-6">
            {payments.map((payment, index) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {payment.users?.display_name || "Неизвестный"}
                      </p>
                      <p className="text-sm text-foreground-secondary">
                        {payment.events && (
                          <>
                            {eventTypeEmoji[payment.events.event_type] || "📅"}{" "}
                            {formatDate(payment.events.event_date)} •{" "}
                          </>
                        )}
                        {payment.amount.toLocaleString("ru-RU")} ₽
                      </p>
                    </div>
                    <GlassButton
                      size="sm"
                      variant="primary"
                      onClick={() => markAsPaid(payment.id)}
                    >
                      ✓ Оплачено
                    </GlassButton>
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
