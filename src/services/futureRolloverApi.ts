import { supabase } from "@/integrations/supabase/client";

export interface RolloverItem {
  symbol: string;
  lastPrice: number;
  priceChange: number;
  oi: number;
  nextOi: number;
  rollover: number;
}

export interface RolloverData {
  data: RolloverItem[];
  lastUpdated: string;
}

export async function fetchFutureRollover(symbol: string, expiry: string): Promise<RolloverData> {
  const { data, error } = await supabase.functions.invoke("future-rollover", {
    body: { symbol, expiry },
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    data: data?.data || [],
    lastUpdated: data?.lastUpdated || new Date().toISOString(),
  };
}

// Re-export expiry dates fetcher
export { fetchFutureExpiryDates } from "./futureBuilupApi";
