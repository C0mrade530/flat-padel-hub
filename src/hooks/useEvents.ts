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
      const now = new Date().toISOString();
      
      console.log('Fetching events, now:', now);
      
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
        .eq('status', 'published')
        .gte('event_date', now)
        .order('event_date', { ascending: true });

      console.log('Events loaded:', data, fetchError);

      if (fetchError) throw fetchError;

      const transformed: TransformedEvent[] = (data || []).map((event: any) => {
        const eventDate = new Date(event.event_date);
        const startTime = eventDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        // Рассчитываем время окончания
        const endDate = new Date(eventDate.getTime() + (event.duration_minutes || 120) * 60000);
        const endTime = endDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        // Определяем тип события по emoji
        let eventType: 'training' | 'tournament' | 'stretching' | 'other' = 'training';
        if (event.emoji === '🏆') eventType = 'tournament';
        else if (event.emoji === '🧘' || event.emoji === '🤸') eventType = 'stretching';
        else if (event.emoji === '🎯' || event.emoji === '🎾') eventType = 'training';
        else eventType = 'other';

        return {
          id: event.id,
          type: eventType,
          title: event.title || getEventTitle(eventType),
          level: event.level || 'Все',
          date: eventDate.toISOString().split('T')[0],
          startTime,
          endTime,
          location: event.location || '',
          maxSeats: event.max_seats || 8,
          currentSeats: event.current_seats || 0,
          price: event.price || 0,
          description: event.description,
          participants: event.event_participants
            ?.filter((p: any) => p.status === 'confirmed' && p.users)
            .map((p: any) => ({
              id: p.users.id,
              name: p.users.display_name,
              avatar: p.users.avatar_url,
            })) || [],
        };
      });

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
