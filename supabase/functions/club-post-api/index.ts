// Public API to post to OptionWorld Club (chat message or feed post).
// Auth: header `x-api-key: <CLUB_API_KEY>`.
//
// POST body:
// {
//   "kind": "chat" | "post",           // default "chat"
//   "category": "general" | "<uuid>",  // slug or id; default "general"
//   "body": "text",                    // required
//   "image_url": "https://...",        // optional
//   "as_user_id": "<uuid>",            // optional; defaults to first admin
//   // post-only optional fields:
//   "idea_type": "MTI"|"STT"|"LTI"|"Discussion",
//   "action": "BUY"|"SELL",
//   "exchange": "NSE"|"MCX",
//   "symbol": "RELIANCE",
//   "cmp": 1234.5,
//   "entry_zone": "1200-1210",
//   "stop_loss": 1180,
//   "target1": 1300,
//   "timeframe": "3 months",
//   "rationale": "..."
// }

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const apiKey = req.headers.get("x-api-key");
  const expected = Deno.env.get("CLUB_API_KEY");
  if (!expected || !apiKey || apiKey !== expected) {
    return json(401, { error: "Invalid API key" });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const body = (payload?.body ?? "").toString().trim();
  if (!body && !payload?.image_url) {
    return json(400, { error: "`body` or `image_url` is required" });
  }

  const kind = payload?.kind === "post" ? "post" : "chat";
  const categoryInput: string = (payload?.category ?? "general").toString();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Resolve category (uuid or slug)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryInput);
  const { data: cat, error: catErr } = await supabase
    .from("club_categories")
    .select("id, slug, name")
    .eq(isUuid ? "id" : "slug", categoryInput)
    .maybeSingle();
  if (catErr) return json(500, { error: catErr.message });
  if (!cat) return json(404, { error: `Category not found: ${categoryInput}` });

  // Resolve author: as_user_id (must be admin) or first admin
  let authorId: string | null = payload?.as_user_id ?? null;
  if (authorId) {
    const { data: ok } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("user_id", authorId)
      .eq("role", "admin")
      .maybeSingle();
    if (!ok) return json(403, { error: "as_user_id is not an admin" });
  } else {
    const { data: admin } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .order("user_id", { ascending: true })
      .limit(1)
      .maybeSingle();
    authorId = admin?.user_id ?? null;
  }
  if (!authorId) return json(500, { error: "No admin user available to post as" });

  if (kind === "chat") {
    const { data, error } = await supabase
      .from("club_chat_messages")
      .insert({
        category_id: cat.id,
        user_id: authorId,
        body: body || "(image)",
        image_url: payload?.image_url ?? null,
      })
      .select()
      .single();
    if (error) return json(500, { error: error.message });
    return json(200, { ok: true, kind, message: data });
  }

  // kind === "post"
  const { data, error } = await supabase
    .from("club_posts")
    .insert({
      category_id: cat.id,
      user_id: authorId,
      body,
      image_url: payload?.image_url ?? null,
      idea_type: payload?.idea_type ?? null,
      action: payload?.action ?? null,
      exchange: payload?.exchange ?? null,
      symbol: payload?.symbol ?? null,
      cmp: payload?.cmp ?? null,
      entry_zone: payload?.entry_zone ?? null,
      stop_loss: payload?.stop_loss ?? null,
      target1: payload?.target1 ?? null,
      timeframe: payload?.timeframe ?? null,
      rationale: payload?.rationale ?? null,
    })
    .select()
    .single();
  if (error) return json(500, { error: error.message });
  return json(200, { ok: true, kind, post: data });
});
