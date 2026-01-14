import { useState } from 'react';
import { supabase, cloudClient } from '@/lib/supabase';
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
    userId: string,
    amount: number,
    description: string,
    returnUrl: string
  ): Promise<PaymentResult> => {
    setLoading(true);

    try {
      // Use cloudClient for edge functions (deployed on Lovable Cloud)
      const { data, error } = await cloudClient.functions.invoke('create-payment', {
        body: {
          amount,
          description,
          metadata: {
            event_id: eventId,
            participant_id: participantId,
            user_id: userId,
          },
          return_url: returnUrl,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      console.log('Payment response:', data);

      if (data?.confirmation?.confirmation_url) {
        // Update payment status in database
        await supabase
          .from('payments')
          .update({
            external_id: data.id,
            status: 'pending',
          })
          .eq('participant_id', participantId);

        return {
          success: true,
          paymentUrl: data.confirmation.confirmation_url,
        };
      }

      return { success: false, error: data?.error || 'Не удалось создать платёж' };
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
    userId: string,
    amount: number,
    eventTitle: string
  ) => {
    const returnUrl = window.location.href;
    
    const result = await createPayment(
      eventId,
      participantId,
      userId,
      amount,
      `Оплата: ${eventTitle}`,
      returnUrl
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

  const checkPendingPayment = async (eventId: string, participantId: string) => {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('event_id', eventId)
      .eq('participant_id', participantId)
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
