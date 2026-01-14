import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('YooKassa webhook received:', JSON.stringify(body));

    // Check if this is a successful payment
    if (body.event === 'payment.succeeded') {
      const payment = body.object;
      const metadata = payment.metadata;

      console.log('Payment succeeded:', payment.id, 'metadata:', metadata);

      // Create Supabase client with service role
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Supabase credentials not configured');
        return new Response(
          JSON.stringify({ error: 'Database not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Update payment status in database
      const { error: updateError } = await supabase
        .from('payments')
        .update({ 
          status: 'paid', 
          paid_at: new Date().toISOString(),
          external_payment_id: payment.id,
        })
        .eq('participant_id', metadata.participant_id);

      if (updateError) {
        console.error('Error updating payment:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update payment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Payment status updated to paid');

      // Send Telegram notification if bot token is configured
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
      
      if (botToken && metadata?.user_id) {
        try {
          // Get user's telegram_id
          const { data: user } = await supabase
            .from('users')
            .select('telegram_id, display_name')
            .eq('id', metadata.user_id)
            .single();

          if (user?.telegram_id) {
            const message = `✅ Оплата получена!\n\n💰 Сумма: ${payment.amount.value} ₽\n🎾 ${payment.description}\n\nСпасибо за оплату, ${user.display_name}!`;
            
            const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: user.telegram_id,
                text: message,
              }),
            });

            const telegramResult = await telegramResponse.json();
            console.log('Telegram notification sent:', telegramResult.ok);
          }
        } catch (telegramError) {
          console.error('Error sending Telegram notification:', telegramError);
          // Don't fail the webhook if Telegram notification fails
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle payment.canceled event
    if (body.event === 'payment.canceled') {
      console.log('Payment canceled:', body.object.id);
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase
          .from('payments')
          .update({ status: 'canceled' })
          .eq('external_payment_id', body.object.id);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For other events, just acknowledge
    console.log('Unhandled event type:', body.event);
    return new Response(
      JSON.stringify({ success: true, message: 'Event acknowledged' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
