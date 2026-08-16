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
import { Loader2 } from "lucide-react";
import { fetchCombinedGreeksData } from "@/services/greeksChartApi";
import {
  analyzeStrikeFlow,
  computeFlowMatrix,
  computeSentimentTotals,
  SentimentTotals,
} from "@/utils/strikeFlowAnalysis";
import { formatIndianNumber } from "@/lib/formatNumber";
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

  const [rows, setRows] = useState<ChainRow[]>([]);
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
      const result = await inBatches(visibleStrikes, 4, async (strike): Promise<ChainRow> => {
        try {
          const res = await fetchCombinedGreeksData(
            selectedSymbol,
            selectedExpiry,
            strike,
            selectedTimeframe
          );
          return {
            strike,
            call: res.callData.length ? sentimentOf(analyzeStrikeFlow(res.callData)) : null,
            put: res.putData.length ? sentimentOf(analyzeStrikeFlow(res.putData)) : null,
          };
        } catch {
          return { strike, call: null, put: null };
        }
      });
      setRows(result);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Error building strike flow chain:", err);
      toast({ title: "Error", description: "Failed to load chain data", variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  }, [selectedSymbol, selectedExpiry, selectedTimeframe, strikesKey, toast]);

  useEffect(() => {
    if (!loadingStrikes && !loadingExpiry) loadChain();
  }, [loadChain, loadingStrikes, loadingExpiry]);

  useEffect(() => {
    if (!selectedSymbol || !selectedExpiry || visibleStrikes.length === 0) return;
    const id = setInterval(() => loadChain(), 60000);
    return () => clearInterval(id);
  }, [loadChain]);

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

              <Button size="sm" className="h-8" onClick={loadChain} disabled={loadingData}>
                {loadingData ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Go"}
              </Button>
            </CardContent>
          </Card>

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
        </main>
      </ProFeatureGate>
    </PageLayout>
  );
};

export default StrikeFlowChain;
