import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { PageLayout } from "@/components/PageLayout";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { fetchPCRData, PCRTimeData } from "@/services/pcrApi";
import { formatIndianNumber } from "@/lib/formatNumber";
import { useToast } from "@/hooks/use-toast";
import { LastRefreshBadge } from "@/components/LastRefreshBadge";
import { cn } from "@/lib/utils";

interface SymbolGroup {
  indexSymbols: string[];
  stockSymbols: string[];
}

const AUTO_REFRESH_INTERVAL = 60 * 1000;

async function fetchSymbolsList(): Promise<SymbolGroup> {
  const { data, error } = await supabase.functions.invoke("option-chain-proxy", {
    body: { endpoint: "symbols" },
  });
  if (error) throw error;
  return {
    indexSymbols: data?.["index symbols"] || [],
    stockSymbols: data?.symbols || [],
  };
}

async function fetchExpiryDates(symbol: string, historicalDate?: string): Promise<string[]> {
  const params: Record<string, string> = { symbol };
  if (historicalDate) params.date = historicalDate;
  const { data, error } = await supabase.functions.invoke("option-chain-proxy", {
    body: { endpoint: "expiry", params },
  });
  if (error) throw error;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.expiry_dates)) return data.expiry_dates;
  if (Array.isArray(data?.expiryDates)) return data.expiryDates;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

const fmtTime = (t: string) => {
  if (!t) return "";
  const clean = t.replace(":", "");
  if (clean.length < 4) return t;
  const h = parseInt(clean.slice(0, 2));
  const m = clean.slice(2, 4);
  return `${h.toString().padStart(2, "0")}:${m}`;
};

