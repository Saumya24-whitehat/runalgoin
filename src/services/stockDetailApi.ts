import { fetchWithFallback } from "./directApi";

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
  Table_1: FinancialRow[];
  Table_2: FinancialRow[];
  Table_3: GrowthData[];
  Table_4: GrowthData[];
  Table_5: GrowthData[];
  Table_6: GrowthData[];
  Table_7: FinancialRow[];
  Table_8: FinancialRow[];
  Table_9: FinancialRow[];
  Table_10: FinancialRow[];
  Table_11: FinancialRow[];
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
    return await fetchWithFallback<StockOverview>({
      directPath: "/navbar/detailed/data1stock.php",
      edgeFunctionName: "stock-detail-data",
      edgeFunctionBody: { symbol, endpoint: "overview" },
      queryParams: { symbol },
    });
  } catch (error) {
    console.error("Error fetching stock overview:", error);
    return null;
  }
};

export const fetchCompanyId = async (symbol: string): Promise<string | null> => {
  try {
    const data = await fetchWithFallback<any>({
      directPath: "/navbar/detailed/detailedMapping.php",
      edgeFunctionName: "stock-detail-data",
      edgeFunctionBody: { symbol, endpoint: "mapping" },
      queryParams: { symbol },
    });
    return data ? String(data) : null;
  } catch (error) {
    console.error("Error fetching company ID:", error);
    return null;
  }
};

export const fetchStockConsolidated = async (symbol: string): Promise<ConsolidatedData | null> => {
  try {
    return await fetchWithFallback<ConsolidatedData>({
      directPath: `/navbar/financial%20api/data_consolidated/${encodeURIComponent(symbol)}.json`,
      edgeFunctionName: "stock-detail-data",
      edgeFunctionBody: { symbol, endpoint: "consolidated" },
    });
  } catch (error) {
    console.error("Error fetching stock consolidated data:", error);
    return null;
  }
};

export const fetchStockOptions = async (symbol: string): Promise<any> => {
  try {
    return await fetchWithFallback<any>({
      directPath: "/stockJackpot/getSymbolData.php",
      edgeFunctionName: "jackpot-symbol-data",
      edgeFunctionBody: { symbol },
      queryParams: { symbol },
    });
  } catch (error) {
    console.error("Error fetching stock options data:", error);
    return null;
  }
};

export const fetchAdditionalFinancialInfo = async (
  company_id: string,
  parent: string,
  section: "quarters" | "years"
): Promise<AdditionalFinancialData | null> => {
  try {
    return await fetchWithFallback<AdditionalFinancialData>({
      directPath: "/navbar/detailed/getAdditionalFinancialInfo.php",
      edgeFunctionName: "stock-detail-data",
      edgeFunctionBody: {
        symbol: "",
        endpoint: "additional_financial",
        company_id,
        parent,
        section,
      },
      queryParams: { company_id, parent, section },
    });
  } catch (error) {
    console.error("Error fetching additional financial info:", error);
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
  return `₹${value.toLocaleString("en-IN")}`;
};

export const formatPrice = (value: number): string => {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatPercentage = (value: number): string => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
};
