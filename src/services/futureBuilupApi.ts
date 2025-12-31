import { supabase } from "@/integrations/supabase/client";

export interface BuildupItem {
  symbol: string;
  price: number;
  priceChange: number;
  oi: number;
  oiChange: number;
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

  // Parse the response data
  const parseItems = (items: any[]): BuildupItem[] => {
    if (!items || !Array.isArray(items)) return [];
    return items.map((item) => ({
      symbol: item.symbol || item.Symbol || "",
      price: parseFloat(item.price || item.Price || item.ltp || 0),
      priceChange: parseFloat(item.priceChange || item.pChange || item.price_change || 0),
      oi: parseInt(item.oi || item.OI || item.openInterest || 0),
      oiChange: parseFloat(item.oiChange || item.oiPChange || item.oi_change || 0),
    }));
  };

  return {
    longBuildup: parseItems(data?.long_buildup || data?.longBuildup || []),
    shortBuildup: parseItems(data?.short_buildup || data?.shortBuildup || []),
    shortCovering: parseItems(data?.short_covering || data?.shortCovering || []),
    longUnwinding: parseItems(data?.long_unwinding || data?.longUnwinding || []),
    lastUpdated: data?.lastUpdated || data?.last_updated || new Date().toISOString(),
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
