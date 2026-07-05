import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: existing } = await admin
      .from("subscriptions")
      .select("id, trial_used, plan_type, status, expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.trial_used) {
      return new Response(
        JSON.stringify({ error: "Free trial already used" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const expires = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();

    if (existing) {
      const { error } = await admin
        .from("subscriptions")
        .update({
          plan_type: "pro",
          status: "active",
          started_at: now.toISOString(),
          expires_at: expires,
          trial_used: true,
        })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await admin.from("subscriptions").insert({
        user_id: user.id,
        plan_type: "pro",
        status: "active",
        started_at: now.toISOString(),
        expires_at: expires,
        trial_used: true,
      });
      if (error) throw error;
    }

    return new Response(JSON.stringify({ success: true, expires_at: expires }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
