import { useMemo, useState } from "react";
import { Calculator, Sigma } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { NitinControls } from "@/components/nitinBhaiya/NitinControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEO } from "@/components/SEO";
import { useNitinBhaiyaAnalysis } from "@/hooks/useNitinBhaiyaAnalysis";

function normalCdf(x: number) { const t = 1 / (1 + 0.2316419 * Math.abs(x)); const d = 0.3989423 * Math.exp(-x * x / 2); const p = 1 - d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x >= 0 ? p : 1 - p; }

export default function NitinBhaiyaGreeks() {
  const state = useNitinBhaiyaAnalysis();
  const [strike, setStrike] = useState(0);
  const [type, setType] = useState<"CE" | "PE">("CE");
  const [manualPremium, setManualPremium] = useState("");
  const [manualIv, setManualIv] = useState("");
  const [days, setDays] = useState("7");
  const activeStrike = strike || state.engine.atm;
  const row = state.current.find((item) => item.strike === activeStrike);
  const side = type === "CE" ? row?.ce : row?.pe;
  const premium = Number(manualPremium) || side?.ltp || 0;
  const iv = Number(manualIv) || side?.iv || 0;
  const outputs = useMemo(() => {
    const delta = Math.min(1, Math.abs(side?.delta ?? 0));
    const requiredMove = delta > 0 ? Math.abs(side?.theta ?? 0) / delta : null;
    const bep = type === "CE" ? activeStrike + premium : activeStrike - premium;
    const hedgeLots = delta > 0 ? Math.ceil(1 / delta) : null;
    const spot = row?.spot ?? 0;
    const t = Math.max(Number(days), 1) / 365;
    const sigma = Math.max(iv, 0) / 100;
    const z = spot > 0 && sigma > 0 ? Math.abs(Math.log(activeStrike / spot)) / (sigma * Math.sqrt(t)) : 0;
    const probability = spot > 0 && sigma > 0 ? (1 - normalCdf(z)) * 2 * 100 : null;
    return { delta, requiredMove, bep, hedgeLots, probability };
  }, [side, type, activeStrike, premium, iv, days, row]);
  return <PageLayout showFooter={false}><SEO title="NitinBhaiya Greeks & Risk | OptionWorld" description="Live option Greeks, breakeven, theta-delta and hedge calculations." path="/nitinbhaiya/greeks" /><section className="mx-auto max-w-6xl py-3"><div className="px-3 pb-3"><p className="font-mono text-[10px] uppercase text-primary">Risk desk</p><h1>Greeks & Risk Calculator</h1></div><NitinControls symbols={state.symbols} expiries={state.expiries} symbol={state.symbol} expiry={state.expiry} date={state.date} time={state.time} loading={state.loading} onSymbol={state.setSymbol} onExpiry={state.setExpiry} onDate={state.setDate} onTime={state.setTime} onRefresh={() => state.refresh()} /><div className="grid gap-3 p-3 lg:grid-cols-[340px_1fr]"><Card className="rounded-none"><CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-4 w-4" />Inputs</CardTitle></CardHeader><CardContent className="space-y-4"><Field label="Strike"><Select value={String(activeStrike || "")} onValueChange={(v) => { setStrike(Number(v)); setManualPremium(""); setManualIv(""); }}><SelectTrigger><SelectValue placeholder="Strike" /></SelectTrigger><SelectContent>{state.current.map((item) => <SelectItem key={item.strike} value={String(item.strike)}>{item.strike}</SelectItem>)}</SelectContent></Select></Field><Field label="Option type"><Select value={type} onValueChange={(v: "CE" | "PE") => { setType(v); setManualPremium(""); setManualIv(""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CE">Call (CE)</SelectItem><SelectItem value="PE">Put (PE)</SelectItem></SelectContent></Select></Field><Field label="Premium"><Input type="number" min="0" value={manualPremium} placeholder={side?.ltp.toFixed(2) ?? "0"} onChange={(e) => setManualPremium(e.target.value)} /></Field><Field label="IV %"><Input type="number" min="0" value={manualIv} placeholder={side?.iv.toFixed(2) ?? "0"} onChange={(e) => setManualIv(e.target.value)} /></Field><Field label="Trading days to expiry"><Input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} /></Field></CardContent></Card><div className="space-y-3"><div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-5">{[['Delta', side?.delta], ['Gamma', side?.gamma], ['Theta', side?.theta], ['Vega', side?.vega], ['Rho', undefined]].map(([label, value]) => <div key={String(label)} className="bg-card p-4"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-2 font-mono text-base font-bold">{typeof value === 'number' ? value.toFixed(4) : 'N/A'}</p></div>)}</div><Card className="rounded-none"><CardHeader><CardTitle className="flex items-center gap-2"><Sigma className="h-4 w-4" />Risk outputs</CardTitle></CardHeader><CardContent className="grid gap-px bg-border sm:grid-cols-2"><Output label="Theta / Delta required move" value={outputs.requiredMove === null ? "Unavailable" : `${outputs.requiredMove.toFixed(2)} pts/day`} /><Output label="Breakeven price" value={outputs.bep ? outputs.bep.toFixed(2) : "Unavailable"} /><Output label="Approximate hedge lots" value={outputs.hedgeLots === null ? "Unavailable" : String(outputs.hedgeLots)} note={outputs.delta < 0.8 ? "Delta below 0.8: hedge remains imperfect." : "Delta-based estimate."} /><Output label="IV strike-hit probability" value={outputs.probability === null ? "Unavailable" : `${outputs.probability.toFixed(1)}%`} note="Statistical estimate, not claimed accuracy." /></CardContent></Card><div className="border-l-4 border-primary bg-muted p-4 text-muted-foreground">Live Greeks are used when provided by the chain. Manual premium and IV entries override only this calculator.</div></div></div></section></PageLayout>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
function Output({ label, value, note }: { label: string; value: string; note?: string }) { return <div className="bg-card p-4"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-2 font-mono text-lg font-bold">{value}</p>{note && <p className="mt-1 text-muted-foreground">{note}</p>}</div>; }