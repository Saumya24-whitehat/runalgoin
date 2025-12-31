import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RolloverItem {
  symbol: string;
  lastPrice: number;
  priceChange: number;
  oi: number;
  nextOi: number;
  rollover: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, expiry } = await req.json();

    if (!symbol || !expiry) {
      return new Response(JSON.stringify({ error: "Symbol and expiry are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encodedSymbol = encodeURIComponent(symbol);
    const url = `https://runalgo.xyz/data/future_buildup.php?symbol=${encodedSymbol}&expiry=${expiry}`;

    console.log(`Fetching future rollover data from: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "*/*",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        referer: "https://runalgo.xyz/OIBUILDUP/",
        "x-requested-with": "XMLHttpRequest",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const rawData = await response.json();
    console.log(`Received data for ${Object.keys(rawData).length} symbols`);

    const rolloverItems: RolloverItem[] = [];

    return new Response(
      JSON.stringify({
        data: rawData,
        lastUpdated: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
    for (const [symbolKey, data] of Object.entries(rawData)) {
      if (!data || typeof data !== "object") continue;

      const item = data as any;
      const lastPrice = parseFloat(item.last_price) || 0;
      const openPrice = item.ohlc?.open || lastPrice;
      const oi = parseInt(item.oi) || 0;
      const nextOi = parseInt(item.NextOI) || 0;

      // Calculate price change percentage
      const priceChange = openPrice > 0 ? ((lastPrice - openPrice) / openPrice) * 100 : 0;

      // Calculate rollover: NextOI / (NextOI + OI) * 100
      const totalOi = nextOi + oi;
      const rollover = totalOi > 0 ? (nextOi / totalOi) * 100 : 0;

      // Only include if there's meaningful data
      if (oi > 0 || nextOi > 0) {
        rolloverItems.push({
          symbol: symbolKey,
          lastPrice,
          priceChange,
          oi,
          nextOi,
          rollover,
        });
      }
    }

    // Sort by rollover percentage descending
    rolloverItems.sort((a, b) => b.rollover - a.rollover);

    console.log(`Processed ${rolloverItems.length} items with rollover data`);

    return new Response(
      JSON.stringify({
        data: rolloverItems,
        lastUpdated: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error fetching future rollover data:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to fetch data" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
