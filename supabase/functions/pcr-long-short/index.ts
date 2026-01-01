import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = "https://runalgo.xyz/data/calculateLongShortPcr.php";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get bearer token from environment variable
    const bearerToken = Deno.env.get('RUNALGO_KUNDALI_BEARER_TOKEN');
    if (!bearerToken) {
      console.error('Missing RUNALGO_KUNDALI_BEARER_TOKEN environment variable');
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { symbol, expiry_date, strikeCount = 5, historicalDate } = await req.json();

    console.log(`[pcr-long-short] Fetching data for symbol=${symbol}, expiry=${expiry_date}, strikeCount=${strikeCount}`);

    // Build URL with query params
    let url = `${BASE_URL}?symbol=${encodeURIComponent(symbol)}&expiry_date=${expiry_date}&StrikeCount=${strikeCount}`;
    
    if (historicalDate) {
      url += `&historicalDate=${historicalDate}`;
    }

    console.log(`[pcr-long-short] API URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': '*/*',
        'authorization': `Bearer ${bearerToken}`,
        'content-type': 'application/json',
        'x-requested-with': 'XMLHttpRequest',
        'referer': 'https://runalgo.xyz/calculate_pcr_long_short.php',
      },
    });

    if (!response.ok) {
      console.error(`[pcr-long-short] API returned status ${response.status}`);
      return new Response(
        JSON.stringify({ error: `API returned status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`[pcr-long-short] Successfully fetched data with ${data.dataWhole?.length || 0} time entries`);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[pcr-long-short] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
