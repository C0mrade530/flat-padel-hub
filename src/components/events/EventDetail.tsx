import { useState, useEffect } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Avatar } from "@/components/ui/GlassAvatar";
import { Calendar, Clock, MapPin, Users, X } from "lucide-react";
import { haptic } from "@/lib/telegram";
import { useUser } from "@/contexts/UserContext";
import { useRegistration } from "@/hooks/useRegistration";
import { usePayment } from "@/hooks/usePayment";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

interface EventDetailProps {
  event: {
    id: string;
    type: "training" | "tournament" | "stretching" | "other";
    title: string;
    level: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    maxSeats: number;
    currentSeats: number;
    price: number;
    description?: string;
    participants?: { id: string; name: string; avatar?: string }[];
  };
  isOpen: boolean;
  onClose: () => void;
  onEventsRefetch?: () => void;
}

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

const EventDetail = ({ 
  event, 
  isOpen, 
  onClose, 
  onEventsRefetch,
}: EventDetailProps) => {
  const { user } = useUser();
  const { register, cancel, checkRegistration, loading: registering } = useRegistration();
  const { handlePayment, loading: paymentLoading } = usePayment();
  
  const [registrationStatus, setRegistrationStatus] = useState<'confirmed' | 'waiting' | null>(null);
  const [queuePosition, setQueuePosition] = useState<number>(1);
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  
  const availableSeats = event.maxSeats - event.currentSeats;
  const isFull = availableSeats === 0;
  const dragControls = useDragControls();

  const isRegistered = registrationStatus === 'confirmed';
  const isWaiting = registrationStatus === 'waiting';
  const isLoading = registering || paymentLoading;

  // Check registration status when event is opened
  useEffect(() => {
    const checkStatus = async () => {
      if (!user || !event || !isOpen) return;

      // Check registration
      const { data: reg } = await supabase
        .from('event_participants')
        .select('id, status, queue_position')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .neq('status', 'canceled')
        .maybeSingle();

      if (reg) {
        setRegistrationStatus(reg.status as 'confirmed' | 'waiting');
        setQueuePosition(reg.queue_position || 1);
        setParticipantId(reg.id);

        // Check pending payment
        const { data: payment } = await supabase
          .from('payments')
          .select('*')
          .eq('participant_id', reg.id)
          .eq('status', 'pending')
          .maybeSingle();

        setPendingPayment(payment);
      } else {
        setRegistrationStatus(null);
        setParticipantId(null);
        setPendingPayment(null);
      }
    };

    checkStatus();
  }, [event, user, isOpen]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString("ru-RU", { month: "long" });
    const weekday = date.toLocaleDateString("ru-RU", { weekday: "long" });
    return { day, month, weekday };
  };

  const { day, month, weekday } = formatDate(event.date);

  const handleClose = () => {
    haptic.impact("light");
    onClose();
  };

  const handleRegister = async () => {
    if (!event || !user) return;

    haptic.impact("medium");
    const success = await register(event.id, event.price);
    
    if (success) {
      // Reload status
      const status = await checkRegistration(event.id);
      setRegistrationStatus(status);

      toast({
        title: status === 'confirmed' ? 'Записано!' : 'В очереди',
        description: status === 'confirmed'
          ? 'Вы успешно записаны на событие'
          : 'Вы добавлены в очередь',
      });

      haptic.notification("success");
      onEventsRefetch?.();
    }
  };

  const handleCancel = async () => {
    if (!event) return;

    haptic.impact("medium");
    const success = await cancel(event.id);
    
    if (success) {
      setRegistrationStatus(null);
      setParticipantId(null);
      setPendingPayment(null);
      onEventsRefetch?.();
    }
  };

  const handlePayClick = async () => {
    if (!participantId || !user) return;

    haptic.impact("medium");
    await handlePayment(
      event.id,
      participantId,
      user.id,
      event.price,
      event.title
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 h-[80vh] flex flex-col"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) {
                handleClose();
              }
            }}
          >
            <div className="bg-[#0a0f1a] rounded-t-[28px] border-t border-emerald-500/20 flex flex-col h-full overflow-hidden">
              {/* Drag Handle */}
              <div 
                className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing flex-shrink-0"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div className="w-12 h-1.5 rounded-full bg-white/20" />
              </div>

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-full glass hover:bg-primary/10 transition-colors z-10"
              >
                <X className="w-5 h-5 text-foreground-secondary" />
              </button>

              {/* Header */}
              <div className="px-6 pb-4 text-center flex-shrink-0">
                <span className="text-5xl mb-2 block">{eventTypeEmoji[event.type]}</span>
                <h2 className="text-2xl font-bold text-foreground uppercase tracking-wide">
                  {eventTypeLabel[event.type]}
                </h2>
                <p className="text-foreground-secondary">Уровень: {event.level}</p>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 space-y-4">
                {/* Event Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <GlassCard className="p-4 text-center" hover={false}>
                    <Calendar className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <p className="font-semibold text-lg text-foreground">{day} {month}</p>
                    <p className="text-sm text-muted-foreground capitalize">{weekday}</p>
                  </GlassCard>

                  <GlassCard className="p-4 text-center" hover={false}>
                    <Clock className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <p className="font-semibold text-lg text-foreground">{event.startTime}</p>
                    <p className="text-sm text-muted-foreground">2 часа</p>
                  </GlassCard>

                  <GlassCard className="p-4 text-center" hover={false}>
                    <MapPin className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <p className="font-semibold text-foreground">{event.location.split(" ")[0]}</p>
                    <p className="text-sm text-muted-foreground">{event.location.split(" ").slice(1).join(" ") || "Moscow"}</p>
                  </GlassCard>

                  <GlassCard className="p-4 text-center" hover={false}>
                    <Users className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <p className="font-semibold text-lg text-foreground">{event.currentSeats} / {event.maxSeats}</p>
                    <p className="text-sm text-emerald-400">{availableSeats} мест свободно</p>
                  </GlassCard>
                </div>

                {/* Price Display */}
                {event.price > 0 && (
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
                    <span className="text-muted-foreground font-medium">Стоимость</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                      {event.price.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                )}

                {/* Participants */}
                {event.participants && event.participants.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Участники</h3>
                    <GlassCard className="p-4" hover={false}>
                      <div className="flex items-center">
                        <div className="flex -space-x-2">
                          {event.participants.slice(0, 6).map((p) => (
                            <Avatar key={p.id} name={p.name} src={p.avatar} size="md" />
                          ))}
                        </div>
                        {event.participants.length > 6 && (
                          <span className="ml-3 text-sm text-muted-foreground">+{event.participants.length - 6}</span>
                        )}
                      </div>
                    </GlassCard>
                  </div>
                )}

                {/* Description */}
                {event.description && (
                  <div className="pb-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Описание</h3>
                    <p className="text-muted-foreground leading-relaxed">{event.description}</p>
                  </div>
                )}
              </div>

              {/* Fixed Bottom CTA - always visible, above everything */}
              <div className="flex-shrink-0 p-4 pt-3 border-t border-white/10 bg-[#0a0f1a]">
                {!isRegistered && !isWaiting ? (
                  <GlassButton
                    variant="primary"
                    fullWidth
                    size="lg"
                    onClick={handleRegister}
                    loading={isLoading}
                  >
                    {isLoading ? 'Записываем...' : isFull ? 'Встать в очередь' : `Записаться • ${event.price.toLocaleString('ru-RU')} ₽`}
                  </GlassButton>
                ) : isRegistered ? (
                  <div className="space-y-3">
                    {/* Registered status */}
                    <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-emerald-400 font-semibold">Вы записаны</span>
                      </div>
                    </div>

                    {pendingPayment && (
                      <GlassButton variant="primary" fullWidth size="lg" onClick={handlePayClick} loading={paymentLoading}>
                        💳 Оплатить • {event.price.toLocaleString('ru-RU')} ₽
                      </GlassButton>
                    )}

                    <GlassButton variant="ghost" fullWidth onClick={handleCancel} loading={isLoading}>
                      <span className="text-red-400">Отменить запись</span>
                    </GlassButton>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Queue status */}
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
                      <span className="text-yellow-400">⏳ Вы #{queuePosition} в очереди</span>
                    </div>
                    <GlassButton variant="ghost" fullWidth onClick={handleCancel} loading={isLoading}>
                      <span className="text-red-400">Покинуть очередь</span>
                    </GlassButton>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export { EventDetail };
