import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { IchartShell } from "@/components/ichart/IchartShell";
import { IchartControls } from "@/components/ichart/IchartControls";
import { useIchartChain } from "@/hooks/useIchartChain";
import { computeMaxPain, findAtm } from "@/services/ichartApi";
import { formatIndianNumber } from "@/lib/formatNumber";

// ichart colours (Calls green / Puts red), intentionally not themed.
const CALL = "#7BC862";
const PUT = "#dc143c";
const n = (v: number) => formatIndianNumber(Math.round(v));

export default function IchartOIStats() {
  const s = useIchartChain();
  const [range, setRange] = useState(10);
  const atm = useMemo(() => findAtm(s.rows), [s.rows]);
  const rows = useMemo(() => { const i = s.rows.findIndex((r) => r.strike === atm); return s.rows.slice(Math.max(0, i - range), i + range + 1); }, [s.rows, atm, range]);
  const maxPain = useMemo(() => computeMaxPain(s.rows), [s.rows]);
  const t = useMemo(() => rows.reduce((a, r) => ({ ceOi: a.ceOi + r.ce.oi, peOi: a.peOi + r.pe.oi, ceCoi: a.ceCoi + r.ce.coi, peCoi: a.peCoi + r.pe.coi }), { ceOi: 0, peOi: 0, ceCoi: 0, peCoi: 0 }), [rows]);
  const data = rows.map((r) => ({ strike: r.strike, "Call OI": r.ce.oi, "Put OI": r.pe.oi, "Call OI Chg": r.ce.coi, "Put OI Chg": r.pe.coi }));
  const cards: [string, string][] = [
    ["Spot Price", s.rows[0]?.spot?.toFixed(2) ?? "-"], ["ATM Strike", atm ? String(atm) : "-"], ["Max Pain", maxPain ? String(maxPain) : "-"],
    ["Total Call OI", n(t.ceOi)], ["Total Put OI", n(t.peOi)], ["PCR (OI)", t.ceOi ? (t.peOi / t.ceOi).toFixed(2) : "-"],
    ["Call OI Chg", n(t.ceCoi)], ["Put OI Chg", n(t.peCoi)], ["PCR (OI Chg)", t.ceCoi ? (t.peCoi / t.ceCoi).toFixed(2) : "-"],
  ];
  const chart = (title: string, a: string, b: string) => (
    <div className="ichart-panel">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e6e6e6" vertical={false} />
          <XAxis dataKey="strike" tick={{ fontSize: 11, fill: "#666" }} />
          <YAxis tick={{ fontSize: 11, fill: "#666" }} tickFormatter={(v) => formatIndianNumber(v)} width={75} />
          <Tooltip formatter={(v: number) => n(v)} contentStyle={{ background: "#fff", border: "1px solid #ccc", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {atm ? <ReferenceLine x={atm} stroke="#F44336" strokeDasharray="4 4" label={{ value: "ATM", fill: "#F44336", fontSize: 11 }} /> : null}
          <Bar dataKey={a} fill={CALL} />
          <Bar dataKey={b} fill={PUT} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
  return (
    <IchartShell title="Option OI Stats">
      <IchartControls s={s} extra={<label>Strikes (±)<input type="number" min={3} max={40} value={range} onChange={(e) => setRange(Number(e.target.value) || 10)} /></label>} />
      {s.error && <p className="ichart-error">{s.error}</p>}
      <div className="ichart-cards">{cards.map(([l, v]) => <div key={l}><p>{l}</p><p>{v}</p></div>)}</div>
      <div style={{ display: "grid", gap: 12, padding: "0 12px 12px", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
        {chart("Open Interest", "Call OI", "Put OI")}
        {chart("Change in Open Interest", "Call OI Chg", "Put OI Chg")}
      </div>
    </IchartShell>
  );
}
