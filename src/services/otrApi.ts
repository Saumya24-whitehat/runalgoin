import { supabase } from "@/integrations/supabase/client";

export interface OTRDataEntry {
  Combined_PCR_OI: number;
  Combined_PCR_COI: number;
  Spot_Price: number;
  Time: string;
  Total_Call_OI: number;
  Total_Put_OI: number;
  Total_Call_COI: number;
  Total_Put_COI: number;
}

export interface OTRDataResponse {
  symbol: string;
  date: string;
  expiry: string;
  timeframe: string;
  data: OTRDataEntry[];
  yesterday_date?: string;
  previous_day?: OTRDataEntry[];
}

export async function fetchOTRData(
  symbol: string,
  expiry: string,
  strikeCount: number = 5,
  tf: string = "3min",
  historicalDate?: string
): Promise<OTRDataResponse> {
  const { data, error } = await supabase.functions.invoke("otr-data", {
    body: {
      symbol,
      expiry,
      strikeCount,
      tf,
      historicalDate,
    },
  });

  if (error) {
    console.error("Error fetching OTR data:", error);
    throw error;
  }

  return data;
}
