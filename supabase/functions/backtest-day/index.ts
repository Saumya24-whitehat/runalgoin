import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { normalizeChain, runIvFlow, runNitin, runStrikeFlow, sessionSlots, Strike } from "./engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE = "https://runalgo.xyz/data";
const HEADERS = { accept: "*/*", "content-type": "application/json", "x-requested-with": "XMLHttpRequest" };

async function getJson(url: string) {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`upstream ${response.status} for ${url}`);
  return await response.json();
}

async function fetchChain(symbol: string, expiry: string, date: string, slot: string): Promise<Strike[]> {
  const url = `${BASE}/getOptionChain.php?symbol=${encodeURIComponent(symbol)}&expiry_date=${encodeURIComponent(expiry)}&time=${slot}&date=${encodeURIComponent(date)}`;
  try {
    const data = await getJson(url);
    return normalizeChain(data?.option_chain?.data ?? []);
  } catch {
    return [];
  }
}

function pickExpiry(expiries: string[], type: string): string | null {
  if (!expiries.length) return null;
  if (type === "weekly") return expiries[0];
  const month = expiries[0].slice(0, 7); // yyyy-MM
  const sameMonth = expiries.filter((value) => value.slice(0, 7) === month);
  return sameMonth.length ? sameMonth[sameMonth.length - 1] : expiries[expiries.length - 1];
}

async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let payload: { symbol?: string; date?: string; expiryType?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const symbol = String(payload.symbol ?? "").trim();
  const date = String(payload.date ?? "").trim();
  const expiryType = String(payload.expiryType ?? "").trim();
  if (!symbol || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !["weekly", "monthly"].includes(expiryType)) {
    return new Response(JSON.stringify({ error: "symbol, date (yyyy-mm-dd) and expiryType (weekly|monthly) are required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const markDay = async (status: string, candles: number, error?: string) => {
    await supabase.from("backtest_days").upsert(
      { symbol, trade_date: date, expiry_type: expiryType, status, candles, error: error ?? null, updated_at: new Date().toISOString() },
      { onConflict: "symbol,trade_date,expiry_type" },
    );
  };

  try {
    const expiryData = await getJson(`${BASE}/getExpiryDates2.php?symbol=${encodeURIComponent(symbol)}&date=${encodeURIComponent(date)}`);
    const expiries: string[] = (expiryData?.expiry_dates ?? []).filter(Boolean).sort();
    const expiry = pickExpiry(expiries, expiryType);
    if (!expiry) {
      await markDay("no-data", 0, "no expiry dates for this date");
      return new Response(JSON.stringify({ status: "no-data", candles: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const slots = sessionSlots();
    const chains = await mapLimit(slots, 6, (slot) => fetchChain(symbol, expiry, date, slot));
    const valid = slots.map((slot, i) => ({ slot, chain: chains[i] })).filter((item) => item.chain.length > 0 && item.chain[0].spot > 0);

    if (valid.length < 20) {
      await markDay("no-data", valid.length, "market closed or insufficient snapshots");
      return new Response(JSON.stringify({ status: "no-data", candles: valid.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const baseline = valid.find((item) => item.slot >= "0945")?.chain ?? valid[0].chain;
    const spots = valid.map((item) => item.chain[0].spot);
    const lastSpot = spots[spots.length - 1];

    const rows = valid.map((item, i) => {
      const previous = i > 0 ? valid[i - 1].chain : [];
      const nitin = runNitin(item.chain, baseline);
      const iv = runIvFlow(item.chain, previous);
      const sf = runStrikeFlow(item.chain, previous);
      const forward = (steps: number) => (i + steps < spots.length ? Number((spots[i + steps] - spots[i]).toFixed(2)) : null);
      return {
        symbol,
        trade_date: date,
        expiry_type: expiryType,
        expiry_date: expiry,
        slot: item.slot,
        spot: spots[i],
        nitin_label: nitin.label,
        nitin_dir: nitin.dir,
        nitin_score: nitin.score,
        iv_label: iv.label,
        iv_dir: iv.dir,
        sf_ratio: sf.ratio,
        sf_dir: sf.dir,
        fwd15: forward(5),
        fwd30: forward(10),
        fwd60: forward(20),
        fwd_close: Number((lastSpot - spots[i]).toFixed(2)),
      };
    });

    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase.from("backtest_candles").upsert(rows.slice(i, i + 200), { onConflict: "symbol,trade_date,expiry_type,slot" });
      if (error) throw new Error(error.message);
    }

    await markDay("done", rows.length);
    return new Response(JSON.stringify({ status: "done", candles: rows.length, expiry }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("backtest-day failed:", message);
    await markDay("failed", 0, message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
