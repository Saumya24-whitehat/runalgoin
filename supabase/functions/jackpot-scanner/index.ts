import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Fetching jackpot scanner data from runalgo.xyz...");

    const response = await fetch("https://runalgo.xyz/stockJackpot/GetAllSymbols.php", {
      method: "GET",
      headers: {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
        "x-requested-with": "XMLHttpRequest",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch jackpot scanner data:", response.status);
      throw new Error(`Failed to fetch data: ${response.status}`);
    }

    const data = await response.json();
    console.log("Successfully fetched jackpot scanner data");

    // Categorize the data
    const longBuildup: { symbol: string; trend: string; ltp: string }[] = [];
    const longUnwinding: { symbol: string; trend: string; ltp: string }[] = [];
    const shortBuildup: { symbol: string; trend: string; ltp: string }[] = [];
    const shortCovering: { symbol: string; trend: string; ltp: string }[] = [];

    for (const [symbol, values] of Object.entries(data)) {
      const arr = values as string[];
      const trend = arr[1];
      const ltp = arr[2];

      const item = { symbol, trend, ltp };

      if (trend === "Long Buildup") {
        longBuildup.push(item);
      } else if (trend === "Long Unwinding") {
        longUnwinding.push(item);
      } else if (trend === "Short Buildup") {
        shortBuildup.push(item);
      } else if (trend === "Short Covering") {
        shortCovering.push(item);
      }
    }

    return new Response(JSON.stringify({
      longBuildup,
      longUnwinding,
      shortBuildup,
      shortCovering,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error fetching jackpot scanner data:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
