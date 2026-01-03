import { supabase } from "@/integrations/supabase/client";

export interface IndexStock {
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

export interface DeliveryData {
  total_df: Array<{
    mTIMESTAMP: string;
    CH_TOT_TRADED_QTY: number;
    COP_DELIV_QTY: number;
  }>;
  last_day_df: Array<{
    CH_SYMBOL: string;
    mTIMESTAMP: string;
    CH_TOT_TRADED_QTY: number;
    COP_DELIV_QTY: number;
    CH_LAST_TRADED_PRICE: number;
  }>;
}

export interface StockTechnical {
  name: string;
  description: string;
  logoid: string;
  close: number;
  change: number;
  high: number;
  low: number;
  SMA20: number;
  SMA50: number;
  SMA100: number;
  SMA200: number;
  EMA20: number;
  EMA50: number;
  EMA100: number;
  EMA200: number;
  RSI: number;
  "Stoch.K_14_1_3": number;
  "Stoch.D_14_1_3": number;
  CCI20: number;
  MoneyFlow: number;
  ROC: number;
  "W.R": number;
  "BB.upper": number;
  "BB.lower": number;
  "BB.basis": number;
  "P.SAR": number;
  "Ichimoku.BLine": number;
  "Ichimoku.CLine": number;
  "Pivot.M.Classic.R1": number;
  "Pivot.M.Classic.R2": number;
  "Pivot.M.Classic.R3": number;
  "Pivot.M.Classic.S1": number;
  "Pivot.M.Classic.S2": number;
  "Pivot.M.Classic.S3": number;
  "Pivot.M.Classic.Middle": number;
  price_52_week_high: number;
  price_52_week_low: number;
  "High.1M": number;
  "Low.1M": number;
  "Perf.W": number;
  "Perf.1M": number;
  "Perf.3M": number;
  "Perf.6M": number;
  "Perf.Y": number;
}

export async function fetchIndexStocks(indexSymbol: string): Promise<IndexStock[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke('index-detail', {
      body: { index: indexSymbol, dataType: 'stocks' }
    });

    if (error) {
      console.error('Error fetching index stocks:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching index stocks:', error);
    return null;
  }
}

export async function fetchDeliveryData(indexSymbol: string): Promise<DeliveryData | null> {
  try {
    const { data, error } = await supabase.functions.invoke('index-detail', {
      body: { index: indexSymbol, dataType: 'delivery' }
    });

    if (error) {
      console.error('Error fetching delivery data:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching delivery data:', error);
    return null;
  }
}

export async function fetchTechnicalsData(indexSymbol: string): Promise<StockTechnical[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke('index-detail', {
      body: { index: indexSymbol, dataType: 'technicals' }
    });

    if (error) {
      console.error('Error fetching technicals data:', error);
      return null;
    }

    // API returns array with date as first element, extract content
    if (Array.isArray(data) && data.length > 0 && data[0].content) {
      return data[0].content;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching technicals data:', error);
    return null;
  }
}

export async function fetchShareholdingData(indexSymbol: string, type: 'promoter' | 'fii' | 'mf' | 'public' = 'promoter'): Promise<any[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke('index-detail', {
      body: { index: indexSymbol, dataType: 'shareholding', shareholdingType: type }
    });

    if (error) {
      console.error('Error fetching shareholding data:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching shareholding data:', error);
    return null;
  }
}

export async function fetchBreadthData(indexSymbol: string): Promise<any | null> {
  try {
    const { data, error } = await supabase.functions.invoke('index-detail', {
      body: { index: indexSymbol, dataType: 'breadth' }
    });

    if (error) {
      console.error('Error fetching breadth data:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching breadth data:', error);
    return null;
  }
}

// Helper to get index symbol from display name
export function getIndexSymbol(indexName: string): string {
  const indexMap: Record<string, string> = {
    'Nifty 50': 'SYML:NSE;NIFTY',
    'NIFTY 50': 'SYML:NSE;NIFTY',
    'NIFTY BANK': 'SYML:NSE;BANKNIFTY',
    'Nifty Bank': 'SYML:NSE;BANKNIFTY',
    'NIFTY IT': 'SYML:NSE;CNXIT',
    'NIFTY METAL': 'SYML:NSE;CNXMETAL',
    'NIFTY PHARMA': 'SYML:NSE;CNXPHARMA',
    'NIFTY AUTO': 'SYML:NSE;CNXAUTO',
    'NIFTY ENERGY': 'SYML:NSE;CNXENERGY',
    'NIFTY FMCG': 'SYML:NSE;CNXFMCG',
    'NIFTY REALTY': 'SYML:NSE;CNXREALTY',
    'NIFTY INFRA': 'SYML:NSE;CNXINFRA',
    'NIFTY PSE': 'SYML:NSE;CNXPSE',
    'NIFTY MEDIA': 'SYML:NSE;CNXMEDIA',
    'NIFTY PRIVATE BANK': 'SYML:NSE;NIFTYPVTBANK',
    'NIFTY PSU BANK': 'SYML:NSE;CNXPSUBANK',
    'NIFTY FIN SERVICE': 'SYML:NSE;CNXFINANCE',
    'NIFTY NEXT 50': 'SYML:NSE;NIFTYJR',
    'NIFTY MIDCAP 50': 'SYML:NSE;NIFTYMIDCAP50',
    'NIFTY 100': 'SYML:NSE;NIFTY100',
    'NIFTY 200': 'SYML:NSE;NIFTY200',
    'NIFTY 500': 'SYML:NSE;NIFTY500',
    'NIFTY COMMODITIES': 'SYML:NSE;CNXCOMMODITY',
    'NIFTY CONSUMPTION': 'SYML:NSE;NIFTYCONSUMPTION',
    'NIFTY CPSE': 'SYML:NSE;NIFTYCPSE',
    'NIFTY GROWSECT 15': 'SYML:NSE;NIFTYGROWSECT15',
    'NIFTY MNC': 'SYML:NSE;CNXMNC',
    'NIFTY OIL & GAS': 'SYML:NSE;NIFTYOILGAS',
    'NIFTY SERV SECTOR': 'SYML:NSE;NIFTYSERVSECTOR',
  };
  
  return indexMap[indexName] || `SYML:NSE;${indexName.replace(/\s+/g, '').toUpperCase()}`;
}

// Format market cap for display
export function formatMarketCap(value: number): string {
  if (value >= 1e12) {
    return `₹${(value / 1e12).toFixed(2)} L Cr`;
  } else if (value >= 1e7) {
    return `₹${(value / 1e7).toFixed(2)} Cr`;
  } else if (value >= 1e5) {
    return `₹${(value / 1e5).toFixed(2)} L`;
  }
  return `₹${value.toFixed(2)}`;
}
