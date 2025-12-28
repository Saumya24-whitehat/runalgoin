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
    const { symbol, expiry_date, strikeCount = 100 } = await req.json();
    
    console.log("Fetching kundali data for:", { symbol, expiry_date, strikeCount });
    
    if (!symbol || !expiry_date) {
      throw new Error("Symbol and expiry_date are required");
    }

    const encodedSymbol = encodeURIComponent(symbol);
    const url = `https://runalgo.xyz/data/kundali.php?symbol=${encodedSymbol}&expiry_date=${expiry_date}&StrikeCount=${strikeCount}`;
    
    console.log("Fetching from URL:", url);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Kundali data received, records:", data?.dataWhole?.length || 0);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in kundali-data function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
