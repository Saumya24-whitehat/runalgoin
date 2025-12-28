import { supabase } from "@/integrations/supabase/client";
import { SymbolsResponse, ExpiryResponse, OptionChainResponse, GroupedSymbols } from "@/types/optionChain";

export async function fetchHeatMapSymbols(): Promise<GroupedSymbols> {
  try {
    const { data, error } = await supabase.functions.invoke('option-chain-proxy', {
      body: { endpoint: 'symbols' }
    });

    if (error) {
      console.error("Error fetching symbols:", error);
      throw error;
    }

    return {
      indexSymbols: data["index symbols"] || [],
      stockSymbols: data.symbols || []
    };
  } catch (error) {
    console.error("Error fetching symbols:", error);
    throw error;
  }
}

export async function fetchHeatMapExpiryDates(symbol: string): Promise<ExpiryResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('option-chain-proxy', {
      body: {
        endpoint: 'expiry',
        params: { symbol }
      }
    });

    if (error) {
      console.error("Error fetching expiry dates:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error fetching expiry dates:", error);
    throw error;
  }
}

export async function fetchHeatMapOptionChainData(
  symbol: string,
  expiry: string,
  strikeCount: number = 10
): Promise<OptionChainResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('option-chain-proxy', {
      body: {
        endpoint: 'optionchain',
        params: { symbol, expiry, strikeCount }
      }
    });

    if (error) {
      console.error("Error fetching option chain data:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error fetching option chain data:", error);
    throw error;
  }
}
