import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, expiry_date, strikeCount = 5, historicalDate } = await req.json();
    
    console.log("Fetching PCR all strikes data for:", { symbol, expiry_date, strikeCount, historicalDate });
    
    if (!symbol || !expiry_date) {
      throw new Error("Symbol and expiry_date are required");
    }

    const encodedSymbol = encodeURIComponent(symbol);
    let url = `https://runalgo.xyz/data/calculateDayPcrPerStrike.php?symbol=${encodedSymbol}&expiry=${expiry_date}&StrikeCount=${strikeCount}`;
    
    if (historicalDate) {
      url += `&date=${historicalDate}`;
    }
    
    console.log("Fetching from URL:", url);
    
    const bearerToken = Deno.env.get('RUNALGO_KUNDALI_BEARER_TOKEN') || 'eyJpYXQiOjE3NTE3NjU4MjMsImRhdGEiOiJTdW5haW5haWx1MTQzLiJ9';
    
    const response = await fetch(url, {
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://runalgo.xyz/calculate_day_pcr_per_strike.php',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("PCR all strikes data received, records:", data?.data?.length || 0);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in pcr-all-strikes function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
