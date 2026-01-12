import { supabase } from "@/integrations/supabase/client";

export interface FutureOiDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi: number;
  previousClose: number;
  tr: number;
  atr14: number;
  datetime: number;
  typicalPrice: number;
  cumulativeTPVolume: number;
  cumulativeVolume: number;
  vwap: number;
}

export interface FutureOiBreakupResponse {
  data: FutureOiDataPoint[];
  date: string;
}

export async function fetchFutureOiBreakup(symbol: string, expiryDate: string): Promise<FutureOiBreakupResponse> {
  const url = `https://runalgo.xyz/data/calculateFutureData.php?symbol=${encodeURIComponent(symbol)}&expiry_date=${encodeURIComponent(expiryDate)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch future OI data: ${response.statusText}`);
  }

  const rawData = await response.json();

  // Transform the data from the API format
  const dataWhole = rawData.dataWhole || {};
  const date = rawData.date || "";

  const data: FutureOiDataPoint[] = Object.entries(dataWhole).map(([time, values]: [string, any]) => ({
    time,
    open: values.Open || 0,
    high: values.High || 0,
    low: values.Low || 0,
    close: values.Close || 0,
    volume: values.Volume || 0,
    oi: values.Oi || 0,
    previousClose: values["Previous Close"] || 0,
    tr: values.TR || 0,
    atr14: values.ATR_14 || 0,
    datetime: values.Datetime2 || 0,
    typicalPrice: values.Typical_Price || 0,
    cumulativeTPVolume: values.Cumulative_TP_Volume || 0,
    cumulativeVolume: values.Cumulative_Volume || 0,
    vwap: values.VWAP || 0,
  }));

  // Sort by time
  data.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return { data, date };
}

// Calculate derived values for the table
export interface ProcessedFutureOiData extends FutureOiDataPoint {
  totalOiChange: number;
  totalOiChangePercent: number;
  dayHigh: number;
  dayLow: number;
  priceChange: number;
  oiChange: number;
  buildup: string;
}

export function processFutureOiData(data: FutureOiDataPoint[]): ProcessedFutureOiData[] {
  if (data.length === 0) return [];

  const firstRow = data[0];
  let runningDayHigh = firstRow.high;
  let runningDayLow = firstRow.low;
  const firstOi = firstRow.oi;

  return data.map((row, index) => {
    const prevRow = index > 0 ? data[index - 1] : null;

    // Flags before updating running values
    let isNewDayHigh = false;
    let isNewDayLow = false;

    // Check & update running Day High
    if (row.high > runningDayHigh) {
      runningDayHigh = row.high;
      isNewDayHigh = true;
    }

    // Check & update running Day Low
    if (row.low < runningDayLow) {
      runningDayLow = row.low;
      isNewDayLow = true;
    }

    // Calculate OI changes
    const oiChange = prevRow ? row.oi - prevRow.oi : 0;
    const totalOiChange = row.oi - firstOi;
    const totalOiChangePercent = firstOi > 0 ? (totalOiChange / firstOi) * 100 : 0;

    // Price change
    const priceChange = row.close - row.previousClose;

    // Determine buildup
    let buildup = "Neutral";
    if (oiChange > 0 && priceChange > 0) buildup = "Long Buildup";
    else if (oiChange > 0 && priceChange < 0) buildup = "Short Buildup";
    else if (oiChange < 0 && priceChange > 0) buildup = "Short Covering";
    else if (oiChange < 0 && priceChange < 0) buildup = "Long Unwinding";

    return {
      ...row,
      totalOiChange,
      totalOiChangePercent,
      dayHigh: runningDayHigh,
      dayLow: runningDayLow,
      priceChange,
      oiChange,
      buildup,
      isNewDayHigh,
      isNewDayLow,
    };
  });
}
