import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const now = new Date().toISOString();

    console.log(`[Cleanup] Checking for expired payments at ${now}`);

    // Find expired pending payments
    const { data: expiredPayments, error: fetchError } = await supabase
      .from('payments')
      .select('id, participant_id, event_id')
      .eq('status', 'pending')
      .not('payment_deadline', 'is', null)
      .lt('payment_deadline', now);

    if (fetchError) {
      console.error('[Cleanup] Error fetching expired payments:', fetchError);
      throw fetchError;
    }

    if (!expiredPayments || expiredPayments.length === 0) {
      console.log('[Cleanup] No expired payments found');
      return new Response(
        JSON.stringify({ message: 'No expired payments', canceled: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Cleanup] Found ${expiredPayments.length} expired payments`);

    let canceledCount = 0;

    for (const payment of expiredPayments) {
      try {
        // Update payment status to expired
        await supabase
          .from('payments')
          .update({ status: 'expired' })
          .eq('id', payment.id);

        // Get participant status
        const { data: participant } = await supabase
          .from('event_participants')
          .select('status')
          .eq('id', payment.participant_id)
          .single();

        if (participant?.status === 'confirmed') {
          // Cancel participant
          await supabase
            .from('event_participants')
            .update({ status: 'canceled', canceled_at: now })
            .eq('id', payment.participant_id);

          // Decrement event seats
          const { data: event } = await supabase
            .from('events')
            .select('current_seats')
            .eq('id', payment.event_id)
            .single();

          if (event && event.current_seats > 0) {
            await supabase
              .from('events')
              .update({ current_seats: event.current_seats - 1 })
              .eq('id', payment.event_id);
          }
        }

        canceledCount++;
        console.log(`[Cleanup] Canceled payment ${payment.id} and participant ${payment.participant_id}`);
      } catch (err) {
        console.error(`[Cleanup] Error processing payment ${payment.id}:`, err);
      }
    }

    console.log(`[Cleanup] Completed. Canceled ${canceledCount} payments`);

    return new Response(
      JSON.stringify({ success: true, canceled: canceledCount }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Cleanup] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
