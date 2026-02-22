import { fetchWithFallback } from "./directApi";
import { ExpiryResponse, OptionChainResponse, GroupedSymbols } from "@/types/optionChain";

export async function fetchHeatMapSymbols(): Promise<GroupedSymbols> {
  const data = await fetchWithFallback<Record<string, any>>({
    directPath: "/data/getSymbols.php",
    edgeFunctionName: "option-chain-proxy",
    edgeFunctionBody: { endpoint: "symbols" },
  });

  return {
    indexSymbols: data["index symbols"] || [],
    stockSymbols: data.symbols || [],
  };
}

export async function fetchHeatMapExpiryDates(symbol: string): Promise<ExpiryResponse> {
  return fetchWithFallback<ExpiryResponse>({
    directPath: "/data/getExpiryDates2.php",
    edgeFunctionName: "option-chain-proxy",
    edgeFunctionBody: { endpoint: "expiry", params: { symbol } },
    queryParams: { symbol },
  });
}

export async function fetchHeatMapOptionChainData(
  symbol: string,
  expiry: string,
  strikeCount: number = 10
): Promise<OptionChainResponse> {
  return fetchWithFallback<OptionChainResponse>({
    directPath: "/data/calculateStrikeDataWithStrikeCount.php",
    edgeFunctionName: "option-chain-proxy",
    edgeFunctionBody: { endpoint: "optionchain", params: { symbol, expiry, strikeCount } },
    queryParams: { symbol, expiry, StrikeCount: strikeCount.toString() },
  });
}
