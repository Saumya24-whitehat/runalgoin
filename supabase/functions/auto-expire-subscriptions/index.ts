// Runs on a schedule (pg_cron). Downgrades expired Pro subs and logs to audit.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const nowIso = new Date().toISOString();

  const { data: expired, error } = await supabase
    .from('subscriptions')
    .select('user_id, plan_type, status, expires_at')
    .in('plan_type', ['pro', 'enterprise'])
    .not('expires_at', 'is', null)
    .lt('expires_at', nowIso);

  if (error) {
    console.error('query error', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const results: any[] = [];
  for (const sub of expired ?? []) {
    await supabase
      .from('subscriptions')
      .update({ plan_type: 'free', status: 'expired' })
      .eq('user_id', sub.user_id);

    await supabase.from('subscription_audit_log').insert({
      user_id: sub.user_id,
      action: 'expiry',
      old_plan: sub.plan_type,
      new_plan: 'free',
      old_status: sub.status,
      new_status: 'expired',
      expires_at: sub.expires_at,
      reason: 'Subscription past expires_at',
      actor: 'cron_auto_expire',
    });
    results.push(sub.user_id);
  }

  return new Response(JSON.stringify({ downgraded: results.length, users: results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
