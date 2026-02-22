import { supabase } from "@/integrations/supabase/client";
import { fetchWithFallback } from "./directApi";

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

// This endpoint does server-side data categorization, keep using edge function
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

// Expiry dates endpoint is a simple proxy - use direct call
export async function fetchFutureExpiryDates(symbol: string): Promise<string[]> {
  try {
    const data = await fetchWithFallback<any>({
      directPath: "/data/getExpiryDates2.php",
      edgeFunctionName: "option-chain",
      edgeFunctionBody: { action: "getExpiryDates", symbol },
      queryParams: { symbol },
    });

    return data?.expiry_dates || [];
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to fetch expiry dates");
  }
}
