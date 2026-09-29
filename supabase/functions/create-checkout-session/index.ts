
// create-checkout-session: creates a Stripe Checkout session for a paid plan
// (professional / business). On success the webhook records the payment into
// subscription_payments so the admin console shows what Payalarm receives.

import Stripe from 'https://esm.sh/stripe@13.0.0?target=deno';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient()
    });
    const { productId, successUrl, cancelUrl, companyId, plan } = await req.json();
    const prices = await stripe.prices.list({
      product: productId,
      active: true
    });
    if (!prices.data.length) {
      return new Response(JSON.stringify({
        error: 'No active price found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: prices.data[0].id,
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: companyId ?? undefined,
      metadata: {
        ...(companyId ? { company_id: companyId } : {}),
        ...(plan ? { plan } : {}),
        source: 'plan_checkout'
      }
    });
    return new Response(JSON.stringify({
      url: session.url
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
