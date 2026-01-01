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

    const { symbol, expiry, strikeCount, tf, historicalDate } = await req.json();

    console.log(`OTR Data request - Symbol: ${symbol}, Expiry: ${expiry}, StrikeCount: ${strikeCount}, TF: ${tf}`);

    // Build URL with parameters
    let apiUrl = `${BASE_URL}/calculate_detailed_combined_pcr_with_pervious_day2.php?symbol=${encodeURIComponent(symbol)}&expiry=${encodeURIComponent(expiry)}&StrikeCount=${strikeCount || 5}&tf=${encodeURIComponent(tf || "3min")}`;
    
    if (historicalDate) {
      apiUrl += `&date=${encodeURIComponent(historicalDate)}`;
    }

    console.log(`Fetching OTR data from: ${apiUrl}`);

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
      console.error(`OTR API error: ${response.status}`);
      throw new Error(`OTR API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`OTR data received, entries: ${data?.data?.length || 0}, previous day entries: ${data?.previous_day?.length || 0}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("OTR Data Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
