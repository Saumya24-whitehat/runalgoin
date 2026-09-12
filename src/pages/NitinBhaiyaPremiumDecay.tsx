import { useMemo } from "react";
import { PageLayout } from "@/components/PageLayout";
import { SEO } from "@/components/SEO";
import { LastRefreshBadge } from "@/components/LastRefreshBadge";
import { useNitinBhaiyaAnalysis } from "@/hooks/useNitinBhaiyaAnalysis";
import { NitinControls } from "@/components/nitinBhaiya/NitinControls";
import { PremiumDecayTimeline } from "@/components/nitinBhaiya/PremiumDecayTimeline";
import { formatIndianNumber } from "@/lib/formatNumber";
import { TrendingDown, Info } from "lucide-react";
import { chainAtm, computeDecayPairs, summarizeDecay } from "@/utils/premiumDecayEngine";

/** Cell background by decay strength. Positive decay = green (writer friendly), negative = red. */
function cellClass(v: number | null, maxAbs: number): string {
  if (v === null || !Number.isFinite(v)) return "";
  const intensity = maxAbs > 0 ? Math.min(1, Math.abs(v) / maxAbs) : 0;
  if (v >= 0) return intensity > 0.66 ? "bg-emerald-500/60" : intensity > 0.33 ? "bg-emerald-500/35" : "bg-emerald-500/15";
  return intensity > 0.66 ? "bg-red-500/60" : intensity > 0.33 ? "bg-red-500/35" : "bg-red-500/15";
}

const fmtPct = (v: number | null) => (v === null ? "—" : `${v.toFixed(2)}%`);

