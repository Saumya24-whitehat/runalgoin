import { supabase } from "@/integrations/supabase/client";

export interface LongShortStrikeData {
  Strike: number;
  "CE LTP": number;
  "PE LTP": number;
  "Call Buying": number;
  "Call Writing": number;
  "Put Buying": number;
  "Put Writing": number;
  "Call Long/Short": number;
  "Put Long/Short": number;
}

export interface LongShortTimeData {
  time: string;
  dataThis: LongShortStrikeData[];
  underlyning: number;
  atm: number;
  CE_Buy_OI: number;
  PE_Buy_OI: number;
  CE_Sell_OI: number;
  PE_Sell_OI: number;
  "CE_Sell/Buy": number;
  "PE_Sell/Buy": number;
  PCR_OI: number;
  PCR_COI: number;
}

export interface LongShortResponse {
  dataWhole: LongShortTimeData[];
  error?: string;
}

export async function fetchPCRLongShortData(
  symbol: string,
  expiryDate: string,
  strikeCount: number = 5,
  historicalDate?: string
): Promise<LongShortResponse> {
  const { data, error } = await supabase.functions.invoke("pcr-long-short", {
    body: {
      symbol,
      expiry_date: expiryDate,
      strikeCount,
      historicalDate,
    },
  });

  if (error) {
    console.error("Error fetching PCR Long/Short data:", error);
    throw new Error(error.message || "Failed to fetch PCR Long/Short data");
  }

  return data as LongShortResponse;
}
