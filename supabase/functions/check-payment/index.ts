import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    const { payment_id } = await req.json();

    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: 'payment_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shopId = Deno.env.get('YOOKASSA_SHOP_ID');
    const secretKey = Deno.env.get('YOOKASSA_SECRET_KEY');

    if (!shopId || !secretKey) {
      console.error('YooKassa credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking payment status:', payment_id);

    const response = await fetch(`https://api.yookassa.ru/v3/payments/${payment_id}`, {
      headers: {
        'Authorization': 'Basic ' + btoa(`${shopId}:${secretKey}`),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('YooKassa error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to check payment', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payment = await response.json();
    console.log('Payment status:', payment.status, 'paid:', payment.paid);

    return new Response(
      JSON.stringify({ 
        status: payment.status, 
        paid: payment.paid,
        amount: payment.amount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error checking payment:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
