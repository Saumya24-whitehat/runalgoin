import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, symbol, date, time, expiry } = await req.json();

    if (action === "getTradingDays") {
      // Fetch trading days
      const url = "https://runalgo.xyz/strategyBuilderWAutoPlay/getTradingDays.php";

      console.log("Fetching trading days from:", url);
      new Response("Done", {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const response = await fetch(url, {
        headers: {
          accept: "*/*",
          "x-requested-with": "XMLHttpRequest",
          referer: "https://runalgo.xyz/strategyBuilderWAutoPlay/",
        },
      });

      console.log(response);
      if (!response.ok) {
        throw new Error(`Failed to fetch trading days: ${response.status}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "getExpiryDates") {
      // Fetch expiry dates
      const encodedSymbol = encodeURIComponent(symbol);
      const url = `https://runalgo.xyz/data/getExpiryDates2.php?symbol=${encodedSymbol}&date=${date}`;

      console.log("Fetching expiry dates from:", url);

      const response = await fetch(url, {
        headers: {
          accept: "*/*",
          "x-requested-with": "XMLHttpRequest",
          referer: "https://runalgo.xyz/strategyBuilderWAutoPlay/",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch expiry dates: ${response.status}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "getStrikesData") {
      // Fetch strikes data
      const url = "https://runalgo.xyz/strategyBuilderWAutoPlay/getAllStrikes_Comm_v2.php";

      const formData = new URLSearchParams();
      formData.append("optSymbol", symbol);
      formData.append("SymbType", "NSE");
      formData.append("date", date);
      formData.append("time", time || "0915");
      formData.append("expiry", expiry);

      console.log("Fetching strikes data with:", formData.toString());

      const response = await fetch(url, {
        method: "POST",
        headers: {
          accept: "*/*",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest",
          origin: "https://runalgo.xyz",
          referer: "https://runalgo.xyz/strategyBuilderWAutoPlay/",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch strikes data: ${response.status}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in option-simulator-data:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
