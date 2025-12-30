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
  expiry: string
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
    // Get spot price
    if (data.spotPrice) {
      spotPrice = parseFloat(data.spotPrice);
    } else if (data.underlyingValue) {
      spotPrice = parseFloat(data.underlyingValue);
    }

    // Get lot size
    if (data.lot) {
      lotSize = parseInt(data.lot);
    }

    // Parse strikes data
    // The API typically returns CE and PE data in arrays
    const ceData = data.CE || data.ce || [];
    const peData = data.PE || data.pe || [];
    const strikeArray = data.strikeArray || data.strikes || [];

    // Try to match CE and PE data by strike
    if (Array.isArray(strikeArray) && strikeArray.length > 0) {
      const uniqueStrikes = [...new Set(strikeArray.map((s: any) => parseFloat(s)))].sort((a, b) => a - b);
      
      uniqueStrikes.forEach((strike) => {
        const strikeNum = typeof strike === 'string' ? parseFloat(strike) : strike;
        const strikeIdx = strikeArray.findIndex((s: any) => parseFloat(s) === strikeNum);
        
        strikes.push({
          strike: strikeNum,
          cePrice: ceData[strikeIdx]?.ltp || ceData[strikeIdx]?.price || 0,
          pePrice: peData[strikeIdx]?.ltp || peData[strikeIdx]?.price || 0,
          ceIV: ceData[strikeIdx]?.iv || 0,
          peIV: peData[strikeIdx]?.iv || 0,
          ceOI: ceData[strikeIdx]?.oi || 0,
          peOI: peData[strikeIdx]?.oi || 0,
          ceVolume: ceData[strikeIdx]?.volume || 0,
          peVolume: peData[strikeIdx]?.volume || 0,
          ceDelta: ceData[strikeIdx]?.delta,
          peDelta: peData[strikeIdx]?.delta,
          ceGamma: ceData[strikeIdx]?.gamma,
          peGamma: peData[strikeIdx]?.gamma,
          ceTheta: ceData[strikeIdx]?.theta,
          peTheta: peData[strikeIdx]?.theta,
          ceVega: ceData[strikeIdx]?.vega,
          peVega: peData[strikeIdx]?.vega,
        });
      });
    }

    // Alternative parsing if data comes in a different format
    if (strikes.length === 0 && data.data) {
      const rawData = data.data;
      Object.keys(rawData).forEach((key) => {
        const strikeData = rawData[key];
        if (strikeData && strikeData.strike) {
          strikes.push({
            strike: parseFloat(strikeData.strike),
            cePrice: parseFloat(strikeData.ceLtp || 0),
            pePrice: parseFloat(strikeData.peLtp || 0),
            ceIV: parseFloat(strikeData.ceIv || 0),
            peIV: parseFloat(strikeData.peIv || 0),
            ceOI: parseFloat(strikeData.ceOi || 0),
            peOI: parseFloat(strikeData.peOi || 0),
            ceVolume: parseFloat(strikeData.ceVol || 0),
            peVolume: parseFloat(strikeData.peVol || 0),
          });
        }
      });
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
  
  return adjustments.map(adj => {
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
