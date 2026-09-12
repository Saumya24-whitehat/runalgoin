import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Info, TriangleAlert } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { SEO } from "@/components/SEO";
import { LastRefreshBadge } from "@/components/LastRefreshBadge";
import { NitinControls } from "@/components/nitinBhaiya/NitinControls";
import { OiPremiumTimeline } from "@/components/nitinBhaiya/OiPremiumTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNitinBhaiyaAnalysis } from "@/hooks/useNitinBhaiyaAnalysis";
import { formatIndianNumber } from "@/lib/formatNumber";
import { fetchNitinChainAt } from "@/services/nitinBhaiyaApi";
import { analyzeOiPremium, OiPremiumSummary } from "@/utils/oiPremiumEngine";
import { ChainStrike } from "@/utils/nitinBhaiyaEngine";

const n = (value: number) => formatIndianNumber(Math.round(value));
const signed = (value: number, decimals = 0) => `${value > 0 ? "+" : ""}${decimals ? value.toFixed(decimals) : n(value)}`;
const tone = (value: string) => value.includes("BULLISH") ? "text-success" : value.includes("BEARISH") ? "text-destructive" : "text-muted-foreground";

export default function NitinBhaiyaOiPremium() {
  const state = useNitinBhaiyaAnalysis();
  const [opening, setOpening] = useState<ChainStrike[]>([]);
  const [latest, setLatest] = useState<OiPremiumSummary | null>(null);

  useEffect(() => {
    if (!state.symbol || !state.expiry) { setOpening([]); return; }
    let active = true;
    fetchNitinChainAt(state.symbol, state.expiry, "0915", state.date || undefined)
      .then((chain) => { if (active) setOpening(chain); })
      .catch(() => { if (active) setOpening([]); });
    return () => { active = false; };
  }, [state.symbol, state.expiry, state.date]);

  const onLatest = useCallback((row: OiPremiumSummary | null) => setLatest(row), []);
  const fallback = useMemo(() => analyzeOiPremium(state.current, opening), [state.current, opening]);
  const summary = latest ?? fallback;


  return <PageLayout showFooter={false}>
    <SEO title="OI + Premium Analysis | OptionWorld" description="ATM plus-minus two strike OI and premium activity analysis with live and historical three-minute data." path="/nitinbhaiya/oi-premium" />
    <section className="mx-auto w-full max-w-[1500px] py-3">
      <div className="flex items-start justify-between gap-3 px-3 pb-3">
        <div><p className="font-mono text-[10px] uppercase text-primary">NitinBhaiya Intelligence</p><h1>OI + Premium</h1><p className="text-muted-foreground">Din bhar jitni strikes par market ghooma, sabhi ka COI · sirf time value (extrinsic) change · 09:15 opening baseline.</p></div>
        {state.lastRefresh && <LastRefreshBadge lastRefresh={state.lastRefresh} />}
      </div>
      <NitinControls symbols={state.symbols} expiries={state.expiries} symbol={state.symbol} expiry={state.expiry} date={state.date} time={state.time} loading={state.loading} onSymbol={state.setSymbol} onExpiry={state.setExpiry} onDate={state.setDate} onTime={state.setTime} onRefresh={() => state.refresh()} />
      {state.error && <div className="m-3 border border-destructive/40 bg-destructive/10 p-3 text-destructive"><TriangleAlert className="mr-2 inline h-4 w-4" />{state.error}</div>}

      <div className="grid grid-cols-2 gap-px border-y bg-border lg:grid-cols-6">
        {[
          ["Spot", summary.spot ? summary.spot.toFixed(2) : "—", ""],
          ["ATM", summary.atm ? n(summary.atm) : "—", ""],
          ["Used Strikes", summary.strikeRange, ""],
          ["CE Activity", summary.ceActivity, ""],
          ["PE Activity", summary.peActivity, ""],
          ["Market Reading", summary.reading, tone(summary.reading)],
        ].map(([label, value, className]) => <div key={label} className="bg-card p-3"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className={`mt-1 font-mono text-sm font-bold ${className}`}>{value}</p></div>)}
      </div>

      <div className="grid gap-3 p-3 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden rounded-none">
          <CardHeader className="py-3"><CardTitle className="flex items-center gap-2 text-sm"><Activity className="h-4 w-4" />Cumulative Strike Activity (ATM ±2 · session union)</CardTitle></CardHeader>
          <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-[10px]">
            <thead className="bg-muted"><tr>{["CE ACTIVITY", "CE COI", "CE PREMIUM Δ", "STRIKE", "PE PREMIUM Δ", "PE COI", "PE ACTIVITY"].map((heading) => <th key={heading} className="px-1 py-2 text-center font-semibold">{heading}</th>)}</tr></thead>

            <tbody>{summary.rows.map((row) => <tr key={row.strike} className={`border-t ${row.isAtm ? "bg-[hsl(var(--oc-atm-bg))]" : "hover:bg-muted/50"}`}>
              <td className="px-1 py-1.5 text-center font-semibold">{row.ceActivity}</td>
              <td className={row.ceCoi >= 0 ? "px-1 py-1.5 text-right font-mono text-success" : "px-1 py-1.5 text-right font-mono text-destructive"}>{signed(row.ceCoi)}</td>
              <td className="px-1 py-1.5 text-right font-mono">{signed(row.cePremiumChange, 2)}</td>
              <td className="bg-muted/70 px-2 py-1.5 text-center font-mono font-bold">{n(row.strike)}{row.isAtm ? " · ATM" : ""}</td>
              <td className="px-1 py-1.5 text-right font-mono">{signed(row.pePremiumChange, 2)}</td>
              <td className={row.peCoi >= 0 ? "px-1 py-1.5 text-right font-mono text-success" : "px-1 py-1.5 text-right font-mono text-destructive"}>{signed(row.peCoi)}</td>
              <td className="px-1 py-1.5 text-center font-semibold">{row.peActivity}</td>
            </tr>)}
            {!summary.rows.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">{state.loading ? "Loading analysis…" : "No opening/current data available."}</td></tr>}</tbody>
          </table></div></CardContent>
        </Card>

        <div className="space-y-3">
          <Card className="rounded-none"><CardHeader className="py-3"><CardTitle className="text-sm">Net Figures (session strike range)</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-px bg-border p-0">
            {[["CE COI", signed(summary.ceCoi)], ["PE COI", signed(summary.peCoi)], ["CE Time Value Δ", signed(summary.cePremiumChange, 2)], ["PE Time Value Δ", signed(summary.pePremiumChange, 2)]].map(([label, value]) => <div key={label} className="bg-card p-3"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 font-mono font-bold">{value}</p></div>)}

          </CardContent></Card>
          <Card className="rounded-none"><CardContent className="flex gap-2 p-3 text-[11px] text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p>PE Writer activity bullish support hai. Sirf Call Buyers active hone par strong bullish reading nahi di jayegi jab tak PE Writers support na karein.</p></CardContent></Card>
        </div>
      </div>

      <OiPremiumTimeline symbol={state.symbol} expiry={state.expiry} date={state.date} time={state.time} opening={opening} refreshKey={state.lastRefresh?.getTime() ?? 0} onLatest={onLatest} />
    </section>
  </PageLayout>;
}