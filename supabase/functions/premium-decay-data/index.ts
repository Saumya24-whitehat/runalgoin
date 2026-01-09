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
    const { endpoint, symbol, expiry, strike, date } = await req.json();

    if (endpoint === "strikes") {
      // Fetch strikes for premium decay using strikes.php
      const params = new URLSearchParams();
      params.append("symbol", symbol);
      params.append("expiry", expiry);
      if (date) {
        params.append("date", date);
      }

      const url = `https://runalgo.xyz/data/strikes.php?${params.toString()}`;
      console.log("Fetching strikes from:", url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (endpoint === "data") {
      // Fetch premium decay data
      const params = new URLSearchParams();
      params.append("symbol", symbol);
      params.append("expiry", expiry);
      params.append("strike", strike.toString());
      if (date) {
        params.append("date", date);
      }

      const url = `https://runalgo.xyz/data/getATMDeltaPremiumData.php?${params.toString()}`;
      console.log("Fetching premium decay data from:", url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid endpoint" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in premium-decay-data function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
