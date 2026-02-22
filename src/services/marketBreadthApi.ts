import { fetchWithFallback } from "./directApi";

export interface IndexGroup {
  name: string;
  indices: {
    symbol: string;
    displayName: string;
  }[];
}

export interface StockData {
  name: string;
  description: string;
  close: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  exchange: string;
}

export interface MarketBreadthResponse {
  date: string;
  content: StockData[];
}

export interface AdvanceDeclineData {
  time: string;
  advance: number;
  decline: number;
}

// Grouped Indian Stock Market Indices
export const groupedIndices: IndexGroup[] = [
  {
    name: "Major Market Indices",
    indices: [
      { symbol: "SYML:BSE;SENSEX", displayName: "BSE SENSEX" },
      { symbol: "SYML:NSE;NIFTY", displayName: "Nifty 50" },
      { symbol: "SYML:NSE;CNX100", displayName: "Nifty 100" },
      { symbol: "SYML:NSE;CNX200", displayName: "Nifty 200" },
      { symbol: "SYML:NSE;CNX500", displayName: "Nifty 500" },
      { symbol: "SYML:NSE;NIFTYJR", displayName: "Nifty Next 50" },
      { symbol: "SYML:NSE;NIFTY_TOTAL_MKT", displayName: "Nifty Total Market" },
    ],
  },
  {
    name: "Banking & Financial Services",
    indices: [
      { symbol: "SYML:NSE;BANKNIFTY", displayName: "Bank Nifty" },
      { symbol: "SYML:NSE;CNXFINANCE", displayName: "Nifty Financial Services" },
      { symbol: "SYML:NSE;NIFTYFINSRV25_50", displayName: "Nifty Financial Services 25/50" },
      { symbol: "SYML:NSE;NIFTYPVTBANK", displayName: "Nifty Private Bank" },
      { symbol: "SYML:NSE;CNXPSUBANK", displayName: "Nifty PSU Bank" },
    ],
  },
  {
    name: "Sectoral Indices",
    indices: [
      { symbol: "SYML:NSE;CNXAUTO", displayName: "Nifty Auto" },
      { symbol: "SYML:NSE;CNXIT", displayName: "Nifty IT" },
      { symbol: "SYML:NSE;CNXPHARMA", displayName: "Nifty Pharma" },
      { symbol: "SYML:NSE;CNXFMCG", displayName: "Nifty FMCG" },
      { symbol: "SYML:NSE;NIFTY_OIL_AND_GAS", displayName: "Nifty Oil & Gas" },
      { symbol: "SYML:NSE;NIFTY_HEALTHCARE", displayName: "Nifty Healthcare" },
      { symbol: "SYML:NSE;CNXMETAL", displayName: "Nifty Metal" },
      { symbol: "SYML:NSE;CNXMEDIA", displayName: "Nifty Media" },
      { symbol: "SYML:NSE;CNXENERGY", displayName: "Nifty Energy" },
      { symbol: "SYML:NSE;CNXREALTY", displayName: "Nifty Realty" },
      { symbol: "SYML:NSE;CNXINFRA", displayName: "Nifty Infrastructure" },
      { symbol: "SYML:NSE;NIFTY_CONSR_DURBL", displayName: "Nifty Consumer Durables" },
      { symbol: "SYML:NSE;CNXSERVICE", displayName: "Nifty Services Sector" },
      { symbol: "SYML:NSE;CNXCOMMODITIES", displayName: "Nifty Commodities" },
    ],
  },
  {
    name: "Market Cap Based Indices",
    indices: [
      { symbol: "SYML:NSE;NIFTY_LARGEMID250", displayName: "Nifty LargeMidcap 250" },
      { symbol: "SYML:NSE;NIFTY500_MULTICAP", displayName: "Nifty 500 Multicap" },
      { symbol: "SYML:NSE;NIFTYMIDCAP50", displayName: "Nifty Midcap 50" },
      { symbol: "SYML:NSE;CNXMIDCAP", displayName: "Nifty Midcap 100" },
      { symbol: "SYML:NSE;NIFTYMIDCAP150", displayName: "Nifty Midcap 150" },
      { symbol: "SYML:NSE;NIFTY_MID_SELECT", displayName: "Nifty Midcap Select" },
      { symbol: "SYML:NSE;NIFTYSMLCAP50", displayName: "Nifty Smallcap 50" },
      { symbol: "SYML:NSE;CNXSMALLCAP", displayName: "Nifty Smallcap 100" },
      { symbol: "SYML:NSE;NIFTYSMLCAP250", displayName: "Nifty Smallcap 250" },
      { symbol: "SYML:NSE;NIFTYMIDSML400", displayName: "Nifty Midsmallcap 400" },
      { symbol: "SYML:NSE;NIFTY_MICROCAP250", displayName: "Nifty Microcap 250" },
    ],
  },
  {
    name: "Thematic & Strategy Indices",
    indices: [
      { symbol: "SYML:NSE;NIFTY_IND_DIGITAL", displayName: "Nifty India Digital" },
      { symbol: "SYML:NSE;NIFTY_INDIA_MFG", displayName: "Nifty India Manufacturing" },
      { symbol: "SYML:NSE;CNXCONSUMPTION", displayName: "Nifty India Consumption" },
      { symbol: "SYML:NSE;CNXMNC", displayName: "Nifty MNC" },
      { symbol: "SYML:NSE;NIFTYALPHA50", displayName: "Nifty Alpha 50" },
      { symbol: "SYML:NSE;NIFTY200MOMENTM30", displayName: "Nifty 200 Momentum 30" },
      { symbol: "SYML:NSE;NIFTY50EQUALWEIGHT", displayName: "Nifty 50 Equal Weight" },
    ],
  },
  {
    name: "Government & Public Sector",
    indices: [
      { symbol: "SYML:NSE;CNXPSE", displayName: "Nifty PSE" },
      { symbol: "SYML:NSE;CPSE", displayName: "Nifty CPSE" },
    ],
  },
];

