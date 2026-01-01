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

    const { endpoint, symbol, expiry, strikes, historicalDate } = await req.json();

    console.log(`TOI Data request - Endpoint: ${endpoint}, Symbol: ${symbol}, Expiry: ${expiry}, Strikes: ${strikes}`);

    if (endpoint === "strikes") {
      // Fetch available strikes for symbol/expiry
      const apiUrl = `${BASE_URL}/strikes.php?symbol=${encodeURIComponent(symbol)}&expiry=${encodeURIComponent(expiry)}`;
      console.log(`Fetching strikes from: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "accept": "*/*",
          "x-requested-with": "XMLHttpRequest",
        },
      });

      if (!response.ok) {
        throw new Error(`Strikes API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Strikes received:`, data);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (endpoint === "data") {
      // Fetch TOI data for selected strikes
      if (!strikes || !Array.isArray(strikes) || strikes.length === 0) {
        throw new Error("No strikes provided");
      }

      // Build URL with historical date if provided
      let apiUrl = `${BASE_URL}/calculateStrikeSpecificCombinedData.php?symbol=${encodeURIComponent(symbol)}&expiry=${encodeURIComponent(expiry)}&strike=${strikes.join(",")}`;
      
      if (historicalDate) {
        apiUrl += `&date=${encodeURIComponent(historicalDate)}`;
      }

      console.log(`Fetching TOI data from: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "accept": "*/*",
          "authorization": `Bearer ${bearerToken}`,
          "content-type": "application/json",
          "x-requested-with": "XMLHttpRequest",
        },
      });

      if (!response.ok) {
        throw new Error(`TOI Data API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`TOI data received, entries: ${data?.data?.length || 0}`);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("TOI Data Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
