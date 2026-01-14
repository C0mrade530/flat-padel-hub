import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { DbEvent, DbUser, DbEventParticipant } from '@/types/database';

interface EventWithParticipants extends DbEvent {
  event_participants?: (DbEventParticipant & { users: DbUser })[];
}

export interface TransformedEvent {
  id: string;
  type: 'training' | 'tournament' | 'stretching' | 'other';
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
}

export const useEvents = () => {
  const [events, setEvents] = useState<TransformedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error: fetchError } = await supabase
        .from('events')
        .select(`
          *,
          event_participants (
            id,
            user_id,
            status,
            users (
              id,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('status', 'scheduled')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;

      const transformed: TransformedEvent[] = (data || []).map((event: any) => ({
        id: event.id,
        type: event.event_type,
        title: getEventTitle(event.event_type),
        level: event.level || 'Все',
        date: event.event_date,
        startTime: event.start_time?.slice(0, 5) || '00:00',
        endTime: event.end_time?.slice(0, 5) || '00:00',
        location: event.location,
        maxSeats: event.max_seats,
        currentSeats: event.current_seats,
        price: event.price,
        description: event.description,
        participants: event.event_participants
          ?.filter((p: any) => p.status === 'confirmed' && p.users)
          .map((p: any) => ({
            id: p.users.id,
            name: p.users.display_name,
            avatar: p.users.avatar_url,
          })) || [],
      }));

      setEvents(transformed);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Не удалось загрузить события');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
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
