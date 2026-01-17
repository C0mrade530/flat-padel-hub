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
      // 1. Check for existing registration (including canceled!)
      const { data: existingReg } = await supabase
        .from('event_participants')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('Existing registration:', existingReg);

      // 2. Get event to check seats
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('current_seats, max_seats')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        console.error('Event fetch error:', eventError);
        throw new Error('Событие не найдено');
      }

      const currentSeats = (event as any).current_seats as number;
      const maxSeats = (event as any).max_seats as number;
      const hasSeats = currentSeats < maxSeats;
      const participantStatus = hasSeats ? 'confirmed' : 'waiting';

      console.log('Seats check:', { currentSeats, maxSeats, hasSeats, participantStatus });

      let participantId: string;

      // 3. Handle existing registration
      if (existingReg) {
        if (existingReg.status === 'confirmed' || existingReg.status === 'waiting') {
          // Already registered
          toast({ title: 'Вы уже записаны на это событие' });
          return false;
        }

        // If canceled - RESTORE it
        if (existingReg.status === 'canceled') {
          let queuePosition: number | null = null;
          if (!hasSeats) {
            const { count } = await supabase
              .from('event_participants')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', eventId)
              .eq('status', 'waiting');
            queuePosition = (count || 0) + 1;
          }

          const { error: updateError } = await supabase
            .from('event_participants')
            .update({ 
              status: participantStatus,
              queue_position: queuePosition,
              canceled_at: null,
            })
            .eq('id', existingReg.id);

          if (updateError) throw updateError;
          participantId = existingReg.id;
          console.log('Restored registration:', participantId);
        } else {
          participantId = existingReg.id;
        }
      } else {
        // 4. Create new registration
        let queuePosition: number | null = null;
        if (!hasSeats) {
          const { count } = await supabase
            .from('event_participants')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId)
            .eq('status', 'waiting');
          queuePosition = (count || 0) + 1;
        }

        const { data: newParticipant, error: insertError } = await supabase
          .from('event_participants')
          .insert({
            event_id: eventId,
            user_id: user.id,
            status: participantStatus,
            queue_position: queuePosition,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        participantId = (newParticipant as any).id;
        console.log('Created new registration:', participantId);
      }

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

      // 6. Handle payment
      if (price > 0) {
        // Check for existing payment
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id, status')
          .eq('participant_id', participantId)
          .maybeSingle();

        const paymentDeadline = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        if (existingPayment) {
          // Update existing payment
          await supabase
            .from('payments')
            .update({ 
              status: 'pending',
              payment_deadline: paymentDeadline,
              external_payment_id: null,
              paid_at: null,
            })
            .eq('id', existingPayment.id);
          console.log('Updated existing payment:', existingPayment.id);
        } else {
          // Create new payment
          const { data: newPayment, error: paymentError } = await supabase
            .from('payments')
            .insert({
              participant_id: participantId,
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
          } else {
            console.log('Created new payment:', newPayment);
          }
        }
      }

      toast({
        title: hasSeats ? '✅ Записано!' : '⏳ В очереди',
        description: hasSeats 
          ? 'Вы успешно записаны на событие' 
          : `Вы в очереди`,
      });

      return true;
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Handle duplicate key error
      if (err.code === '23505' || err.message?.includes('duplicate')) {
        toast({ 
          title: 'Ошибка', 
          description: 'Попробуйте обновить страницу',
          variant: 'destructive' 
        });
      } else {
        toast({
          title: 'Ошибка',
          description: err?.message || 'Не удалось записаться',
          variant: 'destructive',
        });
      }
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
