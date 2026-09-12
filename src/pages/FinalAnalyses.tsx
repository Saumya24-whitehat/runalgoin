import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { PageLayout } from "@/components/PageLayout";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchIroedSnapshots } from "@/services/iroedApi";
import { buildRocRows, RocRow } from "@/utils/rocFlow";
import { formatCompactIndian, formatIndianNumber } from "@/lib/formatNumber";
import { LastRefreshBadge } from "@/components/LastRefreshBadge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const AUTO_REFRESH_INTERVAL = 60 * 1000;

async function fetchSymbolsList() {
  const { data, error } = await supabase.functions.invoke("option-chain-proxy", {
    body: { endpoint: "symbols" },
  });
  if (error) throw error;
  return {
    indexSymbols: (data?.["index symbols"] || []) as string[],
    stockSymbols: (data?.symbols || []) as string[],
  };
}

async function fetchExpiryDates(symbol: string, historicalDate?: string) {
  const params: Record<string, string> = { symbol };
  if (historicalDate) params.date = historicalDate;
  const { data, error } = await supabase.functions.invoke("option-chain-proxy", {
    body: { endpoint: "expiry", params },
  });
  if (error) throw error;
  if (Array.isArray(data)) return data as string[];
  if (Array.isArray(data?.expiry_dates)) return data.expiry_dates as string[];
  if (Array.isArray(data?.data)) return data.data as string[];
  return [] as string[];
}

const rocClass = (v: number | null) =>
  v === null
    ? "text-muted-foreground"
    : v > 0
    ? "text-emerald-500"
    : v < 0
    ? "text-red-500"
    : "text-muted-foreground";

const roc = (v: number | null, digits = 2) =>
  v === null ? "-" : `${v > 0 ? "+" : ""}${v.toFixed(digits)}%`;

const num = (v: number, digits = 2) =>
  `${v > 0 ? "+" : ""}${formatIndianNumber(v, digits)}`;

