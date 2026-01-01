import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FutureItem {
  symbol: string;
  price: number;
  priceChange: number;
  oi: number;
  oiChange: number;
  oiChangePercent: number;
}

interface CategorizedData {
  long_buildup: FutureItem[];
  short_buildup: FutureItem[];
  short_covering: FutureItem[];
  long_unwinding: FutureItem[];
  lastUpdated: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, expiry } = await req.json();
    
    if (!symbol || !expiry) {
      return new Response(
        JSON.stringify({ error: "Symbol and expiry are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const encodedSymbol = encodeURIComponent(symbol);
    const url = `https://runalgo.xyz/data/future_buildup.php?symbol=${encodedSymbol}&expiry=${expiry}`;

    console.log(`Fetching future buildup data from: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "*/*",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        "referer": "https://runalgo.xyz/OIBUILDUP/",
        "x-requested-with": "XMLHttpRequest",
        "user-agent": "Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const rawData = await response.json();
    console.log(`Received data for ${Object.keys(rawData).length} symbols`);

    // Categorize the data based on price change and OI change
    // Long Buildup: Price Up + OI Up (bullish)
    // Short Buildup: Price Down + OI Up (bearish)
    // Short Covering: Price Up + OI Down
    // Long Unwinding: Price Down + OI Down
    
    const longBuildup: FutureItem[] = [];
    const shortBuildup: FutureItem[] = [];
    const shortCovering: FutureItem[] = [];
    const longUnwinding: FutureItem[] = [];

    for (const [symbolKey, data] of Object.entries(rawData)) {
      if (!data || typeof data !== 'object') continue;
      
      const item = data as any;
      const lastPrice = parseFloat(item.last_price) || 0;
      const closePrice = item.ohlc?.close || lastPrice;
      const openPrice = item.ohlc?.open || lastPrice;
      const oi = parseInt(item.oi) || 0;
      const oiChange = parseInt(item.oi_change) || 0;
      
      // Calculate price change percentage from open to last price
      const priceChangePercent = openPrice > 0 ? ((lastPrice - openPrice) / openPrice) * 100 : 0;
      
      // Calculate OI change percentage (oi_change is absolute change, need to calculate %)
      const previousOI = oi - oiChange;
      const oiChangePercent = previousOI > 0 ? (oiChange / previousOI) * 100 : 0;

      const futureItem: FutureItem = {
        symbol: symbolKey,
        price: lastPrice,
        priceChange: priceChangePercent,
        oi: oi,
        oiChange: oiChange,
        oiChangePercent: oiChangePercent,
      };

      // Only include if there's meaningful OI change
      if (Math.abs(oiChangePercent) > 0.1) {
        if (priceChangePercent > 0 && oiChange > 0) {
          longBuildup.push(futureItem);
        } else if (priceChangePercent < 0 && oiChange > 0) {
          shortBuildup.push(futureItem);
        } else if (priceChangePercent > 0 && oiChange < 0) {
          shortCovering.push(futureItem);
        } else if (priceChangePercent < 0 && oiChange < 0) {
          longUnwinding.push(futureItem);
        }
      }
    }

    // Sort by OI change percentage (absolute value, descending)
    const sortByOIChange = (a: FutureItem, b: FutureItem) => 
      Math.abs(b.oiChangePercent) - Math.abs(a.oiChangePercent);

    longBuildup.sort(sortByOIChange);
    shortBuildup.sort(sortByOIChange);
    shortCovering.sort(sortByOIChange);
    longUnwinding.sort(sortByOIChange);

    const result: CategorizedData = {
      long_buildup: longBuildup,
      short_buildup: shortBuildup,
      short_covering: shortCovering,
      long_unwinding: longUnwinding,
      lastUpdated: new Date().toISOString(),
    };

    console.log(`Categorized: LB=${longBuildup.length}, SB=${shortBuildup.length}, SC=${shortCovering.length}, LU=${longUnwinding.length}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch data";
    console.error("Error fetching future buildup data:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
