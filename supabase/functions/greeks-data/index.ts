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
    // Get bearer token from environment variable
    const bearerToken = Deno.env.get('RUNALGO_KUNDALI_BEARER_TOKEN');
    if (!bearerToken) {
      console.error('Missing RUNALGO_KUNDALI_BEARER_TOKEN environment variable');
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { symbol, expiry, strike, optionType, timeframe } = await req.json();

    console.log(`Greeks Data request - Symbol: ${symbol}, Expiry: ${expiry}, Strike: ${strike}, Type: ${optionType}, Timeframe: ${timeframe}`);

    // Build form data
    const formData = new URLSearchParams({
      symbol: symbol || "Nifty 50",
      expiry: expiry || "",
      strike: (strike || 0).toString(),
      optionType: optionType || "Call",
      timeframe: timeframe || "3min",
    });

    const url = `${BASE_URL}/getGreeksData.php`;
    console.log(`Fetching Greeks data from: ${url}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "accept": "*/*",
        "authorization": `Bearer ${bearerToken}`,
        "content-type": "application/x-www-form-urlencoded",
        "x-requested-with": "XMLHttpRequest",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    console.log(`Greeks data fetched successfully for ${symbol} ${strike} ${optionType}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch Greeks data";
    console.error("Error fetching Greeks data:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
