import { useEffect, useMemo, useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Loader2, RefreshCw } from "lucide-react";
import {
  CombinedRow,
  CoverageRow,
  engineScores,
  fetchAllResults,
  fetchCoverage,
} from "@/services/backtestApi";

const SYMBOLS = ["Nifty 50", "Nifty Bank"];
const MIN_TRADES = 80;

const pct = (value: number) => `${value.toFixed(1)}%`;
const move = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

function SetupTable({ rows, tone }: { rows: CombinedRow[]; tone: "long" | "short" }) {
  if (!rows.length) {
    return <p className="p-2 text-[11px] text-muted-foreground">Is direction me koi bharosemand setup nahi mila.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead className="bg-muted/50">
          <tr className="text-left">
            <th className="p-1">Signal</th>
            <th className="p-1">Logic</th>
            <th className="p-1">Index / Expiry</th>
            <th className="p-1 text-right">Signals</th>
            <th className="p-1 text-right">Win %</th>
            <th className="p-1 text-right">Avg 30m</th>
            <th className="p-1">Best time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.symbol}-${row.expiryType}-${row.engine}-${row.signal}`} className="border-t border-border/60">
              <td className="p-1 font-medium">{row.signal}</td>
              <td className="p-1">{row.engine}</td>
              <td className="p-1">{row.symbol} · {row.expiryType}</td>
              <td className="p-1 text-right">{row.trades}</td>
              <td className={cn("p-1 text-right font-semibold", tone === "long" ? "text-emerald-600" : "text-rose-600")}>
                {pct(row.winRate)}
              </td>
              <td className="p-1 text-right">{move(row.avgFwd30)}</td>
              <td className="p-1">{row.bestBucket ?? "—"}{row.bestBucketWinRate ? ` (${pct(row.bestBucketWinRate)})` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BacktestResults() {
  const [rows, setRows] = useState<CombinedRow[]>([]);
  const [coverage, setCoverage] = useState<CoverageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [results, cover] = await Promise.all([fetchAllResults(SYMBOLS), fetchCoverage()]);
      setRows(results);
      setCoverage(cover);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const eligible = useMemo(() => rows.filter((row) => row.trades >= MIN_TRADES), [rows]);
  const longRows = useMemo(
    () => eligible.filter((row) => row.dir === "bullish").sort((a, b) => b.winRate - a.winRate).slice(0, 8),
    [eligible],
  );
  const shortRows = useMemo(
    () => eligible.filter((row) => row.dir === "bearish").sort((a, b) => b.winRate - a.winRate).slice(0, 8),
    [eligible],
  );
  const engines = useMemo(() => engineScores(eligible), [eligible]);
  const totals = useMemo(
    () => ({
      days: coverage.reduce((sum, row) => sum + row.days, 0),
      candles: coverage.reduce((sum, row) => sum + row.candles, 0),
      signals: rows.reduce((sum, row) => sum + row.trades, 0),
    }),
    [coverage, rows],
  );
  const bestLong = longRows[0];
  const bestShort = shortRows[0];

  return (
    <PageLayout>
      <SEO
        path="/backtest-results"
        title="Backtest Result — Kab Long, Kab Short | OptionWorld"
        description="Ek saal ke option chain data par teeno signal logic ka backtest result: kaunsa signal long ke liye sahi hai, kaunsa short ke liye, aur kis time window me sabse behtar chalta hai."
      />

      <ProFeatureGate featureName="Backtest Result">
        <div className="space-y-3 p-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-base font-semibold">Backtest Result — Kab Long Karein, Kab Short</h1>
              <p className="text-[11px] text-muted-foreground">
                Nifty 50 + Nifty Bank · weekly aur monthly expiry · 3-minute candles · 09:15 se 15:30 · signal ke baad 15/30/60 minute ka index move check kiya gaya.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
              Refresh
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Card><CardContent className="p-2">
              <p className="text-[10px] text-muted-foreground">Trading days tested</p>
              <p className="text-lg font-semibold">{totals.days}</p>
            </CardContent></Card>
            <Card><CardContent className="p-2">
              <p className="text-[10px] text-muted-foreground">Candles analysed</p>
              <p className="text-lg font-semibold">{totals.candles.toLocaleString("en-IN")}</p>
            </CardContent></Card>
            <Card><CardContent className="p-2">
              <p className="text-[10px] text-muted-foreground">Signals evaluated</p>
              <p className="text-lg font-semibold">{totals.signals.toLocaleString("en-IN")}</p>
            </CardContent></Card>
          </div>

          <div className="grid gap-2 lg:grid-cols-2">
            <Card className="border-emerald-500/40">
              <CardHeader className="p-2 pb-1">
                <CardTitle className="flex items-center gap-1 text-xs text-emerald-600">
                  <ArrowUpRight className="h-4 w-4" /> LONG kab karein
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0 text-[11px]">
                {bestLong ? (
                  <p className="mb-2">
                    Sabse bharosemand long setup: <b>{bestLong.engine} — {bestLong.signal}</b> ({bestLong.symbol}, {bestLong.expiryType} expiry).
                    Win rate <b>{pct(bestLong.winRate)}</b>, average 30-minute move <b>{move(bestLong.avgFwd30)}</b> point.
                    Sabse achha time window: <b>{bestLong.bestBucket ?? "—"}</b>.
                  </p>
                ) : (
                  <p className="mb-2 text-muted-foreground">Data load ho raha hai ya abhi kaafi signals nahi hain.</p>
                )}
                <SetupTable rows={longRows} tone="long" />
              </CardContent>
            </Card>

            <Card className="border-rose-500/40">
              <CardHeader className="p-2 pb-1">
                <CardTitle className="flex items-center gap-1 text-xs text-rose-600">
                  <ArrowDownRight className="h-4 w-4" /> SHORT kab karein
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0 text-[11px]">
                {bestShort ? (
                  <p className="mb-2">
                    Sabse bharosemand short setup: <b>{bestShort.engine} — {bestShort.signal}</b> ({bestShort.symbol}, {bestShort.expiryType} expiry).
                    Win rate <b>{pct(bestShort.winRate)}</b>, average 30-minute move <b>{move(bestShort.avgFwd30)}</b> point.
                    Sabse achha time window: <b>{bestShort.bestBucket ?? "—"}</b>.
                  </p>
                ) : (
                  <p className="mb-2 text-muted-foreground">Data load ho raha hai ya abhi kaafi signals nahi hain.</p>
                )}
                <SetupTable rows={shortRows} tone="short" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-2 pb-1"><CardTitle className="text-xs">Kaunsa logic kitna bharosemand</CardTitle></CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-1">Logic</th>
                      <th className="p-1">Direction</th>
                      <th className="p-1 text-right">Signals</th>
                      <th className="p-1 text-right">Win %</th>
                      <th className="p-1 text-right">Avg 30m move</th>
                      <th className="p-1">Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engines.map((row) => (
                      <tr key={`${row.engine}-${row.dir}`} className="border-t border-border/60">
                        <td className="p-1 font-medium">{row.engine}</td>
                        <td className="p-1">{row.dir === "bullish" ? "Long" : "Short"}</td>
                        <td className="p-1 text-right">{row.trades}</td>
                        <td className="p-1 text-right font-semibold">{pct(row.winRate)}</td>
                        <td className="p-1 text-right">{move(row.avgFwd30)}</td>
                        <td className="p-1">
                          <Badge variant={row.winRate >= 55 ? "default" : row.winRate >= 50 ? "secondary" : "outline"}>
                            {row.winRate >= 55 ? "Trade karne layak" : row.winRate >= 50 ? "Confirmation ke saath" : "Akela use na karein"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-2 pb-1"><CardTitle className="text-xs">Mera nichod (kaise trade karein)</CardTitle></CardHeader>
            <CardContent className="space-y-1 p-2 pt-0 text-[11px] leading-relaxed">
              <p>1. Sirf un signals par trade karein jinka win rate 55% se uper hai aur jinke saath kam se kam {MIN_TRADES} signals ka record hai — uper wali table me wahi top par hain.</p>
              <p>2. Ek hi candle par do logic ek hi taraf bolein tabhi position lein; akela signal false ho jata hai (win rate 50% ke aas-paas).</p>
              <p>3. Target chhota rakhein: average move 30 minute me sabse saaf dikhta hai, isliye 30-45 minute me nikal jayein.</p>
              <p>4. Time window ka dhyaan rakhein — har setup ka best window uper diya hai; 12:00-13:00 ke sust market me signal kamzor rehta hai.</p>
              <p>5. Weekly aur monthly expiry ka behaviour alag hai; expiry ke din theta tez hota hai, position chhoti rakhein.</p>
              <p className="text-muted-foreground">Yeh backtest study hai, trading advice nahi. Har trade me stop-loss zaroori hai.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-2 pb-1"><CardTitle className="text-xs">Data coverage</CardTitle></CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-1">Index</th>
                      <th className="p-1">Expiry</th>
                      <th className="p-1 text-right">Days</th>
                      <th className="p-1 text-right">Candles</th>
                      <th className="p-1">From</th>
                      <th className="p-1">To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coverage.map((row) => (
                      <tr key={`${row.symbol}-${row.expiry_type}`} className="border-t border-border/60">
                        <td className="p-1">{row.symbol}</td>
                        <td className="p-1">{row.expiry_type}</td>
                        <td className="p-1 text-right">{row.days}</td>
                        <td className="p-1 text-right">{row.candles.toLocaleString("en-IN")}</td>
                        <td className="p-1">{row.from_date ?? "—"}</td>
                        <td className="p-1">{row.to_date ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </ProFeatureGate>
    </PageLayout>
  );
}