// Fetch advance/decline data for all indices
export async function fetchAdvanceDeclineData(): Promise<Record<string, AdvanceDeclineData> | null> {
  try {
    return await fetchWithFallback<Record<string, AdvanceDeclineData>>({
      directPath: "/navbar/marketpage/advanceDecline.php",
      edgeFunctionName: "advance-decline",
    });
  } catch (error) {
    console.error("Error in fetchAdvanceDeclineData:", error);
    return null;
  }
}

export async function fetchMarketBreadthData(indexSymbol: string): Promise<MarketBreadthResponse | null> {
  try {
    const data = await fetchWithFallback<any[]>({
      directPath: "/adv-dec%20copy/ADdataLastData2.php",
      edgeFunctionName: "market-breadth",
      edgeFunctionBody: { index: indexSymbol },
      queryParams: { index: indexSymbol },
    });

    // The API returns an array with date entries, get the latest
    if (Array.isArray(data) && data.length > 0) {
      const latestEntry = data[0];
      const rawContent = latestEntry.content || [];

      const processedContent: StockData[] = rawContent.map((stock: any) => ({
        name: stock.name || "",
        description: stock.description || "",
        close: stock.close || 0,
        change: stock.change || 0,
        changePct: stock.change || 0,
        high: stock.high || 0,
        low: stock.low || 0,
        exchange: "NSE",
      }));

      return {
        date: latestEntry.date,
        content: processedContent,
      };
    }

    return null;
  } catch (error) {
    console.error("Error in fetchMarketBreadthData:", error);
    return null;
  }
}

// Calculate advances and declines from stock data
export function calculateAdvanceDecline(stocks: StockData[]): {
  advances: number;
  declines: number;
  unchanged: number;
} {
  let advances = 0;
  let declines = 0;
  let unchanged = 0;

  stocks.forEach((stock) => {
    if (stock.changePct > 0) {
      advances++;
    } else if (stock.changePct < 0) {
      declines++;
    } else {
      unchanged++;
    }
  });

  return { advances, declines, unchanged };
}
