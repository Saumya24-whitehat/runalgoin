import { useMemo } from "react";
import { PageLayout } from "@/components/PageLayout";
import { SEO } from "@/components/SEO";
import { LastRefreshBadge } from "@/components/LastRefreshBadge";
import { useNitinBhaiyaAnalysis } from "@/hooks/useNitinBhaiyaAnalysis";
import { NitinControls } from "@/components/nitinBhaiya/NitinControls";
import { formatIndianNumber } from "@/lib/formatNumber";
import { TrendingDown, Info } from "lucide-react";

/** % premium decay = (baseline - now) / baseline * 100. Positive => premium eroded (good for writers). */
function decayPct(now: number, base: number): number | null {
  if (!base) return null;
  return ((base - now) / Math.abs(base)) * 100;
}

/** Cell background by decay strength. Positive decay = green (writer friendly), negative = red. */
function cellClass(v: number | null, maxAbs: number): string {
  if (v === null || !Number.isFinite(v)) return "";
  const intensity = maxAbs > 0 ? Math.min(1, Math.abs(v) / maxAbs) : 0;
  if (v >= 0) return intensity > 0.66 ? "bg-emerald-500/60" : intensity > 0.33 ? "bg-emerald-500/35" : "bg-emerald-500/15";
  return intensity > 0.66 ? "bg-red-500/60" : intensity > 0.33 ? "bg-red-500/35" : "bg-red-500/15";
}

