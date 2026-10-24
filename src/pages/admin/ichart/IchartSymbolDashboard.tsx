import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { IchartShell } from "@/components/ichart/IchartShell";
import { useIchartChain } from "@/hooks/useIchartChain";
import { computeMaxPain, findAtm } from "@/services/ichartApi";
import { fetchPCRData, PCRTimeData } from "@/services/pcrApi";
import { fetchFutureBuildup, fetchFutureExpiryDates, BuildupItem } from "@/services/futureBuilupApi";
import { formatIndianNumber } from "@/lib/formatNumber";

/**
 * Rebuild of icharts.in /opt/SymbolDashboard.php (symbolDashboard_v29.js).
 * getSymbolDashboard_v6 → option-chain (totals, PCR, IV, max pain) + future-buildup (futures per expiry)
 * getFutureChartApi_SD → pcr-data (Future per 3 min); getOptionChainData / getTrendingOIAndOIchg → option-chain.
 * Colours are ichart's own (intentionally not themed).
 */
const UP = "#38c172", DOWN = "#dc3030";
const f = (n: number | null | undefined) => (n == null || !isFinite(n) ? "-" : formatIndianNumber(Math.round(n)));
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^NIFTY50$/, "NIFTY").replace(/^NIFTYBANK$/, "BANKNIFTY");

type FutRow = { expiry: string; item: BuildupItem | null };

function Gauge({ title, value, max, label }: { title: string; value: number | null; max: number; label: string }) {
  return (
    <div className="sd-gauge">
      <p>{title}</p>
      <div style={{ width: 130, height: 110 }}>
        <ResponsiveContainer>
          <RadialBarChart innerRadius="70%" outerRadius="100%" startAngle={180} endAngle={0} data={[{ v: value == null ? 0 : Math.min(value, max) }]}>
            <PolarAngleAxis type="number" domain={[0, max]} tick={false} />
            <RadialBar dataKey="v" fill="#1778b8" background={{ fill: "#e7e7e7" }} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="sd-gauge-val">{label}</div>
    </div>
  );
}

