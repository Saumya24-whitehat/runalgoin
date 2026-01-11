const BASE_URL = "https://runalgo.xyz/data";

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
  const params = new URLSearchParams();
  params.append("symbol", symbol);
  params.append("expiry", expiry);
  if (date) {
    params.append("date", date);
  }

  const url = `${BASE_URL}/strikes.php?${params.toString()}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function fetchPremiumDecayData(
  symbol: string,
  expiry: string,
  strike: number,
  date?: string
): Promise<PremiumDecayResponse> {
  const params = new URLSearchParams();
  params.append("symbol", symbol);
  params.append("expiry", expiry);
  params.append("strike", strike.toString());
  if (date) {
    params.append("date", date);
  }

  const url = `${BASE_URL}/getATMDeltaPremiumData.php?${params.toString()}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}
