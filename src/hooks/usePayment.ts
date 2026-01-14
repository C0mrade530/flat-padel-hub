import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { openLink, haptic } from '@/lib/telegram';
import { toast } from '@/hooks/use-toast';

interface PaymentResult {
  success: boolean;
  paymentUrl?: string;
  error?: string;
}

export const usePayment = () => {
  const [loading, setLoading] = useState(false);

  const createPayment = async (
    eventId: string,
    participantId: string,
    amount: number,
    description: string
  ): Promise<PaymentResult> => {
    setLoading(true);

    try {
      // Note: This would connect to a ЮKassa Edge Function
      // For now, we'll simulate the payment URL generation
      // In production, you'd have an edge function that creates the payment
      
      // Mock payment URL for demo purposes
      const paymentUrl = `https://yookassa.ru/checkout?amount=${amount}&description=${encodeURIComponent(description)}`;
      
      // Update payment status to pending if not already
      await supabase
        .from('payments')
        .update({
          status: 'pending',
          // external_id would come from ЮKassa response
        })
        .eq('participant_id', participantId);

      return {
        success: true,
        paymentUrl,
      };
    } catch (error) {
      console.error('Payment error:', error);
      return { success: false, error: 'Не удалось создать платёж' };
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (
    eventId: string,
    participantId: string,
    amount: number,
    eventTitle: string
  ) => {
    const result = await createPayment(
      eventId,
      participantId,
      amount,
      `Оплата: ${eventTitle}`
    );

    if (result.success && result.paymentUrl) {
      haptic.notification('success');
      openLink(result.paymentUrl);
    } else {
      haptic.notification('error');
      toast({
        title: 'Ошибка',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const checkPendingPayment = async (eventId: string, userId: string) => {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    return data;
  };

  const markAsPaid = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'paid',
        })
        .eq('id', paymentId);

      if (error) throw error;

      haptic.notification('success');
      toast({
        title: 'Отмечено как оплаченное',
      });

      return true;
    } catch (error) {
      console.error('Mark as paid error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить статус оплаты',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    createPayment,
    handlePayment,
    checkPendingPayment,
    markAsPaid,
    loading,
  };
};