export default function NitinBhaiyaPremiumDecay() {
  const a = useNitinBhaiyaAnalysis();

  const rows = useMemo(() => {
    const baseMap = new Map(a.baseline.map((b) => [b.strike, b]));
    const merged = a.current
      .map((cur) => {
        const base = baseMap.get(cur.strike);
        if (!base) return null;
        return {
          strike: cur.strike,
          ceNow: cur.ce.ltp,
          peNow: cur.pe.ltp,
          ceBase: base.ce.ltp,
          peBase: base.pe.ltp,
          ceDecay: decayPct(cur.ce.ltp, base.ce.ltp),
          peDecay: decayPct(cur.pe.ltp, base.pe.ltp),
        };
      })
      .filter((r): r is NonNullable<typeof r> => Boolean(r && (r.ceBase > 0 || r.peBase > 0)));
    const spot = a.current.find((c) => c.spot)?.spot ?? 0;
    const atm = merged.length && spot ? merged.reduce((p, c) => (Math.abs(c.strike - spot) < Math.abs(p.strike - spot) ? c : p), merged[0]).strike : 0;
    const atmIdx = merged.findIndex((r) => r.strike === atm);
    return { merged: merged.slice(Math.max(0, atmIdx - 10), atmIdx + 11), atm, spot };
  }, [a.current, a.baseline]);

  const maxAbs = useMemo(() => {
    let m = 0;
    rows.merged.forEach((r) => {
      if (r.ceDecay !== null) m = Math.max(m, Math.abs(r.ceDecay));
      if (r.peDecay !== null) m = Math.max(m, Math.abs(r.peDecay));
    });
    return m || 1;
  }, [rows]);

  const summary = useMemo(() => {
    const atmRow = rows.merged.find((r) => r.strike === rows.atm);
    const near = rows.merged.filter((r) => Math.abs(r.strike - rows.atm) <= (rows.merged[1] ? Math.abs(rows.merged[1].strike - rows.merged[0].strike) * 2 : 150));
    const avg = (vals: (number | null)[]) => {
      const v = vals.filter((x): x is number => x !== null);
      return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
    };
    return {
      atmCe: atmRow?.ceDecay ?? null,
      atmPe: atmRow?.peDecay ?? null,
      avgCe: avg(near.map((r) => r.ceDecay)),
      avgPe: avg(near.map((r) => r.peDecay)),
    };
  }, [rows]);

  const verdict = useMemo(() => {
    if (summary.avgCe === null || summary.avgPe === null) return null;
    const diff = summary.avgCe - summary.avgPe;
    if (Math.abs(diff) < 1) return { text: "Dono sides almost equal decay — market range-bound ho sakta hai (dono writers active).", tone: "text-amber-400" };
    if (diff > 0) return { text: `Call premium zyada decay ho raha hai (+${diff.toFixed(2)}% vs Put) — Call writers strong, bearish/resistance pressure.`, tone: "text-red-400" };
    return { text: `Put premium zyada decay ho raha hai (+${(-diff).toFixed(2)}% vs Call) — Put writers strong, bullish/support pressure.`, tone: "text-emerald-400" };
  }, [summary]);

  return (
    <PageLayout>
      <SEO
        title="Premium Decay Analysis | NitinBhaiya"
        description="Strike-wise Call and Put premium decay percentage vs day baseline, Nitin Bhatia style premium decay analysis."
        path="/nitinbhaiya/premium-decay"
      />
      <div className="border-b bg-card px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-sm font-semibold"><TrendingDown className="h-4 w-4 text-primary" /> Premium Decay Analysis</h1>
            <p className="text-[11px] text-muted-foreground">Strike-wise premium decay % vs 09:45 baseline · ATM ±10 strikes</p>
          </div>
          <LastRefreshBadge lastRefresh={a.lastRefresh} />
        </div>
      </div>

      <NitinControls
        symbols={a.symbols} expiries={a.expiries} symbol={a.symbol} expiry={a.expiry} date={a.date} time={a.time}
        loading={a.loading} onSymbol={a.setSymbol} onExpiry={a.setExpiry} onDate={a.setDate} onTime={a.setTime} onRefresh={() => a.refresh()}
      />

      {a.error && <div className="m-3 rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{a.error}</div>}

      <div className="grid gap-2 p-3 sm:grid-cols-4">
        {[
          { label: "Spot", value: rows.spot ? formatIndianNumber(rows.spot, 2) : "-" },
          { label: "ATM Strike", value: rows.atm ? formatIndianNumber(rows.atm) : "-" },
          { label: "ATM Call Decay", value: summary.atmCe === null ? "-" : `${summary.atmCe.toFixed(2)}%`, cls: summary.atmCe !== null && summary.atmCe >= 0 ? "text-emerald-400" : "text-red-400" },
          { label: "ATM Put Decay", value: summary.atmPe === null ? "-" : `${summary.atmPe.toFixed(2)}%`, cls: summary.atmPe !== null && summary.atmPe >= 0 ? "text-emerald-400" : "text-red-400" },
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

      <div className="overflow-x-auto px-3 pb-4">
        <table className="w-full border-collapse text-[11px] tabular-nums">
          <thead>
            <tr className="border-y bg-muted/50 text-muted-foreground">
              <th className="px-2 py-1.5 text-right">Call Base (09:45)</th>
              <th className="px-2 py-1.5 text-right">Call LTP</th>
              <th className="px-2 py-1.5 text-right">Call Decay %</th>
              <th className="px-2 py-1.5 text-center font-semibold text-foreground">Strike</th>
              <th className="px-2 py-1.5 text-left">Put Decay %</th>
              <th className="px-2 py-1.5 text-left">Put LTP</th>
              <th className="px-2 py-1.5 text-left">Put Base (09:45)</th>
            </tr>
          </thead>
          <tbody>
            {rows.merged.map((r) => {
              const isAtm = r.strike === rows.atm;
              return (
                <tr key={r.strike} className={`border-b ${isAtm ? "bg-amber-400/15 font-semibold" : ""}`}>
                  <td className="px-2 py-1 text-right text-muted-foreground">{r.ceBase ? formatIndianNumber(r.ceBase, 2) : "-"}</td>
                  <td className="px-2 py-1 text-right">{r.ceNow ? formatIndianNumber(r.ceNow, 2) : "-"}</td>
                  <td className={`px-2 py-1 text-right font-medium ${cellClass(r.ceDecay, maxAbs)}`}>{r.ceDecay === null ? "-" : `${r.ceDecay.toFixed(2)}%`}</td>
                  <td className={`px-2 py-1 text-center font-semibold ${isAtm ? "text-amber-400" : ""}`}>{formatIndianNumber(r.strike)}</td>
                  <td className={`px-2 py-1 text-left font-medium ${cellClass(r.peDecay, maxAbs)}`}>{r.peDecay === null ? "-" : `${r.peDecay.toFixed(2)}%`}</td>
                  <td className="px-2 py-1 text-left">{r.peNow ? formatIndianNumber(r.peNow, 2) : "-"}</td>
                  <td className="px-2 py-1 text-left text-muted-foreground">{r.peBase ? formatIndianNumber(r.peBase, 2) : "-"}</td>
                </tr>
              );
            })}
            {!rows.merged.length && (
              <tr><td colSpan={7} className="px-2 py-6 text-center text-muted-foreground">{a.loading ? "Loading premium decay data…" : "No data — symbol/expiry select karein ya refresh karein."}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mx-3 mb-4 grid gap-2 text-[10px] text-muted-foreground sm:grid-cols-3">
        <div className="flex items-center gap-2"><span className="inline-block h-3 w-6 rounded bg-emerald-500/50" /> Positive % = premium decay hua (writers ke favour)</div>
        <div className="flex items-center gap-2"><span className="inline-block h-3 w-6 rounded bg-red-500/50" /> Negative % = premium badha (buyers ke favour)</div>
        <div className="flex items-center gap-2"><span className="inline-block h-3 w-6 rounded bg-amber-400/40" /> Yellow row = ATM strike</div>
      </div>
    </PageLayout>
  );
}
