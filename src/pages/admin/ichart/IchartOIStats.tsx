import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { IchartShell } from "@/components/ichart/IchartShell";
import { NitinControls } from "@/components/nitinBhaiya/NitinControls";
import { LastRefreshBadge } from "@/components/LastRefreshBadge";
import { useIchartChain } from "@/hooks/useIchartChain";
import { computeMaxPain, findAtm } from "@/services/ichartApi";
import { formatIndianNumber } from "@/lib/formatNumber";

const n = (v: number) => formatIndianNumber(Math.round(v));

export default function IchartOIStats() {
  const s = useIchartChain();
  const [range, setRange] = useState(10);
  const atm = useMemo(() => findAtm(s.rows), [s.rows]);
  const rows = useMemo(() => { const i = s.rows.findIndex((r) => r.strike === atm); return s.rows.slice(Math.max(0, i - range), i + range + 1); }, [s.rows, atm, range]);
  const maxPain = useMemo(() => computeMaxPain(s.rows), [s.rows]);
  const t = useMemo(() => rows.reduce((a, r) => ({ ceOi: a.ceOi + r.ce.oi, peOi: a.peOi + r.pe.oi, ceCoi: a.ceCoi + r.ce.coi, peCoi: a.peCoi + r.pe.coi }), { ceOi: 0, peOi: 0, ceCoi: 0, peCoi: 0 }), [rows]);
  const data = rows.map((r) => ({ strike: r.strike, "Call OI": r.ce.oi, "Put OI": r.pe.oi, "Call Chg OI": r.ce.coi, "Put Chg OI": r.pe.coi }));
  const cards: [string, string][] = [
    ["Spot", s.rows[0]?.spot?.toFixed(2) ?? "—"], ["ATM", atm ? n(atm) : "—"], ["Max Pain", maxPain ? n(maxPain) : "—"],
    ["Call OI", n(t.ceOi)], ["Put OI", n(t.peOi)], ["PCR (OI)", t.ceOi ? (t.peOi / t.ceOi).toFixed(2) : "—"],
    ["Call Chg OI", n(t.ceCoi)], ["Put Chg OI", n(t.peCoi)], ["PCR (Chg OI)", t.ceCoi ? (t.peCoi / t.ceCoi).toFixed(2) : "—"],
  ];
  const chart = (title: string, a: string, b: string) => (
    <div className="border bg-card p-2">
      <p className="mb-1 text-xs font-semibold">{title}</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="strike" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatIndianNumber(v)} width={70} />
          <Tooltip formatter={(v: number) => n(v)} contentStyle={{ background: "hsl(var(--card))", fontSize: 11 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {atm ? <ReferenceLine x={atm} stroke="hsl(var(--primary))" strokeDasharray="4 4" /> : null}
          <Bar dataKey={a} fill="hsl(var(--destructive))" />
          <Bar dataKey={b} fill="hsl(var(--success))" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
  return (
    <IchartShell title="Option OI Stats">
      <NitinControls symbols={s.symbols} expiries={s.expiries} symbol={s.symbol} expiry={s.expiry} date={s.date} time={s.time} loading={s.loading} onSymbol={s.setSymbol} onExpiry={s.setExpiry} onDate={s.setDate} onTime={s.setTime} onRefresh={() => s.refresh()} />
      <div className="flex items-center gap-4 border-b px-3 py-2 text-xs">
        <label className="flex items-center gap-1">Strikes ±<input type="number" min={3} max={40} value={range} onChange={(e) => setRange(Number(e.target.value) || 10)} className="w-14 border bg-background px-1 text-base md:text-xs" /></label>
        {s.lastRefresh && <LastRefreshBadge lastRefresh={s.lastRefresh} />}
      </div>
      {s.error && <p className="p-3 text-destructive">{s.error}</p>}
      <div className="grid grid-cols-3 gap-px border-b bg-border md:grid-cols-9">
        {cards.map(([l, v]) => <div key={l} className="bg-card p-2"><p className="text-[10px] uppercase text-muted-foreground">{l}</p><p className="font-mono text-sm font-bold">{v}</p></div>)}
      </div>
      <div className="grid gap-3 p-3 lg:grid-cols-2">
        {chart("Open Interest", "Call OI", "Put OI")}
        {chart("Change in Open Interest", "Call Chg OI", "Put Chg OI")}
      </div>
    </IchartShell>
  );
}
