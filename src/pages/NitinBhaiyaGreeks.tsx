import { useEffect, useMemo, useState } from "react";
import { Calculator, Percent } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { NitinControls } from "@/components/nitinBhaiya/NitinControls";
import { ProbabilityTimelineTable } from "@/components/nitinBhaiya/ProbabilityTimelineTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEO } from "@/components/SEO";
import { useNitinBhaiyaAnalysis } from "@/hooks/useNitinBhaiyaAnalysis";
import { callTargetProbability, probabilitySentiment, putTargetProbability } from "@/utils/optionProbability";

function daysToExpiry(expiry: string) {
  const parsed = Date.parse(expiry);
  if (Number.isNaN(parsed)) return 7;
  const diff = Math.ceil((parsed - Date.now()) / 86400000);
  return Math.max(diff, 1);
}

export default function NitinBhaiyaGreeks() {
  const state = useNitinBhaiyaAnalysis();
  const [putTarget, setPutTarget] = useState("");
  const [callTarget, setCallTarget] = useState("");
  const [putIv, setPutIv] = useState("");
  const [callIv, setCallIv] = useState("");
  const [days, setDays] = useState("");
  const [cmp, setCmp] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const spot = state.current[0]?.spot ?? 0;

  // Auto-pick highest OI strikes below (put side) and above (call side) spot
  const suggested = useMemo(() => {
    if (!state.current.length || !spot) return { put: 0, call: 0 };
    const below = state.current.filter((row) => row.strike < spot);
    const above = state.current.filter((row) => row.strike > spot);
    const put = below.reduce((best, row) => (row.pe.oi > (best?.pe.oi ?? 0) ? row : best), below[0])?.strike ?? 0;
    const call = above.reduce((best, row) => (row.ce.oi > (best?.ce.oi ?? 0) ? row : best), above[0])?.strike ?? 0;
    return { put, call };
  }, [state.current, spot]);

  useEffect(() => { if (suggested.put) setPutTarget((prev) => prev || String(suggested.put)); }, [suggested.put]);
  useEffect(() => { if (suggested.call) setCallTarget((prev) => prev || String(suggested.call)); }, [suggested.call]);
  useEffect(() => { if (state.expiry) setDays((prev) => prev || String(daysToExpiry(state.expiry))); }, [state.expiry]);

  const activePut = Number(putTarget) || suggested.put;
  const activeCall = Number(callTarget) || suggested.call;
  const activeCmp = Number(cmp) || spot;
  const activeDays = Number(days) || daysToExpiry(state.expiry);

  const nearest = (target: number) => state.current.length ? state.current.reduce((best, row) => Math.abs(row.strike - target) < Math.abs(best.strike - target) ? row : best) : null;
  const livePutIv = nearest(activePut)?.pe.iv ?? 0;
  const liveCallIv = nearest(activeCall)?.ce.iv ?? 0;
  const activePutIv = Number(putIv) || livePutIv;
  const activeCallIv = Number(callIv) || liveCallIv;

  const put = putTargetProbability(activeCmp, activePut, activePutIv, activeDays);
  const call = callTargetProbability(activeCmp, activeCall, activeCallIv, activeDays);
  const sentiment = probabilitySentiment(put?.winning ?? null, call?.winning ?? null);
  const pct = (value?: number | null) => value === null || value === undefined ? "Unavailable" : `${value.toFixed(2)}%`;

  return <PageLayout showFooter={false}>
    <SEO title="Option Probability Calculator | OptionWorld" description="Winning probability for call and put targets using live IV, spot and days to expiry, with a full time-wise table." path="/nitinbhaiya/greeks" />
    <section className="mx-auto max-w-6xl py-3">
      <div className="px-3 pb-3">
        <p className="font-mono text-[10px] uppercase text-primary">Probability desk</p>
        <h1>Option Chain Probability Calculator</h1>
      </div>
      <NitinControls symbols={state.symbols} expiries={state.expiries} symbol={state.symbol} expiry={state.expiry} date={state.date} time={state.time} loading={state.loading} onSymbol={state.setSymbol} onExpiry={state.setExpiry} onDate={state.setDate} onTime={state.setTime} onRefresh={() => { state.refresh(); setRefreshKey((k) => k + 1); }} />

      <div className="grid gap-3 p-3 lg:grid-cols-[340px_1fr]">
        <Card className="rounded-none">
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Calculator className="h-4 w-4" />Parameters</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Current price (CMP)"><Input type="number" value={cmp} placeholder={spot ? spot.toFixed(2) : "0"} onChange={(e) => setCmp(e.target.value)} /></Field>
            <Field label="Call implied volatility %"><Input type="number" value={callIv} placeholder={liveCallIv.toFixed(2)} onChange={(e) => setCallIv(e.target.value)} /></Field>
            <Field label="Put implied volatility %"><Input type="number" value={putIv} placeholder={livePutIv.toFixed(2)} onChange={(e) => setPutIv(e.target.value)} /></Field>
            <Field label="Days to expiration"><Input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} /></Field>
            <Field label="Put side target (below CMP)"><Input type="number" value={putTarget} onChange={(e) => setPutTarget(e.target.value)} /></Field>
            <Field label="Call side target (above CMP)"><Input type="number" value={callTarget} onChange={(e) => setCallTarget(e.target.value)} /></Field>
            <p className="text-[10px] text-muted-foreground">Targets highest-OI strikes se auto select hote hain, aap manually badal sakte hain.</p>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="rounded-none border-l-4 border-destructive">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Strike Price &lt; CMP ({activePut || "—"})</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-px bg-border">
                <Cell label="Winning probability" value={pct(put?.winning)} strong />
                <Cell label="Close above target" value={pct(put?.opposite)} />
                <Cell label="Z-score" value={put ? put.zScore.toFixed(4) : "—"} />
                <Cell label="Expected volatility" value={put ? put.expectedVol.toFixed(5) : "—"} />
              </CardContent>
            </Card>
            <Card className="rounded-none border-l-4 border-success">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Strike Price &gt; CMP ({activeCall || "—"})</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-px bg-border">
                <Cell label="Winning probability" value={pct(call?.winning)} strong />
                <Cell label="Close below target" value={pct(call?.opposite)} />
                <Cell label="Z-score" value={call ? call.zScore.toFixed(4) : "—"} />
                <Cell label="Expected volatility" value={call ? call.expectedVol.toFixed(5) : "—"} />
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-none">
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Percent className="h-4 w-4" />Verdict</CardTitle></CardHeader>
            <CardContent>
              <p className={`font-mono text-2xl font-bold ${sentiment.includes("BULLISH") ? "text-success" : sentiment.includes("BEARISH") ? "text-destructive" : "text-muted-foreground"}`}>{sentiment}</p>
              <p className="mt-1 text-muted-foreground">Higher winning probability side sentiment decide karta hai. Yeh statistical estimate hai, guaranteed accuracy nahi.</p>
            </CardContent>
          </Card>

          {state.error && <div className="border-l-4 border-destructive bg-muted p-3 text-destructive">{state.error}</div>}
        </div>
      </div>

      <div className="p-3 pt-0">
        <ProbabilityTimelineTable symbol={state.symbol} expiry={state.expiry} date={state.date} time={state.time} days={activeDays} putTarget={activePut} callTarget={activeCall} refreshKey={refreshKey} />
      </div>
    </section>
  </PageLayout>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-[11px]">{label}</Label>{children}</div>;
}

function Cell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="bg-card p-3"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className={`mt-1 font-mono ${strong ? "text-lg font-bold" : "text-sm"}`}>{value}</p></div>;
}
