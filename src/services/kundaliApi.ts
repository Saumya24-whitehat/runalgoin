import { supabase } from "@/integrations/supabase/client";

export interface KundaliTimeData {
  time: string;
  underlyning: number;
  atm: number;
  oiConditionPE: [string, number];
  oiConditionCE: [string, number];
  volumeConditionPE: [string, number];
  volumeConditionCE: [string, number];
  max_ce_volume: number;
  max_pe_volume: number;
  max_ce_oi: number;
  max_pe_oi: number;
  max_ce_volume2: number;
  max_pe_volume2: number;
  max_ce_oi2: number;
  max_pe_oi2: number;
  max_ce_strike: number;
  max_pe_strike: number;
  max_ce_strike_oi: number;
  max_pe_strike_oi: number;
  max_ce_strike2: number;
  max_pe_strike2: number;
  max_ce_strike_oi2: number;
  max_pe_strike_oi2: number;
}

export interface KundaliResponse {
  dataWhole: KundaliTimeData[];
  error?: string;
}

export interface SupportResistanceData {
  support: string;
  strongSupport: number;
  resistance: string;
  strongResistance: number;
  spotPrice: number;
}

export async function fetchKundaliData(
  symbol: string,
  expiryDate: string,
  strikeCount: number = 100
): Promise<KundaliResponse> {
  const { data, error } = await supabase.functions.invoke("kundali-data", {
    body: {
      symbol,
      expiry_date: expiryDate,
      strikeCount,
    },
  });

  if (error) {
    console.error("Error fetching Kundali data:", error);
    throw new Error(error.message || "Failed to fetch Kundali data");
  }

  return data as KundaliResponse;
}

export function extractSupportResistance(data: KundaliTimeData[], spotPrice: number): SupportResistanceData | null {
  if (!data || data.length === 0) return null;
  
  const latestData = data[data.length - 1];
  
  return {
    // volumeConditionPE[0] + " " + max_pe_strike
    support: `${latestData.volumeConditionPE[0]} ${latestData.max_pe_strike}`,
    // max_pe_strike2
    strongSupport: latestData.max_pe_strike2,
    // volumeConditionCE[0] + " " + max_ce_strike
    resistance: `${latestData.volumeConditionCE[0]} ${latestData.max_ce_strike}`,
    // max_ce_strike2
    strongResistance: latestData.max_ce_strike2,
    spotPrice,
  };
}
