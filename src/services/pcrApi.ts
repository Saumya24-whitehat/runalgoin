import { supabase } from "@/integrations/supabase/client";

export interface PCRStrikeData {
  Strike: number;
  "CE OI": number;
  "PE OI": number;
  "CE COI": number;
  "PE COI": number;
  "CE LTP": number;
  "PE LTP": number;
  PCR: number;
}

export interface PCRTimeData {
  time: string;
  dataThis: PCRStrikeData[];
  underlyning: number;
  atm: number;
  CE_OI: number;
  PE_OI: number;
  CE_COI: number;
  PE_COI: number;
  PCR_OI: number;
  PCR_COI: number;
  timestamp: number;
  Future: number;
  VWAP: number;
}

export interface PCRResponse {
  dataWhole: PCRTimeData[];
  error?: string;
}

export async function fetchPCRData(
  symbol: string,
  expiryDate: string,
  strikeCount: number = 5,
  historicalDate?: string
): Promise<PCRResponse> {
  const { data, error } = await supabase.functions.invoke("pcr-data", {
    body: {
      symbol,
      expiry_date: expiryDate,
      strikeCount,
      historicalDate,
    },
  });

  if (error) {
    console.error("Error fetching PCR data:", error);
    throw new Error(error.message || "Failed to fetch PCR data");
  }

  return data as PCRResponse;
}
