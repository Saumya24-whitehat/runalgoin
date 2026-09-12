import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { NitinControls } from "@/components/nitinBhaiya/NitinControls";
import { SignalBadge } from "@/components/nitinBhaiya/SignalBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { SEO } from "@/components/SEO";
import { useNitinBhaiyaAnalysis } from "@/hooks/useNitinBhaiyaAnalysis";
import { classifyActivity } from "@/utils/nitinBhaiyaEngine";
import { formatIndianNumber } from "@/lib/formatNumber";

const technicalChecks = ["Price above/below key support or resistance", "Fibonacci confluence", "Trendline breakout or breakdown", "Futures OI confirmation", "Candlestick reversal pattern"];

export default function NitinBhaiyaAnalyze() {
  const state = useNitinBhaiyaAnalysis();
  const [step, setStep] = useState(0);
  const [checks, setChecks] = useState<string[]>([]);
  const atm = state.current.find((row) => row.strike === state.engine.atm);
  const base = state.baseline.find((row) => row.strike === state.engine.atm);
  const topCe = useMemo(() => [...state.current].sort((a, b) => b.ce.oi - a.ce.oi).slice(0, 5), [state.current]);
  const topPe = useMemo(() => [...state.current].sort((a, b) => b.pe.oi - a.pe.oi).slice(0, 5), [state.current]);
  const steps = [
    { title: "Market Context", body: <div className="grid grid-cols-3 gap-px bg-border"><Metric label="Spot" value={atm?.spot.toFixed(2) ?? "—"} /><Metric label="ATM" value={String(state.engine.atm || "—")} /><Metric label="VIX regime" value="Data pending" /></div> },
    { title: "OI Structure", body: <div className="grid gap-4 sm:grid-cols-2"><Rank title="Top CE OI · Resistance" rows={topCe.map((r) => [r.strike, r.ce.oi])} /><Rank title="Top PE OI · Support" rows={topPe.map((r) => [r.strike, r.pe.oi])} /></div> },
    { title: "Buyer / Writer Classification", body: <div className="grid gap-px bg-border sm:grid-cols-2"><ActivityBlock side="CALL" value={atm ? classifyActivity(atm.ce.coi, base ? atm.ce.ltp - base.ce.ltp : 0) : "Neutral"} /><ActivityBlock side="PUT" value={atm ? classifyActivity(atm.pe.coi, base ? atm.pe.ltp - base.pe.ltp : 0) : "Neutral"} /></div> },
    { title: "IV + Volume Check", body: <div className="space-y-3"><EngineRow label="IV Rate of Change" detail={state.engine.signals.find((s) => s.key === "iv")?.detail ?? "Unavailable"} direction={state.engine.signals.find((s) => s.key === "iv")?.direction ?? "neutral"} /><p className="text-muted-foreground">Volume and IV are checked together. Flat/down IV with rising activity is treated as absorption, not confirmed buying.</p></div> },
    { title: "Premium Decay", body: <div className="grid gap-px bg-border sm:grid-cols-2"><ActivityBlock side="WRITER SIGNAL" value={state.engine.writerSignal.toUpperCase()} badge={state.engine.writerSignal} /><ActivityBlock side="RELATIVE DECAY" value={`CE ${state.engine.ceDecay?.toFixed(2) ?? "—"}% · PE ${state.engine.peDecay?.toFixed(2) ?? "—"}%`} badge={state.engine.decaySignal} /></div> },
    { title: "Exchange of Hands", body: <div className="flex items-start gap-3"><CheckCircle2 className={`mt-0.5 h-5 w-5 ${state.engine.eoh ? "text-primary" : "text-success"}`} /><div><p className="font-semibold">{state.engine.eoh ? "Exchange of Hands detected" : "No Exchange of Hands condition"}</p><p className="text-muted-foreground">High volume with very low net COI is treated as position transfer, not fresh direction.</p></div></div> },
    { title: "Participant + Futures", body: <div className="border border-dashed p-4"><p className="font-semibold">Daily participant confirmation is not present in this option-chain snapshot.</p><p className="mt-1 text-muted-foreground">The engine leaves this input unavailable instead of inventing a directional score.</p></div> },
    { title: "Technical Confirmation", body: <div className="space-y-3">{technicalChecks.map((item) => <label key={item} className="flex min-h-11 items-center gap-3 border p-3"><Checkbox checked={checks.includes(item)} onCheckedChange={(checked) => setChecks((old) => checked ? [...old, item] : old.filter((x) => x !== item))} /><span>{item}</span></label>)}</div> },
    { title: "Greeks + Final Confluence", body: <div className="space-y-4"><div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4"><Metric label="Delta (CE)" value={atm?.ce.delta.toFixed(3) ?? "—"} /><Metric label="Theta (CE)" value={atm?.ce.theta.toFixed(3) ?? "—"} /><Metric label="Score" value={`${state.engine.score.toFixed(1)} / 50`} /><Metric label="Agreement" value={`${state.engine.agreeingEngines}/7 engines`} /></div><div className="border-l-4 border-primary bg-muted p-4"><p className="text-[10px] uppercase text-muted-foreground">Final state</p><p className="mt-1 text-lg font-bold">{state.engine.sentiment}</p><p className="mt-2 text-muted-foreground">Technical confirmations selected: {checks.length}. This is analytical context, not an accuracy claim or order recommendation.</p></div></div> },
  ];
  return <PageLayout showFooter={false}><SEO title="NitinBhaiya 9-Step Analysis | OptionWorld" description="Guided nine-step NSE option chain analysis using independent confluence signals." path="/nitinbhaiya/analyze" /><section className="mx-auto max-w-5xl py-3"><div className="px-3 pb-3"><p className="font-mono text-[10px] uppercase text-primary">Guided workflow</p><h1>9-Step Option Chain Analysis</h1></div><NitinControls symbols={state.symbols} expiries={state.expiries} symbol={state.symbol} expiry={state.expiry} time={state.time} loading={state.loading} onSymbol={state.setSymbol} onExpiry={state.setExpiry} onTime={state.setTime} onRefresh={() => state.refresh()} /><div className="p-3"><div className="mb-3 flex items-center justify-between"><span className="font-mono">STEP {step + 1} / 9</span><span className="text-muted-foreground">{Math.round(((step + 1) / 9) * 100)}%</span></div><Progress value={((step + 1) / 9) * 100} className="h-1 rounded-none" /><Card className="mt-4 min-h-[340px] rounded-none"><CardHeader><CardTitle>{steps[step].title}</CardTitle></CardHeader><CardContent>{steps[step].body}</CardContent></Card><div className="mt-3 flex justify-between"><Button variant="outline" onClick={() => setStep((v) => Math.max(0, v - 1))} disabled={step === 0}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button><Button onClick={() => setStep((v) => Math.min(8, v + 1))} disabled={step === 8}>Next<ArrowRight className="ml-2 h-4 w-4" /></Button></div></div></section></PageLayout>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="bg-card p-3"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 font-mono font-bold">{value}</p></div>; }
function Rank({ title, rows }: { title: string; rows: [number, number][] }) { return <div><h3 className="mb-2">{title}</h3>{rows.map(([strike, oi], i) => <div key={strike} className="flex justify-between border-t py-2 font-mono"><span>{i + 1}. {strike}</span><span>{formatIndianNumber(oi)}</span></div>)}</div>; }
function ActivityBlock({ side, value, badge }: { side: string; value: string; badge?: "bullish" | "bearish" | "neutral" }) { return <div className="bg-card p-4"><p className="text-[10px] uppercase text-muted-foreground">{side}</p><p className="mt-2 font-mono font-bold">{value}</p>{badge && <div className="mt-2"><SignalBadge direction={badge} /></div>}</div>; }
function EngineRow({ label, detail, direction }: { label: string; detail: string; direction: "bullish" | "bearish" | "neutral" }) { return <div className="flex items-center justify-between border p-3"><div><p className="font-semibold">{label}</p><p className="text-muted-foreground">{detail}</p></div><SignalBadge direction={direction} /></div>; }
