import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://runalgo.xyz/data";

interface Position {
  expiry: string;
  strike: number;
  lots: number;
  type: "Call" | "Put";
}

interface RequestBody {
  symbol: string;
  timeframe: string;
  longs: Position[];
  shorts: Position[];
}

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

    const { symbol, timeframe, longs, shorts }: RequestBody = await req.json();

    console.log(`Strategy Chart request - Symbol: ${symbol}, Timeframe: ${timeframe}, Longs: ${longs.length}, Shorts: ${shorts.length}`);

    // Build form data with positions
    const formData = new URLSearchParams();
    formData.append('symbol', symbol || 'Nifty 50');
    formData.append('timeframe', timeframe || '1min');

    // Add long positions
    if (longs && longs.length > 0) {
      longs.forEach((pos, index) => {
        formData.append(`positions[Longs][${index}][expiry]`, pos.expiry);
        formData.append(`positions[Longs][${index}][strike]`, pos.strike.toString());
        formData.append(`positions[Longs][${index}][lots]`, pos.lots.toString());
        formData.append(`positions[Longs][${index}][type]`, pos.type);
      });
    }

    // Add short positions
    if (shorts && shorts.length > 0) {
      shorts.forEach((pos, index) => {
        formData.append(`positions[Shorts][${index}][expiry]`, pos.expiry);
        formData.append(`positions[Shorts][${index}][strike]`, pos.strike.toString());
        formData.append(`positions[Shorts][${index}][lots]`, pos.lots.toString());
        formData.append(`positions[Shorts][${index}][type]`, pos.type);
      });
    }

    const url = `${BASE_URL}/getChartDataHighChart.php`;
    console.log(`Fetching strategy chart data from: ${url}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "accept": "*/*",
        "authorization": `Bearer ${bearerToken}`,
        "content-type": "application/x-www-form-urlencoded",
        "x-requested-with": "XMLHttpRequest",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    console.log(`Strategy chart data fetched successfully, data points: ${Object.keys(data).length}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch strategy chart data";
    console.error("Error fetching strategy chart data:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
