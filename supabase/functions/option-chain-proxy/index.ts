import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://runalgo.xyz/data";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, params } = await req.json();
    console.log(`Proxying request to: ${endpoint} with params:`, params);

    let url = "";

    switch (endpoint) {
      case "symbols":
        url = `${BASE_URL}/getSymbols.php`;
        break;
      case "expiry":
        const symbol = encodeURIComponent(params.symbol);
        if (params.date) {
          var date = "&date=" + encodeURIComponent(params.symbol);
        } else {
          var date = "";
        }

        url = `${BASE_URL}/getExpiryDates2.php?symbol=${symbol}${date}`;
        break;
      case "optionchain":
        const encodedSymbol = encodeURIComponent(params.symbol);
        url = `${BASE_URL}/calculateStrikeDataWithStrikeCount.php?symbol=${encodedSymbol}&expiry=${params.expiry}&StrikeCount=${params.strikeCount}`;
        break;
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }

    console.log(`Fetching from URL: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "*/*",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`API responded with status: ${response.status}`);
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Successfully fetched data for endpoint: ${endpoint}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in option-chain-proxy function:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
