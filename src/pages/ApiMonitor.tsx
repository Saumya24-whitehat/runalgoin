import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface ApiStatus {
  name: string;
  edgeFunction: string;
  body?: Record<string, unknown>;
  lastDataTime: string | null;
  status: "ok" | "error" | "stale" | "loading";
  error?: string;
  checkedAt: string | null;
  responseTimeMs?: number;
}

const API_CONFIGS: Omit<ApiStatus, "lastDataTime" | "status" | "error" | "checkedAt" | "responseTimeMs">[] = [
  { name: "Ticker / Indices", edgeFunction: "ticker-data" },
  { name: "PCR Data", edgeFunction: "pcr-data", body: { symbol: "Nifty 50", expiry: "current", strikeCount: 5 } },
  { name: "OTR Data", edgeFunction: "otr-data", body: { symbol: "Nifty 50", expiry: "current", strikeCount: 7, tf: "3min" } },
  { name: "Max Pain", edgeFunction: "maxpain-data", body: { symbol: "Nifty 50", expiry: "current", tf: "1min" } },
  { name: "TOI Strikes", edgeFunction: "toi-data", body: { endpoint: "strikes", symbol: "Nifty 50", expiry: "current" } },
  { name: "Option Chain Proxy", edgeFunction: "option-chain-proxy", body: { endpoint: "symbols" } },
  { name: "Greeks Data", edgeFunction: "greeks-data", body: { symbol: "Nifty 50", expiry: "current" } },
  { name: "Premium Decay", edgeFunction: "premium-decay-data", body: { endpoint: "strikes", symbol: "Nifty 50", expiry: "current" } },
  { name: "Advance/Decline", edgeFunction: "advance-decline" },
  { name: "Market Breadth", edgeFunction: "market-breadth", body: { index: "SYML:NSE;NIFTY" } },
  { name: "FII/DII Data", edgeFunction: "fii-data" },
  { name: "FII Summary", edgeFunction: "fii-summary", body: { date: format(new Date(), "dd-MM-yyyy") } },
  { name: "Indices Data", edgeFunction: "indices-data", body: { activeRange: "week" } },
  { name: "Chart Patterns", edgeFunction: "chart-patterns" },
  { name: "Market Actions", edgeFunction: "market-actions" },
  { name: "Deals Data", edgeFunction: "deals-data" },
  { name: "Stock Screener", edgeFunction: "stock-screener", body: { scan: "most_active" } },
  { name: "Future Buildup", edgeFunction: "future-buildup", body: { symbol: "Nifty 50" } },
  { name: "Future Open/High/Low", edgeFunction: "future-open-high-low", body: { symbol: "Nifty 50" } },
  { name: "Future Rollover", edgeFunction: "future-rollover", body: { symbol: "Nifty 50" } },
  { name: "Jackpot Scanner", edgeFunction: "jackpot-scanner" },
  { name: "Trending Stocks", edgeFunction: "trending-stocks" },
  { name: "Kundali Data", edgeFunction: "kundali-data", body: { symbol: "Nifty 50", expiry: "current", strikeCount: 10 } },
  { name: "Option Builder", edgeFunction: "option-builder-data", body: { action: "getSymbols" } },
  { name: "Option Simulator", edgeFunction: "option-simulator-data", body: { action: "getSymbols" } },
  { name: "Strategy Chart", edgeFunction: "strategy-chart-data", body: { action: "getSymbols" } },
  { name: "PCR All Strikes", edgeFunction: "pcr-all-strikes", body: { symbol: "Nifty 50", expiry: "current", strikeCount: 20 } },
  { name: "PCR Long/Short", edgeFunction: "pcr-long-short", body: { symbol: "Nifty 50", expiry: "current" } },
  { name: "Stock Detail", edgeFunction: "stock-detail-data", body: { action: "overview", symbol: "RELIANCE" } },
  { name: "Index Detail", edgeFunction: "index-detail", body: { index: "SYML:NSE;NIFTY", dataType: "stocks" } },
];

// Try to extract the latest date/time from various response formats
function extractLastTime(data: unknown): string | null {
  if (!data) return null;

  // If it's an array, look at the last element for time fields
  if (Array.isArray(data) && data.length > 0) {
    const last = data[data.length - 1];
    return findTimeField(last) || `Array[${data.length}] items`;
  }

  // If it's an object with time-series data inside
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;

    // Check for common wrapper keys
    for (const key of ["data", "records", "results", "entries", "chartData", "otr_data", "current_day"]) {
      if (Array.isArray(obj[key]) && (obj[key] as unknown[]).length > 0) {
        const arr = obj[key] as unknown[];
        const last = arr[arr.length - 1];
        return findTimeField(last) || `${key}[${arr.length}] items`;
      }
    }

    // Direct time field on the object
    const directTime = findTimeField(obj);
    if (directTime) return directTime;

    // It's an object with keys (like ticker data)
    const keys = Object.keys(obj);
    if (keys.length > 0) {
      // Check first value for time
      const firstVal = obj[keys[0]];
      if (typeof firstVal === "object" && firstVal !== null) {
        const t = findTimeField(firstVal as Record<string, unknown>);
        if (t) return t;
      }
      return `Object with ${keys.length} keys`;
    }
  }

  return null;
}

