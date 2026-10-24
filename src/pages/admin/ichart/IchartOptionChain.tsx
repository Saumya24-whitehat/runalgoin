import { useMemo, useState } from "react";
import { IchartShell } from "@/components/ichart/IchartShell";
import { NitinControls } from "@/components/nitinBhaiya/NitinControls";
import { LastRefreshBadge } from "@/components/LastRefreshBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { useIchartChain } from "@/hooks/useIchartChain";
import { findAtm } from "@/services/ichartApi";
import { formatIndianNumber } from "@/lib/formatNumber";

const COLS = ["OI", "Chg OI", "Volume", "IV", "LTP"] as const;
type Col = typeof COLS[number];
const n = (v: number) => formatIndianNumber(Math.round(v));

export default function IchartOptionChain() {
  const s = useIchartChain();
  const [visible, setVisible] = useState<Record<Col, boolean>>({ OI: true, "Chg OI": true, Volume: true, IV: true, LTP: true });
  const [range, setRange] = useState(10);
  const atm = useMemo(() => findAtm(s.rows), [s.rows]);
  const rows = useMemo(() => { const i = s.rows.findIndex((r) => r.strike === atm); return s.rows.slice(Math.max(0, i - range), i + range + 1); }, [s.rows, atm, range]);
  const cols = COLS.filter((c) => visible[c]);
  const val = (side: ChainSide, c: Col) => c === "OI" ? n(side.oi) : c === "Chg OI" ? n(side.coi) : c === "Volume" ? n(side.volume) : c === "IV" ? side.iv.toFixed(2) : side.ltp.toFixed(2);
  const spot = s.rows[0]?.spot;

  return (
    <IchartShell title="Option Chain">
      <NitinControls symbols={s.symbols} expiries={s.expiries} symbol={s.symbol} expiry={s.expiry} date={s.date} time={s.time} loading={s.loading} onSymbol={s.setSymbol} onExpiry={s.setExpiry} onDate={s.setDate} onTime={s.setTime} onRefresh={() => s.refresh()} />
      <div className="flex flex-wrap items-center gap-4 border-b px-3 py-2 text-xs">
        <span>Spot <b className="font-mono">{spot ? spot.toFixed(2) : "—"}</b></span>
        <span>ATM <b className="font-mono text-primary">{atm ? n(atm) : "—"}</b></span>
        <label className="flex items-center gap-1">Strikes ±<input type="number" min={3} max={40} value={range} onChange={(e) => setRange(Number(e.target.value) || 10)} className="w-14 border bg-background px-1 text-base md:text-xs" /></label>
        {COLS.map((c) => <label key={c} className="flex items-center gap-1"><Checkbox checked={visible[c]} onCheckedChange={(v) => setVisible({ ...visible, [c]: Boolean(v) })} />{c}</label>)}
        {s.lastRefresh && <LastRefreshBadge lastRefresh={s.lastRefresh} />}
      </div>
      {s.error && <p className="p-3 text-destructive">{s.error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[10px]">
          <thead>
            <tr><th colSpan={cols.length} className="bg-destructive/10 py-1 text-destructive">CALLS</th><th className="bg-muted" /><th colSpan={cols.length} className="bg-success/10 py-1 text-success">PUTS</th></tr>
            <tr className="bg-muted">{[...cols].reverse().map((c) => <th key={"c" + c} className="px-1 py-1">{c}</th>)}<th className="px-2">Strike</th>{cols.map((c) => <th key={"p" + c} className="px-1 py-1">{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.strike} className={`border-t ${r.strike === atm ? "bg-[hsl(var(--oc-atm-bg))] font-semibold" : ""}`}>
                {[...cols].reverse().map((c) => <td key={c} className={`px-1 py-1 text-right font-mono ${r.strike < atm ? "bg-[hsl(var(--oc-itm-bg,var(--muted)))]" : ""}`}>{val(r.ce, c)}</td>)}
                <td className="bg-muted/70 px-2 text-center font-mono font-bold">{n(r.strike)}</td>
                {cols.map((c) => <td key={c} className={`px-1 py-1 text-right font-mono ${r.strike > atm ? "bg-[hsl(var(--oc-itm-bg,var(--muted)))]" : ""}`}>{val(r.pe, c)}</td>)}
              </tr>
            ))}
            {!rows.length && !s.loading && <tr><td colSpan={cols.length * 2 + 1} className="p-4 text-center text-muted-foreground">No data</td></tr>}
          </tbody>
        </table>
      </div>
    </IchartShell>
  );
}

type ChainSide = { oi: number; coi: number; volume: number; iv: number; ltp: number };
