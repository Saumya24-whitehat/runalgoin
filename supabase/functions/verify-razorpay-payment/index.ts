import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function verifySignature(orderId: string, paymentId: string, signature: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(RAZORPAY_KEY_SECRET!),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${orderId}|${paymentId}`));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex === signature;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ok = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const expires = new Date(now);
    if (plan === 'monthly') expires.setMonth(expires.getMonth() + 1);
    else if (plan === 'yearly' || plan === 'club') expires.setFullYear(expires.getFullYear() + 1);
    else {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amount = plan === 'monthly' ? 150 * 100 : plan === 'yearly' ? 1500 * 100 : 3500 * 100;
    const newPlanType = plan === 'club' ? 'club' : 'pro';

    // Get prior subscription for audit
    const { data: prior } = await supabase
      .from('subscriptions')
      .select('plan_type, status')
      .eq('user_id', userId)
      .maybeSingle();

    // Upsert payment (webhook may also do this — onConflict keeps them in sync)
    await supabase.from('payments').upsert(
      {
        user_id: userId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        plan,
        amount,
        currency: 'INR',
        status: 'captured',
        email: userEmail,
        notes: { plan, user_id: userId },
      },
      { onConflict: 'razorpay_order_id' },
    );

    const { error: upErr } = await supabase.from('subscriptions').upsert(
      {
        user_id: userId,
        plan_type: newPlanType,
        status: 'active',
        started_at: now.toISOString(),
        expires_at: expires.toISOString(),
      },
      { onConflict: 'user_id' },
    );

    if (upErr) {
      console.error('Subscription upsert error:', upErr);
      return new Response(JSON.stringify({ error: 'Failed to activate subscription' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Invoice
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${razorpay_payment_id.slice(-8).toUpperCase()}`;
    const { data: paymentRow } = await supabase
      .from('payments')
      .select('id')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle();

    await supabase.from('invoices').upsert(
      {
        user_id: userId,
        payment_id: paymentRow?.id,
        invoice_number: invoiceNumber,
        plan,
        amount,
        currency: 'INR',
        period_start: now.toISOString(),
        period_end: expires.toISOString(),
        razorpay_order_id,
        razorpay_payment_id,
        customer_email: userEmail,
      },
      { onConflict: 'invoice_number' },
    );

    // Audit
    await supabase.from('subscription_audit_log').insert({
      user_id: userId,
      user_email: userEmail,
      action: prior?.plan_type === 'pro' ? 'renewal' : 'upgrade',
      old_plan: prior?.plan_type ?? 'free',
      new_plan: 'pro',
      old_status: prior?.status ?? null,
      new_status: 'active',
      expires_at: expires.toISOString(),
      reason: 'verify_razorpay_payment',
      actor: 'user',
      razorpay_order_id,
      razorpay_payment_id,
      metadata: { amount, plan },
    });

    return new Response(
      JSON.stringify({ success: true, expires_at: expires.toISOString(), invoice_number: invoiceNumber }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
