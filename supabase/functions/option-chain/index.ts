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
    const { action, symbol, expiry_date } = await req.json();
    console.log(`Option chain request: action=${action}, symbol=${symbol}, expiry=${expiry_date}`);

    let url = '';
    
    switch (action) {
      case 'getSymbols':
        url = 'https://runalgo.xyz/data/getSymbols.php';
        break;
      case 'getExpiryDates':
        url = `https://runalgo.xyz/data/getExpiryDates2.php?symbol=${encodeURIComponent(symbol)}`;
        break;
      case 'getOptionChain':
        url = `https://runalgo.xyz/data/getOptionChain.php?symbol=${encodeURIComponent(symbol)}&expiry_date=${encodeURIComponent(expiry_date)}`;
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Fetching from: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': '*/*',
        'content-type': 'application/json',
        'x-requested-with': 'XMLHttpRequest',
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Successfully fetched ${action} data`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in option-chain function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
