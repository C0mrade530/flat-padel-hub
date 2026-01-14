import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { toast } from '@/hooks/use-toast';

interface UseRegistrationResult {
  register: (eventId: string, price: number) => Promise<boolean>;
  cancel: (eventId: string) => Promise<boolean>;
  checkRegistration: (eventId: string) => Promise<boolean>;
  loading: boolean;
}

export const useRegistration = (): UseRegistrationResult => {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  const checkRegistration = async (eventId: string): Promise<boolean> => {
    if (!user) return false;

    const { data } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .neq('status', 'canceled')
      .maybeSingle();

    return !!data;
  };

  const register = async (eventId: string, price: number): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Ошибка',
        description: 'Необходимо авторизоваться',
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);

    try {
      // 1. Check if already registered
      const isRegistered = await checkRegistration(eventId);
      if (isRegistered) {
        toast({
          title: 'Уже записаны',
          description: 'Вы уже записаны на это событие',
        });
        return false;
      }

      // 2. Get event to check seats
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('current_seats, max_seats')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        throw eventError || new Error('Event not found');
      }

      const currentSeats = (event as any).current_seats as number;
      const maxSeats = (event as any).max_seats as number;
      const hasSeats = currentSeats < maxSeats;
      const participantStatus = hasSeats ? 'confirmed' : 'waiting';
      
      // 3. Calculate queue position if waiting
      let queuePosition: number | null = null;
      if (!hasSeats) {
        const { count } = await supabase
          .from('event_participants')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('status', 'waiting');
        
        queuePosition = (count || 0) + 1;
      }

      // 4. Create participant record
      const { data: participant, error: participantError } = await supabase
        .from('event_participants')
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: participantStatus,
          queue_position: queuePosition,
          registered_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (participantError || !participant) {
        throw participantError || new Error('Failed to create participant');
      }

      // 5. Create payment if price > 0
      if (price > 0) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            participant_id: (participant as any).id,
            user_id: user.id,
            event_id: eventId,
            amount: price,
            status: 'pending',
          });

        if (paymentError) throw paymentError;
      }

      // 6. Update current_seats if confirmed
      if (hasSeats) {
        const { error: updateError } = await supabase
          .from('events')
          .update({ current_seats: currentSeats + 1 })
          .eq('id', eventId);

        if (updateError) throw updateError;
      }

      toast({
        title: hasSeats ? 'Записано!' : 'В очереди',
        description: hasSeats 
          ? 'Вы успешно записаны на событие' 
          : `Вы ${queuePosition}-й в очереди`,
      });

      return true;
    } catch (err) {
      console.error('Registration error:', err);
      toast({
        title: 'Ошибка',
        description: 'Не удалось записаться',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const cancel = async (eventId: string): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);

    try {
      // Get participant record
      const { data: participant, error: fetchError } = await supabase
        .from('event_participants')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .neq('status', 'canceled')
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!participant) return false;

      const participantData = participant as any;

      // Update to canceled
      const { error: updateError } = await supabase
        .from('event_participants')
        .update({ status: 'canceled' })
        .eq('id', participantData.id);

      if (updateError) throw updateError;

      // Decrement seats if was confirmed
      if (participantData.status === 'confirmed') {
        const { data: event } = await supabase
          .from('events')
          .select('current_seats')
          .eq('id', eventId)
          .single();

        if (event) {
          const currentSeats = (event as any).current_seats as number;
          if (currentSeats > 0) {
            await supabase
              .from('events')
              .update({ current_seats: currentSeats - 1 })
              .eq('id', eventId);
          }
        }
      }

      toast({
        title: 'Отменено',
        description: 'Запись отменена',
      });

      return true;
    } catch (err) {
      console.error('Cancel error:', err);
      toast({
        title: 'Ошибка',
        description: 'Не удалось отменить запись',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { register, cancel, checkRegistration, loading };
};
