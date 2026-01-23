import { supabase } from "@/integrations/supabase/client";

export interface ChartPosition {
  expiry: string;
  strike: number;
  lots: number;
  type: "Call" | "Put";
}

export interface OHLCDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi: number;
}

export interface StrategyChartResponse {
  data: OHLCDataPoint[];
  error?: string;
}

// Parse raw API response into structured OHLC data
// Response format: { "timestamp": [open, high, low, close, volume, oi], ... }
function parseChartData(raw: Record<string, number[]>): OHLCDataPoint[] {
  return Object.entries(raw)
    .map(([timestamp, values]) => ({
      timestamp: parseInt(timestamp),
      open: values[0] || 0,
      high: values[1] || 0,
      low: values[2] || 0,
      close: values[3] || 0,
      volume: values[4] || 0,
      oi: values[5] || 0,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

export async function fetchStrategyChartData(
  symbol: string,
  timeframe: string,
  longs: ChartPosition[],
  shorts: ChartPosition[]
): Promise<StrategyChartResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("strategy-chart-data", {
      body: {
        symbol,
        timeframe,
        longs,
        shorts,
      },
    });

    if (error) {
      console.error("Error fetching strategy chart data:", error);
      return { data: [], error: error.message || "Failed to fetch chart data" };
    }

    // Check for error in response
    if (data?.error) {
      return { data: [], error: data.error };
    }

    // Parse the raw response
    const parsedData = parseChartData(data || {});
    return { data: parsedData };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch chart data";
    console.error("Error:", errorMessage);
    return { data: [], error: errorMessage };
  }
}
