import { fetchWithFallback } from "./directApi";
import { supabase } from "@/integrations/supabase/client";

export interface TOIStrikesResponse {
  symbol: string;
  expiry: string;
  date: string;
  strikes: number[];
  atm: number;
}

export interface TOIDataEntry {
  FormatedTime: number;
  Time: string;
  Spot_Price: number;
  CE_OI: number;
  PE_OI: number;
  PCR_OI: string | number;
  OI_DIFF: number;
  CE_COI: number;
  PE_COI: number;
  PCR_COI: string | number;
  COI_DIFF: number;
  CE_VOLUME: number;
  PE_VOLUME: number;
  "CE_COI/CE_VOLUME": string | number;
  "PE_COI/PE_VOLUME": string | number;
  CE_OI_CHANGE: number;
  PE_OI_CHANGE: number;
  TREND: number;
}

export interface TOIDataResponse {
  symbol: string;
  date: string;
  expiry: string;
  data: TOIDataEntry[];
}

// Strikes endpoint is public - use direct call
export async function fetchTOIStrikes(
  symbol: string,
  expiry: string
): Promise<TOIStrikesResponse> {
  return fetchWithFallback<TOIStrikesResponse>({
    directPath: "/data/strikes.php",
    edgeFunctionName: "toi-data",
    edgeFunctionBody: { endpoint: "strikes", symbol, expiry },
    queryParams: { symbol, expiry },
  });
}

// Data endpoint requires bearer token - use edge function
export async function fetchTOIData(
  symbol: string,
  expiry: string,
  strikes: number[],
  historicalDate?: string
): Promise<TOIDataResponse> {
  const { data, error } = await supabase.functions.invoke("toi-data", {
    body: {
      endpoint: "data",
      symbol,
      expiry,
      strikes,
      historicalDate,
    },
  });

  if (error) {
    console.error("Error fetching TOI data:", error);
    throw error;
  }

  return data;
}