const FinalAnalyses = () => {
  const { toast } = useToast();
  const [symbol, setSymbol] = useState("Nifty 50");
  const [expiry, setExpiry] = useState("");
  const [historicalDate, setHistoricalDate] = useState<Date | undefined>();
  const [strikeRange, setStrikeRange] = useState(5);
  const [timeframe, setTimeframe] = useState("5min");

  const historicalDateStr = historicalDate
    ? format(historicalDate, "yyyy-MM-dd")
    : undefined;

  const { data: symbols = { indexSymbols: [], stockSymbols: [] } } = useQuery({
    queryKey: ["option-symbols"],
    queryFn: fetchSymbolsList,
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: expiryDates = [], isLoading: loadingExpiry } = useQuery({
    queryKey: ["option-expiry", symbol, historicalDateStr],
    queryFn: () => fetchExpiryDates(symbol, historicalDateStr),
    enabled: !!symbol,
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (expiryDates.length && !expiryDates.includes(expiry)) {
      setExpiry(expiryDates[0]);
    }
  }, [expiryDates, expiry]);

  const { data, isLoading, isFetching, refetch, dataUpdatedAt, error } = useQuery({
    queryKey: ["iroed", symbol, expiry, strikeRange, timeframe, historicalDateStr],
    queryFn: () =>
      fetchIroedSnapshots({
        symbol,
        expiry,
        strikeRange,
        timeframe,
        historicalDate: historicalDateStr,
      }),
    enabled: !!symbol && !!expiry && !loadingExpiry,
    staleTime: AUTO_REFRESH_INTERVAL,
    refetchInterval: historicalDateStr ? false : AUTO_REFRESH_INTERVAL,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load option data",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const rows: RocRow[] = useMemo(
    () => (data?.snapshots?.length ? buildRocRows(data.snapshots, strikeRange) : []),
    [data, strikeRange]
  );

  const displayRows = useMemo(() => [...rows].reverse(), [rows]);

  return (
    <ProFeatureGate>
      <SEO
        title="Rate of Change: Premium, IV, COI & Index | OptionWorld"
        description="Candle-wise rate of change of option premium decay, IV, change in OI and index price for Call and Put side."
        path="/finalanalyses"
      />
      <PageLayout>
        <div className="container mx-auto px-2 py-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold">
                Rate of Change — Premium Decay, IV, COI &amp; Index
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Candle-wise net figures for ATM ± {strikeRange} strikes (IST)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LastRefreshBadge
                lastRefresh={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
                isFetching={isFetching}
              />
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Controls */}
          <Card>
            <CardContent className="p-2 flex flex-wrap items-center gap-2">
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="Symbol" />
                </SelectTrigger>
                <SelectContent>
                  {[...symbols.indexSymbols, ...symbols.stockSymbols].map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Expiry" />
                </SelectTrigger>
                <SelectContent>
                  {expiryDates.map((e) => (
                    <SelectItem key={e} value={e} className="text-xs">
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                    {historicalDate ? format(historicalDate, "dd/MM/yyyy") : "Live"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={historicalDate}
                    onSelect={setHistoricalDate}
                    disabled={(d) => d > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {historicalDate && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => setHistoricalDate(undefined)}
                >
                  Reset
                </Button>
              )}

              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="h-8 w-[100px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["1min", "3min", "5min", "15min"].map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(strikeRange)}
                onValueChange={(v) => setStrikeRange(Number(v))}
              >
                <SelectTrigger className="h-8 w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 7].map((n) => (
                    <SelectItem key={n} value={String(n)} className="text-xs">
                      ATM ± {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {!isLoading && !rows.length && (
            <Card>
              <CardContent className="p-6 text-center text-xs text-muted-foreground">
                No data available for this selection.
              </CardContent>
            </Card>
          )}

          {!!rows.length && (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead className="sticky top-0 bg-muted/60">
                    <tr className="text-muted-foreground">
                      <th className="px-1 py-1 text-left">Time</th>
                      <th className="px-1 py-1 text-right">Index</th>
                      <th className="px-1 py-1 text-right">Index RoC</th>
                      <th className="px-1 py-1 text-right border-l">CE Premium</th>
                      <th className="px-1 py-1 text-right">CE Prem RoC</th>
                      <th className="px-1 py-1 text-right">CE IV</th>
                      <th className="px-1 py-1 text-right">CE IV RoC</th>
                      <th className="px-1 py-1 text-right">CE COI</th>
                      <th className="px-1 py-1 text-right">CE COI RoC</th>
                      <th className="px-1 py-1 text-right border-l">PE Premium</th>
                      <th className="px-1 py-1 text-right">PE Prem RoC</th>
                      <th className="px-1 py-1 text-right">PE IV</th>
                      <th className="px-1 py-1 text-right">PE IV RoC</th>
                      <th className="px-1 py-1 text-right">PE COI</th>
                      <th className="px-1 py-1 text-right">PE COI RoC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((r) => (
                      <tr key={r.timestamp} className="border-t hover:bg-muted/40">
                        <td className="px-1 py-0.5 font-medium">{r.time}</td>
                        <td className="px-1 py-0.5 text-right">
                          {formatIndianNumber(r.index, 2)}
                        </td>
                        <td className={cn("px-1 py-0.5 text-right", rocClass(r.indexRoc))}>
                          {roc(r.indexRoc)}
                        </td>

                        <td className="px-1 py-0.5 text-right border-l">
                          {formatIndianNumber(r.ceExtrinsic, 2)}
                        </td>
                        <td className={cn("px-1 py-0.5 text-right", rocClass(r.ceDecayRoc))}>
                          {roc(r.ceDecayRoc)}
                        </td>
                        <td className="px-1 py-0.5 text-right">{r.ceIv.toFixed(2)}</td>
                        <td className={cn("px-1 py-0.5 text-right", rocClass(r.ceIvRoc))}>
                          {roc(r.ceIvRoc)}
                        </td>
                        <td
                          className={cn(
                            "px-1 py-0.5 text-right",
                            rocClass(r.ceCoi || null)
                          )}
                        >
                          {formatCompactIndian(r.ceCoi)}
                        </td>
                        <td className={cn("px-1 py-0.5 text-right", rocClass(r.ceCoiRoc))}>
                          {roc(r.ceCoiRoc)}
                        </td>

                        <td className="px-1 py-0.5 text-right border-l">
                          {formatIndianNumber(r.peExtrinsic, 2)}
                        </td>
                        <td className={cn("px-1 py-0.5 text-right", rocClass(r.peDecayRoc))}>
                          {roc(r.peDecayRoc)}
                        </td>
                        <td className="px-1 py-0.5 text-right">{r.peIv.toFixed(2)}</td>
                        <td className={cn("px-1 py-0.5 text-right", rocClass(r.peIvRoc))}>
                          {roc(r.peIvRoc)}
                        </td>
                        <td
                          className={cn(
                            "px-1 py-0.5 text-right",
                            rocClass(r.peCoi || null)
                          )}
                        >
                          {formatCompactIndian(r.peCoi)}
                        </td>
                        <td className={cn("px-1 py-0.5 text-right", rocClass(r.peCoiRoc))}>
                          {roc(r.peCoiRoc)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      </PageLayout>
    </ProFeatureGate>
  );
};

export default FinalAnalyses;
