import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

// Runs daily via pg_cron. Finds active subscriptions expiring in exactly N days
// (for each configured N) and enqueues a reminder email via send-transactional-email.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    // 1. Load config
    const { data: settings, error: settingsError } = await supabase
      .from('subscription_reminder_settings')
      .select('notify_days, enabled')
      .eq('id', 1)
      .maybeSingle()

    if (settingsError) throw settingsError
    if (!settings || !settings.enabled) {
      return jsonResponse({ skipped: true, reason: 'disabled' })
    }
    const days: number[] = (settings.notify_days || []).filter(
      (d: number) => Number.isInteger(d) && d > 0 && d <= 90,
    )
    if (days.length === 0) {
      return jsonResponse({ skipped: true, reason: 'no_days_configured' })
    }

    let totalQueued = 0
    let totalSkipped = 0
    const perDay: Record<string, number> = {}

    for (const daysBefore of days) {
      // window [start, end) covers "expires in exactly daysBefore days" (calendar day)
      const start = new Date()
      start.setUTCHours(0, 0, 0, 0)
      start.setUTCDate(start.getUTCDate() + daysBefore)
      const end = new Date(start)
      end.setUTCDate(end.getUTCDate() + 1)

      const { data: subs, error: subsError } = await supabase
        .from('subscriptions')
        .select('user_id, plan_type, status, expires_at')
        .eq('status', 'active')
        .in('plan_type', ['pro', 'enterprise'])
        .gte('expires_at', start.toISOString())
        .lt('expires_at', end.toISOString())

      if (subsError) {
        console.error(`Failed to query subs for day ${daysBefore}`, subsError)
        continue
      }

      let queuedThisDay = 0

      for (const sub of subs ?? []) {
        // Dedupe: attempt to record the send; if a row already exists we skip.
        const { error: logErr } = await supabase
          .from('subscription_reminder_log')
          .insert({
            user_id: sub.user_id,
            expires_at: sub.expires_at,
            days_before: daysBefore,
          })

        if (logErr) {
          // 23505 unique violation → already sent
          totalSkipped += 1
          continue
        }

        // Fetch recipient profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, name')
          .eq('user_id', sub.user_id)
          .maybeSingle()

        if (!profile?.email) {
          console.warn('No email on profile for user', sub.user_id)
          continue
        }

        const expiry = new Date(sub.expires_at)
        const expiryDate = expiry.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })

        const planLabel =
          sub.plan_type === 'enterprise' ? 'Enterprise' : 'Pro'

        const { error: sendErr } = await supabase.functions.invoke(
          'send-transactional-email',
          {
            body: {
              templateName: 'subscription-expiry',
              recipientEmail: profile.email,
              idempotencyKey: `sub-expiry-${sub.user_id}-${sub.expires_at}-${daysBefore}`,
              templateData: {
                name: profile.name || 'there',
                daysRemaining: daysBefore,
                planType: planLabel,
                expiryDate,
                renewUrl: 'https://optionworld.tech/plans',
              },
            },
          },
        )

        if (sendErr) {
          console.error('send-transactional-email failed', sendErr)
          // Roll back the dedupe row so the next run can retry
          await supabase
            .from('subscription_reminder_log')
            .delete()
            .eq('user_id', sub.user_id)
            .eq('expires_at', sub.expires_at)
            .eq('days_before', daysBefore)
          continue
        }

        queuedThisDay += 1
        totalQueued += 1
      }

      perDay[String(daysBefore)] = queuedThisDay
    }

    return jsonResponse({
      success: true,
      totalQueued,
      totalSkipped,
      perDay,
      days,
    })
  } catch (err) {
    console.error('notify-expiring-subscriptions error', err)
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    )
  }
})

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
