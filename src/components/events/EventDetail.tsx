import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Avatar } from "@/components/ui/GlassAvatar";
import { Calendar, Clock, MapPin, Users, X, Share2, Check } from "lucide-react";
import { haptic } from "@/lib/telegram";
import { useUser } from "@/contexts/UserContext";
import { useRegistration } from "@/hooks/useRegistration";
import { usePayment } from "@/hooks/usePayment";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { PaymentTimer } from "@/components/PaymentTimer";

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
  const { register, cancel, loading: registering } = useRegistration();
  const { handlePayment, loading: paymentLoading } = usePayment();
  
  const [registrationStatus, setRegistrationStatus] = useState<'confirmed' | 'waiting' | null>(null);
  const [queuePosition, setQueuePosition] = useState<number>(1);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | null>(null);
  const [paymentDeadline, setPaymentDeadline] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [acceptedOffer, setAcceptedOffer] = useState(false);
  
  // New states for confirmation and success sheets
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
  
  const availableSeats = event.maxSeats - event.currentSeats;
  const isFull = availableSeats === 0;
  const dragControls = useDragControls();

  const isRegistered = registrationStatus === 'confirmed';
  const isWaiting = registrationStatus === 'waiting';
  const isLoading = registering || paymentLoading;
  const needsPayment = isRegistered && event.price > 0 && paymentStatus !== 'paid';

  // Function to reload registration and payment status
  const reloadStatus = async () => {
    if (!user || !event) return;

    console.log('Reloading status for event:', event.id, 'user:', user.id);

    const { data: reg, error: regError } = await supabase
      .from('event_participants')
      .select('id, status, queue_position')
      .eq('event_id', event.id)
      .eq('user_id', user.id)
      .neq('status', 'canceled')
      .maybeSingle();

    console.log('Participant data:', reg, 'error:', regError);

    if (reg) {
      setRegistrationStatus(reg.status as 'confirmed' | 'waiting');
      setQueuePosition(reg.queue_position || 1);
      setParticipantId(reg.id);

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('id, status, payment_deadline, external_payment_id')
        .eq('participant_id', reg.id)
        .maybeSingle();

      console.log('Payment data:', payment, 'error:', paymentError);

      if (payment) {
        setPaymentStatus(payment.status as 'pending' | 'paid' | null);
        
        // Only set deadline if payment is pending and deadline exists
        if (payment.status === 'pending' && payment.payment_deadline) {
          console.log('Setting payment deadline:', payment.payment_deadline);
          setPaymentDeadline(payment.payment_deadline);
        } else {
          setPaymentDeadline(null);
        }
      } else {
        setPaymentStatus(null);
        setPaymentDeadline(null);
      }
    } else {
      setRegistrationStatus(null);
      setParticipantId(null);
      setPaymentStatus(null);
      setPaymentDeadline(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      reloadStatus();
    }
  }, [event, user, isOpen]);

  // Check payment status when returning from payment page
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('payment') === 'success' && isOpen && user) {
      window.history.replaceState({}, '', window.location.pathname);
      toast({ title: '⏳ Проверяем оплату...' });
      setTimeout(() => {
        checkPaymentManually();
      }, 2000);
    }
  }, [isOpen, user, event]);

  const checkPaymentManually = async () => {
    if (!user || !event) return;
    
    setCheckingPayment(true);
    console.log('Checking payment manually...');
    
    try {
      const { data: reg } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .neq('status', 'canceled')
        .maybeSingle();
      
      console.log('Found participant:', reg);
      
      if (!reg) {
        toast({ title: 'Запись не найдена', variant: 'destructive' });
        return;
      }
      
      const { data: payment } = await supabase
        .from('payments')
        .select('id, status, external_payment_id')
        .eq('participant_id', reg.id)
        .maybeSingle();
      
      console.log('Found payment:', payment);
      
      // If already paid in DB
      if (payment?.status === 'paid') {
        setPaymentStatus('paid');
        setPaymentDeadline(null);
        toast({ title: '✅ Оплата подтверждена!' });
        return;
      }
      
      // If has external payment ID - check with YooKassa
      if (payment?.external_payment_id) {
        console.log('Checking with YooKassa:', payment.external_payment_id);
        
        const { data: checkResult, error: checkError } = await supabase.functions.invoke('check-payment', {
          body: { payment_id: payment.external_payment_id }
        });
        
        console.log('YooKassa result:', checkResult, 'error:', checkError);
        
        if (checkResult?.status === 'succeeded' || checkResult?.paid === true) {
          // Update payment in DB
          const { error: updateError } = await supabase
            .from('payments')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', payment.id);
          
          console.log('Update payment result:', updateError);
          
          // Update UI
          setPaymentStatus('paid');
          setPaymentDeadline(null);
          toast({ title: '✅ Оплата подтверждена!' });
        } else {
          toast({ 
            title: 'Оплата ещё не получена', 
            description: `Статус: ${checkResult?.status || 'неизвестно'}`,
          });
        }
      } else {
        toast({ 
          title: 'Платёж не создан', 
          description: 'Нажмите "Оплатить" для создания платежа' 
        });
      }
    } catch (error: any) {
      console.error('Check payment error:', error);
      toast({ 
        title: 'Ошибка проверки', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setCheckingPayment(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString("ru-RU", { month: "long" });
    const weekday = date.toLocaleDateString("ru-RU", { weekday: "long" });
    return { day, month, weekday };
  };

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", { 
      day: "numeric", 
      month: "short"
    });
  };

  const { day, month, weekday } = formatDate(event.date);

  const handleClose = () => {
    haptic.impact("light");
    onClose();
  };

  // Show confirmation sheet instead of immediate registration
  const handleRegisterClick = () => {
    haptic.impact("light");
    setShowConfirmSheet(true);
  };

  // Confirm registration
  const confirmRegister = async () => {
    if (!event || !user) return;

    haptic.impact("medium");
    const success = await register(event.id, event.price);
    
    if (success) {
      await reloadStatus();
      setShowConfirmSheet(false);
      setShowSuccessSheet(true);
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
      setPaymentStatus(null);
      setPaymentDeadline(null);
      onEventsRefetch?.();
    }
  };

  // Handler for payment timer expiration
  const handlePaymentExpired = useCallback(async () => {
    toast({ 
      title: '⏰ Время истекло', 
      description: 'Ваша бронь отменена',
      variant: 'destructive' 
    });
    
    // Cancel registration
    if (event) {
      await cancel(event.id);
    }
    
    // Update state
    setRegistrationStatus(null);
    setParticipantId(null);
    setPaymentStatus(null);
    setPaymentDeadline(null);
    onEventsRefetch?.();
  }, [event, cancel, onEventsRefetch]);

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

  const handleShare = async () => {
    haptic.impact("light");
    const botUsername = 'FlatPadelBot';
    const shareUrl = `https://t.me/${botUsername}?startapp=event_${event.id}`;
    const { day, month } = formatDate(event.date);
    const shareText = `${eventTypeEmoji[event.type]} ${eventTypeLabel[event.type]}\n📅 ${day} ${month} в ${event.startTime}\n📍 ${event.location}\n💰 ${event.price.toLocaleString('ru-RU')} ₽`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Ссылка скопирована!', description: 'Отправьте её участнику' });
    } catch {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`);
      } else {
        toast({ title: 'Не удалось скопировать', variant: 'destructive' });
      }
    }
  };

  return (
    <>
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

                {/* Header Buttons */}
                <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-full glass hover:bg-primary/10 transition-colors"
                  >
                    <Share2 className="w-5 h-5 text-primary" />
                  </button>
                  <button
                    onClick={handleClose}
                    className="p-2 rounded-full glass hover:bg-primary/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Header */}
                <div className="px-6 pb-4 text-center flex-shrink-0">
                  <span className="text-5xl mb-2 block">{eventTypeEmoji[event.type]}</span>
                  <h2 className="text-2xl font-bold text-foreground uppercase tracking-wide">
                    {eventTypeLabel[event.type]}
                  </h2>
                  <p className="text-muted-foreground">Уровень: {event.level}</p>
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

                {/* Fixed Bottom CTA */}
                <div className="flex-shrink-0 p-4 pt-3 border-t border-white/10 bg-[#0a0f1a]">
                  {!isRegistered && !isWaiting ? (
                    <GlassButton
                      variant="primary"
                      fullWidth
                      size="lg"
                      onClick={handleRegisterClick}
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

                      {/* Payment completed status */}
                      {paymentStatus === 'paid' ? (
                        <div className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 rounded-xl p-4 text-center">
                          <div className="text-3xl mb-2">✅</div>
                          <p className="text-emerald-400 font-semibold text-lg">Оплачено</p>
                          <p className="text-muted-foreground text-sm mt-1">Участие подтверждено</p>
                        </div>
                      ) : event.price > 0 ? (
                        <div className="space-y-3">
                          {/* Payment Timer */}
                          {paymentDeadline && (
                            <PaymentTimer 
                              deadline={paymentDeadline} 
                              onExpired={handlePaymentExpired} 
                            />
                          )}

                          {/* Offer checkbox */}
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={acceptedOffer}
                              onChange={(e) => setAcceptedOffer(e.target.checked)}
                              className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 accent-emerald-500"
                            />
                            <span className="text-sm text-muted-foreground">
                              Принимаю условия{' '}
                              <a 
                                href="/offer" 
                                target="_blank" 
                                className="text-emerald-400 underline hover:text-emerald-300"
                                onClick={(e) => e.stopPropagation()}
                              >
                                публичной оферты
                              </a>
                            </span>
                          </label>

                          {/* Payment button */}
                          <GlassButton 
                            variant="primary" 
                            fullWidth 
                            size="lg" 
                            onClick={handlePayClick} 
                            loading={paymentLoading}
                            disabled={!acceptedOffer}
                            className={!acceptedOffer ? 'opacity-50 cursor-not-allowed' : ''}
                          >
                            💳 Оплатить • {event.price.toLocaleString('ru-RU')} ₽
                          </GlassButton>
                          
                          {/* Manual check link */}
                          <button 
                            onClick={checkPaymentManually}
                            className="text-xs text-muted-foreground underline w-full text-center py-1"
                            disabled={checkingPayment}
                          >
                            {checkingPayment ? 'Проверяем...' : 'Уже оплатили? Проверить статус'}
                          </button>
                        </div>
                      ) : (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                          <p className="text-emerald-400 font-medium">✅ Участие подтверждено</p>
                        </div>
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

      {/* Confirmation Sheet */}
      <Sheet open={showConfirmSheet} onOpenChange={setShowConfirmSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl bg-[#0a0f1a] border-t border-emerald-500/20">
          <div className="text-center py-6">
            <span className="text-5xl mb-4 block">{eventTypeEmoji[event.type]}</span>
            <h2 className="text-xl font-bold mb-2">Подтвердите запись</h2>
            <p className="text-muted-foreground mb-6">
              {eventTypeLabel[event.type]} • {formatDateShort(event.date)} в {event.startTime}
            </p>
            
            {/* Details */}
            <div className="bg-white/5 rounded-xl p-4 mb-6 text-left space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">📍 Локация</span>
                <span>{event.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">📊 Уровень</span>
                <span>{event.level || 'Любой'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">👥 Свободно мест</span>
                <span>{availableSeats} из {event.maxSeats}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-3">
                <span className="text-muted-foreground">💰 Стоимость</span>
                <span className="font-bold text-lg text-primary">{event.price.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
            
            {/* Offer checkbox */}
            <label className="flex items-start gap-3 text-left mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedOffer}
                onChange={(e) => setAcceptedOffer(e.target.checked)}
                className="mt-1 w-5 h-5 rounded accent-emerald-500"
              />
              <span className="text-sm text-muted-foreground">
                Принимаю условия <a href="/offer" target="_blank" className="text-primary underline">публичной оферты</a>
              </span>
            </label>
            
            <GlassButton 
              variant="primary" 
              fullWidth 
              size="lg"
              onClick={confirmRegister}
              disabled={!acceptedOffer}
              loading={registering}
              className={!acceptedOffer ? 'opacity-50' : ''}
            >
              {isFull ? 'Встать в очередь' : 'Подтвердить запись'}
            </GlassButton>
            
            <button 
              onClick={() => setShowConfirmSheet(false)}
              className="text-sm text-muted-foreground mt-4 w-full py-2"
            >
              Отмена
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Success Sheet */}
      <Sheet open={showSuccessSheet} onOpenChange={setShowSuccessSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl bg-[#0a0f1a] border-t border-emerald-500/20">
          <div className="text-center py-8">
            {/* Animated checkmark */}
            <motion.div 
              className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Check className="w-10 h-10 text-emerald-500" />
              </motion.div>
            </motion.div>
            
            <h2 className="text-2xl font-bold mb-2">Вы записаны! 🎉</h2>
            <p className="text-muted-foreground mb-6">
              {eventTypeLabel[event.type]} • {formatDateShort(event.date)} в {event.startTime}
            </p>
            
            {/* Payment reminder */}
            {event.price > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6 text-left">
                <p className="text-yellow-400 text-sm">
                  ⚠️ Не забудьте оплатить участие до начала события
                </p>
              </div>
            )}
            
            {/* Buttons */}
            {event.price > 0 && (
              <GlassButton 
                variant="primary" 
                fullWidth 
                size="lg"
                onClick={async () => {
                  setShowSuccessSheet(false);
                  // Wait for status to be updated
                  await reloadStatus();
                  if (participantId) {
                    handlePayClick();
                  }
                }}
                className="mb-3"
              >
                💳 Оплатить сейчас • {event.price.toLocaleString('ru-RU')} ₽
              </GlassButton>
            )}
            
            <GlassButton 
              variant="secondary" 
              fullWidth
              onClick={() => {
                setShowSuccessSheet(false);
                handleShare();
              }}
              className="mb-3"
            >
              📤 Пригласить друзей
            </GlassButton>
            
            <button 
              onClick={() => setShowSuccessSheet(false)}
              className="text-sm text-muted-foreground w-full py-2"
            >
              Закрыть
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export { EventDetail };
