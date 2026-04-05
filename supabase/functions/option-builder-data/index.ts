import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DATA_BASE_URL = 'https://runalgo.xyz/strategyBuilder';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, symbol, expiry, positions } = await req.json();
    console.log(`Option Builder API - Action: ${action}, Symbol: ${symbol}`);

    switch (action) {
      case 'getOptionChain': {
        // Fetch option chain data from runalgo API
        const formData = new URLSearchParams();
        formData.append('optSymbol', symbol || 'Nifty 50');
        formData.append('SymbType', 'NSE');

        console.log('Fetching option chain data for symbol:', symbol);

        const response = await fetch(`${DATA_BASE_URL}/getAllStrikes_Comm_v2.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Origin': 'https://runalgo.xyz',
            'Referer': 'https://runalgo.xyz/strategyBuilder/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: formData.toString(),
        });

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Option chain data fetched successfully');

        // Transform the data to a more usable format
        const transformedData = {
          strikeArray: data.TotalATMvalues || [],
          strikeDiff: data.strike_diff || 50,
          lot: parseInt(data.lot) || 75,
          spotPrice: data.ltp || 0,
          futureToken: data.FutureToken || [],
          futureNames: data.FutureNames || [],
          futureExpiry: data.FutureExpiry || [],
          futurePrices: data.FuturePrices || data.futurePrices || [],
          ceTokens: data.CE_Tokens || [],
          peTokens: data.PE_Tokens || [],
          spotToken: data.SpotToken_upstox || '',
          expiryWise: data.expiryWise || {},
        };

        return new Response(JSON.stringify(transformedData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getMargin': {
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
          console.error('Margin API error:', marginResponse.status);
          return new Response(JSON.stringify({ 
            response: { 
              data: { finalMargin: 0 } 
            } 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const marginData = await marginResponse.json();
        console.log('Margin data fetched successfully');

        return new Response(JSON.stringify(marginData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error('Error in option-builder-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
