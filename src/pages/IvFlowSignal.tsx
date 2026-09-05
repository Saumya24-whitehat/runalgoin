import { useState, useEffect, useCallback, useMemo } from "react";
import { PageLayout } from "@/components/PageLayout";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { Card, CardContent } from "@/components/ui/card";
import { GreeksChartControls } from "@/components/greeksChart/GreeksChartControls";
import { fetchCombinedGreeksData, ParsedGreeksData } from "@/services/greeksChartApi";
import {
  analyzeIvFlow,
  computeIvFlowSummary,
  verdictColor,
  signalColor,
  IvFlowRow,
  Verdict,
} from "@/utils/ivFlowSignal";
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
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};


const ivArrow = (dir: "up" | "down" | "flat") =>
  dir === "up" ? "↑" : dir === "down" ? "↓" : "~";

const verdictOrder: Verdict[] = [
  "Very Strong Bullish",
  "Strong Bullish",
  "Bullish",
  "Range / Neutral",
  "Bearish",
  "Strong Bearish",
  "Very Strong Bearish",
];

function SideCell({ snap }: { snap: IvFlowRow["ce"] }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn("w-fit rounded px-1.5 py-0.5 font-semibold", signalColor[snap.signal])}>
        {snap.signal}
      </span>
      <span className="font-mono text-muted-foreground whitespace-nowrap">
        IV{ivArrow(snap.ivDir)} {snap.iv.toFixed(1)} ({snap.ivRoc >= 0 ? "+" : ""}
        {snap.ivRoc.toFixed(1)}%) · OI {snap.oiChange > 0 ? "+" : ""}
        {formatIndianNumber(snap.oiChange)} · Prm {snap.premiumChange > 0 ? "+" : ""}
        {snap.premiumChange.toFixed(1)}
      </span>
    </div>
  );
}

function FlowTable({ rows }: { rows: IvFlowRow[] }) {
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
            {["Time", "CE Signal (IV · OI · Premium)", "PE Signal (IV · OI · Premium)", "Verdict", "Meaning"].map((h) => (
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
              <td className="px-1.5 py-1"><SideCell snap={r.ce} /></td>
              <td className="px-1.5 py-1"><SideCell snap={r.pe} /></td>
              <td className={cn("px-1.5 py-1 whitespace-nowrap font-bold", verdictColor[r.verdict])}>
                {r.verdict}
              </td>
              <td className="px-1.5 py-1 min-w-[260px] text-muted-foreground">{r.meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const IvFlowSignal = () => {
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

  const rows = useMemo(
    () => analyzeIvFlow(data?.callData || [], data?.putData || []).reverse(),
    [data]
  );
  const summary = useMemo(() => computeIvFlowSummary(rows), [rows]);
  const latest = rows[0];

  return (
    <PageLayout>
      <SEO
        title="IV Flow Signal — Writer vs Buyer Detection | OptionWorld"
        description="IV RoC + OI + Premium based CE/PE writer-buyer detection with strong bullish and bearish verdicts candle by candle."
        path="/iv-flow-signal"
      />
      <ProFeatureGate featureName="IV Flow Signal">
        <main className="container py-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold">IV Flow Signal</h1>
              <p className="text-xs text-muted-foreground">
                IV rate-of-change + OI + premium — candle-wise writer/buyer detection and bullish/bearish verdict.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LastRefreshBadge lastRefresh={lastRefresh} isFetching={loadingData} />
              <PageInfoModal
                title="IV Flow Signal"
                subtitle="IV RoC + OI + Premium logic"
                overview="Each candle, for both CE and PE, IV direction (rate of change from the day's first non-zero IV), OI change and premium change are combined into a writer/buyer signal. The CE and PE signals together produce a bullish or bearish verdict."
                legend={[
                  { label: "Writing", text: "IV↓ + OI↑ + Premium↓ — fresh writing", color: "#0ea5e9" },
                  { label: "Buying", text: "IV↑ + OI↑ + Premium↑ — fresh buying", color: "#10b981" },
                  { label: "Short Covering", text: "IV↑ + OI↓ + Premium↑ — writers buying back", color: "#8b5cf6" },
                  { label: "Long Unwinding", text: "IV↓ + OI↓ + Premium↓ — buyers exiting", color: "#f59e0b" },
                ]}
                sections={[
                  {
                    heading: "Bullish combinations",
                    body: "CE Buying + PE Writing = Strong Bullish. CE Short Covering + PE Writing = Very Strong Bullish. CE Buying + PE Short Covering = Strong Bullish.",
                  },
                  {
                    heading: "Bearish combinations",
                    body: "CE Writing + PE Buying = Strong Bearish. CE Writing + PE Short Covering = Very Strong Bearish. CE Writing + PE Writing = range-bound, no directional trade.",
                  },
                ]}
                howToUse="Pick symbol, expiry, strike and timeframe. Read the newest candle at the top; the Verdict column is the tradeable signal."
                tips={[
                  "Very Strong signals with rising OI volume are the most reliable.",
                  "Range / Neutral near expiry often means writers control both sides.",
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

          {latest && (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Latest Verdict</div>
                  <div className={cn("text-base font-bold", verdictColor[latest.verdict])}>
                    {latest.verdict}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Bullish Candles</div>
                  <div className="font-mono text-sm text-emerald-500">{summary.bullishPct.toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Bearish Candles</div>
                  <div className="font-mono text-sm text-red-500">{summary.bearishPct.toFixed(0)}%</div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 ml-auto">
                  {verdictOrder.map((v) =>
                    summary.byVerdict[v] > 0 ? (
                      <span key={v} className={cn("text-[10px] font-semibold", verdictColor[v])}>
                        {v}: {summary.byVerdict[v]}
                      </span>
                    ) : null
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-2">
              <FlowTable rows={rows} />
            </CardContent>
          </Card>
        </main>
      </ProFeatureGate>
    </PageLayout>
  );
};

export default IvFlowSignal;
