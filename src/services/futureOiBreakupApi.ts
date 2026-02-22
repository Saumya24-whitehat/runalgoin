import { fetchWithFallback } from "./directApi";

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
  const rawData = await fetchWithFallback<any>({
    directPath: "/data/calculateFutureData.php",
    edgeFunctionName: "option-chain", // fallback to any available proxy
    queryParams: { symbol, expiry_date: expiryDate },
  });

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

export interface ProcessedFutureOiData extends FutureOiDataPoint {
  totalOiChange: number;
  totalOiChangePercent: number;
  dayHigh: number;
  dayLow: number;
  priceChange: number;
  oiChange: number;
  buildup: string;
  isNewDayHigh: boolean;
  isNewDayLow: boolean;
}

export function processFutureOiData(data: FutureOiDataPoint[]): ProcessedFutureOiData[] {
  if (data.length === 0) return [];

  const firstRow = data[0];
  let runningDayHigh = firstRow.high;
  let runningDayLow = firstRow.low;
  const firstOi = firstRow.oi;

  return data.map((row, index) => {
    const prevRow = index > 0 ? data[index - 1] : null;

    let isNewDayHigh = false;
    let isNewDayLow = false;

    if (row.high > runningDayHigh) {
      runningDayHigh = row.high;
      isNewDayHigh = true;
    }

    if (row.low < runningDayLow) {
      runningDayLow = row.low;
      isNewDayLow = true;
    }

    const oiChange = prevRow ? row.oi - prevRow.oi : 0;
    const totalOiChange = row.oi - firstOi;
    const totalOiChangePercent = firstOi > 0 ? (totalOiChange / firstOi) * 100 : 0;

    const priceChange = row.close - row.previousClose;

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