export default function NitinBhaiyaPremiumDecay() {
  const a = useNitinBhaiyaAnalysis();

  const pairs = useMemo(() => computeDecayPairs(a.current, a.baseline, 5), [a.current, a.baseline]);
  const { atm, spot } = useMemo(() => chainAtm(a.current.length ? a.current : a.baseline), [a.current, a.baseline]);
  const summary = useMemo(() => summarizeDecay(pairs, spot, atm), [pairs, spot, atm]);

  const maxAbs = useMemo(() => {
    let m = 0;
    pairs.forEach((p) => {
      if (p.ceDecay !== null) m = Math.max(m, Math.abs(p.ceDecay));
      if (p.peDecay !== null) m = Math.max(m, Math.abs(p.peDecay));
    });
    return m || 1;
  }, [pairs]);

  const verdict = useMemo(() => {
    if (summary.avgCeDecay === null || summary.avgPeDecay === null) return null;
    const diff = summary.avgCeDecay - summary.avgPeDecay;
    if (Math.abs(diff) < 1) return { text: "Dono sides almost equal decay — ⚪ Neutral. Agar dono rapidly decay kar rahe hain to range/theta environment possible hai.", tone: "text-amber-400" };
    if (diff < 0) return { text: `CE premium better hold kar raha hai (CE decay ${summary.avgCeDecay.toFixed(2)}% vs PE ${summary.avgPeDecay.toFixed(2)}%) → 🟢 Bullish decay bias.`, tone: "text-emerald-400" };
    return { text: `PE premium better hold kar raha hai (PE decay ${summary.avgPeDecay.toFixed(2)}% vs CE ${summary.avgCeDecay.toFixed(2)}%) → 🔴 Bearish decay bias.`, tone: "text-red-400" };
  }, [summary]);

  return (
    <PageLayout>
      <SEO
        title="Premium Decay Analysis | NitinBhaiya"
        description="Equidistant CE vs PE normalized premium decay comparison — which side premium holds value better, bullish/bearish decay bias with timeline."
        path="/nitinbhaiya/premium-decay"
      />
      <div className="border-b bg-card px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-sm font-semibold"><TrendingDown className="h-4 w-4 text-primary" /> Premium Decay Analysis</h1>
            <p className="text-[11px] text-muted-foreground">Method A: ATM ±5 equidistant pairs · spot-normalized adjusted premium · baseline 09:45</p>
          </div>
          <LastRefreshBadge lastRefresh={a.lastRefresh} />
        </div>
      </div>

      <NitinControls
        symbols={a.symbols} expiries={a.expiries} symbol={a.symbol} expiry={a.expiry} date={a.date} time={a.time}
        loading={a.loading} onSymbol={a.setSymbol} onExpiry={a.setExpiry} onDate={a.setDate} onTime={a.setTime} onRefresh={() => a.refresh()}
      />

      {a.error && <div className="m-3 rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{a.error}</div>}

      <div className="grid gap-2 p-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Spot", value: spot ? formatIndianNumber(spot, 2) : "-" },
          { label: "ATM (09:45 base)", value: atm ? formatIndianNumber(atm) : "-" },
          { label: "Avg CE Decay", value: fmtPct(summary.avgCeDecay), cls: summary.avgCeDecay !== null && summary.avgPeDecay !== null && summary.avgCeDecay < summary.avgPeDecay ? "text-emerald-400" : "" },
          { label: "Avg PE Decay", value: fmtPct(summary.avgPeDecay), cls: summary.avgCeDecay !== null && summary.avgPeDecay !== null && summary.avgPeDecay < summary.avgCeDecay ? "text-emerald-400" : "" },
          { label: "Better Holding", value: summary.betterSide },
          { label: "Decay Sentiment", value: summary.sentiment, cls: summary.sentiment === "BULLISH" ? "text-emerald-400" : summary.sentiment === "BEARISH" ? "text-red-400" : "text-amber-400" },
        ].map((m) => (
          <div key={m.label} className="rounded border bg-card p-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</p>
            <p className={`text-lg font-semibold tabular-nums ${m.cls ?? ""}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {verdict && (
        <div className="mx-3 mb-2 flex items-start gap-2 rounded border bg-muted/40 p-2 text-xs">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <p className={verdict.tone}>{verdict.text}</p>
        </div>
      )}

      <div className="overflow-x-auto px-3 pb-2">
        <table className="w-full border-collapse text-[11px] tabular-nums">
          <thead>
            <tr className="border-y bg-muted/50 text-muted-foreground">
              <th className="px-2 py-1.5 text-right">CE Strike</th>
              <th className="px-2 py-1.5 text-right">CE Adj% (Base)</th>
              <th className="px-2 py-1.5 text-right">CE Adj% (Now)</th>
              <th className="px-2 py-1.5 text-right">CE Decay %</th>
              <th className="px-2 py-1.5 text-right">CE Retention</th>
              <th className="px-2 py-1.5 text-center font-semibold text-foreground">± Dist</th>
              <th className="px-2 py-1.5 text-left">PE Retention</th>
              <th className="px-2 py-1.5 text-left">PE Decay %</th>
              <th className="px-2 py-1.5 text-left">PE Adj% (Now)</th>
              <th className="px-2 py-1.5 text-left">PE Adj% (Base)</th>
              <th className="px-2 py-1.5 text-left">PE Strike</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((p) => (
              <tr key={p.distance} className="border-b">
                <td className="px-2 py-1 text-right text-muted-foreground">{formatIndianNumber(p.ceStrike)}</td>
                <td className="px-2 py-1 text-right text-muted-foreground">{fmtPct(p.ceBaseNorm)}</td>
                <td className="px-2 py-1 text-right">{fmtPct(p.ceNowNorm)}</td>
                <td className={`px-2 py-1 text-right font-medium ${cellClass(p.ceDecay, maxAbs)}`}>{fmtPct(p.ceDecay)}</td>
                <td className="px-2 py-1 text-right">{fmtPct(p.ceRetention)}</td>
                <td className={`px-2 py-1 text-center font-semibold ${p.betterSide === "CE" ? "text-emerald-400" : p.betterSide === "PE" ? "text-red-400" : ""}`}>
                  ±{p.distance}{p.betterSide !== "—" ? ` · ${p.betterSide}` : ""}
                </td>
                <td className="px-2 py-1 text-left">{fmtPct(p.peRetention)}</td>
                <td className={`px-2 py-1 text-left font-medium ${cellClass(p.peDecay, maxAbs)}`}>{fmtPct(p.peDecay)}</td>
                <td className="px-2 py-1 text-left">{fmtPct(p.peNowNorm)}</td>
                <td className="px-2 py-1 text-left text-muted-foreground">{fmtPct(p.peBaseNorm)}</td>
                <td className="px-2 py-1 text-left text-muted-foreground">{formatIndianNumber(p.peStrike)}</td>
              </tr>
            ))}
            {!pairs.length && (
              <tr><td colSpan={11} className="px-2 py-6 text-center text-muted-foreground">{a.loading ? "Loading premium decay data…" : "No data — symbol/expiry select karein ya refresh karein."}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mx-3 mb-2 grid gap-2 text-[10px] text-muted-foreground sm:grid-cols-3">
        <div className="flex items-center gap-2"><span className="inline-block h-3 w-6 rounded bg-emerald-500/50" /> Positive decay % = premium eroded vs 09:45</div>
        <div className="flex items-center gap-2"><span className="inline-block h-3 w-6 rounded bg-red-500/50" /> Negative decay % = premium badha</div>
        <div className="flex items-center gap-2"><span className="inline-block h-3 w-6 rounded bg-amber-400/40" /> CE Decay &lt; PE Decay → Bullish · opposite → Bearish</div>
      </div>

      <PremiumDecayTimeline symbol={a.symbol} expiry={a.expiry} date={a.date} time={a.time} baseline={a.baseline} refreshKey={a.lastRefresh?.getTime() ?? 0} />
    </PageLayout>
  );
}