export default function IchartSymbolDashboard() {
  const s = useIchartChain();
  const [futs, setFuts] = useState<FutRow[]>([]);
  const [price, setPrice] = useState<{ time: string; price: number }[]>([]);

  useEffect(() => {
    let off = false;
    (async () => {
      const exps = (await fetchFutureExpiryDates(s.symbol).catch(() => [])).slice(0, 3);
      const rows = await Promise.all(exps.map(async (e) => {
        const d = await fetchFutureBuildup(s.symbol, e).catch(() => null);
        const all = d ? [...d.longBuildup, ...d.shortBuildup, ...d.shortCovering, ...d.longUnwinding] : [];
        return { expiry: e, item: all.find((i) => norm(i.symbol) === norm(s.symbol)) ?? null };
      }));
      if (!off) setFuts(rows);
    })();
    return () => { off = true; };
  }, [s.symbol]);

  useEffect(() => {
    if (!s.expiry) return;
    fetchPCRData(s.symbol, s.expiry, 110).then((r) => {
      const rows: PCRTimeData[] = r?.dataWhole ?? [];
      setPrice(rows.map((x) => ({ time: String(x.time).match(/(\d{2}):?(\d{2})/)?.slice(1).join(":") ?? String(x.time), price: Number(x.Future || x.underlyning || 0) })).filter((x) => x.price > 0));
    }).catch(() => setPrice([]));
  }, [s.symbol, s.expiry, s.lastRefresh]);

  const st = useMemo(() => {
    const r = s.rows;
    if (!r.length) return null;
    const sum = (k: (x: typeof r[0]) => number) => r.reduce((a, x) => a + k(x), 0);
    const ceOi = sum((x) => x.ce.oi), peOi = sum((x) => x.pe.oi), ceC = sum((x) => x.ce.coi), peC = sum((x) => x.pe.coi);
    const top = (k: (x: typeof r[0]) => number) => r.reduce((b, x) => (k(x) > k(b) ? x : b)).strike;
    const atm = findAtm(r), a = r.find((x) => x.strike === atm);
    return {
      ceOi, peOi, ceC, peC, atm, spot: r[0].spot,
      pcr: ceOi ? peOi / ceOi : null, iv: a ? (a.ce.iv + a.pe.iv) / 2 : null, maxPain: computeMaxPain(r),
      maxCe: top((x) => x.ce.oi), maxPe: top((x) => x.pe.oi), maxCeC: top((x) => x.ce.coi), maxPeC: top((x) => x.pe.coi),
      trendOi: [...r].sort((x, y) => y.ce.oi + y.pe.oi - (x.ce.oi + x.pe.oi)).slice(0, 5).map((x) => ({ k: x.strike, v: x.ce.oi + x.pe.oi })),
      trendChg: [...r].sort((x, y) => Math.abs(y.ce.coi + y.pe.coi) - Math.abs(x.ce.coi + x.pe.coi)).slice(0, 5).map((x) => ({ k: x.strike, v: x.ce.coi + x.pe.coi })),
    };
  }, [s.rows]);

  const near = useMemo(() => {
    if (!st) return [];
    const i = s.rows.findIndex((x) => x.strike === st.atm);
    return s.rows.slice(Math.max(0, i - 10), i + 11);
  }, [s.rows, st]);
  const chartRows = near.map((x) => ({ strike: x.strike, CE: x.ce.oi, PE: x.pe.oi, "CE Chg": x.ce.coi, "PE Chg": x.pe.coi }));
  const trend = (v: number) => (v > 0 ? "Bullish" : v < 0 ? "Bearish" : "Neutral");
  const chg = (v?: number) => v == null ? <td>-</td> : <td style={{ color: v > 0 ? UP : DOWN, textAlign: "right" }}>{v > 0 ? "▲" : "▼"} {v.toFixed(2)}%</td>;

  return (
    <IchartShell>
      <div className="ichart-sd">
        <div className="sd-form">
          <label className="sd-radio"><input type="radio" checked={!s.date} onChange={() => { s.setDate(""); s.setTime(""); }} /> Latest</label>
          <label className="sd-radio"><input type="radio" checked={!!s.date} onChange={() => s.setDate(new Date().toISOString().slice(0, 10))} /> Historical</label>
          <label className="sd-field">Select Symbol<select value={s.symbol} onChange={(e) => s.setSymbol(e.target.value)}>{s.symbols.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="sd-field">Expiry Date<select value={s.expiry} onChange={(e) => s.setExpiry(e.target.value)}>{s.expiries.map((x) => <option key={x}>{x}</option>)}</select></label>
          {s.date && <label className="sd-field">Select Date<input type="date" min="2018-08-02" max={new Date().toISOString().slice(0, 10)} value={s.date} onChange={(e) => s.setDate(e.target.value)} /></label>}
        </div>
        {s.error && <div className="ichart-error">{s.error}</div>}

        <div className="sd-row sd-top">
          <div className="sd-box">
            <h6 style={{ textAlign: "center", fontSize: 15 }}>Symbol : {s.symbol}</h6>
            <table className="sd-table">
              <thead><tr><th>Expiry Date</th><th>Price</th><th>Price Chg</th><th>Volume</th><th>OI</th><th>OI Chg</th></tr></thead>
              <tbody>{(futs.length ? futs : [{ expiry: "-", item: null }]).map((r) => (
                <tr key={r.expiry}><td style={{ textAlign: "left" }}>{r.expiry}</td><td style={{ textAlign: "right" }}>{r.item ? r.item.price.toFixed(2) : "-"}</td>{chg(r.item?.priceChange)}<td style={{ textAlign: "right" }}>-</td><td style={{ textAlign: "right" }}>{f(r.item?.oi)}</td>{chg(r.item?.oiChangePercent)}</tr>
              ))}</tbody>
            </table>
            <div className="sd-kv"><h6>Fair Price : <span>-</span></h6><h6>Lot Size : <span>-</span></h6></div>
          </div>
          <div className="sd-box sd-gauges">
            <div>
              <div className="sd-gauge-grid">
                <Gauge title="Rollover" value={null} max={100} label="-" />
                <Gauge title="MWPL" value={null} max={100} label="-" />
                <Gauge title="IV" value={st?.iv ?? null} max={50} label={st?.iv != null ? st.iv.toFixed(2) : "-"} />
                <Gauge title="PCR" value={st?.pcr ?? null} max={2} label={st?.pcr != null ? st.pcr.toFixed(2) : "-"} />
              </div>
              <div className="sd-kv"><h6>IVR: <span>-</span></h6><h6>IVP: <span>-</span></h6><h6>Max Pain: <span>{st?.maxPain ?? "-"}</span></h6></div>
            </div>
            {st ? (
              <div>
                <h6 className="sd-mono">Last Updated at : <span>{s.lastRefresh?.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }) ?? "-"}</span></h6>
                <div className="sd-lists">
                  <ul>
                    <li>Total CE OI : <span>{f(st.ceOi)}</span></li><li>Total PE OI : <span>{f(st.peOi)}</span></li>
                    <li>Diff PE-CE OI : <span>{f(st.peOi - st.ceOi)}</span></li><li>Trend OI : <span>{trend(st.peOi - st.ceOi)}</span></li>
                    <li>Max CE OI Strike : <span>{st.maxCe}</span></li><li>Max CE OI Chg Strike : <span>{st.maxCeC}</span></li>
                  </ul>
                  <ul>
                    <li>Total CE OI Chg : <span>{f(st.ceC)}</span></li><li>Total PE OI Chg : <span>{f(st.peC)}</span></li>
                    <li>Diff PE-CE OI Chg : <span style={{ color: st.peC - st.ceC > 0 ? UP : DOWN }}>{f(st.peC - st.ceC)}</span></li><li>Trend OI Chg : <span>{trend(st.peC - st.ceC)}</span></li>
                    <li>Max PE OI Strike : <span>{st.maxPe}</span></li><li>Max PE OI Chg Strike : <span>{st.maxPeC}</span></li>
                  </ul>
                </div>
              </div>
            ) : <div className="no-data">Data not available</div>}
          </div>
        </div>

        <div className="sd-row sd-two">
          <div className="sd-box">
            <h1 className="sd-h1">Price chart</h1>
            <div style={{ height: 380 }}>
              {price.length ? (
                <ResponsiveContainer><LineChart data={price}><CartesianGrid stroke="#eee" /><XAxis dataKey="time" tick={{ fontSize: 10 }} minTickGap={40} /><YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} width={60} /><Tooltip /><Line dataKey="price" stroke="#1778b8" dot={false} strokeWidth={1.5} /></LineChart></ResponsiveContainer>
              ) : <div className="no-data">Data not available</div>}
            </div>
          </div>
          <div className="sd-box" style={{ overflow: "hidden" }}>
            <h1 className="sd-h1">Option Chain</h1>
            <div style={{ maxHeight: 380, overflow: "auto" }}>
              <table className="sd-table sd-oc">
                <thead><tr><th>IV</th><th>OI Chg</th><th>OI</th><th>Price</th><th>Strike Price</th><th>Price</th><th>OI</th><th>OI Chg</th><th>IV</th></tr></thead>
                <tbody>{near.map((r) => (
                  <tr key={r.strike} className={r.strike === st?.atm ? "atm" : ""}>
                    <td>{r.ce.iv.toFixed(2)}</td><td>{f(r.ce.coi)}</td><td>{f(r.ce.oi)}</td><td>{r.ce.ltp.toFixed(2)}</td>
                    <td className="strike">{r.strike}</td>
                    <td>{r.pe.ltp.toFixed(2)}</td><td>{f(r.pe.oi)}</td><td>{f(r.pe.coi)}</td><td>{r.pe.iv.toFixed(2)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="sd-row">
          <div className="sd-box sd-two-in">
            {[["OI", "CE", "PE"], ["OI Change", "CE Chg", "PE Chg"]].map(([t, a, b]) => (
              <div key={t} style={{ height: 340 }}>
                <h1 className="sd-h1">{t}</h1>
                <ResponsiveContainer height="88%"><BarChart data={chartRows}><CartesianGrid stroke="#eee" /><XAxis dataKey="strike" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} width={70} tickFormatter={(v) => formatIndianNumber(v)} /><Tooltip formatter={(v: number) => formatIndianNumber(v)} /><Bar dataKey={a} fill={DOWN} /><Bar dataKey={b} fill={UP} /></BarChart></ResponsiveContainer>
              </div>
            ))}
          </div>
        </div>

        <div className="sd-row sd-two">
          {[["Trending OI Strikes", "Trending OI", "OI", st?.trendOi], ["Trending OI Chg Strikes", "Trending OI Chg", "OI Chg", st?.trendChg]].map(([h, t, c, rows]) => (
            <div key={h as string} className="sd-box">
              <h1 className="sd-h1">{h as string}</h1>
              {rows ? (
                <table className="sd-table" border={1}>
                  <tbody>
                    <tr><th colSpan={2}>{t as string}</th></tr>
                    <tr><th style={{ width: "50%" }}>Strikes</th><th>{c as string}</th></tr>
                    {(rows as { k: number; v: number }[]).map((r) => <tr key={r.k}><td>{r.k}</td><td>{f(r.v)}</td></tr>)}
                  </tbody>
                </table>
              ) : <div className="no-data">Data not available</div>}
            </div>
          ))}
        </div>
      </div>
    </IchartShell>
  );
}
