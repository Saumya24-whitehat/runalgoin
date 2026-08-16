import { useState, useEffect, useCallback, useMemo } from "react";
import { PageLayout } from "@/components/PageLayout";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GreeksChartControls } from "@/components/greeksChart/GreeksChartControls";
import { fetchCombinedGreeksData, ParsedGreeksData } from "@/services/greeksChartApi";
import { analyzeStrikeFlow, actionColor, StrikeFlowRow, computeFlowMatrix, computeSentimentTotals } from "@/utils/strikeFlowAnalysis";
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

const fmtTime = (ts: number) => {
  const d = new Date(ts);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")} ${String(
    d.getUTCHours()
  ).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

const signClass = (v: number) =>
  v > 0 ? "text-emerald-500" : v < 0 ? "text-red-500" : "text-muted-foreground";

const playerClass = (p: StrikeFlowRow["player"]) =>
  p === "Retail"
    ? "bg-amber-500/15 text-amber-500"
    : p === "Big Player"
    ? "bg-emerald-500/15 text-emerald-500"
    : p === "Exit / Deflate"
    ? "bg-red-500/15 text-red-500"
    : "bg-muted text-muted-foreground";

function FlowTable({ rows }: { rows: StrikeFlowRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No data for this strike yet.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px] leading-tight">
        <thead className="sticky top-0 bg-muted/60 backdrop-blur">
          <tr className="text-left">
            {["Date / Time", "LTP", "LTP Chg", "OI", "Candle COI", "Day COI", "IV", "IV Chg", "Activity", "Who", "Insight"].map((h) => (
              <th key={h} className="px-1.5 py-1.5 font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.timestamp} className="border-b border-border/40 hover:bg-muted/30">
              <td className="px-1.5 py-1 whitespace-nowrap font-mono">{fmtTime(r.timestamp)}</td>
              <td className="px-1.5 py-1 font-mono">{r.ltp.toFixed(2)}</td>
              <td className={cn("px-1.5 py-1 font-mono", signClass(r.ltpChange))}>
                {r.ltpChange > 0 ? "+" : ""}
                {r.ltpChange.toFixed(2)} ({r.ltpChangePct.toFixed(1)}%)
              </td>
              <td className="px-1.5 py-1 font-mono">{formatIndianNumber(r.oi)}</td>
              <td className={cn("px-1.5 py-1 font-mono", signClass(r.coi))}>
                {r.coi > 0 ? "+" : ""}
                {formatIndianNumber(r.coi)}
              </td>
              <td className="px-1.5 py-1 font-mono">{r.iv.toFixed(2)}</td>
              <td className={cn("px-1.5 py-1 font-mono", signClass(r.ivChange))}>
                {r.ivChange > 0 ? "+" : ""}
                {r.ivChange.toFixed(2)} ({r.ivChangePct.toFixed(1)}%)
              </td>
              <td className={cn("px-1.5 py-1 whitespace-nowrap font-semibold", actionColor[r.action])}>
                {r.action}
                <span className="ml-1 font-normal text-muted-foreground">
                  {r.ivRegime === "Spike" ? "· IV↑" : r.ivRegime === "Crush" ? "· IV↓" : "· IV~"}
                </span>
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap">
                <span className={cn("rounded px-1.5 py-0.5 font-semibold", playerClass(r.player))}>
                  {r.player}
                </span>
              </td>
              <td className="px-1.5 py-1 min-w-[280px] text-muted-foreground">{r.insight}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FlowMatrixSummary({ rows, label }: { rows: StrikeFlowRow[]; label: string }) {
  const matrix = useMemo(() => computeFlowMatrix(rows), [rows]);
  const bp = useMemo(() => computeSentimentTotals(matrix, "Big Player"), [matrix]);
  const retail = useMemo(() => computeSentimentTotals(matrix, "Retail"), [matrix]);

  const actions = [
    { key: "Long Buildup" as const, label: "Long Buildup" },
    { key: "Short Buildup" as const, label: "Short Buildup" },
    { key: "Short Covering" as const, label: "Short Covering" },
    { key: "Long Unwinding" as const, label: "Long Unwinding" },
  ];

  const fmtRatio = (ratio: number | null) => {
    if (ratio === null) return "—";
    if (!isFinite(ratio)) return "∞";
    return `${ratio.toFixed(2)}:1`;
  };

  const ratioClass = (ratio: number | null) =>
    ratio === null ? "text-muted-foreground" : ratio > 1 ? "text-emerald-500" : "text-red-500";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{label} Flow Matrix</h3>
        <span className="text-xs text-muted-foreground">{rows.length} candles analysed</span>
      </div>

      <div className="overflow-x-auto rounded-md border border-border/40">
        <table className="w-full text-[10px] leading-tight">
          <thead className="bg-muted/60">
            <tr className="text-left">
              <th className="px-2 py-1.5 font-semibold">Activity</th>
              <th className="px-2 py-1.5 font-semibold text-right">Retail COI</th>
              <th className="px-2 py-1.5 font-semibold text-right">Big Player COI</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => {
              const re = matrix[a.key].Retail;
              const bpCell = matrix[a.key]["Big Player"];
              return (
                <tr key={a.key} className="border-b border-border/40 last:border-0">
                  <td className={cn("px-2 py-1.5 font-semibold whitespace-nowrap", actionColor[a.key])}>
                    {a.label}
                  </td>
                  <td className={cn("px-2 py-1.5 text-right font-mono", signClass(re.totalCoi))}>
                    {re.totalCoi > 0 ? "+" : ""}
                    {formatIndianNumber(Math.round(re.totalCoi))}
                  </td>
                  <td className={cn("px-2 py-1.5 text-right font-mono", signClass(bpCell.totalCoi))}>
                    {bpCell.totalCoi > 0 ? "+" : ""}
                    {formatIndianNumber(Math.round(bpCell.totalCoi))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3 space-y-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Big Player Sentiment</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] text-emerald-500 font-semibold">Bullish OI</div>
                <div className="font-mono text-sm">{formatIndianNumber(Math.round(bp.bullish))}</div>
              </div>
              <div>
                <div className="text-[10px] text-red-500 font-semibold">Bearish OI</div>
                <div className="font-mono text-sm">{formatIndianNumber(Math.round(bp.bearish))}</div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <span className="text-xs font-semibold">Bullish / Bearish</span>
              <span className={cn("font-mono font-bold", ratioClass(bp.ratio))}>
                {fmtRatio(bp.ratio)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3 space-y-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Retail Sentiment</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] text-emerald-500 font-semibold">Bullish OI</div>
                <div className="font-mono text-sm">{formatIndianNumber(Math.round(retail.bullish))}</div>
              </div>
              <div>
                <div className="text-[10px] text-red-500 font-semibold">Bearish OI</div>
                <div className="font-mono text-sm">{formatIndianNumber(Math.round(retail.bearish))}</div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <span className="text-xs font-semibold">Bullish / Bearish</span>
              <span className={cn("font-mono font-bold", ratioClass(retail.ratio))}>
                {fmtRatio(retail.ratio)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


const StrikeFlowAnalyzer = () => {
  const { toast } = useToast();
  const [symbols, setSymbols] = useState<SymbolGroup>({ indexSymbols: [], stockSymbols: [] });
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [strikes, setStrikes] = useState<number[]>([]);

  const [selectedSymbol, setSelectedSymbol] = useState("Nifty 50");
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [selectedStrike, setSelectedStrike] = useState(0);
  const [selectedTimeframe, setSelectedTimeframe] = useState("3min");

  const [data, setData] = useState<ParsedGreeksData | null>(null);
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
      setSelectedStrike(0);
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
          setSelectedStrike(atm);
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

  const handleGo = useCallback(async () => {
    if (!selectedSymbol || !selectedExpiry || !selectedStrike) return;
    setLoadingData(true);
    try {
      const res = await fetchCombinedGreeksData(
        selectedSymbol,
        selectedExpiry,
        selectedStrike,
        selectedTimeframe
      );
      setData(res);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Error fetching strike data:", err);
      toast({ title: "Error", description: "Failed to load strike data", variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  }, [selectedSymbol, selectedExpiry, selectedStrike, selectedTimeframe, toast]);

  useEffect(() => {
    if (selectedSymbol && selectedExpiry && selectedStrike && !loadingStrikes && !loadingExpiry) {
      handleGo();
    }
  }, [selectedSymbol, selectedExpiry, selectedStrike, selectedTimeframe, loadingStrikes, loadingExpiry]);

  useEffect(() => {
    if (!selectedSymbol || !selectedExpiry || !selectedStrike) return;
    const id = setInterval(() => handleGo(), 60000);
    return () => clearInterval(id);
  }, [handleGo]);

  const callRows = useMemo(() => analyzeStrikeFlow(data?.callData || []).reverse(), [data]);
  const putRows = useMemo(() => analyzeStrikeFlow(data?.putData || []).reverse(), [data]);
  const combinedRows = useMemo(() => [...callRows, ...putRows], [callRows, putRows]);

  return (
    <PageLayout>
      <SEO
        title="Strike Flow Analyzer — OI, COI & IV Activity | OptionWorld"
        description="Candle-by-candle strike analysis: LTP, OI, COI and IV change with buildup, unwinding and short-covering signals plus retail vs big-player interpretation."
        path="/strike-flow"
      />
      <ProFeatureGate featureName="Strike Flow Analyzer">
        <main className="container py-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold">Strike Flow Analyzer</h1>
              <p className="text-xs text-muted-foreground">
                Candle-to-candle price vs OI vs IV — who is buying, writing, covering or unwinding.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LastRefreshBadge lastRefresh={lastRefresh} isFetching={loadingData} />
              <PageInfoModal
                title="Strike Flow Analyzer"
                subtitle="Price + OI + IV read for a single strike"
                overview="For the selected strike, each candle is compared with the previous one to classify the option activity, and the IV behaviour on that candle decides whether the move looks like retail emotion or a quiet big-player position."
                legend={[
                  { label: "Long Buildup", text: "OI up + premium up = fresh option buying", color: "#10b981" },
                  { label: "Short Buildup", text: "OI up + premium down = fresh writing", color: "#ef4444" },
                  { label: "Short Covering", text: "OI down + premium up = writers buying back", color: "#0ea5e9" },
                  { label: "Long Unwinding", text: "OI down + premium down = buyers exiting", color: "#f59e0b" },
                ]}
                sections={[
                  {
                    heading: "IV overlay — the real edge",
                    body: "Every scenario has two versions: with an IV spike and with flat/slow IV. IV spike = retail emotion, and the big player usually takes the opposite side. Flat or slowly grinding IV = calculated, quiet big-player move. IV crush = a large position being closed, premium deflating.",
                  },
                ]}
                howToUse="Pick symbol, expiry, strike and timeframe. Read the newest candle at the top and follow the Activity + Who columns together, never the OI change alone."
                tips={[
                  "Repeated 'Big Player · Short Buildup' at one strike marks a defended wall.",
                  "IV spike with long buildup often marks a short-term top in premium.",
                  "IV crush with falling OI means avoid fresh option buying at that strike.",
                ]}
              />
            </div>
          </div>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-3">
              <GreeksChartControls
                symbols={symbols}
                expiryDates={expiryDates}
                strikes={strikes}
                selectedSymbol={selectedSymbol}
                selectedExpiry={selectedExpiry}
                selectedStrike={selectedStrike}
                selectedTimeframe={selectedTimeframe}
                loadingSymbols={loadingSymbols}
                loadingExpiry={loadingExpiry}
                loadingStrikes={loadingStrikes}
                loadingData={loadingData}
                onSymbolChange={setSelectedSymbol}
                onExpiryChange={setSelectedExpiry}
                onStrikeChange={setSelectedStrike}
                onTimeframeChange={setSelectedTimeframe}
                onGo={handleGo}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2 space-y-4">
              <FlowMatrixSummary rows={combinedRows} label="Overall" />
              <Tabs defaultValue="call">
                <TabsList className="grid w-full max-w-xs grid-cols-2">
                  <TabsTrigger value="call">
                    {selectedStrike || ""} CE
                  </TabsTrigger>
                  <TabsTrigger value="put">
                    {selectedStrike || ""} PE
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="call" className="mt-2 space-y-3">
                  <FlowMatrixSummary rows={callRows} label="CE" />
                  <FlowTable rows={callRows} />
                </TabsContent>
                <TabsContent value="put" className="mt-2 space-y-3">
                  <FlowMatrixSummary rows={putRows} label="PE" />
                  <FlowTable rows={putRows} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </main>
      </ProFeatureGate>
    </PageLayout>
  );
};

export default StrikeFlowAnalyzer;
