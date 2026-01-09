import { supabase } from "@/integrations/supabase/client";

export interface PremiumDecayStrikesResponse {
  symbol: string;
  expiry: string;
  date: string;
  strikes: number[];
  atm: number;
}

export interface PremiumDecayDataEntry {
  FormatedTime: number;
  Time: string;
  Spot_Price: number;
  ce_delta: number;
  pe_delta: number;
  ce_ltp: number;
  pe_ltp: number;
  ce_delta_ltp: number;
  pe_delta_ltp: number;
  ce_delta_ltp_chg: number;
  pe_delta_ltp_chg: number;
  ce_delta_ltp_start: number;
  pe_delta_ltp_start: number;
}

export interface PremiumDecayResponse {
  symbol: string;
  date: string;
  expiry: string;
  data: PremiumDecayDataEntry[];
}

export async function fetchPremiumDecayStrikes(
  symbol: string,
  expiry: string,
  date?: string
): Promise<PremiumDecayStrikesResponse> {
  const { data, error } = await supabase.functions.invoke("premium-decay-data", {
    body: {
      endpoint: "strikes",
      symbol,
      expiry,
      date,
    },
  });

  if (error) {
    console.error("Error fetching Premium Decay strikes:", error);
    throw error;
  }

  return data;
}

export async function fetchPremiumDecayData(
  symbol: string,
  expiry: string,
  strike: number,
  date?: string
): Promise<PremiumDecayResponse> {
  const { data, error } = await supabase.functions.invoke("premium-decay-data", {
    body: {
      endpoint: "data",
      symbol,
      expiry,
      strike,
      date,
    },
  });

  if (error) {
    console.error("Error fetching Premium Decay data:", error);
    throw error;
  }

  return data;
}
