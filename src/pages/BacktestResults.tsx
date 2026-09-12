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
  BucketRow,
  CombinedRow,
  CoverageRow,
  engineScores,
  fetchAllBucketRows,
  fetchAllResults,
  fetchCoverage,
} from "@/services/backtestApi";

const SYMBOLS = ["Nifty 50", "Nifty Bank"];
const MIN_TRADES = 100;

const pct = (value: number) => `${Number(value).toFixed(1)}%`;
const move = (value: number | null) =>
  value === null || value === undefined ? "—" : `${Number(value) > 0 ? "+" : ""}${Number(value).toFixed(1)}`;

function SetupTable({ rows, tone }: { rows: BucketRow[]; tone: "long" | "short" }) {
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
            <th className="p-1">Time window</th>
            <th className="p-1 text-right">Signals</th>
            <th className="p-1 text-right">Win %</th>
            <th className="p-1 text-right">Avg 30m</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.symbol}-${row.expiryType}-${row.engine}-${row.signal}-${row.bucket}`}
              className="border-t border-border/60"
            >
              <td className="p-1 font-medium">{row.signal}</td>
              <td className="p-1">{row.engine}</td>
              <td className="p-1">{row.symbol} · {row.expiryType}</td>
              <td className="p-1">{row.bucket}</td>
              <td className="p-1 text-right">{row.trades}</td>
              <td className={cn("p-1 text-right font-semibold", tone === "long" ? "text-emerald-600" : "text-rose-600")}>
                {pct(row.win_rate)}
              </td>
              <td className="p-1 text-right">{move(row.avg_fwd30)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BacktestResults() {
  const [buckets, setBuckets] = useState<BucketRow[]>([]);
  const [overall, setOverall] = useState<CombinedRow[]>([]);
  const [coverage, setCoverage] = useState<CoverageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [bucketRows, overallRows, cover] = await Promise.all([
        fetchAllBucketRows(SYMBOLS),
        fetchAllResults(SYMBOLS),
        fetchCoverage(),
      ]);
      setBuckets(bucketRows);
      setOverall(overallRows);
      setCoverage(cover);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const eligible = useMemo(() => buckets.filter((row) => Number(row.trades) >= MIN_TRADES), [buckets]);
  const longRows = useMemo(
    () => eligible.filter((row) => row.dir === "bullish").sort((a, b) => Number(b.win_rate) - Number(a.win_rate)).slice(0, 10),
    [eligible],
  );
  const shortRows = useMemo(
    () => eligible.filter((row) => row.dir === "bearish").sort((a, b) => Number(b.win_rate) - Number(a.win_rate)).slice(0, 10),
    [eligible],
  );
  const engines = useMemo(() => engineScores(overall), [overall]);
  const totals = useMemo(
    () => ({
      days: coverage.reduce((sum, row) => sum + row.days, 0),
      candles: coverage.reduce((sum, row) => sum + row.candles, 0),
      signals: overall.reduce((sum, row) => sum + row.trades, 0),
    }),
    [coverage, overall],
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
              <p className="text-[10px] text-muted-foreground">Days tested</p>
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

          <Card className="border-amber-500/50">
            <CardContent className="p-2 text-[11px] leading-relaxed">
              <b>Sabse pehle sach:</b> agar aap har signal par blindly trade karein to teeno logic ka win rate sirf 45-49% hai — matlab
              akela signal koi edge nahi deta. Edge sirf tab milta hai jab signal <b>strong</b> ho aur <b>sahi time window</b> me aaye.
              Neeche wahi combinations hain jo ek saal me sach me chale.
            </CardContent>
          </Card>

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
                    Best long setup: <b>{bestLong.engine} — {bestLong.signal}</b> ({bestLong.symbol}, {bestLong.expiryType} expiry),
                    time <b>{bestLong.bucket}</b> · win rate <b>{pct(bestLong.win_rate)}</b> · average 30-minute move <b>{move(bestLong.avg_fwd30)}</b> point
                    ({bestLong.trades} signals).
                  </p>
                ) : (
                  <p className="mb-2 text-muted-foreground">Data load ho raha hai…</p>
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
                    Best short setup: <b>{bestShort.engine} — {bestShort.signal}</b> ({bestShort.symbol}, {bestShort.expiryType} expiry),
                    time <b>{bestShort.bucket}</b> · win rate <b>{pct(bestShort.win_rate)}</b> · average 30-minute move <b>{move(bestShort.avg_fwd30)}</b> point
                    ({bestShort.trades} signals).
                  </p>
                ) : (
                  <p className="mb-2 text-muted-foreground">Data load ho raha hai…</p>
                )}
                <SetupTable rows={shortRows} tone="short" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-2 pb-1"><CardTitle className="text-xs">Poore din ka average (har signal par trade karne se kya hota)</CardTitle></CardHeader>
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
                        <td className="p-1 text-right">{row.trades.toLocaleString("en-IN")}</td>
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
              <p>1. <b>Mid-day zone (12:00 se 14:00)</b> sabse bharosemand nikla — is window me strong signals ka win rate 55-59% tak jata hai. Subah 09:15-10:00 ka signal sabse kamzor hai (noise zyada).</p>
              <p>2. <b>Short side ka edge zyada saaf hai.</b> "Very Strong Bearish" (IV Flow) aur "STRONG BEARISH" (NitinBhaiya) mid-day me sabse achhe rahe, khaas kar Nifty Bank me jahan average move 9-16 point tak mila.</p>
              <p>3. <b>Long ke liye</b> NitinBhaiya ka "STRONG BULLISH" aur IV Flow ka "Very Strong Bullish" 12:00-13:00 window me hi lein — baaki time inka result 50% ke neeche hai.</p>
              <p>4. <b>Sirf strong signals lein.</b> Normal "Bullish/Bearish" aur Strike Flow ke akele signals 45-48% hi hain — unhe confirmation ke liye use karein, entry ke liye nahi.</p>
              <p>5. <b>Ek hi taraf do logic</b> bolein tab position size badhayein; alag-alag bolein to skip karein.</p>
              <p>6. <b>Target 30 minute</b> ka rakhein — 30-minute move sabse consistent hai; 60 minute tak rukne par edge patla ho jata hai.</p>
              <p className="text-muted-foreground">Yeh backtest study hai, trading advice nahi. Stop-loss zaroori hai; past result future guarantee nahi.</p>
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
