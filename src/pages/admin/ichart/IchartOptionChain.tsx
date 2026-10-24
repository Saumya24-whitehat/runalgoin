import { useMemo, useState } from "react";
import { IchartShell } from "@/components/ichart/IchartShell";
import { IchartControls } from "@/components/ichart/IchartControls";
import { useIchartChain } from "@/hooks/useIchartChain";
import { findAtm } from "@/services/ichartApi";
import { formatIndianNumber } from "@/lib/formatNumber";
import { ChainStrike } from "@/utils/nitinBhaiyaEngine";

type Side = ChainStrike["ce"];
const n = (v: number) => formatIndianNumber(Math.round(v));
const sign = (v: number) => (v > 0 ? "pos" : v < 0 ? "neg" : "");

// Column order follows ichart's Calls side (outer → strike). Puts side is mirrored.
type ColDef = { key: string; label: string; get: (s: Side, strike: number, spot: number, isCall: boolean) => { text: string; cls?: string } };
const intrinsic = (strike: number, spot: number, isCall: boolean) => Math.max(0, isCall ? spot - strike : strike - spot);

const COLS: ColDef[] = [
  { key: "vega", label: "Vega", get: (s) => ({ text: s.vega.toFixed(2) }) },
  { key: "theta", label: "Theta", get: (s) => ({ text: s.theta.toFixed(2) }) },
  { key: "gamma", label: "Gamma", get: (s) => ({ text: s.gamma.toFixed(4) }) },
  { key: "delta", label: "Delta", get: (s) => ({ text: s.delta.toFixed(2) }) },
  { key: "iv", label: "IV", get: (s) => ({ text: s.iv.toFixed(2) }) },
  { key: "oichgp", label: "OI Chg%", get: (s) => { const p = s.prevOi ? (s.coi / s.prevOi) * 100 : 0; return { text: s.prevOi ? p.toFixed(2) : "-", cls: sign(p) }; } },
  { key: "oichg", label: "OI Chg", get: (s) => ({ text: n(s.coi), cls: sign(s.coi) }) },
  { key: "oi", label: "OI", get: (s) => ({ text: n(s.oi) }) },
  { key: "volume", label: "Volume", get: (s) => ({ text: n(s.volume) }) },
  { key: "int", label: "Int Val", get: (_s, k, sp, c) => ({ text: intrinsic(k, sp, c).toFixed(2) }) },
  { key: "ext", label: "Ext Val", get: (s, k, sp, c) => ({ text: Math.max(0, s.ltp - intrinsic(k, sp, c)).toFixed(2) }) },
  { key: "ltp", label: "LTP", get: (s) => ({ text: s.ltp.toFixed(2) }) },
];
const DEFAULT = new Set(["iv", "oichg", "oi", "volume", "ltp"]);

export default function IchartOptionChain() {
  const s = useIchartChain();
  const [on, setOn] = useState<Set<string>>(DEFAULT);
  const [range, setRange] = useState(10);
  const atm = useMemo(() => findAtm(s.rows), [s.rows]);
  const spot = s.rows[0]?.spot ?? 0;
  const rows = useMemo(() => { const i = s.rows.findIndex((r) => r.strike === atm); return s.rows.slice(Math.max(0, i - range), i + range + 1); }, [s.rows, atm, range]);
  const cols = COLS.filter((c) => on.has(c.key));
  const putCols = [...cols].reverse();
  const toggle = (k: string) => { const x = new Set(on); x.has(k) ? x.delete(k) : x.add(k); setOn(x); };

  return (
    <IchartShell title="Option Chain">
      <IchartControls s={s} extra={<label>Strikes (±)<input type="number" min={3} max={40} value={range} onChange={(e) => setRange(Number(e.target.value) || 10)} /></label>} />
      <div className="ichart-info">
        <span>Spot Price: <b>{spot ? spot.toFixed(2) : "-"}</b></span>
        <span>ATM Strike: <b>{atm || "-"}</b></span>
        {s.lastRefresh && <span>Last updated: <b>{s.lastRefresh.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}</b></span>}
      </div>
      <div className="ichart-columns">{COLS.map((c) => <label key={c.key}><input type="checkbox" checked={on.has(c.key)} onChange={() => toggle(c.key)} />{c.label}</label>)}</div>
      {s.error && <p className="ichart-error">{s.error}</p>}
      <div style={{ overflowX: "auto" }}>
        <table className="optionchain">
          <thead>
            <tr><th className="calls" colSpan={cols.length}>Calls</th><th className="khaki-background" colSpan={3} /><th className="puts" colSpan={cols.length}>Puts</th></tr>
            <tr>{cols.map((c) => <th key={"c" + c.key}>{c.label}</th>)}<th className="khaki-background">Strike Price</th><th className="khaki-background">PE-CE OI</th><th className="khaki-background">PE-CE OI Chg</th>{putCols.map((c) => <th key={"p" + c.key}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const diff = r.pe.oi - r.ce.oi, diffChg = r.pe.coi - r.ce.coi;
              return (
                <tr key={r.strike} className={r.strike === atm ? "atm" : ""}>
                  {cols.map((c) => { const v = c.get(r.ce, r.strike, spot, true); return <td key={c.key} className={`${v.cls ?? ""} ${r.strike < spot ? "itmhighlight" : ""}`}>{v.text}</td>; })}
                  <td className="strikecolumnhighlight">{r.strike}</td>
                  <td className={`strikecolumnhighlight ${sign(diff)}`}>{n(diff)}</td>
                  <td className={`strikecolumnhighlight ${sign(diffChg)}`}>{n(diffChg)}</td>
                  {putCols.map((c) => { const v = c.get(r.pe, r.strike, spot, false); return <td key={c.key} className={`${v.cls ?? ""} ${r.strike > spot ? "itmhighlight" : ""}`}>{v.text}</td>; })}
                </tr>
              );
            })}
            {!rows.length && !s.loading && <tr><td colSpan={cols.length * 2 + 3}>No data available</td></tr>}
          </tbody>
        </table>
      </div>
    </IchartShell>
  );
}
