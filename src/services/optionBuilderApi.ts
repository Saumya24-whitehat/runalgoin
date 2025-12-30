import { supabase } from "@/integrations/supabase/client";

export interface OptionData {
  instrument_key: string;
  market_data: {
    ltp: number;
    oi: number;
    volume: number;
    prev_oi?: number;
  };
  option_greeks: {
    iv: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
}

export interface ExpiryData {
  strikes: number[];
  ceToken: string[];
  peToken: string[];
  data: {
    strike_price: number;
    underlying_spot_price: number;
    call_options: OptionData;
    put_options: OptionData;
  }[];
}

export interface OptionChainResponse {
  strikeArray: number[];
  strikeDiff: number;
  lot: number;
  spotPrice: number;
  futureToken: string[];
  futureNames: string[];
  futureExpiry: string[];
  ceTokens: string[];
  peTokens: string[];
  spotToken: string;
  expiryWise: Record<string, ExpiryData>;
}

export interface Position {
  id?: string;
  action: 'Buy' | 'Sell';
  lots: number;
  date: string;
  expiry: string;
  strike: number;
  optType: 'CE' | 'PE' | 'FUTURE';
  entryPrice: number;
  currentPrice: number;
  exitPrice?: number;
  IV: number;
  lotSize: number;
  enabled: boolean;
  instrumentToken?: string;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface MarginData {
  finalMargin: number;
  spanMargin?: number;
  exposureMargin?: number;
}

export const fetchOptionChainData = async (symbol: string): Promise<OptionChainResponse> => {
  const { data, error } = await supabase.functions.invoke('option-builder-data', {
    body: { action: 'getOptionChain', symbol },
  });

  if (error) {
    console.error('Error fetching option chain data:', error);
    throw error;
  }

  return data;
};

export const calculateMargin = async (positions: { instrumentKey: string; side: string; quantity: number; product: string }[]): Promise<MarginData> => {
  const { data, error } = await supabase.functions.invoke('option-builder-data', {
    body: { action: 'getMargin', positions },
  });

  if (error) {
    console.error('Error calculating margin:', error);
    throw error;
  }

  return data?.response?.data || { finalMargin: 0 };
};

// Black-Scholes calculation for P&L projections
export const blackScholesCall = (S: number, K: number, T: number, r: number, sigma: number): number => {
  if (T <= 0) return Math.max(0, S - K);
  
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  
  const Nd1 = normalCDF(d1);
  const Nd2 = normalCDF(d2);
  
  return S * Nd1 - K * Math.exp(-r * T) * Nd2;
};

export const blackScholesPut = (S: number, K: number, T: number, r: number, sigma: number): number => {
  if (T <= 0) return Math.max(0, K - S);
  
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  
  const Nd1 = normalCDF(-d1);
  const Nd2 = normalCDF(-d2);
  
  return K * Math.exp(-r * T) * Nd2 - S * Nd1;
};

const normalCDF = (x: number): number => {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
};

// Calculate P&L at expiry for a given spot price
export const calculatePLAtExpiry = (positions: Position[], spotPrice: number): number => {
  let totalPL = 0;

  positions.forEach(position => {
    if (!position.enabled) return;

    // If position is exited, calculate based on exit price
    if (position.exitPrice !== undefined) {
      const pl = (position.exitPrice - position.entryPrice) * position.lots * position.lotSize * (position.action === 'Buy' ? 1 : -1);
      totalPL += pl;
      return;
    }

    let positionPL = 0;

    if (position.optType === 'CE') {
      if (spotPrice > position.strike) {
        positionPL = (spotPrice - position.strike - position.entryPrice) * position.lots * position.lotSize;
      } else {
        positionPL = -position.entryPrice * position.lots * position.lotSize;
      }
    } else if (position.optType === 'PE') {
      if (spotPrice < position.strike) {
        positionPL = (position.strike - spotPrice - position.entryPrice) * position.lots * position.lotSize;
      } else {
        positionPL = -position.entryPrice * position.lots * position.lotSize;
      }
    } else if (position.optType === 'FUTURE') {
      positionPL = (spotPrice - position.entryPrice) * position.lots * position.lotSize;
    }

    totalPL += positionPL * (position.action === 'Buy' ? 1 : -1);
  });

  return totalPL;
};

// Parse expiry string to date
export const parseExpiryDate = (expiry: string): Date => {
  // Format: "27MAR25" or "2025-03-27"
  if (expiry.includes('-')) {
    return new Date(expiry);
  }
  
  const day = parseInt(expiry.substring(0, 2));
  const monthStr = expiry.substring(2, 5);
  const year = parseInt("20" + expiry.substring(5, 7));
  
  const months: Record<string, number> = {
    "JAN": 0, "FEB": 1, "MAR": 2, "APR": 3, "MAY": 4, "JUN": 5,
    "JUL": 6, "AUG": 7, "SEP": 8, "OCT": 9, "NOV": 10, "DEC": 11
  };
  
  return new Date(year, months[monthStr] || 0, day);
};

// Calculate days until expiry
export const getDaysUntilExpiry = (expiry: string): number => {
  const expiryDate = parseExpiryDate(expiry);
  const today = new Date();
  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

// Calculate P&L for today using Black-Scholes
export const calculatePLToday = (positions: Position[], spotPrice: number): number => {
  let totalPL = 0;
  const r = 0.05; // Risk-free rate

  positions.forEach(position => {
    if (!position.enabled) return;
    
    if (position.exitPrice !== undefined) {
      const pl = (position.exitPrice - position.entryPrice) * position.lots * position.lotSize * (position.action === 'Buy' ? 1 : -1);
      totalPL += pl;
      return;
    }

    const daysToExpiry = getDaysUntilExpiry(position.expiry);
    const T = daysToExpiry / 365;
    const volatility = (position.IV || 15) / 100;

    let theoreticalPrice = 0;
    if (position.optType === 'CE') {
      theoreticalPrice = blackScholesCall(spotPrice, position.strike, T, r, volatility);
    } else if (position.optType === 'PE') {
      theoreticalPrice = blackScholesPut(spotPrice, position.strike, T, r, volatility);
    } else if (position.optType === 'FUTURE') {
      theoreticalPrice = spotPrice;
    }

    const positionPL = (theoreticalPrice - position.entryPrice) * position.lots * position.lotSize * (position.action === 'Buy' ? 1 : -1);
    totalPL += positionPL;
  });

  return totalPL;
};

// Calculate dynamic price range based on current price and days to expiry
export const calculatePriceRange = (currentPrice: number, daysToExpiry: number = 30): { startPrice: number; endPrice: number; step: number } => {
  const scaleFactor = Math.max(1, Math.sqrt(daysToExpiry));
  const rangeWidth = Math.ceil(200 * scaleFactor);
  
  return {
    startPrice: Math.floor(currentPrice - rangeWidth),
    endPrice: Math.ceil(currentPrice + rangeWidth),
    step: 1
  };
};

// Generate P&L data for chart
export const generatePLChartData = (
  positions: Position[],
  currentPrice: number,
  rangePercent: number = 0.05
): { expiry: [number, number][]; today: [number, number][] } => {
  const enabledPositions = positions.filter(p => p.enabled);
  
  if (enabledPositions.length === 0) {
    return { expiry: [], today: [] };
  }

  // Get days to expiry from first position
  const daysToExpiry = enabledPositions.length > 0 
    ? getDaysUntilExpiry(enabledPositions[0].expiry) 
    : 30;

  const { startPrice, endPrice, step } = calculatePriceRange(currentPrice, daysToExpiry);

  const expiryData: [number, number][] = [];
  const todayData: [number, number][] = [];

  for (let price = startPrice; price <= endPrice; price += step) {
    expiryData.push([price, calculatePLAtExpiry(enabledPositions, price)]);
    todayData.push([price, calculatePLToday(enabledPositions, price)]);
  }

  return { expiry: expiryData, today: todayData };
};

// Calculate Greeks totals
export const calculateTotalGreeks = (positions: Position[]): { delta: number; gamma: number; theta: number; vega: number } => {
  let totalDelta = 0;
  let totalGamma = 0;
  let totalTheta = 0;
  let totalVega = 0;

  positions.forEach(position => {
    if (!position.enabled || position.exitPrice !== undefined) return;

    const multiplier = position.lots * position.lotSize * (position.action === 'Buy' ? 1 : -1);

    totalDelta += (position.delta || 0) * multiplier;
    totalGamma += (position.gamma || 0) * multiplier;
    totalTheta += (position.theta || 0) * multiplier;
    totalVega += (position.vega || 0) * multiplier;
  });

  return {
    delta: totalDelta,
    gamma: totalGamma,
    theta: totalTheta,
    vega: totalVega,
  };
};

// Find breakeven points
export const findBreakevenPoints = (plData: [number, number][]): number[] => {
  const breakevenPoints: number[] = [];

  for (let i = 0; i < plData.length - 1; i++) {
    const [price1, pl1] = plData[i];
    const [price2, pl2] = plData[i + 1];

    if ((pl1 <= 0 && pl2 >= 0) || (pl1 >= 0 && pl2 <= 0)) {
      const ratio = Math.abs(pl1) / (Math.abs(pl1) + Math.abs(pl2));
      const breakeven = price1 + ratio * (price2 - price1);
      if (!isNaN(breakeven)) {
        breakevenPoints.push(Math.round(breakeven * 100) / 100);
      }
    }
  }

  return breakevenPoints;
};

// Format number in Indian notation
export const formatIndianNumber = (num: number): string => {
  const x = num.toString().split(".");
  let intPart = x[0];
  const decPart = x.length > 1 ? "." + x[1] : "";

  let lastThree = intPart.substring(intPart.length - 3);
  const otherNumbers = intPart.substring(0, intPart.length - 3);

  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }

  return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree + decPart;
};
