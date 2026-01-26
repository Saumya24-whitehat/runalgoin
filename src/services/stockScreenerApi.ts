import { supabase } from "@/integrations/supabase/client";

export interface ScanColumn {
  name: string;
  title: string;
}

export interface ScanDataItem {
  d: (string | number | null | Array<{ name: string; proname: string }>)[];
  s: string;
}

export interface ScanResult {
  success: boolean;
  columns: ScanColumn[];
  condition: string;
  data: ScanDataItem[];
  total_count?: number;
  error?: string;
}

export interface ScanExample {
  title: string;
  condition: string;
  description: string;
  category: string;
}

export const scanStocks = async (condition: string, limit: number = 100): Promise<ScanResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('stock-screener', {
      body: { condition, limit }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error scanning stocks:', error);
    return {
      success: false,
      columns: [],
      condition,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Preset scan examples organized by category
export const scanCategories: { name: string; scans: ScanExample[] }[] = [
  {
    name: "Price Scans",
    scans: [
      {
        title: "Previous Day High Breakout",
        condition: "close>high[1]",
        description: "Stocks trading above previous day's high",
        category: "Price Scans"
      },
      {
        title: "Previous Day Low Breakdown",
        condition: "close<low[1]",
        description: "Stocks trading below previous day's low",
        category: "Price Scans"
      },
      {
        title: "52 Week High",
        condition: "close>=price_52_week_high*0.98",
        description: "Stocks near 52 week high (within 2%)",
        category: "Price Scans"
      },
      {
        title: "52 Week Low",
        condition: "close<=price_52_week_low*1.02",
        description: "Stocks near 52 week low (within 2%)",
        category: "Price Scans"
      },
      {
        title: "Gap Up Opening",
        condition: "open>high[1]",
        description: "Stocks that opened with a gap up",
        category: "Price Scans"
      },
      {
        title: "Gap Down Opening",
        condition: "open<low[1]",
        description: "Stocks that opened with a gap down",
        category: "Price Scans"
      },
      {
        title: "All Time High",
        condition: "close>=High.All*0.99",
        description: "Stocks at or near all-time high",
        category: "Price Scans"
      },
      {
        title: "Bullish Engulfing",
        condition: "close>open and close[1]<open[1] and close>open[1] and open<close[1]",
        description: "Bullish engulfing candlestick pattern",
        category: "Price Scans"
      }
    ]
  },
  {
    name: "Technical Scans",
    scans: [
      {
        title: "RSI Oversold",
        condition: "RSI<30",
        description: "Stocks with RSI below 30 (oversold)",
        category: "Technical Scans"
      },
      {
        title: "RSI Overbought",
        condition: "RSI>70",
        description: "Stocks with RSI above 70 (overbought)",
        category: "Technical Scans"
      },
      {
        title: "Golden Cross",
        condition: "SMA50>SMA200 and SMA50[1]<SMA200[1]",
        description: "50 SMA crossing above 200 SMA",
        category: "Technical Scans"
      },
      {
        title: "Death Cross",
        condition: "SMA50<SMA200 and SMA50[1]>SMA200[1]",
        description: "50 SMA crossing below 200 SMA",
        category: "Technical Scans"
      },
      {
        title: "MACD Bullish Crossover",
        condition: "MACD.macd>MACD.signal and MACD.macd[1]<MACD.signal[1]",
        description: "MACD line crossing above signal line",
        category: "Technical Scans"
      },
      {
        title: "Price Above 200 SMA",
        condition: "close>SMA200",
        description: "Stocks trading above 200-day moving average",
        category: "Technical Scans"
      },
      {
        title: "Bollinger Band Squeeze",
        condition: "(BB.upper-BB.lower)/close<0.05",
        description: "Low volatility - potential breakout setup",
        category: "Technical Scans"
      },
      {
        title: "ADX Strong Trend",
        condition: "ADX>25",
        description: "Stocks with strong trending momentum",
        category: "Technical Scans"
      }
    ]
  },
  {
    name: "Volume Scans",
    scans: [
      {
        title: "Volume Spike",
        condition: "volume>volume[1]*2",
        description: "Volume more than 2x previous day",
        category: "Volume Scans"
      },
      {
        title: "High Relative Volume",
        condition: "relative_volume_10d_calc>2",
        description: "Volume significantly above average",
        category: "Volume Scans"
      },
      {
        title: "Low Volume",
        condition: "relative_volume_10d_calc<0.5",
        description: "Volume significantly below average",
        category: "Volume Scans"
      },
      {
        title: "Bullish Volume",
        condition: "close>open and volume>volume[1]*1.5",
        description: "Green candle with increased volume",
        category: "Volume Scans"
      }
    ]
  },
  {
    name: "Fundamental Scans",
    scans: [
      {
        title: "Low P/E Ratio",
        condition: "price_earnings_ttm<15 and price_earnings_ttm>0",
        description: "Stocks with P/E ratio below 15",
        category: "Fundamental Scans"
      },
      {
        title: "High Dividend Yield",
        condition: "dividends_yield_current>3",
        description: "Stocks with dividend yield above 3%",
        category: "Fundamental Scans"
      },
      {
        title: "Large Cap",
        condition: "market_cap_basic>500000000000",
        description: "Market cap above 50,000 Cr",
        category: "Fundamental Scans"
      },
      {
        title: "Small Cap Growth",
        condition: "market_cap_basic<50000000000 and earnings_per_share_diluted_ttm>0",
        description: "Small cap with positive earnings",
        category: "Fundamental Scans"
      },
      {
        title: "Strong Buy Rating",
        condition: "AnalystRating='Strong Buy' or AnalystRating='Buy'",
        description: "Stocks with analyst buy rating",
        category: "Fundamental Scans"
      }
    ]
  },
  {
    name: "Candlestick Patterns",
    scans: [
      {
        title: "Doji",
        condition: "abs(close-open)/high-low<0.1",
        description: "Doji candlestick pattern",
        category: "Candlestick Patterns"
      },
      {
        title: "Hammer",
        condition: "close>open and (open-low)>(close-open)*2 and (high-close)<(close-open)*0.3",
        description: "Bullish hammer pattern",
        category: "Candlestick Patterns"
      },
      {
        title: "Morning Star",
        condition: "close>open and close[2]<open[2] and close>((open[2]+close[2])/2)",
        description: "Bullish reversal pattern",
        category: "Candlestick Patterns"
      },
      {
        title: "Bearish Engulfing",
        condition: "close<open and close[1]>open[1] and close<open[1] and open>close[1]",
        description: "Bearish engulfing pattern",
        category: "Candlestick Patterns"
      }
    ]
  }
];

export const formatCellValue = (
  value: string | number | null | Array<{ name: string; proname: string }>,
  columnName: string
): string => {
  if (value === null || value === undefined || value === '') return 'N/A';

  // Handle index array
  if (columnName === 'indexes.tr' && Array.isArray(value)) {
    if (value.length === 0) return 'N/A';
    return value.map(idx => idx.name || idx).join(', ');
  }

  // Handle numeric values
  if (typeof value === 'number') {
    // Market cap formatting
    if (columnName === 'market_cap_basic') {
      if (value >= 10000000000000) {
        return `₹${(value / 10000000000000).toFixed(2)}L Cr`;
      } else if (value >= 10000000) {
        return `₹${(value / 10000000).toFixed(1)} Cr`;
      } else if (value >= 100000) {
        return `₹${(value / 100000).toFixed(1)} L`;
      }
      return `₹${value.toLocaleString('en-IN')}`;
    }

    // Price formatting
    const priceColumns = ['close', 'high', 'low', 'open', 'price'];
    const baseCol = columnName.split('[')[0].split('|')[0];
    if (priceColumns.some(p => baseCol.includes(p))) {
      return `₹${value.toFixed(2)}`;
    }

    // Volume formatting
    if (columnName === 'volume') {
      if (value >= 10000000) {
        return `${(value / 10000000).toFixed(1)}Cr`;
      } else if (value >= 100000) {
        return `${(value / 100000).toFixed(1)}L`;
      }
      return value.toLocaleString('en-IN');
    }

    // Percentage formatting
    if (columnName.includes('yield') || columnName.includes('percent')) {
      return `${value.toFixed(2)}%`;
    }

    // Ratio formatting
    if (columnName.includes('ratio') || columnName.includes('pe') || columnName.includes('eps')) {
      return value.toFixed(2);
    }

    // Default number formatting
    return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  return String(value);
};

export const formatColumnTitle = (column: ScanColumn): string => {
  // Use title if provided
  if (column.title) return column.title;

  const titleMap: Record<string, string> = {
    'name': 'Symbol',
    'description': 'Company Name',
    'close': 'Price (₹)',
    'high': 'High (₹)',
    'low': 'Low (₹)',
    'open': 'Open (₹)',
    'volume': 'Volume',
    'market_cap_basic': 'Market Cap',
    'price_earnings_ttm': 'P/E Ratio',
    'earnings_per_share_diluted_ttm': 'EPS (₹)',
    'dividends_yield_current': 'Div Yield (%)',
    'relative_volume_10d_calc': 'Rel Volume',
    'market': 'Market',
    'sector': 'Sector',
    'exchange': 'Exchange',
    'AnalystRating': 'Rating',
    'indexes.tr': 'Index'
  };

  const columnName = column.name;

  // Handle historical references
  if (columnName.includes('[')) {
    const base = columnName.split('[')[0];
    const period = columnName.match(/\[(\d+)\]/)?.[1];
    const baseTitle = titleMap[base] || base.toUpperCase();
    return `${baseTitle} [${period}d ago]`;
  }

  // Handle timeframe references
  if (columnName.includes('|')) {
    const [base, timeframe] = columnName.split('|');
    const baseTitle = titleMap[base] || base.toUpperCase();
    return `${baseTitle} (${timeframe}m)`;
  }

  return titleMap[columnName] || columnName.replace(/_/g, ' ').toUpperCase();
};
