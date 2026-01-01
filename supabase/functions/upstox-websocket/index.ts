import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, accessToken: providedToken } = body;

    if (action === "getAccessToken") {
      // Fetch access token from runalgo
      const response = await fetch("https://runalgo.xyz/DoNotTouch/upstox.txt");
      if (!response.ok) {
        throw new Error(`Failed to fetch access token: ${response.status}`);
      }
      const token = await response.text();
      
      return new Response(
        JSON.stringify({ accessToken: token.trim() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "getWebSocketUrl") {
      // First get the access token if not provided
      let token = providedToken;
      if (!token) {
        const tokenResponse = await fetch("https://runalgo.xyz/DoNotTouch/upstox.txt");
        if (!tokenResponse.ok) {
          throw new Error(`Failed to fetch access token: ${tokenResponse.status}`);
        }
        token = (await tokenResponse.text()).trim();
      }

      // Get WebSocket URL from Upstox
      const wsResponse = await fetch(
        "https://api.upstox.com/v3/feed/market-data-feed/authorize",
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!wsResponse.ok) {
        const errorText = await wsResponse.text();
        throw new Error(`Failed to get WebSocket URL: ${wsResponse.status} - ${errorText}`);
      }

      const data = await wsResponse.json();
      
      return new Response(
        JSON.stringify({ 
          websocketUrl: data.data?.authorizedRedirectUri,
          accessToken: token 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
