import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  amount: number;
  description: string;
  metadata: {
    event_id: string;
    participant_id: string;
    user_id: string;
  };
  return_url: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const shopId = Deno.env.get('YOOKASSA_SHOP_ID');
    const secretKey = Deno.env.get('YOOKASSA_SECRET_KEY');

    if (!shopId || !secretKey) {
      console.error('YooKassa credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { amount, description, metadata, return_url }: PaymentRequest = await req.json();

    console.log('Creating payment:', { amount, description, metadata });

    // Create payment in YooKassa
    const idempotenceKey = crypto.randomUUID();
    
    const paymentData = {
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB',
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: return_url,
      },
      description: description,
      metadata: metadata,
    };

    console.log('Sending to YooKassa:', JSON.stringify(paymentData));

    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotenceKey,
        'Authorization': 'Basic ' + btoa(`${shopId}:${secretKey}`),
      },
      body: JSON.stringify(paymentData),
    });

    const responseText = await response.text();
    console.log('YooKassa response status:', response.status);
    console.log('YooKassa response:', responseText);

    if (!response.ok) {
      console.error('YooKassa error:', responseText);
      return new Response(
        JSON.stringify({ error: 'Payment creation failed', details: responseText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payment = JSON.parse(responseText);
    console.log('Payment created successfully:', payment.id);

    return new Response(
      JSON.stringify({
        id: payment.id,
        status: payment.status,
        confirmation: payment.confirmation,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating payment:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
