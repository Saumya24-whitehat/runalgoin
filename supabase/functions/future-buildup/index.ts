import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, expiry } = await req.json();
    
    if (!symbol || !expiry) {
      return new Response(
        JSON.stringify({ error: "Symbol and expiry are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const encodedSymbol = encodeURIComponent(symbol);
    const url = `https://runalgo.xyz/data/future_buildup.php?symbol=${encodedSymbol}&expiry=${expiry}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "*/*",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        "referer": "https://runalgo.xyz/OIBUILDUP/",
        "x-requested-with": "XMLHttpRequest",
        "user-agent": "Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching future buildup data:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch data" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
