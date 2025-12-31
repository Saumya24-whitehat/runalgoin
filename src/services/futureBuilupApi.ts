import { supabase } from "@/integrations/supabase/client";

export interface BuildupItem {
  symbol: string;
  price: number;
  priceChange: number;
  oi: number;
  oiChange: number;
  oiChangePercent: number;
}

export interface FutureBuildupData {
  longBuildup: BuildupItem[];
  shortBuildup: BuildupItem[];
  shortCovering: BuildupItem[];
  longUnwinding: BuildupItem[];
  lastUpdated: string;
}

export async function fetchFutureBuildup(symbol: string, expiry: string): Promise<FutureBuildupData> {
  const { data, error } = await supabase.functions.invoke("future-buildup", {
    body: { symbol, expiry },
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    longBuildup: data?.long_buildup || [],
    shortBuildup: data?.short_buildup || [],
    shortCovering: data?.short_covering || [],
    longUnwinding: data?.long_unwinding || [],
    lastUpdated: data?.lastUpdated || new Date().toISOString(),
  };
}

export async function fetchFutureExpiryDates(symbol: string): Promise<string[]> {
  // Use the option-chain endpoint to get expiry dates as futures share similar expiries
  const { data, error } = await supabase.functions.invoke("option-chain", {
    body: { action: "getExpiryDates", symbol },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data?.expiry_dates || [];
}