const signed = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`;
const signedInt = (v: number) => `${v > 0 ? "+" : ""}${formatIndianNumber(Math.round(v))}`;
const changeClass = (v: number) =>
  v > 0 ? "text-emerald-500" : v < 0 ? "text-red-500" : "text-muted-foreground";

const Indicator = () => {
  const { toast } = useToast();
  const [selectedSymbol, setSelectedSymbol] = useState("Nifty 50");
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [historicalDate, setHistoricalDate] = useState<Date | undefined>();
  const [strikeCount, setStrikeCount] = useState(5);

  const historicalDateStr = historicalDate ? format(historicalDate, "yyyy-MM-dd") : undefined;

  const { data: symbols = { indexSymbols: [], stockSymbols: [] }, isLoading: loadingSymbols } =
    useQuery({
      queryKey: ["option-symbols"],
      queryFn: fetchSymbolsList,
      staleTime: 24 * 60 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
    });

  const { data: expiryDates = [], isLoading: loadingExpiry } = useQuery({
    queryKey: ["option-expiry", selectedSymbol, historicalDateStr],
    queryFn: () => fetchExpiryDates(selectedSymbol, historicalDateStr),
    enabled: !!selectedSymbol,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (expiryDates.length > 0 && !expiryDates.includes(selectedExpiry)) {
      setSelectedExpiry(expiryDates[0]);
    }
  }, [expiryDates, selectedExpiry]);

  const {
    data: pcrResult,
    isLoading: loadingData,
    isFetching,
    refetch,
    dataUpdatedAt,
    error,
  } = useQuery({
    queryKey: ["indicator-pcr", selectedSymbol, selectedExpiry, strikeCount, historicalDateStr],
    queryFn: () => fetchPCRData(selectedSymbol, selectedExpiry, strikeCount, historicalDateStr),
    enabled: !!selectedSymbol && !!selectedExpiry && !loadingExpiry,
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
        description: "Failed to load indicator data",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const rows: PCRTimeData[] = useMemo(() => {
    const list = pcrResult?.dataWhole || [];
    return [...list].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [pcrResult]);

  // ATM locked to the 09:15 (first) candle of the selected day
  const baseAtm = useMemo(() => {
    const first = rows[0];
    if (!first) return null;
    return first.atm ?? null;
  }, [rows]);

  const strikeRowAt = (entry: PCRTimeData, strike: number) =>
    entry.dataThis?.find((d) => Number(d.Strike) === Number(strike));

  // Chart: CE / PE premium change of the 09:15 ATM strike through the day
  const chartData = useMemo(() => {
    if (!rows.length || baseAtm === null) return [];
    const first = strikeRowAt(rows[0], baseAtm);
    const baseCe = first?.["CE LTP"] ?? 0;
    const basePe = first?.["PE LTP"] ?? 0;
    if (!baseCe && !basePe) return [];

    return rows
      .map((entry) => {
        const r = strikeRowAt(entry, baseAtm);
        if (!r) return null;
        const ce = r["CE LTP"] ?? 0;
        const pe = r["PE LTP"] ?? 0;
        if (!ce && !pe) return null;
        return {
          time: fmtTime(entry.time),
          callChange: baseCe ? ce - baseCe : 0,
          putChange: basePe ? pe - basePe : 0,
          callPct: baseCe ? ((ce - baseCe) / baseCe) * 100 : 0,
          putPct: basePe ? ((pe - basePe) / basePe) * 100 : 0,
          spot: entry.underlyning,
        };
      })
      .filter(Boolean) as {
      time: string;
      callChange: number;
      putChange: number;
      callPct: number;
      putPct: number;
      spot: number;
    }[];
  }, [rows, baseAtm]);

  const latest = rows.length ? rows[rows.length - 1] : null;
  const lastPoint = chartData.length ? chartData[chartData.length - 1] : null;

  // 5-strike COI figures for the selected day (latest snapshot of the day)
  const coiRows = useMemo(() => {
    if (!latest?.dataThis?.length) return [];
    const sorted = [...latest.dataThis].sort((a, b) => Number(a.Strike) - Number(b.Strike));
    if (baseAtm === null) return sorted.slice(0, strikeCount);
    const atmIdx = sorted.findIndex((d) => Number(d.Strike) === Number(baseAtm));
    if (atmIdx < 0) return sorted.slice(0, strikeCount);
    const half = Math.floor(strikeCount / 2);
    const start = Math.max(0, Math.min(atmIdx - half, sorted.length - strikeCount));
    return sorted.slice(start, start + strikeCount);
  }, [latest, baseAtm, strikeCount]);

  const coiTotals = useMemo(
    () =>
      coiRows.reduce(
        (acc, r) => ({
          ce: acc.ce + (r["CE COI"] || 0),
          pe: acc.pe + (r["PE COI"] || 0),
        }),
        { ce: 0, pe: 0 }
      ),
    [coiRows]
  );

  return (
    <>
      <SEO
        title="Indicator — ATM Call/Put Change & COI | OptionWorld"
        description="Historical date and expiry wise ATM (09:15) Call vs Put premium change chart with 5-strike change in open interest figures."
        path="/indicator"
      />
      <PageLayout>
        <ProFeatureGate featureName="Indicator">
          <main className="container px-3 sm:px-4 py-4 space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3 items-end">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground">Symbol</label>
                    <Select
                      value={selectedSymbol}
                      onValueChange={setSelectedSymbol}
                      disabled={loadingSymbols}
                    >
                      <SelectTrigger className="w-full bg-background/50 h-9 text-xs">
                        <SelectValue placeholder="Symbol" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] bg-popover z-50">
                        {symbols.indexSymbols.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-muted/50">
                              INDEX
                            </div>
                            {symbols.indexSymbols.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {symbols.stockSymbols.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-muted/50 mt-1">
                              STOCKS
                            </div>
                            {symbols.stockSymbols.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground">
                      Historical Expiry
                    </label>
                    <Select
                      value={selectedExpiry}
                      onValueChange={setSelectedExpiry}
                      disabled={loadingExpiry || expiryDates.length === 0}
                    >
                      <SelectTrigger className="w-full bg-secondary h-9 text-xs">
                        <SelectValue placeholder={loadingExpiry ? "Loading..." : "Expiry"} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50 max-h-[300px]">
                        {expiryDates.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground">
                      Historical Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal bg-secondary h-9 text-xs"
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {historicalDate ? format(historicalDate, "dd/MM/yyyy") : "Today"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-50" align="start">
                        <Calendar
                          mode="single"
                          selected={historicalDate}
                          onSelect={setHistoricalDate}
                          defaultMonth={historicalDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground">Strikes</label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={strikeCount}
                      onChange={(e) => setStrikeCount(parseInt(e.target.value) || 5)}
                      className="bg-secondary h-9 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {historicalDate && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs"
                        onClick={() => setHistoricalDate(undefined)}
                      >
                        Reset
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="h-9"
                      onClick={() => refetch()}
                      disabled={isFetching}
                    >
                      {isFetching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <span>
                    ATM @ 09:15:{" "}
                    <span className="font-mono font-bold text-foreground">
                      {baseAtm ?? "—"}
                    </span>
                  </span>
                  {latest && (
                    <span>
                      Spot:{" "}
                      <span className="font-mono font-bold text-foreground">
                        {latest.underlyning?.toFixed(2)}
                      </span>
                    </span>
                  )}
                  {!historicalDate && <LastRefreshBadge lastRefresh={new Date(dataUpdatedAt)} />}
                </div>
              </CardContent>
            </Card>

            {/* Chart: Call vs Put change from 09:15 ATM */}
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold uppercase tracking-wide">
                    ATM {baseAtm ?? ""} — Call vs Put Change (from 09:15)
                  </div>
                  {lastPoint && (
                    <div className="flex gap-3 text-[11px] font-mono">
                      <span className={changeClass(lastPoint.callChange)}>
                        CE {signed(lastPoint.callChange)} ({signed(lastPoint.callPct)}%)
                      </span>
                      <span className={changeClass(lastPoint.putChange)}>
                        PE {signed(lastPoint.putChange)} ({signed(lastPoint.putPct)}%)
                      </span>
                    </div>
                  )}
                </div>

                {loadingData ? (
                  <div className="h-[360px] flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="h-[360px] flex items-center justify-center text-xs text-muted-foreground">
                    No data for the selected date / expiry
                  </div>
                ) : (
                  <div className="h-[360px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          interval="preserveStartEnd"
                          minTickGap={28}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          width={52}
                          tickFormatter={(v: number) => v.toFixed(0)}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 6,
                            fontSize: 11,
                          }}
                          formatter={(value: number, name: string) => [signed(value), name]}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" opacity={0.6} />
                        <Line
                          type="monotone"
                          dataKey="callChange"
                          name="Call Change"
                          stroke="hsl(var(--chart-1, 142 71% 45%))"
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="putChange"
                          name="Put Change"
                          stroke="hsl(var(--destructive))"
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 5-strike change in OI figures for the day */}
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold uppercase tracking-wide">
                    {strikeCount} Strike Change in OI
                    {historicalDate ? ` — ${format(historicalDate, "dd/MM/yyyy")}` : " — Today"}
                  </div>
                  {latest && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      as of {fmtTime(latest.time)}
                    </span>
                  )}
                </div>

                {coiRows.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">No data</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-border/60 text-muted-foreground uppercase">
                          <th className="text-right py-1">CE COI</th>
                          <th className="text-right py-1">CE OI</th>
                          <th className="text-center py-1">Strike</th>
                          <th className="text-right py-1">PE OI</th>
                          <th className="text-right py-1">PE COI</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono">
                        {coiRows.map((r) => {
                          const isAtm = Number(r.Strike) === Number(baseAtm);
                          return (
                            <tr
                              key={r.Strike}
                              className={cn(
                                "border-b border-border/30",
                                isAtm && "bg-primary/10 font-bold"
                              )}
                            >
                              <td className={cn("text-right py-1", changeClass(r["CE COI"] || 0))}>
                                {signedInt(r["CE COI"] || 0)}
                              </td>
                              <td className="text-right py-1">
                                {formatIndianNumber(Math.round(r["CE OI"] || 0))}
                              </td>
                              <td className="text-center py-1 font-bold">{r.Strike}</td>
                              <td className="text-right py-1">
                                {formatIndianNumber(Math.round(r["PE OI"] || 0))}
                              </td>
                              <td className={cn("text-right py-1", changeClass(r["PE COI"] || 0))}>
                                {signedInt(r["PE COI"] || 0)}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="border-t border-border font-bold">
                          <td className={cn("text-right py-1", changeClass(coiTotals.ce))}>
                            {signedInt(coiTotals.ce)}
                          </td>
                          <td />
                          <td className="text-center py-1 uppercase">Total</td>
                          <td />
                          <td className={cn("text-right py-1", changeClass(coiTotals.pe))}>
                            {signedInt(coiTotals.pe)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </ProFeatureGate>
      </PageLayout>
    </>
  );
};

export default Indicator;
