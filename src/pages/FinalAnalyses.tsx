import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { PageLayout } from "@/components/PageLayout";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Loader2, RefreshCw, ChevronRight } from "lucide-react";
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
import { fetchIroedSnapshots } from "@/services/iroedApi";
import {
  runIroedEngine,
  sentimentColor,
  activityColor,
  legSentiment,
  EngineRow,
} from "@/utils/iroedEngine";
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

const signed = (v: number, digits = 1) =>
  `${v > 0 ? "+" : ""}${v.toFixed(digits)}`;
const biasClass = (v: number | null) =>
  v === null
    ? "text-muted-foreground"
    : v > 0
    ? "text-emerald-500"
    : v < 0
    ? "text-red-500"
    : "text-muted-foreground";

const FinalAnalyses = () => {
  const { toast } = useToast();
  const [symbol, setSymbol] = useState("Nifty 50");
  const [expiry, setExpiry] = useState("");
  const [historicalDate, setHistoricalDate] = useState<Date | undefined>();
  const [strikeRange, setStrikeRange] = useState(5);
  const [binSize, setBinSize] = useState(20);
  const [timeframe, setTimeframe] = useState("5min");
  const [openRow, setOpenRow] = useState<number | null>(null);

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

  const {
    data,
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
    error,
  } = useQuery({
    queryKey: [
      "iroed",
      symbol,
      expiry,
      strikeRange,
      timeframe,
      historicalDateStr,
    ],
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
        description: "Failed to load sentiment data",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const rows: EngineRow[] = useMemo(() => {
    if (!data?.snapshots?.length) return [];
    return runIroedEngine(data.snapshots, { binSize, strikeRange });
  }, [data, binSize, strikeRange]);

  const latest = rows.length ? rows[rows.length - 1] : null;
  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        time: r.time,
        raw: Number(r.rawScore.toFixed(1)),
        smoothed: Number(r.smoothedScore.toFixed(1)),
        index: r.index,
      })),
    [rows]
  );

  const displayRows = useMemo(() => [...rows].reverse(), [rows]);

  return (
    <ProFeatureGate>
      <SEO
        title="IROED Market Sentiment Engine | OptionWorld"
        description="Consolidated option market sentiment from fresh OI, extrinsic premium decay, IV and writer/buyer activity at every interval."
        path="/finalanalyses"
      />
      <PageLayout>
        <div className="container mx-auto px-2 py-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold">Final Analyses — IROED Sentiment Engine</h1>
              <p className="text-[11px] text-muted-foreground">
                Index-Relative OI, Extrinsic Decay &amp; IV Market Sentiment
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LastRefreshBadge lastUpdated={dataUpdatedAt} isRefreshing={isFetching} />
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

              <Select value={String(binSize)} onValueChange={(v) => setBinSize(Number(v))}>
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 25, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)} className="text-xs">
                      Bin {n}
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
                No snapshot data available for this selection.
              </CardContent>
            </Card>
          )}

          {latest && (
            <>
              {/* Latest verdict */}
              <Card>
                <CardContent className="p-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground text-[10px]">Time / Index</div>
                    <div className="font-semibold">
                      {latest.time} · {formatIndianNumber(latest.index, 2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px]">Sentiment</div>
                    <div className={cn("font-bold", sentimentColor[latest.sentiment])}>
                      {latest.sentiment}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px]">Score (smoothed)</div>
                    <div className={cn("font-semibold", biasClass(latest.smoothedScore))}>
                      {signed(latest.smoothedScore)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px]">Confidence</div>
                    <div className="font-semibold">
                      {latest.confidence.toFixed(0)}%{" "}
                      <span className="text-muted-foreground">({latest.confidenceBand})</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px]">Support (PE Wall)</div>
                    <div className="font-semibold text-emerald-500">
                      {latest.peWall ?? "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px]">Resistance (CE Wall)</div>
                    <div className="font-semibold text-red-500">{latest.ceWall ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px]">Dominant Activity</div>
                    <div className="font-semibold">{latest.dominantActivity}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Bias breakdown */}
              <Card>
                <CardContent className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {[
                    { label: "COI Bias (25%)", value: latest.coiBias },
                    { label: "Decay Bias (30%)", value: latest.decayBias },
                    { label: "Writer Bias (30%)", value: latest.writerBias },
                    { label: "Buyer Bias (15%)", value: latest.buyerBias },
                  ].map((b) => (
                    <div key={b.label}>
                      <div className="text-muted-foreground text-[10px]">{b.label}</div>
                      <div className={cn("font-semibold", biasClass(b.value))}>
                        {b.value === null ? "N/A" : signed(b.value)}
                      </div>
                    </div>
                  ))}
                  <div>
                    <div className="text-muted-foreground text-[10px]">CE / PE Fresh OI</div>
                    <div className="font-semibold">
                      {formatCompactIndian(latest.cePositiveCoi)} /{" "}
                      {formatCompactIndian(latest.pePositiveCoi)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px]">CE / PE Decay %</div>
                    <div className="font-semibold">
                      {latest.ceWeightedDecay === null
                        ? "-"
                        : `${latest.ceWeightedDecay.toFixed(1)}%`}{" "}
                      /{" "}
                      {latest.peWeightedDecay === null
                        ? "-"
                        : `${latest.peWeightedDecay.toFixed(1)}%`}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px]">Persistence / Momentum</div>
                    <div className="font-semibold">
                      {latest.persistence} · {signed(latest.scoreMomentum)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px]">Visit No / Reference</div>
                    <div className="font-semibold">
                      #{latest.visitNumber} · {latest.referenceTime ?? "—"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Score chart */}
              <Card>
                <CardContent className="p-2">
                  <div className="text-[11px] font-medium mb-1">
                    Market Score — raw vs smoothed
                  </div>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} minTickGap={24} />
                        <YAxis
                          domain={[-100, 100]}
                          tick={{ fontSize: 10 }}
                          width={34}
                        />
                        <YAxis
                          yAxisId="idx"
                          orientation="right"
                          domain={["dataMin", "dataMax"]}
                          tick={{ fontSize: 10 }}
                          width={50}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            fontSize: 11,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                        <ReferenceLine y={30} strokeDasharray="2 4" stroke="hsl(var(--muted-foreground))" opacity={0.5} />
                        <ReferenceLine y={-30} strokeDasharray="2 4" stroke="hsl(var(--muted-foreground))" opacity={0.5} />
                        <Line
                          type="monotone"
                          dataKey="raw"
                          name="Raw Score"
                          stroke="hsl(var(--muted-foreground))"
                          strokeDasharray="4 3"
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="smoothed"
                          name="Smoothed Score"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          yAxisId="idx"
                          type="monotone"
                          dataKey="index"
                          name="Index"
                          stroke="hsl(var(--chart-2, 200 80% 55%))"
                          strokeDasharray="6 3"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Main sentiment table */}
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr className="text-left">
                        {[
                          "",
                          "Time",
                          "Index",
                          "CE COI",
                          "PE COI",
                          "COI Bias",
                          "CE Decay",
                          "PE Decay",
                          "Decay Bias",
                          "CE Wr",
                          "PE Wr",
                          "Wr Bias",
                          "CE Buy",
                          "PE Buy",
                          "Buy Bias",
                          "Score",
                          "Sentiment",
                          "Conf",
                          "Support",
                          "Resistance",
                          "Dominant",
                        ].map((h) => (
                          <th key={h} className="px-1.5 py-1 font-medium whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.map((r) => (
                        <>
                          <tr
                            key={r.timestamp}
                            className="border-t border-border hover:bg-muted/30 cursor-pointer"
                            onClick={() =>
                              setOpenRow(openRow === r.timestamp ? null : r.timestamp)
                            }
                          >
                            <td className="px-1">
                              <ChevronRight
                                className={cn(
                                  "h-3 w-3 transition-transform",
                                  openRow === r.timestamp && "rotate-90"
                                )}
                              />
                            </td>
                            <td className="px-1.5 py-1 whitespace-nowrap">{r.time}</td>
                            <td className="px-1.5 py-1">{formatIndianNumber(r.index, 2)}</td>
                            <td className="px-1.5 py-1">{formatCompactIndian(r.cePositiveCoi)}</td>
                            <td className="px-1.5 py-1">{formatCompactIndian(r.pePositiveCoi)}</td>
                            <td className={cn("px-1.5 py-1", biasClass(r.coiBias))}>
                              {signed(r.coiBias, 0)}
                            </td>
                            <td className="px-1.5 py-1">
                              {r.ceWeightedDecay === null ? "—" : `${r.ceWeightedDecay.toFixed(0)}%`}
                            </td>
                            <td className="px-1.5 py-1">
                              {r.peWeightedDecay === null ? "—" : `${r.peWeightedDecay.toFixed(0)}%`}
                            </td>
                            <td className={cn("px-1.5 py-1", biasClass(r.decayBias))}>
                              {r.decayBias === null ? "—" : signed(r.decayBias, 0)}
                            </td>
                            <td className="px-1.5 py-1">{r.ceWriterRatio.toFixed(0)}</td>
                            <td className="px-1.5 py-1">{r.peWriterRatio.toFixed(0)}</td>
                            <td className={cn("px-1.5 py-1", biasClass(r.writerBias))}>
                              {signed(r.writerBias, 0)}
                            </td>
                            <td className="px-1.5 py-1">{r.ceBuyerRatio.toFixed(0)}</td>
                            <td className="px-1.5 py-1">{r.peBuyerRatio.toFixed(0)}</td>
                            <td className={cn("px-1.5 py-1", biasClass(r.buyerBias))}>
                              {signed(r.buyerBias, 0)}
                            </td>
                            <td className={cn("px-1.5 py-1 font-semibold", biasClass(r.smoothedScore))}>
                              {signed(r.smoothedScore, 0)}
                            </td>
                            <td className={cn("px-1.5 py-1 font-semibold whitespace-nowrap", sentimentColor[r.sentiment])}>
                              {r.sentiment}
                            </td>
                            <td className="px-1.5 py-1">{r.confidence.toFixed(0)}%</td>
                            <td className="px-1.5 py-1 text-emerald-500">{r.peWall ?? "—"}</td>
                            <td className="px-1.5 py-1 text-red-500">{r.ceWall ?? "—"}</td>
                            <td className="px-1.5 py-1 whitespace-nowrap">{r.dominantActivity}</td>
                          </tr>
                          {openRow === r.timestamp && (
                            <tr key={`${r.timestamp}-detail`} className="bg-muted/20">
                              <td colSpan={21} className="px-2 py-2">
                                <div className="text-[10px] text-muted-foreground mb-1">
                                  Index Bin {r.indexBin} · ATM {r.atm} · Visit #{r.visitNumber} ·
                                  Reference {r.referenceTime ?? "—"} · CE IV Δ{" "}
                                  {signed(r.ceIvChange, 2)} · PE IV Δ {signed(r.peIvChange, 2)} ·
                                  Availability {r.availability.toFixed(0)}% · Agreement{" "}
                                  {r.agreement.toFixed(0)}% · Data Quality{" "}
                                  {r.dataQuality.toFixed(0)}%
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-[10px]">
                                    <thead className="bg-muted/40">
                                      <tr className="text-left">
                                        {[
                                          "Strike",
                                          "Type",
                                          "LTP",
                                          "OI",
                                          "COI",
                                          "IV",
                                          "IV Δ",
                                          "Extrinsic",
                                          "Extrinsic Δ",
                                          "Same-Level Decay",
                                          "Activity",
                                          "Implies",
                                        ].map((h) => (
                                          <th key={h} className="px-1.5 py-1 font-medium whitespace-nowrap">
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {r.legs.map((l) => (
                                        <tr
                                          key={`${l.strike}-${l.side}`}
                                          className="border-t border-border/50"
                                        >
                                          <td className="px-1.5 py-0.5">{l.strike}</td>
                                          <td className="px-1.5 py-0.5">{l.side}</td>
                                          <td className="px-1.5 py-0.5">{l.ltp.toFixed(2)}</td>
                                          <td className="px-1.5 py-0.5">{formatCompactIndian(l.oi)}</td>
                                          <td className={cn("px-1.5 py-0.5", biasClass(l.coi))}>
                                            {formatCompactIndian(l.coi)}
                                          </td>
                                          <td className="px-1.5 py-0.5">{l.iv.toFixed(2)}</td>
                                          <td className={cn("px-1.5 py-0.5", biasClass(l.ivChange))}>
                                            {signed(l.ivChange, 2)}
                                          </td>
                                          <td className="px-1.5 py-0.5">{l.extrinsic.toFixed(2)}</td>
                                          <td className={cn("px-1.5 py-0.5", biasClass(l.extrinsicChange))}>
                                            {signed(l.extrinsicChange, 2)}
                                          </td>
                                          <td className="px-1.5 py-0.5">
                                            {l.sameLevelDecayPct === null
                                              ? "—"
                                              : `${l.sameLevelDecayPct.toFixed(1)}%`}
                                          </td>
                                          <td className="px-1.5 py-0.5">
                                            <Badge
                                              variant="secondary"
                                              className={cn(
                                                "px-1 py-0 text-[9px] font-medium",
                                                activityColor[l.activity]
                                              )}
                                            >
                                              {l.activity}
                                            </Badge>
                                          </td>
                                          <td className="px-1.5 py-0.5">
                                            {legSentiment(l.side, l.activity)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <p className="text-[10px] text-muted-foreground">
                Score = 0.25·COI Bias + 0.30·Decay Bias + 0.30·Writer Bias + 0.15·Buyer Bias
                (weights re-normalised when same-level revisit data is unavailable). Activity labels
                describe writer/buyer behaviour only — they do not identify participants.
              </p>
            </>
          )}
        </div>
      </PageLayout>
    </ProFeatureGate>
  );
};

export default FinalAnalyses;
