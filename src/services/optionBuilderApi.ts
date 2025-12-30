import { supabase } from "@/integrations/supabase/client";

export interface OptionChainData {
  TotalATMvalues?: number[];
  strikeArray?: number[];
  Id?: string;
  Get_Tokens?: string[];
  lot?: number;
  multiplier?: number;
  FutureToken?: string;
  FutureNames?: string[];
  FutureExpiry?: string[];
  CE_Tokens?: string[];
  PE_Tokens?: string[];
  SpotToken_upstox?: string;
  SpotToken?: string;
  strike_diff?: number;
  expiryWise?: Record<string, ExpiryData>;
}

export interface ExpiryData {
  strikes: number[];
  ceToken: string[];
  peToken: string[];
  data: OptionStrikeData[];
}

export interface OptionStrikeData {
  strike_price: number;
  ce_ltp?: number;
  pe_ltp?: number;
  ce_iv?: number;
  pe_iv?: number;
  ce_delta?: number;
  pe_delta?: number;
  ce_gamma?: number;
  pe_gamma?: number;
  ce_theta?: number;
  pe_theta?: number;
  ce_vega?: number;
  pe_vega?: number;
  ce_oi?: number;
  pe_oi?: number;
  ce_volume?: number;
  pe_volume?: number;
  ce_token?: string;
  pe_token?: string;
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

export const fetchOptionChainData = async (symbol: string): Promise<OptionChainData> => {
  const { data, error } = await supabase.functions.invoke('option-builder-data', {
    body: { action: 'getOptionChain', symbol },
  });

  if (error) {
    console.error('Error fetching option chain data:', error);
    throw error;
  }

  return data;
};

export const fetchExpiryDates = async (symbol: string): Promise<string[]> => {
  const { data, error } = await supabase.functions.invoke('option-builder-data', {
    body: { action: 'getExpiryDates', symbol },
  });

  if (error) {
    console.error('Error fetching expiry dates:', error);
    throw error;
  }

  return data.expiry_dates || [];
};

export const calculateMargin = async (positions: { instrumentKey: string; side: string; quantity: number; product: string }[]): Promise<MarginData> => {
  const { data, error } = await supabase.functions.invoke('option-builder-data', {
    body: { action: 'getMargin', positions },
  });

  if (error) {
    console.error('Error calculating margin:', error);
    throw error;
  }

  return data?.data || { finalMargin: 0 };
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
    if (!position.enabled || position.exitPrice !== undefined) {
      // If exited, use exit price
      if (position.exitPrice !== undefined) {
        const pl = (position.exitPrice - position.entryPrice) * position.lots * position.lotSize * (position.action === 'Buy' ? 1 : -1);
        totalPL += pl;
      }
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

// Calculate P&L for today using Black-Scholes
export const calculatePLToday = (positions: Position[], spotPrice: number): number => {
  let totalPL = 0;
  const r = 0.05; // Risk-free rate

  positions.forEach(position => {
    if (!position.enabled || position.exitPrice !== undefined) {
      if (position.exitPrice !== undefined) {
        const pl = (position.exitPrice - position.entryPrice) * position.lots * position.lotSize * (position.action === 'Buy' ? 1 : -1);
        totalPL += pl;
      }
      return;
    }

    // Calculate days to expiry
    const today = new Date();
    const expiryDate = new Date(position.expiry);
    const daysToExpiry = Math.max(1, Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const T = daysToExpiry / 365;

    const volatility = position.IV / 100;

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

// Generate P&L data for chart
export const generatePLChartData = (
  positions: Position[],
  currentPrice: number,
  rangePercent: number = 0.05
): { expiry: [number, number][]; today: [number, number][] } => {
  const startPrice = Math.floor(currentPrice * (1 - rangePercent));
  const endPrice = Math.ceil(currentPrice * (1 + rangePercent));
  const step = Math.max(1, Math.floor((endPrice - startPrice) / 200));

  const expiryData: [number, number][] = [];
  const todayData: [number, number][] = [];

  for (let price = startPrice; price <= endPrice; price += step) {
    expiryData.push([price, calculatePLAtExpiry(positions, price)]);
    todayData.push([price, calculatePLToday(positions, price)]);
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
