import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://runalgo.xyz/data";
const AUTH_TOKEN = "Bearer eyJpYXQiOjE3NTE2NzczOTksImRhdGEiOiJTdW5haW5haWx1MTQzLiJ9";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, expiry_date, strikeCount, historicalDate } = await req.json();

    console.log(`PCR Data request - Symbol: ${symbol}, Expiry: ${expiry_date}, StrikeCount: ${strikeCount}`);

    // Build URL with query parameters
    const params = new URLSearchParams({
      symbol: symbol || "Nifty 50",
      expiry_date: expiry_date || "",
      StrikeCount: (strikeCount || 5).toString(),
    });

    // Add historical date if provided
    if (historicalDate) {
      params.append("date", historicalDate);
    }

    const url = `${BASE_URL}/calculatePcr.php?${params.toString()}`;
    console.log(`Fetching PCR data from: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "*/*",
        "authorization": AUTH_TOKEN,
        "content-type": "application/json",
        "x-requested-with": "XMLHttpRequest",
      },
    });

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    console.log(`PCR data fetched successfully, entries: ${data?.dataWhole?.length || 0}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch PCR data";
    console.error("Error fetching PCR data:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
