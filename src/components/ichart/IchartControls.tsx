import { useIchartChain } from "@/hooks/useIchartChain";

const TIMES: string[] = [];
for (let m = 9 * 60 + 15; m <= 15 * 60 + 30; m += 3) TIMES.push(`${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}`);

type S = ReturnType<typeof useIchartChain>;

export function IchartControls({ s, extra }: { s: S; extra?: React.ReactNode }) {
  return (
    <div className="ichart-controls">
      <label>Symbol<select value={s.symbol} onChange={(e) => s.setSymbol(e.target.value)}>{s.symbols.map((x) => <option key={x}>{x}</option>)}</select></label>
      <label>Expiry<select value={s.expiry} onChange={(e) => s.setExpiry(e.target.value)}>{s.expiries.map((x) => <option key={x}>{x}</option>)}</select></label>
      <label>Date<input type="date" value={s.date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => s.setDate(e.target.value)} /></label>
      <label>Time<select value={s.time} onChange={(e) => s.setTime(e.target.value)}><option value="">Live</option>{TIMES.map((t) => <option key={t} value={t}>{t.slice(0, 2)}:{t.slice(2)}</option>)}</select></label>
      {extra}
      <button className="ichart-btn" onClick={() => s.refresh()} disabled={s.loading}>{s.loading ? "Loading…" : "Get Data"}</button>
      {(s.date || s.time) && <button className="ichart-btn outline" onClick={() => { s.setDate(""); s.setTime(""); }}>Live</button>}
    </div>
  );
}
