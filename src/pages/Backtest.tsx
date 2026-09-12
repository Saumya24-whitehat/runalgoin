import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Loader2, Play, RefreshCw, Square } from "lucide-react";
import {
  BacktestStatRow,
  ExpiryType,
  buildTradingDates,
  fetchBacktestStats,
  fetchProcessedDays,
  rollUp,
  runBacktestDay,
} from "@/services/backtestApi";

const SYMBOLS = ["Nifty 50", "Nifty Bank"];
const BUCKETS = ["09:15-10:00", "10:00-11:00", "11:00-12:00", "12:00-13:00", "13:00-14:00", "14:00-15:30"];
const CONCURRENCY = 4;

const num = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined ? "—" : `${value > 0 ? "+" : ""}${Number(value).toFixed(digits)}`;

export default function Backtest() {
  const { toast } = useToast();
  const [symbol, setSymbol] = useState(SYMBOLS[0]);
  const [expiryType, setExpiryType] = useState<ExpiryType>("weekly");
  const [lookback, setLookback] = useState("365");
  const [stats, setStats] = useState<BacktestStatRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });
  const stopRef = useRef(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await fetchBacktestStats(symbol, expiryType));
    } catch (error) {
      toast({ title: "Result load nahi hua", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [symbol, expiryType, toast]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const run = useCallback(async () => {
    stopRef.current = false;
    setRunning(true);
    try {
      const processed = await fetchProcessedDays(symbol, expiryType);
      const skip = new Set(processed.filter((day) => day.status !== "failed").map((day) => day.trade_date));
      const dates = buildTradingDates(Number(lookback)).filter((date) => !skip.has(date));
      setProgress({ done: 0, total: dates.length, current: "" });
      if (!dates.length) {
        toast({ title: "Sab din pehle se process ho chuke hain", description: "Neeche result dekhein." });
        return;
      }

      let cursor = 0;
      let completed = 0;
      const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (cursor < dates.length && !stopRef.current) {
          const date = dates[cursor++];
          setProgress((prev) => ({ ...prev, current: date }));
          try {
            await runBacktestDay(symbol, date, expiryType);
          } catch {
            /* day marked failed server-side; continue */
          }
          completed += 1;
          setProgress((prev) => ({ ...prev, done: completed }));
        }
      });
      await Promise.all(workers);
      await loadStats();
      toast({ title: stopRef.current ? "Backtest roka gaya" : "Backtest poora hua", description: `${completed} din process hue.` });
    } catch (error) {
      toast({ title: "Backtest fail hua", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  }, [symbol, expiryType, lookback, loadStats, toast]);

  const overall = useMemo(() => rollUp(stats), [stats]);
  const totalTrades = useMemo(() => stats.reduce((sum, row) => sum + Number(row.trades), 0), [stats]);
  const longSetups = useMemo(
    () => overall.filter((row) => row.dir === "bullish" && row.trades >= 100 && row.winRate >= 52).slice(0, 6),
    [overall],
  );
  const shortSetups = useMemo(
    () => overall.filter((row) => row.dir === "bearish" && row.trades >= 100 && row.winRate >= 52).slice(0, 6),
    [overall],
  );

  const bucketMap = useMemo(() => {
    const map = new Map<string, BacktestStatRow>();
    stats.forEach((row) => map.set(`${row.engine}|${row.signal}|${row.bucket}`, row));
    return map;
  }, [stats]);
  const bucketKeys = useMemo(() => {
    const seen = new Set<string>();
    stats.forEach((row) => seen.add(`${row.engine}|${row.signal}|${row.dir}`));
    return [...seen].sort();
  }, [stats]);

  return (
    <PageLayout>
      <SEO
        title="Options Signal Backtest — 1 Year Long & Short Study | OptionWorld"
        description="Ek saal ke option chain data par NitinBhaiya, IV Flow aur Strike Flow signals ka backtest — kab long karna chahiye aur kab short, weekly aur monthly expiry dono par."
      />
      <ProFeatureGate featureName="Signal Backtest">
        <div className="space-y-3 p-2">
          <h1 className="text-base font-semibold">Signal Backtest — Long vs Short (1 Year)</h1>

          <Card>
            <CardContent className="flex flex-wrap items-center gap-2 p-2">
              <Select value={symbol} onValueChange={setSymbol} disabled={running}>
                <SelectTrigger className="w-[150px]" aria-label="Symbol"><SelectValue /></SelectTrigger>
                <SelectContent>{SYMBOLS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
              </Select>

              <Tabs value={expiryType} onValueChange={(value) => setExpiryType(value as ExpiryType)}>
                <TabsList>
                  <TabsTrigger value="weekly" disabled={running}>Weekly expiry</TabsTrigger>
                  <TabsTrigger value="monthly" disabled={running}>Monthly expiry</TabsTrigger>
                </TabsList>
              </Tabs>

              <Select value={lookback} onValueChange={setLookback} disabled={running}>
                <SelectTrigger className="w-[130px]" aria-label="Lookback"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Last 1 month</SelectItem>
                  <SelectItem value="90">Last 3 months</SelectItem>
                  <SelectItem value="180">Last 6 months</SelectItem>
                  <SelectItem value="365">Last 1 year</SelectItem>
                </SelectContent>
              </Select>

              {running ? (
                <Button variant="destructive" size="sm" onClick={() => { stopRef.current = true; }}>
                  <Square className="mr-1 h-3 w-3" /> Stop
                </Button>
              ) : (
                <Button size="sm" onClick={run}>
                  <Play className="mr-1 h-3 w-3" /> Run backtest
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={loadStats} disabled={loading || running}>
                <RefreshCw className={cn("mr-1 h-3 w-3", loading && "animate-spin")} /> Result refresh
              </Button>
              <span className="text-muted-foreground">{totalTrades.toLocaleString("en-IN")} signals analysed</span>
            </CardContent>
          </Card>

          {running && (
            <Card>
              <CardContent className="space-y-1 p-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> {progress.current || "Starting"}</span>
                  <span>{progress.done} / {progress.total} days</span>
                </div>
                <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
                <p className="text-muted-foreground">Har din ke 09:15 se 15:30 tak ke 3-minute candles process ho rahe hain. Page khula rehne dein.</p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-2 md:grid-cols-2">
            <SetupCard title="Kab LONG karein" rows={longSetups} tone="long" />
            <SetupCard title="Kab SHORT karein" rows={shortSetups} tone="short" />
          </div>

          <Card>
            <CardHeader className="p-2 pb-0"><CardTitle className="text-xs">Signal-wise performance (30-min forward move)</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-2">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1">Engine</th><th>Signal</th><th>Side</th><th className="text-right">Signals</th>
                    <th className="text-right">Win %</th><th className="text-right">Avg 30m</th><th className="text-right">Avg 60m</th><th>Best window</th>
                  </tr>
                </thead>
                <tbody>
                  {overall.map((row) => (
                    <tr key={`${row.engine}-${row.signal}-${row.dir}`} className="border-b last:border-0">
                      <td className="py-0.5">{row.engine}</td>
                      <td>{row.signal}</td>
                      <td className={row.dir === "bullish" ? "text-emerald-500" : "text-red-500"}>{row.dir === "bullish" ? "Long" : "Short"}</td>
                      <td className="text-right font-mono">{row.trades.toLocaleString("en-IN")}</td>
                      <td className={cn("text-right font-mono font-semibold", row.winRate >= 55 ? "text-emerald-500" : row.winRate < 48 ? "text-red-500" : "")}>{row.winRate.toFixed(1)}%</td>
                      <td className={cn("text-right font-mono", row.avgFwd30 > 0 ? "text-emerald-500" : "text-red-500")}>{num(row.avgFwd30)}</td>
                      <td className={cn("text-right font-mono", row.avgFwd60 > 0 ? "text-emerald-500" : "text-red-500")}>{num(row.avgFwd60)}</td>
                      <td>{row.bestBucket ? `${row.bestBucket} (${row.bestBucketWinRate?.toFixed(1)}%)` : "—"}</td>
                    </tr>
                  ))}
                  {!overall.length && <tr><td colSpan={8} className="py-4 text-center text-muted-foreground">Abhi data nahi hai — "Run backtest" dabaayein.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-2 pb-0"><CardTitle className="text-xs">Time-of-day win rate (%)</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-2">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1">Engine · Signal</th><th>Side</th>
                    {BUCKETS.map((bucket) => <th key={bucket} className="text-right">{bucket}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {bucketKeys.map((key) => {
                    const [engine, signal, dir] = key.split("|");
                    return (
                      <tr key={key} className="border-b last:border-0">
                        <td className="py-0.5">{engine} · {signal}</td>
                        <td className={dir === "bullish" ? "text-emerald-500" : "text-red-500"}>{dir === "bullish" ? "Long" : "Short"}</td>
                        {BUCKETS.map((bucket) => {
                          const cell = bucketMap.get(`${engine}|${signal}|${bucket}`);
                          const rate = cell ? Number(cell.win_rate) : null;
                          return (
                            <td key={bucket} className={cn("text-right font-mono", rate === null ? "text-muted-foreground" : rate >= 55 ? "text-emerald-500" : rate < 48 ? "text-red-500" : "")}>
                              {rate === null ? "—" : `${rate.toFixed(0)}%`}
                              {cell && <span className="text-muted-foreground"> ({Number(cell.trades)})</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {!bucketKeys.length && <tr><td colSpan={BUCKETS.length + 2} className="py-4 text-center text-muted-foreground">Backtest chalane ke baad yahan time-wise result aayega.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <p className="text-muted-foreground">
            Win % ka matlab: signal ke baad agle 30 minute me index expected direction me gaya. Avg 30m / 60m index points me net move hai (long signals ke liye positive achha, short signals ke liye negative achha).
          </p>
        </div>
      </ProFeatureGate>
    </PageLayout>
  );
}

function SetupCard({ title, rows, tone }: { title: string; rows: ReturnType<typeof rollUp>; tone: "long" | "short" }) {
  const Icon = tone === "long" ? ArrowUpRight : ArrowDownRight;
  return (
    <Card>
      <CardHeader className="p-2 pb-0">
        <CardTitle className={cn("flex items-center gap-1 text-xs", tone === "long" ? "text-emerald-500" : "text-red-500")}>
          <Icon className="h-3 w-3" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 p-2">
        {rows.length ? rows.map((row) => (
          <div key={`${row.engine}-${row.signal}`} className="flex items-center justify-between gap-2 border-b pb-1 last:border-0">
            <div>
              <div className="font-medium">{row.engine} · {row.signal}</div>
              <div className="text-muted-foreground">{row.bestBucket ? `Best time ${row.bestBucket}` : "Time window data pending"} · {row.trades.toLocaleString("en-IN")} signals</div>
            </div>
            <div className="text-right font-mono">
              <div className="font-semibold">{row.winRate.toFixed(1)}%</div>
              <div className="text-muted-foreground">{num(row.avgFwd30)} pts / 30m</div>
            </div>
          </div>
        )) : <p className="text-muted-foreground">Is side par abhi koi reliable setup nahi mila (ya backtest baaki hai).</p>}
      </CardContent>
    </Card>
  );
}
