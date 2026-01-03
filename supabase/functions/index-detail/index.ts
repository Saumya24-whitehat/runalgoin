import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  index: string;
  dataType: 'stocks' | 'delivery' | 'advanceDecline' | 'technicals' | 'shareholding' | 'breadth';
  shareholdingType?: 'promoter' | 'fii' | 'mf' | 'public';
  breadthType?: 'breadth' | 'periodicHL' | 'advDec';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { index, dataType, shareholdingType, breadthType }: RequestBody = await req.json();
    
    if (!index) {
      return new Response(JSON.stringify({ error: 'Index is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const encodedIndex = encodeURIComponent(index);
    let apiUrl = '';
    
    switch (dataType) {
      case 'stocks':
        apiUrl = `https://runalgo.xyz/navbar/detailed/datastocks.php?index=${encodedIndex}`;
        break;
      case 'delivery':
        apiUrl = `https://runalgo.xyz/navbar/detailed/deliveryData.php?index=${encodedIndex}`;
        break;
      case 'advanceDecline':
        apiUrl = `https://runalgo.xyz/adv-dec copy/ADdataLastData.php?index=${encodedIndex}`;
        break;
      case 'technicals':
        apiUrl = `https://runalgo.xyz/adv-dec copy/ADdataLastData.php?index=${encodedIndex}`;
        break;
      case 'shareholding':
        const shType = shareholdingType || 'promoter';
        apiUrl = `https://runalgo.xyz/navbar/detailed/shareholdingData.php?index=${encodedIndex}&type=${shType}`;
        break;
      case 'breadth':
        apiUrl = `https://runalgo.xyz/adv-dec copy/ADdataLastData.php?index=${encodedIndex}`;
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid data type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    console.log(`Fetching ${dataType} data for index: ${index}`);
    console.log(`API URL: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
      }
    });

    if (!response.ok) {
      console.error(`API response not ok: ${response.status}`);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log(`Successfully fetched ${dataType} data`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching index detail data:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
