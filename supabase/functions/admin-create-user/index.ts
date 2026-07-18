import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function genPassword(len = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let out = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Verify caller is admin
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { name, username, email: rawEmail, plan, expiresAt, password } = body as {
      name: string; username: string; email?: string | null; plan: "free" | "pro" | "club" | "enterprise"; expiresAt?: string | null; password?: string | null;
    };
    if (!name || !plan) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const providedEmail = (rawEmail ?? "").toString().trim().toLowerCase();
    // If admin did not provide an email, mint a placeholder. User will replace it on first login.
    const emailPending = !providedEmail;
    const email = providedEmail || `pending+${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}@pending.optionworld.tech`;

    const providedPassword = (password ?? "").toString().trim();
    if (providedPassword && providedPassword.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const tempPassword = providedPassword || genPassword(12);

    // Create auth user, auto-confirmed
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message ?? "Failed to create user" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const newUserId = created.user.id;

    // Update profile with username + must_change_password flag (profile auto-created by trigger)
    await admin.from("profiles").update({
      name,
      username: username || null,
      must_change_password: true,
    }).eq("user_id", newUserId);

    // Upsert subscription
    await admin.from("subscriptions").upsert({
      user_id: newUserId,
      plan_type: plan,
      status: "active",
      expires_at: plan === "free" ? null : (expiresAt ?? null),
      started_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    // Origin & one-time magic login link (works even when the user has no real email — the link
    // itself carries the token; we just don't email it, admin shares it manually).
    const origin = req.headers.get("origin") ?? "https://optionworld.tech";
    const loginUrl = `${origin}/auth`;
    let loginLink: string | null = null;
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: `${origin}/welcome` },
      });
      loginLink = linkData?.properties?.action_link ?? null;
    } catch (_) {
      loginLink = null;
    }

    let emailSent = false;
    let emailError: string | null = null;
    if (emailPending) {
      // No real email on file — skip sending. Admin will share creds manually.
      emailError = "no_email_on_file";
    } else if (RESEND_KEY) {
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
          <h2 style="margin:0 0 12px">Welcome to OptionWorld, ${name}!</h2>
          <p>An account has been created for you.</p>
          <table style="border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:6px 12px;background:#f4f4f5"><b>Email</b></td><td style="padding:6px 12px;background:#f4f4f5">${email}</td></tr>
            <tr><td style="padding:6px 12px"><b>Temporary Password</b></td><td style="padding:6px 12px;font-family:monospace;font-size:14px">${tempPassword}</td></tr>
            <tr><td style="padding:6px 12px;background:#f4f4f5"><b>Plan</b></td><td style="padding:6px 12px;background:#f4f4f5">${plan.toUpperCase()}${expiresAt ? ` (valid till ${new Date(expiresAt).toLocaleDateString("en-IN")})` : ""}</td></tr>
          </table>
          <p style="margin:20px 0">
            <a href="${loginUrl}" style="background:#0f172a;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;display:inline-block">Login to your account</a>
          </p>
          <p style="color:#555;font-size:13px">On your first login you'll be asked to set a new password and complete your profile.</p>
        </div>`;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({
          from: "OptionWorld <onboarding@resend.dev>",
          to: [email],
          subject: "Your OptionWorld account is ready",
          html,
        }),
      });
      if (r.ok) emailSent = true;
      else emailError = await r.text();
    } else {
      emailError = "RESEND_API_KEY not configured";
    }

    return new Response(JSON.stringify({
      success: true,
      userId: newUserId,
      email,
      emailPending,
      tempPassword,
      loginLink,
      emailSent,
      emailError,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
