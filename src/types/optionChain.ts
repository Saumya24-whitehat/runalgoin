export interface SymbolsResponse {
  symbols: string[];
  "index symbols"?: string[];
}

export interface GroupedSymbols {
  indexSymbols: string[];
  stockSymbols: string[];
}

export interface ExpiryResponse {
  symbol: string;
  latest_date: string;
  expiry_dates: string[];
}

export interface StrikeData {
  Strike: number;
  CE_OI: number;
  PE_OI: number;
  CE_COI: number;
  PE_COI: number;
  "CE_COI%": number;
  "PE_COI%": number;
  CE_IV: number;
  PE_IV: number;
  CE_LTP: number;
  PE_LTP: number;
  CE_LTP_CHG: number;
  PE_LTP_CHG: number;
  "CE_LTP_CHG%": number;
  "PE_LTP_CHG%": number;
}

export interface OptionChainResponse {
  symbol: string;
  date: string;
  expiry: string;
  Spot_Price: number;
  atm: number;
  Time: string;
  data: StrikeData[];
}
