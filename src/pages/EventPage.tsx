import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { useRegistration } from '@/hooks/useRegistration';
import { usePayment } from '@/hooks/usePayment';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Avatar } from '@/components/ui/GlassAvatar';
import { Calendar, Clock, MapPin, Users, Share2, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { haptic } from '@/lib/telegram';

interface EventData {
  id: string;
  title: string;
  emoji: string;
  description: string | null;
  event_date: string;
  duration_minutes: number;
  location: string | null;
  city: string;
  level: string;
  max_seats: number;
  current_seats: number;
  price: number;
  status: string;
}

const EventPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const { register, cancel, loading: registering } = useRegistration();
  const { handlePayment, loading: paymentLoading } = usePayment();

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [registrationStatus, setRegistrationStatus] = useState<'confirmed' | 'waiting' | null>(null);
  const [queuePosition, setQueuePosition] = useState<number>(1);
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);

  const isRegistered = registrationStatus === 'confirmed';
  const isWaiting = registrationStatus === 'waiting';
  const isLoading = registering || paymentLoading;

  useEffect(() => {
    if (!eventId) {
      navigate('/');
      return;
    }
    loadEvent();
  }, [eventId, user]);

  const loadEvent = async () => {
    if (!eventId) return;
    
    setLoading(true);
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error || !data) {
      console.error('Event not found:', error);
      toast({ title: 'Событие не найдено', variant: 'destructive' });
      navigate('/');
      return;
    }

    setEvent(data as EventData);

    // Check registration if user is loaded
    if (user) {
      const { data: reg } = await supabase
        .from('event_participants')
        .select('id, status, queue_position')
        .eq('event_id', eventId)
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
    }

    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString('ru-RU', { month: 'long' });
    const weekday = date.toLocaleDateString('ru-RU', { weekday: 'long' });
    const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return { day, month, weekday, time };
  };

  const handleRegister = async () => {
    if (!event || !user) return;

    haptic.impact('medium');
    const success = await register(event.id, event.price);

    if (success) {
      await loadEvent(); // Reload to get updated status
      haptic.notification('success');
    }
  };

  const handleCancel = async () => {
    if (!event) return;

    haptic.impact('medium');
    const success = await cancel(event.id);

    if (success) {
      setRegistrationStatus(null);
      setParticipantId(null);
      setPendingPayment(null);
    }
  };

  const handlePayClick = async () => {
    if (!participantId || !user || !event) return;

    haptic.impact('medium');
    await handlePayment(
      event.id,
      participantId,
      user.id,
      event.price,
      event.title
    );
  };

  const handleShare = async () => {
    if (!event) return;

    haptic.impact('light');
    const botUsername = 'FlatPadelBot'; // Replace with your bot username
    const shareUrl = `https://t.me/${botUsername}?startapp=event_${event.id}`;
    const { day, month, time } = formatDate(event.event_date);
    const shareText = `${event.emoji} ${event.title}\n📅 ${day} ${month} в ${time}\n📍 ${event.location || event.city}\n💰 ${event.price.toLocaleString('ru-RU')} ₽`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Ссылка скопирована!', description: 'Отправьте её участнику' });
    } catch {
      // Fallback for mobile
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`);
      } else {
        toast({ title: 'Не удалось скопировать', variant: 'destructive' });
      }
    }
  };

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return null;
  }

  const { day, month, weekday, time } = formatDate(event.event_date);
  const availableSeats = event.max_seats - event.current_seats;
  const isFull = availableSeats === 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <motion.header
        className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-primary/10 px-4 py-3"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-full hover:bg-primary/10 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-lg">Событие</h1>
          <button
            onClick={handleShare}
            className="p-2 -mr-2 rounded-full hover:bg-primary/10 transition-colors"
          >
            <Share2 className="w-5 h-5 text-primary" />
          </button>
        </div>
      </motion.header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 pb-32">
        {/* Event Header */}
        <motion.div
          className="text-center"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <span className="text-6xl mb-3 block">{event.emoji}</span>
          <h2 className="text-2xl font-bold text-foreground uppercase tracking-wide">
            {event.title}
          </h2>
          <p className="text-foreground-secondary mt-1">Уровень: {event.level}</p>
        </motion.div>

        {/* Info Grid */}
        <motion.div
          className="grid grid-cols-2 gap-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-4 text-center" hover={false}>
            <Calendar className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-lg text-foreground">{day} {month}</p>
            <p className="text-sm text-muted-foreground capitalize">{weekday}</p>
          </GlassCard>

          <GlassCard className="p-4 text-center" hover={false}>
            <Clock className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-lg text-foreground">{time}</p>
            <p className="text-sm text-muted-foreground">{event.duration_minutes} мин</p>
          </GlassCard>

          <GlassCard className="p-4 text-center" hover={false}>
            <MapPin className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-foreground">{event.location?.split(' ')[0] || event.city}</p>
            <p className="text-sm text-muted-foreground">{event.city}</p>
          </GlassCard>

          <GlassCard className="p-4 text-center" hover={false}>
            <Users className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-lg text-foreground">{event.current_seats} / {event.max_seats}</p>
            <p className="text-sm text-emerald-400">{availableSeats} мест</p>
          </GlassCard>
        </motion.div>

        {/* Price */}
        {event.price > 0 && (
          <motion.div
            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span className="text-muted-foreground font-medium">Стоимость</span>
            <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              {event.price.toLocaleString('ru-RU')} ₽
            </span>
          </motion.div>
        )}

        {/* Description */}
        {event.description && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Описание</h3>
            <p className="text-muted-foreground leading-relaxed">{event.description}</p>
          </motion.div>
        )}
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pt-3 border-t border-white/10 bg-[#0a0f1a]/95 backdrop-blur-xl">
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

            {/* Payment button if pending */}
            {pendingPayment && event.price > 0 && (
              <GlassButton variant="primary" fullWidth size="lg" onClick={handlePayClick} loading={paymentLoading}>
                💳 Оплатить • {event.price.toLocaleString('ru-RU')} ₽
              </GlassButton>
            )}

            {/* Payment completed status */}
            {!pendingPayment && event.price > 0 && (
              <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
                <span className="text-green-400 font-semibold">✓ Оплачено</span>
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
  );
};

export default EventPage;
