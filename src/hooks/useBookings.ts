import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import type { DbEvent, ParticipantStatus } from '@/types/database';

export interface TransformedBooking {
  id: string;
  type: 'training' | 'tournament' | 'stretching' | 'other';
  title: string;
  level: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  price: number;
  status: 'confirmed' | 'waiting' | 'canceled';
  position?: number;
}

export const useBookings = () => {
  const { user } = useUser();
  const [confirmed, setConfirmed] = useState<TransformedBooking[]>([]);
  const [waiting, setWaiting] = useState<TransformedBooking[]>([]);
  const [history, setHistory] = useState<TransformedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error: fetchError } = await supabase
        .from('event_participants')
        .select(`
          *,
          events (*)
        `)
        .eq('user_id', user.id)
        .neq('status', 'canceled');

      if (fetchError) throw fetchError;

      const transformBooking = (item: any): TransformedBooking => ({
        id: item.id,
        type: item.events.event_type,
        title: getEventTitle(item.events.event_type),
        level: item.events.level || 'Все',
        date: item.events.event_date,
        startTime: item.events.start_time?.slice(0, 5) || '00:00',
        endTime: item.events.end_time?.slice(0, 5) || '00:00',
        location: item.events.location,
        price: item.events.price,
        status: item.status,
        position: item.queue_position,
      });

      const confirmedBookings: TransformedBooking[] = [];
      const waitingBookings: TransformedBooking[] = [];
      const historyBookings: TransformedBooking[] = [];

      (data || []).forEach((item: any) => {
        if (!item.events) return;
        
        const booking = transformBooking(item);
        const isPast = item.events.event_date < today || item.events.status === 'completed';

        if (isPast) {
          historyBookings.push(booking);
        } else if (item.status === 'confirmed') {
          confirmedBookings.push(booking);
        } else if (item.status === 'waiting') {
          waitingBookings.push(booking);
        }
      });

      setConfirmed(confirmedBookings);
      setWaiting(waitingBookings);
      setHistory(historyBookings);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Не удалось загрузить записи');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return { confirmed, waiting, history, loading, error, refetch: fetchBookings };
};

function getEventTitle(type: string): string {
  const titles: Record<string, string> = {
    training: 'Тренировка',
    tournament: 'Турнир',
    stretching: 'Растяжка',
    other: 'Событие',
  };
  return titles[type] || 'Событие';
}
