import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FutureItem {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  lastPrice: number;
  priceChange: number;
  openHighDiff: number;
  openLowDiff: number;
}

interface CategorizedData {
  open_equal_high: FutureItem[];
  open_equal_low: FutureItem[];
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

    console.log(`Fetching future open-high-low data from: ${url}`);

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

    // Categorize based on Open = High (bearish) and Open = Low (bullish)
    const openEqualHigh: FutureItem[] = [];
    const openEqualLow: FutureItem[] = [];

    // Threshold for considering prices as "equal" (percentage difference)
    const threshold = 0.15; // 0.15% difference considered as equal

    for (const [symbolKey, data] of Object.entries(rawData)) {
      if (!data || typeof data !== 'object') continue;
      
      const item = data as any;
      const ohlc = item.ohlc;
      if (!ohlc) continue;

      const open = parseFloat(ohlc.open) || 0;
      const high = parseFloat(ohlc.high) || 0;
      const low = parseFloat(ohlc.low) || 0;
      const close = parseFloat(ohlc.close) || 0;
      const lastPrice = parseFloat(item.last_price) || close;

      if (open === 0 || high === 0 || low === 0) continue;

      // Calculate percentage difference from open
      const openHighDiffPercent = ((high - open) / open) * 100;
      const openLowDiffPercent = ((open - low) / open) * 100;

      // Price change from open
      const priceChangePercent = ((lastPrice - open) / open) * 100;

      const futureItem: FutureItem = {
        symbol: symbolKey,
        open,
        high,
        low,
        close,
        lastPrice,
        priceChange: priceChangePercent,
        openHighDiff: openHighDiffPercent,
        openLowDiff: openLowDiffPercent,
      };

      // Open = High (within threshold) - Bearish indicator
      // Stock opened at the highest point of the day
      if (openHighDiffPercent <= threshold) {
        openEqualHigh.push(futureItem);
      }

      // Open = Low (within threshold) - Bullish indicator
      // Stock opened at the lowest point of the day
      if (openLowDiffPercent <= threshold) {
        openEqualLow.push(futureItem);
      }
    }

    // Sort by price change (most extreme first)
    openEqualHigh.sort((a, b) => a.priceChange - b.priceChange); // Most negative first (bearish)
    openEqualLow.sort((a, b) => b.priceChange - a.priceChange); // Most positive first (bullish)

    const result: CategorizedData = {
      open_equal_high: openEqualHigh,
      open_equal_low: openEqualLow,
      lastUpdated: new Date().toISOString(),
    };

    console.log(`Categorized: O=H=${openEqualHigh.length}, O=L=${openEqualLow.length}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch data";
    console.error("Error fetching future open-high-low data:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
