// Razorpay webhook receiver.
// Configure in Razorpay Dashboard → Settings → Webhooks with the URL of this function
// and the same secret stored as RAZORPAY_WEBHOOK_SECRET.
// Subscribe at minimum to: payment.captured, payment.failed, refund.created, refund.processed.

import { createClient } from 'npm:@supabase/supabase-js@2';

const WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function verifySignature(rawBody: string, signature: string) {
  if (!WEBHOOK_SECRET) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex === signature;
}

function planFromNotes(notes: Record<string, string> | null | undefined): 'monthly' | 'yearly' | null {
  const p = notes?.plan;
  return p === 'monthly' || p === 'yearly' ? p : null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';
  const ok = await verifySignature(rawBody, signature);
  if (!ok) {
    console.warn('Invalid webhook signature');
    return new Response(JSON.stringify({ error: 'invalid signature' }), { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('bad json', { status: 400 });
  }

  const type: string = event?.event || '';
  console.log('Razorpay event:', type);

  try {
    if (type === 'payment.captured' || type === 'payment.authorized' || type === 'payment.failed') {
      const p = event.payload?.payment?.entity;
      if (!p) return new Response('ok');
      const notes = p.notes || {};
      const userId: string | undefined = notes.user_id;
      const plan = planFromNotes(notes);

      // Upsert payment row keyed on order_id
      await supabase.from('payments').upsert(
        {
          user_id: userId,
          razorpay_order_id: p.order_id,
          razorpay_payment_id: p.id,
          plan: plan ?? notes.plan ?? 'unknown',
          amount: p.amount,
          currency: p.currency,
          status: p.status, // captured / authorized / failed
          method: p.method,
          email: p.email,
          contact: p.contact,
          notes,
        },
        { onConflict: 'razorpay_order_id' },
      );

      if (type === 'payment.captured' && userId && plan) {
        const now = new Date();
        const expires = new Date(now);
        if (plan === 'monthly') expires.setMonth(expires.getMonth() + 1);
        else expires.setFullYear(expires.getFullYear() + 1);

        // Look up prior subscription for audit
        const { data: prior } = await supabase
          .from('subscriptions')
          .select('plan_type, status')
          .eq('user_id', userId)
          .maybeSingle();

        await supabase.from('subscriptions').upsert(
          {
            user_id: userId,
            plan_type: 'pro',
            status: 'active',
            started_at: now.toISOString(),
            expires_at: expires.toISOString(),
          },
          { onConflict: 'user_id' },
        );

        // Invoice
        const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${p.id.slice(-8).toUpperCase()}`;
        const { data: paymentRow } = await supabase
          .from('payments')
          .select('id')
          .eq('razorpay_order_id', p.order_id)
          .maybeSingle();

        await supabase.from('invoices').upsert(
          {
            user_id: userId,
            payment_id: paymentRow?.id,
            invoice_number: invoiceNumber,
            plan,
            amount: p.amount,
            currency: p.currency,
            period_start: now.toISOString(),
            period_end: expires.toISOString(),
            razorpay_order_id: p.order_id,
            razorpay_payment_id: p.id,
            customer_email: p.email,
          },
          { onConflict: 'invoice_number' },
        );

        // Audit
        await supabase.from('subscription_audit_log').insert({
          user_id: userId,
          user_email: p.email,
          action: prior?.plan_type === 'pro' ? 'renewal' : 'upgrade',
          old_plan: prior?.plan_type ?? 'free',
          new_plan: 'pro',
          old_status: prior?.status ?? null,
          new_status: 'active',
          expires_at: expires.toISOString(),
          reason: `Razorpay ${type}`,
          actor: 'razorpay_webhook',
          razorpay_order_id: p.order_id,
          razorpay_payment_id: p.id,
          metadata: { amount: p.amount, currency: p.currency, method: p.method },
        });
      } else if (type === 'payment.failed' && userId) {
        await supabase.from('subscription_audit_log').insert({
          user_id: userId,
          user_email: p.email,
          action: 'payment_failed',
          reason: p.error_description || 'Razorpay payment.failed',
          actor: 'razorpay_webhook',
          razorpay_order_id: p.order_id,
          razorpay_payment_id: p.id,
          metadata: { error_code: p.error_code, method: p.method },
        });
      }
    } else if (type === 'refund.created' || type === 'refund.processed') {
      const r = event.payload?.refund?.entity;
      const pay = event.payload?.payment?.entity;
      if (!r) return new Response('ok');

      const { data: payRow } = await supabase
        .from('payments')
        .select('id, user_id, notes')
        .eq('razorpay_payment_id', r.payment_id)
        .maybeSingle();

      await supabase
        .from('payments')
        .update({
          status: 'refunded',
          refund_id: r.id,
          refund_amount: r.amount,
          refunded_at: new Date().toISOString(),
        })
        .eq('razorpay_payment_id', r.payment_id);

      const userId = payRow?.user_id;
      if (userId) {
        // Downgrade if fully refunded
        if (type === 'refund.processed') {
          const { data: prior } = await supabase
            .from('subscriptions')
            .select('plan_type, status, expires_at')
            .eq('user_id', userId)
            .maybeSingle();

          await supabase
            .from('subscriptions')
            .update({ plan_type: 'free', status: 'cancelled', expires_at: null })
            .eq('user_id', userId);

          await supabase.from('subscription_audit_log').insert({
            user_id: userId,
            user_email: pay?.email,
            action: 'refund',
            old_plan: prior?.plan_type,
            new_plan: 'free',
            old_status: prior?.status,
            new_status: 'cancelled',
            reason: `Razorpay ${type}`,
            actor: 'razorpay_webhook',
            razorpay_payment_id: r.payment_id,
            metadata: { refund_id: r.id, amount: r.amount },
          });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('webhook handler error', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
