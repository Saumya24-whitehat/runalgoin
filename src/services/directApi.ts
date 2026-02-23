/**
 * Direct API utility — tries calling the external API directly from the browser.
 * Falls back to the Supabase edge function proxy if CORS blocks the direct call.
 *
 * Benefits:
 *  - Eliminates the extra hop (browser → edge fn → API → edge fn → browser)
 *  - Falls back gracefully so nothing breaks if CORS is not enabled
 */

import { supabase } from "@/integrations/supabase/client";

const RUNALGO_BASE = "https://runalgo.xyz";

// Cache which endpoints support direct calls vs need proxy
const corsSupport = new Map<string, boolean>();

interface DirectFetchOptions {
  /** The direct URL path on runalgo.xyz (e.g. "/ticker/indices_data.php") */
  directPath: string;
  /** The edge function name to fall back to */
  edgeFunctionName: string;
  /** Optional body to send to the edge function (POST) */
  edgeFunctionBody?: Record<string, unknown>;
  /** Optional query params for the direct GET call */
  queryParams?: Record<string, string>;
  /** Extra headers for the direct call */
  directHeaders?: Record<string, string>;
  /** If true, forces using the edge function (e.g. when auth token is needed) */
  requiresAuth?: boolean;
}

export async function fetchWithFallback<T = unknown>(options: DirectFetchOptions): Promise<T> {
  const { directPath, edgeFunctionName, edgeFunctionBody, queryParams, directHeaders, requiresAuth = false } = options;

  // If this endpoint needs server-side auth, skip direct call entirely
  if (requiresAuth) {
    return callEdgeFunction<T>(edgeFunctionName, edgeFunctionBody);
  }

  // If we already know CORS is blocked for this path, skip direct
  if (corsSupport.has(directPath) && !corsSupport.get(directPath)) {
    return callEdgeFunction<T>(edgeFunctionName, edgeFunctionBody);
  }

  // Try direct call first
  try {
    const url = new URL(directPath, RUNALGO_BASE);
    if (queryParams) {
      Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout for direct
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "accept": "*/*",
        "content-type": "application/json",
        "x-requested-with": "XMLHttpRequest",
        "Referer": "https://optionworld.tech/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
        ...directHeaders,
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Direct API error: ${response.status}`);
    }

    const data = await response.json();
    corsSupport.set(directPath, true);
    console.log(`[DirectAPI] ✅ Direct call succeeded: ${directPath}`);
    return data as T;
  } catch (err) {
    // CORS error, network error, or timeout — fall back
    const isCors =
      err instanceof TypeError && (err.message.includes("Failed to fetch") || err.message.includes("CORS"));
    if (isCors) {
      corsSupport.set(directPath, false);
      console.log(`[DirectAPI] ❌ CORS blocked: ${directPath}, using edge function fallback`);
    } else {
      console.log(`[DirectAPI] ⚠️ Direct call failed: ${directPath}, falling back`, err);
    }

    return callEdgeFunction<T>(edgeFunctionName, edgeFunctionBody);
  }
}

async function callEdgeFunction<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    ...(body ? { body } : {}),
  });

  if (error) {
    console.error(`[DirectAPI] Edge function "${name}" error:`, error);
    throw new Error(error.message || `Failed to call ${name}`);
  }

  return data as T;
}
