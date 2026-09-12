import { supabase } from "@/integrations/supabase/client";
import { ChainStrike } from "@/utils/nitinBhaiyaEngine";

type RawSide = { market_data?: Record<string, number>; option_greeks?: Record<string, number> };
type RawRow = { strike_price?: number; underlying_spot_price?: number; call_options?: RawSide; put_options?: RawSide };

function side(raw?: RawSide) {
  const market = raw?.market_data ?? {};
  const greeks = raw?.option_greeks ?? {};
  const oi = Number(market.oi ?? 0);
  const prevOi = Number(market.prev_oi ?? 0);
  return { oi, prevOi, coi: prevOi ? oi - prevOi : Number(market.coi ?? 0), ltp: Number(market.ltp ?? 0), iv: Number(greeks.iv ?? 0), volume: Number(market.volume ?? 0), delta: Number(greeks.delta ?? 0), theta: Number(greeks.theta ?? 0), gamma: Number(greeks.gamma ?? 0), vega: Number(greeks.vega ?? 0) };
}

function normalize(rows: RawRow[]): ChainStrike[] {
  return rows.map((row) => ({ strike: Number(row.strike_price ?? 0), spot: Number(row.underlying_spot_price ?? 0), ce: side(row.call_options), pe: side(row.put_options) })).sort((a, b) => a.strike - b.strike);
}

export async function fetchNitinSymbols(): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke("option-chain", { body: { action: "getSymbols" } });
  if (error) throw error;
  return [...(data?.["index symbols"] ?? data?.index_symbols ?? []), ...(data?.symbols ?? [])];
}

export async function fetchNitinExpiries(symbol: string): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke("option-chain", { body: { action: "getExpiryDates", symbol } });
  if (error) throw error;
  return data?.expiry_dates ?? [];
}

async function fetchChain(symbol: string, expiry: string, time?: string) {
  const body: Record<string, string> = { action: "getOptionChain", symbol, expiry_date: expiry };
  if (time) body.time = time;
  const { data, error } = await supabase.functions.invoke("option-chain", { body });
  if (error) throw error;
  return normalize(data?.option_chain?.data ?? []);
}

export async function fetchNitinAnalysis(symbol: string, expiry: string, time?: string) {
  const [current, baselineResult] = await Promise.all([
    fetchChain(symbol, expiry, time),
    fetchChain(symbol, expiry, "0945").catch(() => []),
  ]);
  return { current, baseline: baselineResult };
}
