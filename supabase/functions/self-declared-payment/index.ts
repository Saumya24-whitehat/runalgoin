import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email;

    const body = await req.json();
    const { method, plan, transaction_id } = body ?? {};

    if (method !== 'paypal' && method !== 'upi') {
      return new Response(JSON.stringify({ error: 'Invalid method' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (plan !== 'monthly' && plan !== 'yearly' && plan !== 'club') {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const txn = typeof transaction_id === 'string' ? transaction_id.trim() : '';
    if (txn.length < 4 || txn.length > 100) {
      return new Response(JSON.stringify({ error: 'Transaction ID must be 4–100 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const expires = new Date(now);
    if (plan === 'monthly') expires.setMonth(expires.getMonth() + 1);
    else expires.setFullYear(expires.getFullYear() + 1); // yearly + club both 1 year

    const amount = plan === 'monthly' ? 150 * 100 : plan === 'yearly' ? 1500 * 100 : 3500 * 100;
    const newPlanType = plan === 'club' ? 'club' : 'pro';
    const manualOrderId = `manual_${method}_${Date.now()}_${userId.slice(0, 8)}`;

    // Prior subscription for audit
    const { data: prior } = await supabase
      .from('subscriptions')
      .select('plan_type, status')
      .eq('user_id', userId)
      .maybeSingle();

    // Payment row (self-declared)
    await supabase.from('payments').upsert(
      {
        user_id: userId,
        razorpay_order_id: manualOrderId,
        razorpay_payment_id: txn,
        plan,
        amount,
        currency: 'INR',
        status: 'self_declared',
        email: userEmail,
        notes: { method, transaction_id: txn, plan, user_id: userId, self_declared: true },
      },
      { onConflict: 'razorpay_order_id' },
    );

    // Activate subscription
    const { error: upErr } = await supabase.from('subscriptions').upsert(
      {
        user_id: userId,
        plan_type: 'pro',
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
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${manualOrderId.slice(-8).toUpperCase()}`;
    const { data: paymentRow } = await supabase
      .from('payments')
      .select('id')
      .eq('razorpay_order_id', manualOrderId)
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
        razorpay_order_id: manualOrderId,
        razorpay_payment_id: txn,
        customer_email: userEmail,
      },
      { onConflict: 'invoice_number' },
    );

    // Audit log
    await supabase.from('subscription_audit_log').insert({
      user_id: userId,
      user_email: userEmail,
      action: prior?.plan_type === 'pro' ? 'renewal' : 'upgrade',
      old_plan: prior?.plan_type ?? 'free',
      new_plan: 'pro',
      old_status: prior?.status ?? null,
      new_status: 'active',
      expires_at: expires.toISOString(),
      reason: 'self_declared_payment',
      actor: 'user',
      razorpay_order_id: manualOrderId,
      razorpay_payment_id: txn,
      metadata: { amount, plan, method, transaction_id: txn },
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
