import { supabase } from "@/integrations/supabase/client";

export interface MMAData {
  timestamp: string;
  BankniftyPrice: number;
  NP: number;
  "PositiveZ-IndexAverage": number;
  "NegativeZ-IndexAverage": number;
  BankniftyChangeAverage: number;
  NPChangeAverage: number;
}

export interface PCRAllStrikesTimeData {
  Time: string;
  Spot_Price: number;
  PCR_OI: Record<string, number>;
  PCR_COI: Record<string, number>;
  color_oi_per_strike: Record<string, string>;
  color_coi_per_strike: Record<string, string>;
  MMA_Data: MMAData;
}

export interface PCRAllStrikesResponse {
  symbol: string;
  date: string;
  expiry: string;
  data: PCRAllStrikesTimeData[];
  error?: string;
}

export async function fetchPCRAllStrikesData(
  symbol: string,
  expiryDate: string,
  strikeCount: number = 5,
  historicalDate?: string
): Promise<PCRAllStrikesResponse> {
  const { data, error } = await supabase.functions.invoke("pcr-all-strikes", {
    body: {
      symbol,
      expiry_date: expiryDate,
      strikeCount,
      historicalDate,
    },
  });

  if (error) {
    console.error("Error fetching PCR All Strikes data:", error);
    throw new Error(error.message || "Failed to fetch PCR All Strikes data");
  }

  return data as PCRAllStrikesResponse;
}
