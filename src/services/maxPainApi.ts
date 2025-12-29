import { supabase } from "@/integrations/supabase/client";

export interface MaxPainStrikeData {
  CE: number;
  PE: number;
  Total: number;
}

export interface MaxPainTimeEntry {
  Time: string;
  maxPainStrike: number;
  index: number;
  atm: number;
  data: Record<string, MaxPainStrikeData>;
  date: string;
}

export interface MaxPainResponse {
  DataWhole: MaxPainTimeEntry[];
}

export async function fetchMaxPainData(
  symbol: string,
  expiryDate: string,
  tf: string = "1min",
  historicalDate?: string
): Promise<MaxPainResponse> {
  const { data, error } = await supabase.functions.invoke("maxpain-data", {
    body: {
      symbol,
      expiry_date: expiryDate,
      tf,
      historicalDate,
    },
  });

  if (error) {
    console.error("Error fetching max pain data:", error);
    throw new Error("Failed to fetch max pain data");
  }

  return data as MaxPainResponse;
}
