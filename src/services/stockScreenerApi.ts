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
    name: "Price Action",
    scans: [
      {
        title: "Previous Day High Breakout",
        condition: "close>high[1]",
        description: "Stocks trading above previous day's high",
        category: "Price Action"
      },
      {
        title: "Previous Day Low Breakdown",
        condition: "close<low[1]",
        description: "Stocks trading below previous day's low",
        category: "Price Action"
      },
      {
        title: "52 Week High",
        condition: "close>=price_52_week_high*0.98",
        description: "Stocks near 52 week high (within 2%)",
        category: "Price Action"
      },
      {
        title: "52 Week Low",
        condition: "close<=price_52_week_low*1.02",
        description: "Stocks near 52 week low (within 2%)",
        category: "Price Action"
      },
      {
        title: "All Time High",
        condition: "close>=High.All*0.99",
        description: "Stocks at or near all-time high",
        category: "Price Action"
      },
      {
        title: "All Time Low",
        condition: "close<=Low.All*1.01",
        description: "Stocks at or near all-time low",
        category: "Price Action"
      },
      {
        title: "Gap Up Opening",
        condition: "open>high[1]",
        description: "Stocks that opened with a gap up",
        category: "Price Action"
      },
      {
        title: "Gap Down Opening",
        condition: "open<low[1]",
        description: "Stocks that opened with a gap down",
        category: "Price Action"
      },
      {
        title: "Inside Day",
        condition: "high<high[1] and low>low[1]",
        description: "Inside day pattern - potential breakout setup",
        category: "Price Action"
      },
      {
        title: "Outside Day",
        condition: "high>high[1] and low<low[1]",
        description: "Outside day pattern - high volatility",
        category: "Price Action"
      },
      {
        title: "Narrow Range Day",
        condition: "(high-low)/close<0.02",
        description: "Stocks with less than 2% range today",
        category: "Price Action"
      },
      {
        title: "Wide Range Day",
        condition: "(high-low)/close>0.05",
        description: "Stocks with more than 5% range today",
        category: "Price Action"
      },
      {
        title: "Price Above Open",
        condition: "close>open",
        description: "Stocks trading above today's open (bullish)",
        category: "Price Action"
      },
      {
        title: "Price Below Open",
        condition: "close<open",
        description: "Stocks trading below today's open (bearish)",
        category: "Price Action"
      }
    ]
  },
  {
    name: "Moving Averages",
    scans: [
      {
        title: "Price Above 20 SMA",
        condition: "close>SMA20",
        description: "Stocks trading above 20-day SMA",
        category: "Moving Averages"
      },
      {
        title: "Price Above 50 SMA",
        condition: "close>SMA50",
        description: "Stocks trading above 50-day SMA",
        category: "Moving Averages"
      },
      {
        title: "Price Above 200 SMA",
        condition: "close>SMA200",
        description: "Stocks trading above 200-day SMA",
        category: "Moving Averages"
      },
      {
        title: "Price Below 200 SMA",
        condition: "close<SMA200",
        description: "Stocks trading below 200-day SMA",
        category: "Moving Averages"
      },
      {
        title: "Golden Cross",
        condition: "SMA50>SMA200 and SMA50[1]<SMA200[1]",
        description: "50 SMA crossing above 200 SMA (bullish)",
        category: "Moving Averages"
      },
      {
        title: "Death Cross",
        condition: "SMA50<SMA200 and SMA50[1]>SMA200[1]",
        description: "50 SMA crossing below 200 SMA (bearish)",
        category: "Moving Averages"
      },
      {
        title: "20 SMA Crossover",
        condition: "close>SMA20 and close[1]<SMA20[1]",
        description: "Price crossing above 20 SMA",
        category: "Moving Averages"
      },
      {
        title: "50 SMA Crossover",
        condition: "close>SMA50 and close[1]<SMA50[1]",
        description: "Price crossing above 50 SMA",
        category: "Moving Averages"
      },
      {
        title: "EMA 9/21 Bullish Cross",
        condition: "EMA9>EMA21 and EMA9[1]<EMA21[1]",
        description: "9 EMA crossing above 21 EMA",
        category: "Moving Averages"
      },
      {
        title: "EMA 9/21 Bearish Cross",
        condition: "EMA9<EMA21 and EMA9[1]>EMA21[1]",
        description: "9 EMA crossing below 21 EMA",
        category: "Moving Averages"
      },
      {
        title: "All SMAs Aligned Bullish",
        condition: "close>SMA20 and SMA20>SMA50 and SMA50>SMA200",
        description: "Price above all major SMAs in perfect alignment",
        category: "Moving Averages"
      },
      {
        title: "All SMAs Aligned Bearish",
        condition: "close<SMA20 and SMA20<SMA50 and SMA50<SMA200",
        description: "Price below all major SMAs in perfect alignment",
        category: "Moving Averages"
      }
    ]
  },
  {
    name: "RSI Scans",
    scans: [
      {
        title: "RSI Oversold (<30)",
        condition: "RSI<30",
        description: "Stocks with RSI below 30 (oversold)",
        category: "RSI Scans"
      },
      {
        title: "RSI Overbought (>70)",
        condition: "RSI>70",
        description: "Stocks with RSI above 70 (overbought)",
        category: "RSI Scans"
      },
      {
        title: "RSI Extreme Oversold (<20)",
        condition: "RSI<20",
        description: "Extremely oversold stocks",
        category: "RSI Scans"
      },
      {
        title: "RSI Extreme Overbought (>80)",
        condition: "RSI>80",
        description: "Extremely overbought stocks",
        category: "RSI Scans"
      },
      {
        title: "RSI Bullish Crossover",
        condition: "RSI>30 and RSI[1]<30",
        description: "RSI crossing above 30 from oversold",
        category: "RSI Scans"
      },
      {
        title: "RSI Bearish Crossover",
        condition: "RSI<70 and RSI[1]>70",
        description: "RSI crossing below 70 from overbought",
        category: "RSI Scans"
      },
      {
        title: "RSI Neutral Zone",
        condition: "RSI>40 and RSI<60",
        description: "RSI in neutral zone (40-60)",
        category: "RSI Scans"
      },
      {
        title: "RSI Trending Up",
        condition: "RSI>RSI[1] and RSI[1]>RSI[2]",
        description: "RSI rising for 2 consecutive days",
        category: "RSI Scans"
      }
    ]
  },
  {
    name: "MACD Scans",
    scans: [
      {
        title: "MACD Bullish Crossover",
        condition: "MACD.macd>MACD.signal and MACD.macd[1]<MACD.signal[1]",
        description: "MACD line crossing above signal line",
        category: "MACD Scans"
      },
      {
        title: "MACD Bearish Crossover",
        condition: "MACD.macd<MACD.signal and MACD.macd[1]>MACD.signal[1]",
        description: "MACD line crossing below signal line",
        category: "MACD Scans"
      },
      {
        title: "MACD Above Zero",
        condition: "MACD.macd>0",
        description: "MACD histogram above zero line",
        category: "MACD Scans"
      },
      {
        title: "MACD Below Zero",
        condition: "MACD.macd<0",
        description: "MACD histogram below zero line",
        category: "MACD Scans"
      },
      {
        title: "MACD Zero Crossover",
        condition: "MACD.macd>0 and MACD.macd[1]<0",
        description: "MACD crossing above zero line",
        category: "MACD Scans"
      },
      {
        title: "MACD Histogram Rising",
        condition: "MACD.hist>MACD.hist[1]",
        description: "MACD histogram increasing",
        category: "MACD Scans"
      }
    ]
  },
  {
    name: "Bollinger Bands",
    scans: [
      {
        title: "BB Upper Band Breakout",
        condition: "close>BB.upper",
        description: "Price above upper Bollinger Band",
        category: "Bollinger Bands"
      },
      {
        title: "BB Lower Band Breakdown",
        condition: "close<BB.lower",
        description: "Price below lower Bollinger Band",
        category: "Bollinger Bands"
      },
      {
        title: "BB Squeeze",
        condition: "(BB.upper-BB.lower)/close<0.05",
        description: "Bollinger Band squeeze - low volatility",
        category: "Bollinger Bands"
      },
      {
        title: "BB Expansion",
        condition: "(BB.upper-BB.lower)/close>0.15",
        description: "Wide Bollinger Bands - high volatility",
        category: "Bollinger Bands"
      },
      {
        title: "BB Middle Band Support",
        condition: "close>BB.basis and close[1]<BB.basis[1]",
        description: "Price bouncing off middle Bollinger Band",
        category: "Bollinger Bands"
      },
      {
        title: "Price Near Lower BB",
        condition: "close<=BB.lower*1.01",
        description: "Price at or near lower Bollinger Band",
        category: "Bollinger Bands"
      },
      {
        title: "Price Near Upper BB",
        condition: "close>=BB.upper*0.99",
        description: "Price at or near upper Bollinger Band",
        category: "Bollinger Bands"
      }
    ]
  },
  {
    name: "Volume Analysis",
    scans: [
      {
        title: "Volume Spike (2x)",
        condition: "volume>volume[1]*2",
        description: "Volume more than 2x previous day",
        category: "Volume Analysis"
      },
      {
        title: "Volume Spike (3x)",
        condition: "volume>volume[1]*3",
        description: "Volume more than 3x previous day",
        category: "Volume Analysis"
      },
      {
        title: "High Relative Volume",
        condition: "relative_volume_10d_calc>2",
        description: "Volume significantly above 10-day average",
        category: "Volume Analysis"
      },
      {
        title: "Low Volume",
        condition: "relative_volume_10d_calc<0.5",
        description: "Volume significantly below average",
        category: "Volume Analysis"
      },
      {
        title: "Bullish Volume",
        condition: "close>open and volume>volume[1]*1.5",
        description: "Green candle with increased volume",
        category: "Volume Analysis"
      },
      {
        title: "Bearish Volume",
        condition: "close<open and volume>volume[1]*1.5",
        description: "Red candle with increased volume",
        category: "Volume Analysis"
      },
      {
        title: "Volume Breakout",
        condition: "volume>volume[1]*2 and close>high[1]",
        description: "High volume with price breakout",
        category: "Volume Analysis"
      },
      {
        title: "Accumulation Day",
        condition: "close>open and volume>volume[1]*1.2 and close>close[1]",
        description: "Signs of institutional accumulation",
        category: "Volume Analysis"
      },
      {
        title: "Distribution Day",
        condition: "close<open and volume>volume[1]*1.2 and close<close[1]",
        description: "Signs of institutional distribution",
        category: "Volume Analysis"
      }
    ]
  },
  {
    name: "ADX & Trend Strength",
    scans: [
      {
        title: "Strong Trend (ADX>25)",
        condition: "ADX>25",
        description: "Stocks with strong trending momentum",
        category: "ADX & Trend Strength"
      },
      {
        title: "Very Strong Trend (ADX>40)",
        condition: "ADX>40",
        description: "Stocks with very strong trend",
        category: "ADX & Trend Strength"
      },
      {
        title: "Weak Trend (ADX<20)",
        condition: "ADX<20",
        description: "Stocks with weak/no trend (range-bound)",
        category: "ADX & Trend Strength"
      },
      {
        title: "ADX Rising",
        condition: "ADX>ADX[1] and ADX[1]>ADX[2]",
        description: "Trend strength increasing",
        category: "ADX & Trend Strength"
      },
      {
        title: "Bullish DI Cross",
        condition: "ADX.di_plus>ADX.di_minus and ADX.di_plus[1]<ADX.di_minus[1]",
        description: "+DI crossing above -DI (bullish)",
        category: "ADX & Trend Strength"
      },
      {
        title: "Bearish DI Cross",
        condition: "ADX.di_minus>ADX.di_plus and ADX.di_minus[1]<ADX.di_plus[1]",
        description: "-DI crossing above +DI (bearish)",
        category: "ADX & Trend Strength"
      }
    ]
  },
  {
    name: "Candlestick Patterns",
    scans: [
      {
        title: "Bullish Engulfing",
        condition: "close>open and close[1]<open[1] and close>open[1] and open<close[1]",
        description: "Bullish engulfing candlestick pattern",
        category: "Candlestick Patterns"
      },
      {
        title: "Bearish Engulfing",
        condition: "close<open and close[1]>open[1] and close<open[1] and open>close[1]",
        description: "Bearish engulfing pattern",
        category: "Candlestick Patterns"
      },
      {
        title: "Doji",
        condition: "abs(close-open)/(high-low)<0.1 and (high-low)>0",
        description: "Doji candlestick pattern - indecision",
        category: "Candlestick Patterns"
      },
      {
        title: "Hammer",
        condition: "close>open and (open-low)>(close-open)*2 and (high-close)<(close-open)*0.3",
        description: "Bullish hammer pattern",
        category: "Candlestick Patterns"
      },
      {
        title: "Shooting Star",
        condition: "close<open and (high-open)>(open-close)*2 and (close-low)<(open-close)*0.3",
        description: "Bearish shooting star pattern",
        category: "Candlestick Patterns"
      },
      {
        title: "Morning Star",
        condition: "close>open and close[2]<open[2] and close>((open[2]+close[2])/2)",
        description: "Bullish reversal pattern",
        category: "Candlestick Patterns"
      },
      {
        title: "Evening Star",
        condition: "close<open and close[2]>open[2] and close<((open[2]+close[2])/2)",
        description: "Bearish reversal pattern",
        category: "Candlestick Patterns"
      },
      {
        title: "Three White Soldiers",
        condition: "close>open and close[1]>open[1] and close[2]>open[2] and close>close[1] and close[1]>close[2]",
        description: "Three consecutive bullish candles",
        category: "Candlestick Patterns"
      },
      {
        title: "Three Black Crows",
        condition: "close<open and close[1]<open[1] and close[2]<open[2] and close<close[1] and close[1]<close[2]",
        description: "Three consecutive bearish candles",
        category: "Candlestick Patterns"
      },
      {
        title: "Bullish Marubozu",
        condition: "close>open and (open-low)<(close-open)*0.1 and (high-close)<(close-open)*0.1",
        description: "Strong bullish candle with no wicks",
        category: "Candlestick Patterns"
      },
      {
        title: "Bearish Marubozu",
        condition: "close<open and (close-low)<(open-close)*0.1 and (high-open)<(open-close)*0.1",
        description: "Strong bearish candle with no wicks",
        category: "Candlestick Patterns"
      }
    ]
  },
  {
    name: "Stochastic",
    scans: [
      {
        title: "Stochastic Oversold",
        condition: "Stoch.K<20",
        description: "Stochastic %K below 20 (oversold)",
        category: "Stochastic"
      },
      {
        title: "Stochastic Overbought",
        condition: "Stoch.K>80",
        description: "Stochastic %K above 80 (overbought)",
        category: "Stochastic"
      },
      {
        title: "Stochastic Bullish Cross",
        condition: "Stoch.K>Stoch.D and Stoch.K[1]<Stoch.D[1] and Stoch.K<30",
        description: "%K crossing above %D from oversold",
        category: "Stochastic"
      },
      {
        title: "Stochastic Bearish Cross",
        condition: "Stoch.K<Stoch.D and Stoch.K[1]>Stoch.D[1] and Stoch.K>70",
        description: "%K crossing below %D from overbought",
        category: "Stochastic"
      }
    ]
  },
  {
    name: "ATR & Volatility",
    scans: [
      {
        title: "High ATR (>3%)",
        condition: "ATR/close>0.03",
        description: "Stocks with ATR more than 3% of price",
        category: "ATR & Volatility"
      },
      {
        title: "Low ATR (<1%)",
        condition: "ATR/close<0.01",
        description: "Low volatility stocks",
        category: "ATR & Volatility"
      },
      {
        title: "ATR Expansion",
        condition: "ATR>ATR[1]*1.5",
        description: "Significant increase in volatility",
        category: "ATR & Volatility"
      },
      {
        title: "Volatility Contraction",
        condition: "ATR<ATR[5]*0.7",
        description: "Decreasing volatility - potential breakout setup",
        category: "ATR & Volatility"
      }
    ]
  },
  {
    name: "Fundamental Scans",
    scans: [
      {
        title: "Low P/E Ratio (<15)",
        condition: "price_earnings_ttm<15 and price_earnings_ttm>0",
        description: "Value stocks with P/E ratio below 15",
        category: "Fundamental Scans"
      },
      {
        title: "Very Low P/E (<10)",
        condition: "price_earnings_ttm<10 and price_earnings_ttm>0",
        description: "Deep value stocks with P/E below 10",
        category: "Fundamental Scans"
      },
      {
        title: "High Dividend Yield (>3%)",
        condition: "dividends_yield_current>3",
        description: "Stocks with dividend yield above 3%",
        category: "Fundamental Scans"
      },
      {
        title: "Very High Dividend (>5%)",
        condition: "dividends_yield_current>5",
        description: "High dividend yield stocks (>5%)",
        category: "Fundamental Scans"
      },
      {
        title: "Large Cap (>50K Cr)",
        condition: "market_cap_basic>500000000000",
        description: "Market cap above 50,000 Cr",
        category: "Fundamental Scans"
      },
      {
        title: "Mid Cap (5K-50K Cr)",
        condition: "market_cap_basic>50000000000 and market_cap_basic<500000000000",
        description: "Market cap between 5,000-50,000 Cr",
        category: "Fundamental Scans"
      },
      {
        title: "Small Cap (<5K Cr)",
        condition: "market_cap_basic<50000000000",
        description: "Market cap below 5,000 Cr",
        category: "Fundamental Scans"
      },
      {
        title: "Positive EPS Growth",
        condition: "earnings_per_share_diluted_ttm>0",
        description: "Stocks with positive earnings per share",
        category: "Fundamental Scans"
      },
      {
        title: "Strong Buy Rating",
        condition: "AnalystRating='Strong Buy' or AnalystRating='Buy'",
        description: "Stocks with analyst buy rating",
        category: "Fundamental Scans"
      },
      {
        title: "Low Price to Book",
        condition: "price_book_ratio<1",
        description: "Stocks trading below book value",
        category: "Fundamental Scans"
      }
    ]
  },
  {
    name: "Momentum & Swing",
    scans: [
      {
        title: "5 Day High Breakout",
        condition: "close>high[1] and close>high[2] and close>high[3] and close>high[4] and close>high[5]",
        description: "New 5-day high breakout",
        category: "Momentum & Swing"
      },
      {
        title: "10 Day High Breakout",
        condition: "close>=highest(high,10)",
        description: "Breaking 10-day high",
        category: "Momentum & Swing"
      },
      {
        title: "Strong Uptrend",
        condition: "close>close[1] and close[1]>close[2] and close[2]>close[3]",
        description: "Price rising for 3 consecutive days",
        category: "Momentum & Swing"
      },
      {
        title: "Strong Downtrend",
        condition: "close<close[1] and close[1]<close[2] and close[2]<close[3]",
        description: "Price falling for 3 consecutive days",
        category: "Momentum & Swing"
      },
      {
        title: "Momentum Breakout",
        condition: "close>high[1] and volume>volume[1]*1.5 and close>SMA20",
        description: "Price breakout with volume confirmation",
        category: "Momentum & Swing"
      },
      {
        title: "Pullback to Support",
        condition: "low<=SMA20*1.01 and close>SMA20 and close>open",
        description: "Pullback to 20 SMA with bounce",
        category: "Momentum & Swing"
      },
      {
        title: "Reversal from Low",
        condition: "close>open and (close-low)>(high-low)*0.7 and close[1]<close[2]",
        description: "Bullish reversal from recent low",
        category: "Momentum & Swing"
      }
    ]
  },
  {
    name: "Combined Strategies",
    scans: [
      {
        title: "Bullish Setup",
        condition: "close>SMA50 and RSI>50 and RSI<70 and volume>volume[1]",
        description: "Multiple bullish indicators aligned",
        category: "Combined Strategies"
      },
      {
        title: "Bearish Setup",
        condition: "close<SMA50 and RSI<50 and RSI>30 and volume>volume[1]",
        description: "Multiple bearish indicators aligned",
        category: "Combined Strategies"
      },
      {
        title: "Trend + Momentum",
        condition: "close>SMA200 and RSI>50 and MACD.macd>MACD.signal",
        description: "Uptrend with positive momentum",
        category: "Combined Strategies"
      },
      {
        title: "Oversold Bounce",
        condition: "RSI<35 and close>open and volume>volume[1]*1.5",
        description: "Oversold with bullish reversal",
        category: "Combined Strategies"
      },
      {
        title: "Breakout with Volume",
        condition: "close>high[1] and volume>volume[1]*2 and RSI<70",
        description: "Price breakout with volume confirmation",
        category: "Combined Strategies"
      },
      {
        title: "Strong Trend Continuation",
        condition: "ADX>25 and close>SMA20 and MACD.macd>0",
        description: "Strong trend with momentum",
        category: "Combined Strategies"
      },
      {
        title: "52 Week High with Volume",
        condition: "close>=price_52_week_high*0.98 and volume>volume[1]*1.5",
        description: "Near 52W high with volume surge",
        category: "Combined Strategies"
      },
      {
        title: "Golden Cross + RSI",
        condition: "SMA50>SMA200 and SMA50[5]<SMA200[5] and RSI>50",
        description: "Recent golden cross with positive RSI",
        category: "Combined Strategies"
      }
    ]
  },
  {
    name: "Intraday Scans",
    scans: [
      {
        title: "Opening Range Breakout",
        condition: "close>high[1] and open>high[1]",
        description: "Price breaking above previous high at open",
        category: "Intraday Scans"
      },
      {
        title: "Opening Range Breakdown",
        condition: "close<low[1] and open<low[1]",
        description: "Price breaking below previous low at open",
        category: "Intraday Scans"
      },
      {
        title: "Gap and Go",
        condition: "open>high[1] and close>open and volume>volume[1]*2",
        description: "Gap up with continued momentum",
        category: "Intraday Scans"
      },
      {
        title: "Gap Fill Setup",
        condition: "open>high[1] and close<open",
        description: "Gap up that's filling",
        category: "Intraday Scans"
      },
      {
        title: "High of Day Breakout",
        condition: "close>=high*0.99",
        description: "Trading near high of day",
        category: "Intraday Scans"
      },
      {
        title: "Low of Day Breakdown",
        condition: "close<=low*1.01",
        description: "Trading near low of day",
        category: "Intraday Scans"
      }
    ]
  },
  {
    name: "Sector & Index",
    scans: [
      {
        title: "Nifty 50 Stocks",
        condition: "index='Nifty 50'",
        description: "Stocks in Nifty 50 index",
        category: "Sector & Index"
      },
      {
        title: "Bank Nifty Stocks",
        condition: "index='Nifty Bank'",
        description: "Stocks in Bank Nifty index",
        category: "Sector & Index"
      },
      {
        title: "IT Sector",
        condition: "sector='Technology Services'",
        description: "Information Technology sector stocks",
        category: "Sector & Index"
      },
      {
        title: "Banking Sector",
        condition: "sector='Finance'",
        description: "Banking and Finance sector stocks",
        category: "Sector & Index"
      },
      {
        title: "Pharma Sector",
        condition: "sector='Health Technology'",
        description: "Pharmaceutical sector stocks",
        category: "Sector & Index"
      },
      {
        title: "Auto Sector",
        condition: "sector='Consumer Durables'",
        description: "Automobile sector stocks",
        category: "Sector & Index"
      },
      {
        title: "Metal Sector",
        condition: "sector='Non-Energy Minerals'",
        description: "Metal and Mining sector stocks",
        category: "Sector & Index"
      },
      {
        title: "FMCG Sector",
        condition: "sector='Consumer Non-Durables'",
        description: "FMCG sector stocks",
        category: "Sector & Index"
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
