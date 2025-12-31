import { supabase } from "@/integrations/supabase/client";

export interface OpenHighLowItem {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  lastPrice: number;
  priceChange: number;
  openHighDiff: number;
  openLowDiff: number;
}

export interface OpenHighLowData {
  open_equal_high: OpenHighLowItem[];
  open_equal_low: OpenHighLowItem[];
  lastUpdated: string;
}

export async function fetchFutureOpenHighLow(
  symbol: string,
  expiry: string
): Promise<OpenHighLowData> {
  const { data, error } = await supabase.functions.invoke("future-open-high-low", {
    body: { symbol, expiry },
  });

  if (error) {
    console.error("Error fetching future open-high-low data:", error);
    throw new Error(error.message || "Failed to fetch data");
  }

  return data as OpenHighLowData;
}

// Re-export expiry dates fetcher from futureBuilupApi
export { fetchFutureExpiryDates } from "./futureBuilupApi";
