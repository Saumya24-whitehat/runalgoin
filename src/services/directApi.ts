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

/**
 * Always routes through the edge function for reliability and speed.
 * Direct browser calls are consistently CORS-blocked, so we skip them
 * to eliminate the 2s timeout penalty on every first request.
 */
export async function fetchWithFallback<T = unknown>(options: DirectFetchOptions): Promise<T> {
  const { edgeFunctionName, edgeFunctionBody } = options;
  return callEdgeFunction<T>(edgeFunctionName, edgeFunctionBody);
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
