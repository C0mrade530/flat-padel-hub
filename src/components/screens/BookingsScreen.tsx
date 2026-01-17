import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, Calendar, Loader2, MapPin, Share2, Info, X, Check } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Clock, Timer } from "lucide-react";
import { useBookings, TransformedBooking } from "@/hooks/useBookings";
import { usePayment } from "@/hooks/usePayment";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/utils";
import { BookingCardSkeleton } from "@/components/ui/skeleton";

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

interface ExtendedBooking extends TransformedBooking {
  eventId?: string;
  participantId?: string;
  paymentStatus?: 'pending' | 'paid' | null;
}

const BookingsScreen = () => {
  const { user } = useUser();
  const { confirmed, waiting, history, loading, error, refetch } = useBookings();
  const { handlePayment, loading: paymentLoading } = usePayment();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const upcomingBookings = [...confirmed, ...waiting];
  const pastBookings = history;

  // Count unpaid bookings
  const unpaidBookings = confirmed.filter(b => b.price > 0);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", { 
      day: "numeric", 
      month: "short",
      weekday: "short"
    });
  };

  const handlePayBooking = async (booking: TransformedBooking) => {
    if (!user) return;
    
    haptic.impact("medium");
    
    // Get participant ID for this booking
    const { data: participant } = await supabase
      .from('event_participants')
      .select('id, event_id')
      .eq('id', booking.id)
      .maybeSingle();
    
    if (participant) {
      await handlePayment(
        participant.event_id,
        participant.id,
        user.id,
        booking.price,
        eventTypeLabel[booking.type]
      );
    }
  };

  const handleCancelBooking = async (booking: TransformedBooking) => {
    if (!user) return;
    
    const confirmed = window.confirm('Вы уверены, что хотите отменить запись?');
    if (!confirmed) return;
    
    haptic.impact("medium");
    setCancelingId(booking.id);
    
    try {
      const { error } = await supabase
        .from('event_participants')
        .update({ status: 'canceled', canceled_at: new Date().toISOString() })
        .eq('id', booking.id);
      
      if (error) throw error;
      
      toast({ title: '✅ Запись отменена' });
      refetch();
    } catch (err) {
      toast({ title: 'Ошибка отмены', variant: 'destructive' });
    } finally {
      setCancelingId(null);
    }
  };

  const handleShare = async (booking: TransformedBooking) => {
    haptic.impact("light");
    const botUsername = 'FlatPadelBot';
    const shareText = `${eventTypeEmoji[booking.type]} ${eventTypeLabel[booking.type]}\n📅 ${formatDate(booking.date)} в ${booking.startTime}\n📍 ${booking.location}`;

    try {
      await navigator.clipboard.writeText(shareText);
      toast({ title: 'Скопировано!' });
    } catch {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        tg.openTelegramLink(`https://t.me/share/url?text=${encodeURIComponent(shareText)}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-24 px-4 pt-safe-top">
        <div className="pt-8 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              Мои записи
            </h1>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <BookingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const renderBookingCard = (booking: TransformedBooking, index: number, isWaiting: boolean = false) => (
    <motion.div
      key={booking.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
    >
      <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{eventTypeEmoji[booking.type]}</span>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{eventTypeLabel[booking.type]}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatDate(booking.date)} • {booking.startTime}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {booking.location}
                </p>
              </div>
              
              {/* Status badge */}
              {isWaiting ? (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  #{booking.position}
                </span>
              ) : booking.price > 0 ? (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
                  ⏳ К оплате
                </span>
              ) : (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Бесплатно
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
          {!isWaiting && booking.price > 0 && (
            <GlassButton 
              variant="primary" 
              size="sm" 
              className="flex-1"
              onClick={() => handlePayBooking(booking)}
              loading={paymentLoading}
            >
              💳 Оплатить • {booking.price.toLocaleString('ru-RU')} ₽
            </GlassButton>
          )}
          
          <GlassButton 
            variant="ghost" 
            size="sm"
            onClick={() => handleShare(booking)}
          >
            <Share2 className="w-4 h-4" />
          </GlassButton>
          
          <GlassButton 
            variant="ghost" 
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => handleCancelBooking(booking)}
            loading={cancelingId === booking.id}
          >
            <X className="w-4 h-4" />
          </GlassButton>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen pb-24 px-4 pt-safe-top">
      {/* Header */}
      <motion.header
        className="pt-8 mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <ClipboardList className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Мои записи
          </h1>
        </div>
        <p className="text-muted-foreground">
          {upcomingBookings.length} активных
        </p>
      </motion.header>

      {/* Unpaid bookings banner */}
      {unpaidBookings.length > 0 && activeTab === 'upcoming' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4 mb-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="font-medium text-yellow-400">
                {unpaidBookings.length} {unpaidBookings.length === 1 ? 'запись ожидает' : 'записи ожидают'} оплаты
              </p>
              <p className="text-sm text-muted-foreground">
                Оплатите до начала события
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div
        className="flex gap-2 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <button
          onClick={() => setActiveTab('upcoming')}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2",
            activeTab === 'upcoming' 
              ? "bg-primary text-primary-foreground" 
              : "bg-white/5 text-foreground"
          )}
        >
          Предстоящие
          {upcomingBookings.length > 0 && (
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs",
              activeTab === 'upcoming' ? "bg-black/20" : "bg-primary/20 text-primary"
            )}>
              {upcomingBookings.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-medium transition-all",
            activeTab === 'past' 
              ? "bg-primary text-primary-foreground" 
              : "bg-white/5 text-foreground"
          )}
        >
          Прошедшие
        </button>
      </motion.div>

      {/* Error state */}
      {error && (
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{error}</p>
          <button onClick={refetch} className="text-primary underline">
            Попробовать снова
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'upcoming' ? (
          <motion.div
            key="upcoming"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Confirmed section */}
            {confirmed.length > 0 && (
              <div className="mb-6">
                <motion.div
                  className="flex items-center gap-4 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                  <span className="text-xs font-medium text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <Check className="w-3 h-3" />
                    Подтверждённые
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                </motion.div>

                <div className="space-y-4">
                  {confirmed.map((booking, index) => renderBookingCard(booking, index, false))}
                </div>
              </div>
            )}

            {/* Waiting section */}
            {waiting.length > 0 && (
              <div className="mb-6">
                <motion.div
                  className="flex items-center gap-4 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
                  <span className="text-xs font-medium text-yellow-400 uppercase tracking-widest flex items-center gap-2">
                    <Timer className="w-3 h-3" />
                    В очереди
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
                </motion.div>

                <div className="space-y-4">
                  {waiting.map((booking, index) => renderBookingCard(booking, index, true))}
                </div>
              </div>
            )}

            {/* Empty state for upcoming */}
            {upcomingBookings.length === 0 && !error && (
              <motion.div
                className="flex flex-col items-center justify-center py-16"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <span className="text-6xl mb-4">📅</span>
                <h3 className="text-lg font-semibold mb-2">
                  Нет записей
                </h3>
                <p className="text-muted-foreground text-center mb-6 max-w-xs">
                  Вы ещё не записались ни на одно событие. Самое время найти игру!
                </p>
                <GlassButton variant="primary" size="md">
                  🎾 Найти игру
                </GlassButton>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="past"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {pastBookings.length > 0 ? (
              <div className="space-y-4">
                {pastBookings.map((booking, index) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    <GlassCard className="p-4 opacity-70">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted/10 text-xl">
                          {eventTypeEmoji[booking.type] || '📅'}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">
                            {eventTypeLabel[booking.type] || 'Событие'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(booking.date)} • {booking.startTime}
                          </p>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <span className="text-6xl mb-4">📜</span>
                <h3 className="text-lg font-semibold mb-2">
                  История пуста
                </h3>
                <p className="text-muted-foreground text-center mb-6">
                  Здесь появятся ваши прошедшие события
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { BookingsScreen };
