import { supabase } from "@/integrations/supabase/client";

export interface StockOverview {
  symbol: string;
  ticker: string;
  company_name: string;
  slug: string;
  price: number;
  currency: string;
  change_percent: number;
  volume: number;
  relative_volume: number;
  market_cap: number;
  pe_ratio: number;
  eps: number;
  eps_growth: number;
  dividend_yield: number;
  sector_tr: string;
  market: string;
  sector: string;
  recommendation: number;
  exchange: string;
  upChange: number;
  downChange: number;
}

export interface FinancialRow {
  "Unnamed: 0": string;
  [key: string]: string | number | null;
}

export interface GrowthData {
  [key: string]: string;
}

export interface ConsolidatedData {
  Table_1: FinancialRow[]; // Quarterly results
  Table_2: FinancialRow[]; // Yearly results
  Table_3: GrowthData[]; // Compounded Sales Growth
  Table_4: GrowthData[]; // Compounded Profit Growth
  Table_5: GrowthData[]; // Stock Price CAGR
  Table_6: GrowthData[]; // Return on Equity
  Table_7: FinancialRow[]; // Balance Sheet
  Table_8: FinancialRow[]; // Cash Flow
  Table_9: FinancialRow[]; // Ratios
  Table_10: FinancialRow[]; // Shareholding Quarterly
  Table_11: FinancialRow[]; // Shareholding Yearly
}

export interface OptionsAverageData {
  avgPriceChng: string;
  avgDelivery: string;
  avgAction: string;
}

export interface OptionsOIData {
  expiry: string;
  oi: string;
  chngInOi: string;
}

export interface OptionsHistoryRow {
  date: string;
  close: string;
  chng: string;
  priceChng: string;
  delivery: string;
  vwap: string;
  action: string;
  avgDelivery: string;
  jackpot?: string;
  oi: string;
  chngInOi: string;
  coiPercent: string;
  logic: string;
}

export interface OptionsData {
  average: {
    oneDay: OptionsAverageData;
    threeDays: OptionsAverageData;
    fiveDays: OptionsAverageData;
  };
  oi: OptionsOIData[];
  history: OptionsHistoryRow[];
}

export interface PeerData {
  company: string;
  price: number;
  pe_ratio: number;
  market_cap: string;
  return_52w: number;
}

export interface AdditionalFinancialData {
  [key: string]: {
    [period: string]: string;
  };
}

export const fetchStockOverview = async (symbol: string): Promise<StockOverview | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('stock-detail-data', {
      body: { symbol, endpoint: 'overview' }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching stock overview:', error);
    return null;
  }
};

export const fetchStockConsolidated = async (symbol: string): Promise<ConsolidatedData | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('stock-detail-data', {
      body: { symbol, endpoint: 'consolidated' }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching stock consolidated data:', error);
    return null;
  }
};

export const fetchStockOptions = async (symbol: string): Promise<any> => {
  try {
    const { data, error } = await supabase.functions.invoke('jackpot-symbol-data', {
      body: { symbol }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching stock options data:', error);
    return null;
  }
};

export const fetchAdditionalFinancialInfo = async (
  company_id: string,
  parent: string,
  section: 'quarters' | 'years'
): Promise<AdditionalFinancialData | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('stock-detail-data', {
      body: { 
        symbol: '', 
        endpoint: 'additional_financial',
        company_id,
        parent,
        section
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching additional financial info:', error);
    return null;
  }
};

export const formatMarketCap = (value: number): string => {
  if (value >= 1e12) {
    return `₹${(value / 1e12).toFixed(2)}L Cr`;
  } else if (value >= 1e7) {
    return `₹${(value / 1e7).toFixed(2)} Cr`;
  } else if (value >= 1e5) {
    return `₹${(value / 1e5).toFixed(2)}L`;
  }
  return `₹${value.toLocaleString('en-IN')}`;
};

export const formatPrice = (value: number): string => {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatPercentage = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};