import { fetchWithFallback } from "./directApi";

export interface PremiumDecayStrikesResponse {
  symbol: string;
  expiry: string;
  date: string;
  strikes: number[];
  atm: number;
  MorningAtmStrike?: number;
}

export interface PremiumDecayDataEntry {
  FormatedTime: number;
  Time: string;
  Spot_Price: number;
  ce_delta: number;
  pe_delta: number;
  ce_ltp: number;
  pe_ltp: number;
  ce_delta_ltp: number;
  pe_delta_ltp: number;
  ce_delta_ltp_chg: number;
  pe_delta_ltp_chg: number;
  ce_delta_ltp_start: number;
  pe_delta_ltp_start: number;
}

export interface PremiumDecayResponse {
  symbol: string;
  date: string;
  expiry: string;
  data: PremiumDecayDataEntry[];
}

export async function fetchPremiumDecayStrikes(
  symbol: string,
  expiry: string,
  date?: string
): Promise<PremiumDecayStrikesResponse> {
  const queryParams: Record<string, string> = { symbol, expiry };
  if (date) queryParams.date = date;

  return fetchWithFallback<PremiumDecayStrikesResponse>({
    directPath: "/data/strikes.php",
    edgeFunctionName: "premium-decay-data",
    edgeFunctionBody: { endpoint: "strikes", symbol, expiry, date },
    queryParams,
  });
}

export async function fetchPremiumDecayData(
  symbol: string,
  expiry: string,
  strike: number,
  date?: string
): Promise<PremiumDecayResponse> {
  const queryParams: Record<string, string> = {
    symbol,
    expiry,
    strike: strike.toString(),
  };
  if (date) queryParams.date = date;

  return fetchWithFallback<PremiumDecayResponse>({
    directPath: "/data/getATMDeltaPremiumData.php",
    edgeFunctionName: "premium-decay-data",
    edgeFunctionBody: { endpoint: "data", symbol, expiry, strike, date },
    queryParams,
  });
}
