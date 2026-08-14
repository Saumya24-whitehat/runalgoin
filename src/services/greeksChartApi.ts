import { supabase } from "@/integrations/supabase/client";

// Data format: [ltp, oi, iv, delta, theta, gamma, vega]
export interface GreeksDataPoint {
  timestamp: number;
  ltp: number;
  oi: number;
  iv: number;
  delta: number;
  theta: number;
  gamma: number;
  vega: number;
  prevOi: number;
  coi: number;
}

export interface GreeksResponse {
  symbol: string;
  date: string;
  expiry: string;
  callData?: Record<string, number[]>;
  putData?: Record<string, number[]>;
  error?: string;
}

export interface ParsedGreeksData {
  symbol: string;
  date: string;
  expiry: string;
  callData: GreeksDataPoint[];
  putData: GreeksDataPoint[];
}

// Parse raw API response into structured data
function parseGreeksData(raw: Record<string, number[]>): GreeksDataPoint[] {
  return Object.entries(raw)
    .map(([timestamp, values]) => ({
      timestamp: parseInt(timestamp),
      ltp: values[0] || 0,
      oi: values[1] || 0,
      iv: values[2] || 0,
      delta: values[3] || 0,
      theta: values[4] || 0,
      gamma: values[5] || 0,
      vega: values[6] || 0,
      prevOi: values[7] || 0,
      coi: values[7] ? (values[1] || 0) - values[7] : 0,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

export async function fetchGreeksData(
  symbol: string,
  expiry: string,
  strike: number,
  optionType: "Call" | "Put",
  timeframe: string = "3min"
): Promise<GreeksResponse> {
  const { data, error } = await supabase.functions.invoke("greeks-data", {
    body: {
      symbol,
      expiry,
      strike,
      optionType,
      timeframe,
    },
  });

  if (error) {
    console.error("Error fetching Greeks data:", error);
    throw new Error(error.message || "Failed to fetch Greeks data");
  }

  return data as GreeksResponse;
}

// Fetch both Call and Put data for a strike
export async function fetchCombinedGreeksData(
  symbol: string,
  expiry: string,
  strike: number,
  timeframe: string = "3min"
): Promise<ParsedGreeksData> {
  // Fetch both Call and Put data in parallel
  const [callResponse, putResponse] = await Promise.all([
    fetchGreeksData(symbol, expiry, strike, "Call", timeframe),
    fetchGreeksData(symbol, expiry, strike, "Put", timeframe),
  ]);

  return {
    symbol: callResponse.symbol || symbol,
    date: callResponse.date || "",
    expiry: callResponse.expiry || expiry,
    callData: callResponse.callData ? parseGreeksData(callResponse.callData) : [],
    putData: putResponse.putData ? parseGreeksData(putResponse.putData) : [],
  };
}

// Fetch single option type data
export async function fetchSingleGreeksData(
  symbol: string,
  expiry: string,
  strike: number,
  optionType: "Call" | "Put",
  timeframe: string = "3min"
): Promise<GreeksDataPoint[]> {
  const response = await fetchGreeksData(symbol, expiry, strike, optionType, timeframe);
  
  const rawData = optionType === "Call" ? response.callData : response.putData;
  return rawData ? parseGreeksData(rawData) : [];
}
