import { useState, useEffect, useCallback, useMemo } from "react";
import { PageLayout } from "@/components/PageLayout";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Clock, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { fetchCombinedGreeksData, GreeksDataPoint } from "@/services/greeksChartApi";
import {
  analyzeStrikeFlow,
  computeFlowMatrix,
  computeSentimentTotals,
  getSentiment,
  SentimentTotals,
} from "@/utils/strikeFlowAnalysis";
import { formatIndianNumber, formatCompactIndian } from "@/lib/formatNumber";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LastRefreshBadge } from "@/components/LastRefreshBadge";
import { PageInfoModal } from "@/components/PageInfoModal";
import { SEO } from "@/components/SEO";
import { cn } from "@/lib/utils";

interface SymbolGroup {
  indexSymbols: string[];
  stockSymbols: string[];
}

interface SideSentiment {
  bigPlayer: SentimentTotals;
  retail: SentimentTotals;
}

interface ChainRow {
  strike: number;
  call: SideSentiment | null;
  put: SideSentiment | null;
}

interface RawStrikeData {
  strike: number;
  call: GreeksDataPoint[];
  put: GreeksDataPoint[];
}

const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let total = 9 * 60 + 15; total <= 15 * 60 + 30; total += 3) {
    const h = Math.floor(total / 60).toString().padStart(2, "0");
    const m = (total % 60).toString().padStart(2, "0");
    slots.push(`${h}${m}`);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const formatTimeDisplay = (time: string) => {
  if (!time || time.length < 4) return "";
  const hour = parseInt(time.slice(0, 2));
  const min = time.slice(2, 4);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour.toString().padStart(2, "0")}:${min} ${period}`;
};

const closestSlot = () => {
  const now = new Date();
  const cur = `${now.getHours().toString().padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}`;
  return TIME_SLOTS.reduce(
    (prev, curr) =>
      Math.abs(parseInt(curr) - parseInt(cur)) < Math.abs(parseInt(prev) - parseInt(cur)) ? curr : prev,
    TIME_SLOTS[0]
  );
};

// Candle timestamps are ms with IST already baked in (read as UTC parts)
const minuteOfDay = (ts: number) => {
  const d = new Date(ts);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};

const timeframes = ["1min", "3min", "5min", "15min", "30min", "60min"];
const strikeCounts = [5, 7, 10, 15, 20];

const fmtRatio = (ratio: number | null) => {
  if (ratio === null) return "—";
  if (!isFinite(ratio)) return "∞";
  return `${ratio.toFixed(2)}:1`;
};

const ratioClass = (ratio: number | null) =>
  ratio === null ? "text-muted-foreground" : ratio > 1 ? "text-emerald-500" : "text-red-500";

function sentimentOf(rows: ReturnType<typeof analyzeStrikeFlow>): SideSentiment {
  const matrix = computeFlowMatrix(rows);
  return {
    bigPlayer: computeSentimentTotals(matrix, "Big Player"),
    retail: computeSentimentTotals(matrix, "Retail"),
  };
}

async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>) {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    out.push(...(await Promise.all(chunk.map(fn))));
  }
  return out;
}

export interface FlowTotals {
  bpBull: number;
  bpBear: number;
  retailBull: number;
  retailBear: number;
  bpRatio: number | null;
  retailRatio: number | null;
}

function totalsFromRaw(raw: RawStrikeData[], cutoffMinute: number | null): FlowTotals {
  const t = { bpBull: 0, bpBear: 0, retailBull: 0, retailBear: 0 };
  raw.forEach((r) => {
    [r.call, r.put].forEach((data) => {
      const clipped =
        cutoffMinute === null ? data : data.filter((d) => minuteOfDay(d.timestamp) <= cutoffMinute);
      if (!clipped.length) return;
      const s = sentimentOf(analyzeStrikeFlow(clipped));
      t.bpBull += s.bigPlayer.bullish;
      t.bpBear += s.bigPlayer.bearish;
      t.retailBull += s.retail.bullish;
      t.retailBear += s.retail.bearish;
    });
  });
  const bpRatio = t.bpBear === 0 ? (t.bpBull === 0 ? null : Infinity) : t.bpBull / t.bpBear;
  const retailRatio = t.retailBear === 0 ? (t.retailBull === 0 ? null : Infinity) : t.retailBull / t.retailBear;
  return { ...t, bpRatio, retailRatio };
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// Handles "28-Aug-2026", "2026-08-28", "28 Aug 2026"
function parseExpiry(value: string): Date | null {
  if (!value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const dmy = /^(\d{1,2})[-\s/]([A-Za-z]{3,})[-\s/](\d{2,4})$/.exec(value);
  if (dmy) {
    const month = MONTH_MAP[dmy[2].slice(0, 3).toLowerCase()];
    if (month === undefined) return null;
    const year = Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]);
    return new Date(year, month, Number(dmy[1]));
  }
  const fallback = new Date(value);
  return isNaN(fallback.getTime()) ? null : fallback;
}

const StrikeFlowChain = () => {
  const { toast } = useToast();
  const [symbols, setSymbols] = useState<SymbolGroup>({ indexSymbols: [], stockSymbols: [] });
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [strikes, setStrikes] = useState<number[]>([]);

  const [selectedSymbol, setSelectedSymbol] = useState("Nifty 50");
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [centerStrike, setCenterStrike] = useState(0);
  const [selectedTimeframe, setSelectedTimeframe] = useState("3min");
  const [strikeCount, setStrikeCount] = useState(7);

  const [rawRows, setRawRows] = useState<RawStrikeData[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [isHistoricalMode, setIsHistoricalMode] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const [loadingSymbols, setLoadingSymbols] = useState(true);
  const [loadingExpiry, setLoadingExpiry] = useState(false);
  const [loadingStrikes, setLoadingStrikes] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const { data: res, error } = await supabase.functions.invoke("option-chain-proxy", {
          body: { endpoint: "symbols" },
        });
        if (error) throw error;
        setSymbols({
          indexSymbols: res?.["index symbols"] || [],
          stockSymbols: res?.symbols || [],
        });
      } catch (err) {
        console.error("Error fetching symbols:", err);
        toast({ title: "Error", description: "Failed to load symbols", variant: "destructive" });
      } finally {
        setLoadingSymbols(false);
      }
    };
    run();
  }, [toast]);

  useEffect(() => {
    if (!selectedSymbol) return;
    const run = async () => {
      setLoadingExpiry(true);
      setSelectedExpiry("");
      setStrikes([]);
      setCenterStrike(0);
      try {
        const { data: res, error } = await supabase.functions.invoke("option-chain-proxy", {
          body: { endpoint: "expiry", params: { symbol: selectedSymbol } },
        });
        if (error) throw error;
        const dates: string[] = Array.isArray(res)
          ? res
          : res?.expiry_dates || res?.expiryDates || res?.data || [];
        setExpiryDates(dates);
        if (dates.length > 0) setSelectedExpiry(dates[0]);
      } catch (err) {
        console.error("Error fetching expiry dates:", err);
        toast({ title: "Error", description: "Failed to load expiry dates", variant: "destructive" });
      } finally {
        setLoadingExpiry(false);
      }
    };
    run();
  }, [selectedSymbol, toast]);

  useEffect(() => {
    if (!selectedSymbol || !selectedExpiry) return;
    const run = async () => {
      setLoadingStrikes(true);
      try {
        const { data: res, error } = await supabase.functions.invoke("toi-data", {
          body: { endpoint: "strikes", symbol: selectedSymbol, expiry: selectedExpiry },
        });
        if (error) throw error;
        const raw = Array.isArray(res) ? res : res?.strikes || res?.data || [];
        const list: number[] = raw.map(Number).filter((n: number) => !isNaN(n));
        list.sort((a, b) => a - b);
        setStrikes(list);
        if (list.length > 0) {
          const atm = res?.atm && list.includes(res.atm) ? res.atm : list[Math.floor(list.length / 2)];
          setCenterStrike(atm);
        }
      } catch (err) {
        console.error("Error fetching strikes:", err);
        toast({ title: "Error", description: "Failed to load strikes", variant: "destructive" });
      } finally {
        setLoadingStrikes(false);
      }
    };
    run();
  }, [selectedSymbol, selectedExpiry, toast]);

  const visibleStrikes = useMemo(() => {
    if (!strikes.length || !centerStrike) return [];
    const idx = strikes.indexOf(centerStrike);
    if (idx < 0) return [];
    const half = Math.floor(strikeCount / 2);
    return strikes.slice(Math.max(0, idx - half), idx + half + 1);
  }, [strikes, centerStrike, strikeCount]);

  const strikesKey = visibleStrikes.join(",");

  const loadChain = useCallback(async () => {
    if (!selectedSymbol || !selectedExpiry || visibleStrikes.length === 0) return;
    setLoadingData(true);
    try {
      const result = await inBatches(visibleStrikes, 4, async (strike): Promise<RawStrikeData> => {
        try {
          const res = await fetchCombinedGreeksData(
            selectedSymbol,
            selectedExpiry,
            strike,
            selectedTimeframe
          );
          return { strike, call: res.callData || [], put: res.putData || [] };
        } catch {
          return { strike, call: [], put: [] };
        }
      });
      setRawRows(result);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Error building strike flow chain:", err);
      toast({ title: "Error", description: "Failed to load chain data", variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  }, [selectedSymbol, selectedExpiry, selectedTimeframe, strikesKey, toast]);

  // Next weekly expiry (the one right after the selected) and the monthly expiry
  // (last expiry falling in the same calendar month as the selected expiry)
  const { nextWeekExpiry, monthlyExpiry } = useMemo(() => {
    const idx = expiryDates.indexOf(selectedExpiry);
    const nextWeek = idx >= 0 && idx + 1 < expiryDates.length ? expiryDates[idx + 1] : null;

    const selDate = parseExpiry(selectedExpiry);
    let monthly: string | null = null;
    if (selDate) {
      const sameMonth = expiryDates.filter((d) => {
        const p = parseExpiry(d);
        return p && p.getMonth() === selDate.getMonth() && p.getFullYear() === selDate.getFullYear();
      });
      if (sameMonth.length) {
        monthly = sameMonth.reduce((a, b) => {
          const pa = parseExpiry(a)!;
          const pb = parseExpiry(b)!;
          return pb > pa ? b : a;
        });
      }
    }
    if (monthly === selectedExpiry) monthly = null;
    return { nextWeekExpiry: nextWeek === selectedExpiry ? null : nextWeek, monthlyExpiry: monthly };
  }, [expiryDates, selectedExpiry]);

  const [nextWeekRaw, setNextWeekRaw] = useState<RawStrikeData[]>([]);
  const [monthlyRaw, setMonthlyRaw] = useState<RawStrikeData[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(false);

  const loadExtraExpiries = useCallback(async () => {
    if (!selectedSymbol || visibleStrikes.length === 0) return;
    const fetchFor = async (expiry: string) =>
      inBatches(visibleStrikes, 4, async (strike): Promise<RawStrikeData> => {
        try {
          const res = await fetchCombinedGreeksData(selectedSymbol, expiry, strike, selectedTimeframe);
          return { strike, call: res.callData || [], put: res.putData || [] };
        } catch {
          return { strike, call: [], put: [] };
        }
      });

    setLoadingExtra(true);
    try {
      const [nw, mo] = await Promise.all([
        nextWeekExpiry ? fetchFor(nextWeekExpiry) : Promise.resolve([]),
        monthlyExpiry ? fetchFor(monthlyExpiry) : Promise.resolve([]),
      ]);
      setNextWeekRaw(nw);
      setMonthlyRaw(mo);
    } catch (err) {
      console.error("Error loading extra expiry summaries:", err);
    } finally {
      setLoadingExtra(false);
    }
  }, [selectedSymbol, selectedTimeframe, strikesKey, nextWeekExpiry, monthlyExpiry]);

  const cutoffMinute = useMemo(() => {
    if (!isHistoricalMode || !selectedTime) return null;
    return parseInt(selectedTime.slice(0, 2)) * 60 + parseInt(selectedTime.slice(2, 4));
  }, [isHistoricalMode, selectedTime]);

  const rows = useMemo<ChainRow[]>(() => {
    return rawRows.map((r) => {
      const clip = (data: GreeksDataPoint[]) =>
        cutoffMinute === null ? data : data.filter((d) => minuteOfDay(d.timestamp) <= cutoffMinute);
      const call = clip(r.call);
      const put = clip(r.put);
      return {
        strike: r.strike,
        call: call.length ? sentimentOf(analyzeStrikeFlow(call)) : null,
        put: put.length ? sentimentOf(analyzeStrikeFlow(put)) : null,
      };
    });
  }, [rawRows, cutoffMinute]);

  const handleTimeChange = (direction: "prev" | "next") => {
    const baseTime = selectedTime && TIME_SLOTS.includes(selectedTime) ? selectedTime : closestSlot();
    const idx = TIME_SLOTS.indexOf(baseTime);
    const next = Math.min(Math.max(idx + (direction === "prev" ? -1 : 1), 0), TIME_SLOTS.length - 1);
    setSelectedTime(TIME_SLOTS[next]);
  };

  const enableHistoricalMode = () => {
    if (!isHistoricalMode) {
      setIsHistoricalMode(true);
      setSelectedTime(closestSlot());
    }
  };

  const resetToLive = () => {
    setIsHistoricalMode(false);
    setSelectedTime("");
  };

  useEffect(() => {
    if (!loadingStrikes && !loadingExpiry) loadChain();
  }, [loadChain, loadingStrikes, loadingExpiry]);

  useEffect(() => {
    if (!loadingStrikes && !loadingExpiry) loadExtraExpiries();
  }, [loadExtraExpiries, loadingStrikes, loadingExpiry]);

  useEffect(() => {
    if (isHistoricalMode) return;
    if (!selectedSymbol || !selectedExpiry || visibleStrikes.length === 0) return;
    const id = setInterval(() => {
      loadChain();
      loadExtraExpiries();
    }, 60000);
    return () => clearInterval(id);
  }, [loadChain, loadExtraExpiries, isHistoricalMode]);

  const SideCells = ({ side, mirrored }: { side: SideSentiment | null; mirrored?: boolean }) => {
    const cells = [
      <td key="bpb" className="px-1.5 py-1 text-right font-mono text-emerald-500">
        {side ? formatIndianNumber(Math.round(side.bigPlayer.bullish)) : "-"}
      </td>,
      <td key="bpr" className="px-1.5 py-1 text-right font-mono text-red-500">
        {side ? formatIndianNumber(Math.round(side.bigPlayer.bearish)) : "-"}
      </td>,
      <td
        key="bpratio"
        className={cn("px-1.5 py-1 text-right font-mono font-bold", ratioClass(side?.bigPlayer.ratio ?? null))}
      >
        {side ? fmtRatio(side.bigPlayer.ratio) : "-"}
      </td>,
      <td key="rb" className="px-1.5 py-1 text-right font-mono text-emerald-500/80">
        {side ? formatIndianNumber(Math.round(side.retail.bullish)) : "-"}
      </td>,
      <td key="rr" className="px-1.5 py-1 text-right font-mono text-red-500/80">
        {side ? formatIndianNumber(Math.round(side.retail.bearish)) : "-"}
      </td>,
      <td
        key="rratio"
        className={cn("px-1.5 py-1 text-right font-mono font-semibold", ratioClass(side?.retail.ratio ?? null))}
      >
        {side ? fmtRatio(side.retail.ratio) : "-"}
      </td>,
    ];
    return <>{mirrored ? cells.slice().reverse() : cells}</>;
  };

  const headLabels = ["BP Bull OI", "BP Bear OI", "BP B/B", "Retail Bull OI", "Retail Bear OI", "Retail B/B"];

  const totals = useMemo(() => totalsFromRaw(rawRows, cutoffMinute), [rawRows, cutoffMinute]);
  const nextWeekTotals = useMemo(
    () => (nextWeekRaw.length ? totalsFromRaw(nextWeekRaw, cutoffMinute) : null),
    [nextWeekRaw, cutoffMinute]
  );
  const monthlyTotals = useMemo(
    () => (monthlyRaw.length ? totalsFromRaw(monthlyRaw, cutoffMinute) : null),
    [monthlyRaw, cutoffMinute]
  );

  // Cumulative bullish / bearish OI over the day, bucketed per candle time (09:15 → last candle)
  const timeSeries = useMemo(() => {
    const buckets = new Map<number, { bpBull: number; bpBear: number; retailBull: number; retailBear: number }>();

    const addSide = (data: GreeksDataPoint[]) => {
      const clipped =
        cutoffMinute === null ? data : data.filter((d) => minuteOfDay(d.timestamp) <= cutoffMinute);
      if (!clipped.length) return;
      for (const r of analyzeStrikeFlow(clipped)) {
        if (r.action === "Neutral") continue;
        if (r.player !== "Retail" && r.player !== "Big Player") continue;
        const m = minuteOfDay(r.timestamp);
        const b = buckets.get(m) || { bpBull: 0, bpBear: 0, retailBull: 0, retailBear: 0 };
        const sentiment = getSentiment(r.action, r.player);
        const val = Math.abs(r.coi);
        if (r.player === "Big Player") {
          if (sentiment === "Bullish") b.bpBull += val;
          else b.bpBear += val;
        } else {
          if (sentiment === "Bullish") b.retailBull += val;
          else b.retailBear += val;
        }
        buckets.set(m, b);
      }
    };

    rawRows.forEach((r) => {
      addSide(r.call);
      addSide(r.put);
    });

    // Fixed full-session axis (09:15 → 15:30) so the chart never re-scales / shifts
    const step = Math.max(1, parseInt(selectedTimeframe) || 3);
    const start = 9 * 60 + 15;
    const end = 15 * 60 + 30;
    const axis: number[] = [];
    for (let m = start; m <= end; m += step) axis.push(m);

    const mins = Array.from(buckets.keys());
    const lastMin = mins.length ? Math.max(...mins) : -1;
    let bpBull = 0,
      bpBear = 0,
      retailBull = 0,
      retailBear = 0;

    return axis.map((m) => {
      // absorb every candle that falls inside this slot
      for (let k = m; k < m + step; k++) {
        const b = buckets.get(k);
        if (!b) continue;
        bpBull += b.bpBull;
        bpBear += b.bpBear;
        retailBull += b.retailBull;
        retailBear += b.retailBear;
      }
      const time = `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
      if (lastMin < 0 || m > lastMin) {
        return { time, bpBull: null, bpBear: null, retailBull: null, retailBear: null };
      }
      return { time, bpBull, bpBear, retailBull, retailBear };
    });
  }, [rawRows, cutoffMinute, selectedTimeframe]);


  const lastPlottedTime = useMemo(() => {
    const filled = timeSeries.filter((d) => d.bpBull !== null);
    return filled.length ? filled[filled.length - 1].time : "--:--";
  }, [timeSeries]);

  // Stable half-hourly ticks across the fixed session axis
  const hourTicks = useMemo(
    () => timeSeries.filter((d) => d.time.endsWith(":00") || d.time.endsWith(":30")).map((d) => d.time),
    [timeSeries]
  );





  return (
    <PageLayout>
      <SEO
        title="Strike Flow Chain — Big Player vs Retail Sentiment | OptionWorld"
        description="Option-chain style view with strikes in the centre: Call and Put side big player vs retail bullish and bearish OI with ratios for every strike."
        path="/strike-flow-chain"
      />
      <ProFeatureGate featureName="Strike Flow Chain">
        <main className="container py-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold">Strike Flow Chain</h1>
              <p className="text-xs text-muted-foreground">
                Strike in the middle — Call side on the left, Put side on the right, with big player vs retail sentiment OI.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LastRefreshBadge lastRefresh={lastRefresh} isFetching={loadingData} />
              <PageInfoModal
                title="Strike Flow Chain"
                subtitle="Sentiment OI per strike, both sides"
                overview="For every strike, all candles of the day are classified (long buildup, short buildup, short covering, long unwinding) and split into big player vs retail flow. The COI of bullish activity and bearish activity is totalled per side and shown with its ratio."
                legend={[
                  { label: "BP Bull OI", text: "Big player long buildup + short covering COI", color: "#10b981" },
                  { label: "BP Bear OI", text: "Big player short buildup + long unwinding COI", color: "#ef4444" },
                  { label: "Retail", text: "Same activities read with opposite sentiment", color: "#f59e0b" },
                ]}
                howToUse="Pick symbol, expiry, centre strike, timeframe and how many strikes to load. Ratio above 1 means that side's flow is net bullish."
                tips={[
                  "Compare Call-side BP bearish OI against Put-side BP bearish OI to find the defended range.",
                  "Fewer strikes load faster; 20 strikes needs a few seconds.",
                ]}
              />
            </div>
          </div>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-3 flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground">Symbol</div>
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol} disabled={loadingSymbols}>
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {symbols.indexSymbols.map((s) => (
                      <SelectItem key={`i-${s}`} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                    {symbols.stockSymbols.map((s) => (
                      <SelectItem key={`s-${s}`} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground">Expiry</div>
                <Select value={selectedExpiry} onValueChange={setSelectedExpiry} disabled={loadingExpiry}>
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue placeholder="Expiry" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {expiryDates.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground">Centre strike</div>
                <Select
                  value={centerStrike ? String(centerStrike) : ""}
                  onValueChange={(v) => setCenterStrike(Number(v))}
                  disabled={loadingStrikes}
                >
                  <SelectTrigger className="h-8 w-[120px] text-xs">
                    <SelectValue placeholder="Strike" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {strikes.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground">Timeframe</div>
                <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                  <SelectTrigger className="h-8 w-[100px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeframes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground">Strikes</div>
                <Select value={String(strikeCount)} onValueChange={(v) => setStrikeCount(Number(v))}>
                  <SelectTrigger className="h-8 w-[90px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {strikeCounts.map((c) => (
                      <SelectItem key={c} value={String(c)}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-primary/50"
                  onClick={() => { enableHistoricalMode(); handleTimeChange("prev"); }}
                  disabled={isHistoricalMode && TIME_SLOTS.indexOf(selectedTime) <= 0}
                  title="Earlier time"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant={isHistoricalMode ? "default" : "outline"}
                  className={`h-8 px-3 flex items-center gap-2 text-xs ${isHistoricalMode ? "bg-cyan-600 hover:bg-cyan-700" : "border-primary/50"}`}
                  onClick={enableHistoricalMode}
                  title="Show data from market open up to this time"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-medium">{isHistoricalMode ? formatTimeDisplay(selectedTime) : "Live"}</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-primary/50"
                  onClick={() => { enableHistoricalMode(); handleTimeChange("next"); }}
                  disabled={isHistoricalMode && TIME_SLOTS.indexOf(selectedTime) >= TIME_SLOTS.length - 1}
                  title="Later time"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {isHistoricalMode && (
                  <Button
                    variant="default"
                    size="icon"
                    className="h-8 w-8 bg-cyan-600 hover:bg-cyan-700"
                    onClick={resetToLive}
                    title="Reset to Live"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <Button size="sm" className="h-8" onClick={loadChain} disabled={loadingData}>
                {loadingData ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Go"}
              </Button>
            </CardContent>
          </Card>

          {rows.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total BP Bullish OI</div>
                    <div className="text-sm font-mono font-bold text-emerald-500">
                      {formatIndianNumber(Math.round(totals.bpBull))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total BP Bearish OI</div>
                    <div className="text-sm font-mono font-bold text-red-500">
                      {formatIndianNumber(Math.round(totals.bpBear))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">BP B / B</div>
                    <div className={cn("text-sm font-mono font-bold", ratioClass(totals.bpRatio))}>
                      {fmtRatio(totals.bpRatio)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Retail Bullish OI</div>
                    <div className="text-sm font-mono font-bold text-emerald-500/80">
                      {formatIndianNumber(Math.round(totals.retailBull))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Retail Bearish OI</div>
                    <div className="text-sm font-mono font-bold text-red-500/80">
                      {formatIndianNumber(Math.round(totals.retailBear))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Retail B / B</div>
                    <div className={cn("text-sm font-mono font-bold", ratioClass(totals.retailRatio))}>
                      {fmtRatio(totals.retailRatio)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-2">
              {loadingData && rows.length === 0 ? (
                <div className="py-12 flex items-center justify-center text-sm text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading strike flow…
                </div>
              ) : rows.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No data yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] leading-tight">
                    <thead>
                      <tr className="bg-muted/60">
                        <th colSpan={6} className="px-1.5 py-1 text-center font-bold text-emerald-500">
                          CALLS
                        </th>
                        <th className="px-1.5 py-1 text-center font-bold">STRIKE</th>
                        <th colSpan={6} className="px-1.5 py-1 text-center font-bold text-red-500">
                          PUTS
                        </th>
                      </tr>
                      <tr className="bg-muted/40">
                        {headLabels.map((h) => (
                          <th key={`c-${h}`} className="px-1.5 py-1 text-right font-semibold whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                        <th className="px-1.5 py-1 text-center font-semibold">Strike</th>
                        {headLabels
                          .slice()
                          .reverse()
                          .map((h) => (
                            <th key={`p-${h}`} className="px-1.5 py-1 text-right font-semibold whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr
                          key={r.strike}
                          className={cn(
                            "border-b border-border/40 hover:bg-muted/30",
                            r.strike === centerStrike && "bg-primary/5"
                          )}
                        >
                          <SideCells side={r.call} />
                          <td className="px-1.5 py-1 text-center font-mono font-bold bg-muted/40">
                            {r.strike}
                          </td>
                          <SideCells side={r.put} mirrored />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {rows.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide text-center mb-3">
                  Bullish vs Bearish OI — Intraday (09:15 → 15:30, plotted till {lastPlottedTime})
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="h-[260px]">
                    <div className="text-[10px] text-center font-semibold mb-1 text-emerald-400">Big Player</div>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                        <XAxis
                          dataKey="time"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          ticks={hourTicks}
                          interval={0}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => formatCompactIndian(v, 1)}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          formatter={(value: number, name: string) => [formatIndianNumber(Math.round(value)), name]}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Line type="monotone" dataKey="bpBull" name="BP Bullish OI" stroke="#10b981" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="bpBear" name="BP Bearish OI" stroke="#ef4444" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-[260px]">
                    <div className="text-[10px] text-center font-semibold mb-1 text-amber-400">Retail</div>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                        <XAxis
                          dataKey="time"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          ticks={hourTicks}
                          interval={0}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => formatCompactIndian(v, 1)}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          formatter={(value: number, name: string) => [formatIndianNumber(Math.round(value)), name]}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Line type="monotone" dataKey="retailBull" name="Retail Bullish OI" stroke="#10b981" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="retailBear" name="Retail Bearish OI" stroke="#ef4444" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </ProFeatureGate>
    </PageLayout>
  );
};

export default StrikeFlowChain;