function findTimeField(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;

  // Common time field names in priority order
  const timeFields = ["time", "Time", "timestamp", "Timestamp", "datetime", "DateTime", "date", "Date", "created_at", "updated_at", "last_updated", "lastUpdated"];
  for (const field of timeFields) {
    if (o[field] !== undefined && o[field] !== null) {
      return String(o[field]);
    }
  }
  return null;
}

export default function ApiMonitor() {
  const [apis, setApis] = useState<ApiStatus[]>(
    API_CONFIGS.map((c) => ({
      ...c,
      lastDataTime: null,
      status: "loading" as const,
      checkedAt: null,
    }))
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFullRefresh, setLastFullRefresh] = useState<Date | null>(null);

  const checkApi = useCallback(async (config: typeof API_CONFIGS[number], index: number) => {
    const start = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke(config.edgeFunction, {
        body: config.body || {},
      });

      const responseTimeMs = Date.now() - start;

      if (error) {
        setApis((prev) => {
          const copy = [...prev];
          copy[index] = {
            ...copy[index],
            status: "error",
            error: error.message || "Unknown error",
            checkedAt: new Date().toISOString(),
            responseTimeMs,
          };
          return copy;
        });
        return;
      }

      const lastDataTime = extractLastTime(data);

      setApis((prev) => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          status: lastDataTime ? "ok" : "stale",
          lastDataTime,
          error: undefined,
          checkedAt: new Date().toISOString(),
          responseTimeMs,
        };
        return copy;
      });
    } catch (err: unknown) {
      const responseTimeMs = Date.now() - start;
      setApis((prev) => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
          checkedAt: new Date().toISOString(),
          responseTimeMs,
        };
        return copy;
      });
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    setApis((prev) => prev.map((a) => ({ ...a, status: "loading" as const })));

    // Run all checks in parallel
    await Promise.allSettled(API_CONFIGS.map((config, i) => checkApi(config, i)));

    setLastFullRefresh(new Date());
    setIsRefreshing(false);
  }, [checkApi]);

  // Initial fetch + 5 min interval
  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  const statusIcon = (status: ApiStatus["status"]) => {
    switch (status) {
      case "ok":
        return <CheckCircle className="h-5 w-5 text-success" />;
      case "error":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "stale":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "loading":
        return <Clock className="h-5 w-5 text-muted-foreground animate-pulse" />;
    }
  };

  const statusBadge = (status: ApiStatus["status"]) => {
    switch (status) {
      case "ok":
        return <Badge className="bg-success/20 text-success border-success/30">OK</Badge>;
      case "error":
        return <Badge variant="destructive">ERROR</Badge>;
      case "stale":
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">NO TIME</Badge>;
      case "loading":
        return <Badge variant="secondary">Loading...</Badge>;
    }
  };

  const okCount = apis.filter((a) => a.status === "ok").length;
  const errorCount = apis.filter((a) => a.status === "error").length;
  const loadingCount = apis.filter((a) => a.status === "loading").length;

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">API Health Monitor</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Auto-refreshes every 5 minutes.{" "}
              {lastFullRefresh && <>Last check: {format(lastFullRefresh, "dd/MM/yyyy HH:mm:ss")}</>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2 text-sm">
              <span className="text-success font-medium">✓ {okCount}</span>
              <span className="text-destructive font-medium">✗ {errorCount}</span>
              {loadingCount > 0 && <span className="text-muted-foreground">⏳ {loadingCount}</span>}
            </div>
            <Button onClick={refreshAll} disabled={isRefreshing} size="sm" variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh All
            </Button>
          </div>
        </div>

        {/* API Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {apis.map((api, i) => (
            <Card key={api.edgeFunction} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {statusIcon(api.status)}
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{api.name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{api.edgeFunction}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">{statusBadge(api.status)}</div>
                </div>

                <div className="mt-3 space-y-1">
                  {api.lastDataTime && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Last data:</span>
                      <span className="text-xs font-mono text-foreground font-medium">{api.lastDataTime}</span>
                    </div>
                  )}
                  {api.error && (
                    <p className="text-xs text-destructive truncate" title={api.error}>
                      {api.error}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    {api.checkedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        Checked: {format(new Date(api.checkedAt), "HH:mm:ss")}
                      </span>
                    )}
                    {api.responseTimeMs !== undefined && (
                      <span
                        className={`text-[10px] font-mono ${
                          api.responseTimeMs > 5000
                            ? "text-destructive"
                            : api.responseTimeMs > 2000
                            ? "text-yellow-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {api.responseTimeMs}ms
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
