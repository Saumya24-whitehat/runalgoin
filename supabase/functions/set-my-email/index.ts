import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email } = await req.json() as { email?: string };
    const clean = (email ?? "").trim().toLowerCase();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (clean.endsWith("@pending.optionworld.tech")) {
      return new Response(JSON.stringify({ error: "Please enter your real email address" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Only allow replacing a pending placeholder email — prevent arbitrary email hijacking.
    const currentEmail = (userData.user.email ?? "").toLowerCase();
    if (!currentEmail.endsWith("@pending.optionworld.tech")) {
      return new Response(JSON.stringify({ error: "Email already set" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ensure email not already in use
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    // listUsers doesn't filter — use direct query instead is preferred, but a simple check via signIn is not right.
    // Do a lightweight check by attempting to fetch profile by email:
    const { data: dup } = await admin.from("profiles").select("user_id").eq("email", clean).maybeSingle();
    if (dup && dup.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Email already in use" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(userData.user.id, {
      email: clean,
      email_confirm: true,
    });
    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("profiles").update({ email: clean }).eq("user_id", userData.user.id);

    return new Response(JSON.stringify({ success: true, email: clean }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
