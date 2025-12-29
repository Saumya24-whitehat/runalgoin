import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://runalgo.xyz/data";
const BEARER_TOKEN = Deno.env.get("RUNALGO_KUNDALI_BEARER_TOKEN") || "";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
        "authorization": `Bearer ${BEARER_TOKEN}`,
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
  } catch (error) {
    console.error("OTR Data Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
