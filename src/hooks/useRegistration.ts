import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { toast } from '@/hooks/use-toast';

interface UseRegistrationResult {
  register: (eventId: string, price: number) => Promise<boolean>;
  cancel: (eventId: string) => Promise<boolean>;
  checkRegistration: (eventId: string) => Promise<'confirmed' | 'waiting' | null>;
  loading: boolean;
}

export const useRegistration = (): UseRegistrationResult => {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  const checkRegistration = async (eventId: string): Promise<'confirmed' | 'waiting' | null> => {
    if (!user) return null;

    const { data } = await supabase
      .from('event_participants')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .neq('status', 'canceled')
      .maybeSingle();

    if (data && (data.status === 'confirmed' || data.status === 'waiting')) {
      return data.status;
    }
    return null;
  };

  const register = async (eventId: string, price: number): Promise<boolean> => {
    if (!user) {
      console.error('Registration failed: No user');
      toast({
        title: 'Ошибка',
        description: 'Пользователь не найден',
        variant: 'destructive',
      });
      return false;
    }

    console.log('Registering:', { eventId, userId: user.id, price });
    setLoading(true);

    try {
      // 1. Check if already registered
      const { data: existingReg, error: existingError } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .neq('status', 'canceled')
        .maybeSingle();

      if (existingError) {
        console.error('Error checking existing registration:', existingError);
      }

      if (existingReg) {
        console.log('Already registered:', existingReg);
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

      if (eventError) {
        console.error('Event fetch error:', eventError);
        throw new Error('Событие не найдено');
      }

      if (!event) {
        console.error('Event not found');
        throw new Error('Событие не найдено');
      }

      console.log('Event data:', event);

      const currentSeats = (event as any).current_seats as number;
      const maxSeats = (event as any).max_seats as number;
      const hasSeats = currentSeats < maxSeats;
      const participantStatus = hasSeats ? 'confirmed' : 'waiting';

      console.log('Seats check:', { currentSeats, maxSeats, hasSeats, participantStatus });
      
      // 3. Calculate queue position if waiting
      let queuePosition: number | null = null;
      if (!hasSeats) {
        const { count } = await supabase
          .from('event_participants')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('status', 'waiting');
        
        queuePosition = (count || 0) + 1;
        console.log('Queue position:', queuePosition);
      }

      // 4. Create participant record
      const participantData = {
        event_id: eventId,
        user_id: user.id,
        status: participantStatus,
        queue_position: queuePosition,
      };
      console.log('Creating participant:', participantData);

      const { data: participant, error: participantError } = await supabase
        .from('event_participants')
        .insert(participantData)
        .select()
        .single();

      if (participantError) {
        console.error('Participant creation error:', participantError);
        throw participantError;
      }

      console.log('Participant created:', participant);

      // 5. Update current_seats if confirmed
      if (hasSeats) {
        const { error: updateError } = await supabase
          .from('events')
          .update({ current_seats: currentSeats + 1 })
          .eq('id', eventId);

        if (updateError) {
          console.error('Failed to update seats:', updateError);
        } else {
          console.log('Seats updated:', currentSeats + 1);
        }
      }

      // 6. Create payment with 15-minute deadline if price > 0
      if (price > 0) {
        console.log('Creating payment for amount:', price);
        const paymentDeadline = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // +15 minutes
        
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .insert({
            participant_id: (participant as any).id,
            user_id: user.id,
            event_id: eventId,
            amount: price,
            status: 'pending',
            payment_deadline: paymentDeadline,
          })
          .select()
          .single();

        if (paymentError) {
          console.error('Payment creation error:', paymentError);
          // Don't throw - registration succeeded
        } else {
          console.log('Payment created with deadline:', payment);
        }
      }

      toast({
        title: hasSeats ? '✅ Записано!' : '⏳ В очереди',
        description: hasSeats 
          ? 'Вы успешно записаны на событие' 
          : `Вы ${queuePosition}-й в очереди`,
      });

      return true;
    } catch (err: any) {
      console.error('Registration error:', err);
      toast({
        title: 'Ошибка',
        description: err?.message || 'Не удалось записаться',
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
        .update({ status: 'canceled', canceled_at: new Date().toISOString() })
        .eq('id', participantData.id);

      if (updateError) throw updateError;

      // Cancel related payment
      await supabase
        .from('payments')
        .update({ status: 'canceled' })
        .eq('participant_id', participantData.id);

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
