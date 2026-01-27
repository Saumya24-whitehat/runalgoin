import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, endpoint, company_id, parent, section } = await req.json();
    
    if (!symbol && !company_id) {
      return new Response(
        JSON.stringify({ error: "Symbol or company_id is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching ${endpoint} data for symbol: ${symbol}, company_id: ${company_id}`);

    let url = '';
    
    switch (endpoint) {
      case 'overview':
        url = `https://runalgo.xyz/navbar/detailed/data1stock.php?symbol=${encodeURIComponent(symbol)}`;
        break;
      case 'consolidated':
        url = `https://runalgo.xyz/navbar/financial%20api/data_consolidated/${encodeURIComponent(symbol)}.json`;
        break;
      case 'options':
        url = `https://runalgo.xyz/stockJackpot/getSymbolData.php?symbol=${encodeURIComponent(symbol)}`;
        break;
      case 'peers':
        url = `https://runalgo.xyz/navbar/detailed/peers.php?symbol=${encodeURIComponent(symbol)}`;
        break;
      case 'mapping':
        url = `https://runalgo.xyz/navbar/detailed/detailedMapping.php?symbol=${encodeURIComponent(symbol)}`;
        break;
      case 'additional_financial':
        if (!company_id || !parent || !section) {
          return new Response(
            JSON.stringify({ error: "company_id, parent, and section are required for additional_financial" }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        url = `https://runalgo.xyz/navbar/detailed/getAdditionalFinancialInfo.php?company_id=${encodeURIComponent(company_id)}&parent=${encodeURIComponent(parent)}&section=${encodeURIComponent(section)}`;
        break;
      default:
        url = `https://runalgo.xyz/navbar/detailed/data1stock.php?symbol=${encodeURIComponent(symbol)}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "*/*",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${endpoint} data:`, response.status);
      throw new Error(`Failed to fetch data: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Successfully fetched ${endpoint} data for ${symbol || company_id}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error fetching stock detail data:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});