import { supabase } from "@/integrations/supabase/client";

export interface SimulatorExpiryDate {
  expiry: string;
  label: string;
}

export interface SimulatorStrikeData {
  strike: number;
  cePrice: number;
  pePrice: number;
  ceIV: number;
  peIV: number;
  ceOI: number;
  peOI: number;
  ceCOI: number;
  peCOI: number;
  ceVolume: number;
  peVolume: number;
  ceDelta?: number;
  peDelta?: number;
  ceGamma?: number;
  peGamma?: number;
  ceTheta?: number;
  peTheta?: number;
  ceVega?: number;
  peVega?: number;
}

export interface SimulatorData {
  spotPrice: number;
  lotSize: number;
  strikes: SimulatorStrikeData[];
  expiry: string;
  date: string;
  time: string;
}

// Fetch trading days
export async function fetchTradingDays(): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke("option-simulator-data", {
    body: {
      action: "getTradingDays",
    },
  });

  if (error) {
    console.error("Error fetching trading days:", error);
    throw error;
  }

  // The API returns an array of trading days in YYYY-MM-DD format
  if (Array.isArray(data)) {
    return data;
  }

  return [];
}

// Fetch available expiry dates for a symbol on a given date
export async function fetchSimulatorExpiryDates(symbol: string, date: string): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke("option-simulator-data", {
    body: {
      action: "getExpiryDates",
      symbol,
      date,
    },
  });

  if (error) {
    console.error("Error fetching expiry dates:", error);
    throw error;
  }

  // Handle response format: { symbol: "Nifty 50", latest_date: "...", expiry_dates: [...] }
  if (data && data.expiry_dates && Array.isArray(data.expiry_dates)) {
    return data.expiry_dates;
  }

  // Fallback: The API returns an array of expiry dates directly
  if (Array.isArray(data)) {
    return data;
  }

  // Handle other object response formats
  if (data && data.expiries) {
    return data.expiries;
  }

  return [];
}

// Fetch strikes data for a specific symbol, date, time, and expiry
export async function fetchSimulatorStrikesData(
  symbol: string,
  date: string,
  time: string,
  expiry: string,
): Promise<SimulatorData> {
  const { data, error } = await supabase.functions.invoke("option-simulator-data", {
    body: {
      action: "getStrikesData",
      symbol,
      date,
      time,
      expiry,
    },
  });

  if (error) {
    console.error("Error fetching strikes data:", error);
    throw error;
  }

  // Parse the response
  const strikes: SimulatorStrikeData[] = [];
  let spotPrice = 0;
  let lotSize = 75;

  // Extract data from API response
  if (data) {
    // Get lot size from response
    if (data.lot) {
      lotSize = parseInt(data.lot);
    }

    // Parse expiryWise data format
    // Format: { expiryWise: { "2025-12-30": { strikes: [...], data: [...] } } }
    const expiryData = data.expiryWise?.[expiry];

    if (expiryData && Array.isArray(expiryData.data)) {
      expiryData.data.forEach((item: any) => {
        // Get spot price from first item
        if (spotPrice === 0 && item.underlying_spot_price) {
          spotPrice = parseFloat(item.underlying_spot_price);
        }

        const callOptions = item.call_options || {};
        const putOptions = item.put_options || {};
        const callMarket = callOptions.market_data || {};
        const putMarket = putOptions.market_data || {};
        const callGreeks = callOptions.option_greeks || {};
        const putGreeks = putOptions.option_greeks || {};

        console.log(putGreeks);
        console.log(callGreeks);
        // consol
        strikes.push({
          strike: parseFloat(item.strike_price),
          cePrice: parseFloat(callMarket.ltp) || 0,
          pePrice: parseFloat(putMarket.ltp) || 0,
          ceIV: parseFloat(callGreeks.iv) || 0,
          peIV: parseFloat(putGreeks.iv) || 0,
          ceOI: parseFloat(callMarket.oi) || 0,
          peOI: parseFloat(putMarket.oi) || 0,
          ceCOI: parseFloat(callMarket.oi) - parseFloat(callMarket.prev_oi) || 0,
          peCOI: parseFloat(putMarket.oi) - parseFloat(callMarket.prev_oi) || 0,
          ceVolume: parseFloat(callMarket.volume) || 0,
          peVolume: parseFloat(putMarket.volume) || 0,
          ceDelta: callGreeks.delta || 0,
          peDelta: putGreeks.delta || 0,
          ceGamma: callGreeks.gamma || 0,
          peGamma: putGreeks.gamma || 0,
          ceTheta: callGreeks.theta || 0,
          peTheta: putGreeks.theta || 0,
          ceVega: callGreeks.vega || 0,
          peVega: putGreeks.vega || 0,
        });
      });
    }

    // Fallback: try TotalATMvalues if expiryWise is not available
    if (strikes.length === 0 && data.TotalATMvalues) {
      // Get spot price from first data item if available
      const firstDataItem = data.expiryWise?.[Object.keys(data.expiryWise || {})[0]]?.data?.[0];
      if (firstDataItem?.underlying_spot_price) {
        spotPrice = parseFloat(firstDataItem.underlying_spot_price);
      }
    }
  }

  return {
    spotPrice,
    lotSize,
    strikes: strikes.sort((a, b) => a.strike - b.strike),
    expiry,
    date,
    time,
  };
}

// Format time for API (e.g., "09:15" -> "0915")
export function formatTimeForApi(time: string): string {
  return time.replace(":", "");
}

// Format date for API (YYYY-MM-DD)
export function formatDateForApi(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Get available time slots for market hours (3-minute intervals)
export function getMarketTimeSlots(): { value: string; label: string }[] {
  const slots = [];
  for (let hour = 9; hour <= 15; hour++) {
    for (let min = 0; min < 60; min += 3) {
      if (hour === 9 && min < 15) continue; // Market opens at 9:15
      if (hour === 15 && min > 30) continue; // Market closes at 15:30

      const h = hour.toString().padStart(2, "0");
      const m = min.toString().padStart(2, "0");
      slots.push({
        value: `${h}${m}`,
        label: `${h}:${m}`,
      });
    }
  }
  return slots;
}

// Get time slots for quick selection buttons
export function getQuickTimeSlots(currentTime: string): { label: string; value: string }[] {
  const currentMinutes = parseInt(currentTime.slice(0, 2)) * 60 + parseInt(currentTime.slice(2));

  const adjustments = [
    { label: "-2h", minutes: -120 },
    { label: "-30m", minutes: -30 },
    { label: "-15m", minutes: -15 },
    { label: "-3m", minutes: -3 },
    { label: "3m+", minutes: 3 },
    { label: "15m+", minutes: 15 },
    { label: "30m+", minutes: 30 },
    { label: "2h+", minutes: 120 },
  ];

  return adjustments.map((adj) => {
    let newMinutes = currentMinutes + adj.minutes;
    // Clamp to market hours (9:15 = 555 to 15:30 = 930)
    newMinutes = Math.max(555, Math.min(930, newMinutes));

    const hours = Math.floor(newMinutes / 60);
    const mins = newMinutes % 60;
    const value = hours.toString().padStart(2, "0") + mins.toString().padStart(2, "0");

    return { label: adj.label, value };
  });
}

// Get lot size for symbol
export function getLotSizeForSymbol(symbol: string): number {
  const lotSizes: Record<string, number> = {
    "Nifty 50": 75,
    "Nifty Bank": 30,
    "Nifty Fin Service": 65,
    "Nifty Mid Select": 120,
  };
  return lotSizes[symbol] || 75;
}
