import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = 'http://runalgo.in/data';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, symbol, expiry, positions } = await req.json();
    console.log(`Option Builder API - Action: ${action}, Symbol: ${symbol}`);

    let url = '';
    let method = 'GET';
    let body = null;

    switch (action) {
      case 'getOptionChain':
        url = `${BASE_URL}/getAllStrikes_Comm_v2.php`;
        method = 'POST';
        body = new URLSearchParams({ optSymbol: symbol || 'Nifty 50' });
        break;

      case 'getSymbols':
        url = `${BASE_URL}/getSymbols2.php`;
        break;

      case 'getExpiryDates':
        url = `${BASE_URL}/getExpiryDates2.php?symbol=${encodeURIComponent(symbol || 'NIFTY')}`;
        break;

      case 'getMargin':
        // Proxy to Upstox margin calculator
        const marginResponse = await fetch(
          'https://service.upstox.com/jspan-margin-calculator-pub/v1/open/calculate-margin-basket',
          {
            method: 'POST',
            headers: {
              'accept': 'application/json, text/plain, */*',
              'accept-version': 'v2.1',
              'content-type': 'application/json',
              'origin': 'https://upstox.com',
              'referer': 'https://upstox.com/',
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            body: JSON.stringify({
              isMtfMarginRequired: false,
              instruments: positions || [],
            }),
          }
        );

        if (!marginResponse.ok) {
          throw new Error(`Margin API error: ${marginResponse.status}`);
        }

        const marginData = await marginResponse.json();
        console.log('Margin data fetched successfully');

        return new Response(JSON.stringify(marginData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Make the API request
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Referer': 'http://runalgo.in/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': method === 'POST' ? 'application/x-www-form-urlencoded' : 'application/json',
      },
    };

    if (body && method === 'POST') {
      fetchOptions.body = body.toString();
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Option Builder data fetched successfully for action: ${action}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in option-builder-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
