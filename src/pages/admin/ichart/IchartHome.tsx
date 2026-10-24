import { useEffect, useMemo, useState } from "react";
import { Area, ComposedChart, Line, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { IchartShell } from "@/components/ichart/IchartShell";
import { fetchPCRData, PCRTimeData } from "@/services/pcrApi";
import { fetchFutureBuildup, BuildupItem, FutureBuildupData } from "@/services/futureBuilupApi";
import { fetchIchartChain, fetchIchartExpiries, findAtm } from "@/services/ichartApi";
import { formatIndianNumber } from "@/lib/formatNumber";

/**
 * Rebuild of icharts.in /opt/index.php (public dashboard).
 * ichart getDataForPublicDashboard_v17.php → OptionWorld: pcr-data (price/OI/PCR), option-chain (ATM IV), future-buildup (buildup + gainers/losers).
 * Colours below are ichart's own (intentionally not themed).
 */
const UP = "#38c172";
const DOWN = "#dc3030";
const INDICES = [{ symbol: "Nifty 50", name: "NIFTY" }, { symbol: "Nifty Bank", name: "BANKNIFTY" }];

type IndexData = { name: string; expiry: string; series: { time: string; price: number; oi: number }[]; pcr: number | null; iv: number | null };

const toExp = (iso: string) => { if (!iso) return ""; const d = new Date(iso + "T00:00:00"); return `${String(d.getDate()).padStart(2, "0")}${d.toLocaleString("en", { month: "short" }).toUpperCase()}${String(d.getFullYear()).slice(2)}`; };
const fmtTime = (t: string) => { const m = String(t).match(/(\d{2}):?(\d{2})/); return m ? `${m[1]}:${m[2]}` : String(t); };

async function loadIndex(symbol: string, name: string): Promise<IndexData> {
  const expiries = await fetchIchartExpiries(symbol);
  const expiry = expiries[0] ?? "";
  const [pcr, chain] = await Promise.all([fetchPCRData(symbol, expiry, 110).catch(() => null), fetchIchartChain(symbol, expiry).catch(() => [])]);
  const rows: PCRTimeData[] = pcr?.dataWhole ?? [];
  const series = rows.map((r) => ({ time: fmtTime(r.time), price: Number(r.Future || r.underlyning || 0), oi: Number(r.CE_OI || 0) + Number(r.PE_OI || 0) })).filter((r) => r.price > 0);
  const last = rows[rows.length - 1];
  const atm = findAtm(chain);
  const atmRow = chain.find((r) => r.strike === atm);
  const iv = atmRow ? (atmRow.ce.iv + atmRow.pe.iv) / 2 : null;
  return { name: `${name}-${toExp(expiry)}`, expiry, series, pcr: last ? Number(last.PCR_OI) : null, iv };
}

function PriceOiBox({ d }: { d: IndexData | null }) {
  const first = d?.series[0], last = d?.series[d.series.length - 1];
  const diff = first && last ? last.price - first.price : 0;
  const pct = first && last && first.price ? (diff / first.price) * 100 : 0;
  const oiDiff = first && last ? last.oi - first.oi : 0;
  const oiPct = first && last && first.oi ? (oiDiff / first.oi) * 100 : 0;
  const pc = diff >= 0 ? UP : DOWN, oc = oiDiff >= 0 ? UP : DOWN;
  return (
    <div className="box span-4">
      <h4>{d?.name ?? "Loading…"}</h4>
      <div style={{ height: 260 }}>
        {d && d.series.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={d.series} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs><linearGradient id={`oi-${d.name}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={oc} stopOpacity={0.5} /><stop offset="100%" stopColor={oc} stopOpacity={0.1} /></linearGradient></defs>
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#666" }} minTickGap={40} />
              <YAxis yAxisId="p" domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#666" }} width={55} />
              <YAxis yAxisId="o" orientation="right" domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#666" }} tickFormatter={(v) => formatIndianNumber(v)} width={75} />
              <Tooltip contentStyle={{ background: "#333", border: 0, color: "#fff", fontSize: 11 }} labelStyle={{ color: "#fff" }} formatter={(v: number, n: string) => [n === "OI" ? formatIndianNumber(v) : v.toFixed(2), n]} />
              <Area yAxisId="o" type="monotone" dataKey="oi" name="OI" stroke={oc} strokeWidth={0} fill={`url(#oi-${d.name})`} isAnimationActive={false} />
              <Line yAxisId="p" type="monotone" dataKey="price" name="Price" stroke={pc} strokeWidth={1} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : <div className="no-data">{d ? "Data not available" : "Loading…"}</div>}
      </div>
      {last && (
        <div className="niftypricedata">
          <h6><span className="lbl">Price : </span> {last.price.toFixed(2)} <span style={{ color: pc }}>{diff >= 0 ? "+" : ""}{diff.toFixed(2)}</span> <span style={{ color: pc }}>({pct.toFixed(2)}%)</span></h6>
          <h6><span className="lbl">OI : </span> {formatIndianNumber(last.oi)} <span style={{ color: oc }}>({oiPct.toFixed(2)}%)</span></h6>
        </div>
      )}
    </div>
  );
}

function Gauge({ label, value, max, color }: { label: string; value: number | null; max: number; color: string }) {
  const pct = value == null ? 0 : Math.min(100, (value / max) * 100);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ height: 110, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart data={[{ v: pct }]} startAngle={180} endAngle={0} innerRadius="60%" outerRadius="100%" cy="80%">
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="v" fill={color} background={{ fill: "#d9dbdb" }} cornerRadius={10} isAnimationActive={false} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div style={{ position: "absolute", left: 0, right: 0, top: "52%", fontSize: 20, fontWeight: 700, color: "#000" }}>{value == null ? "-" : value.toFixed(2)}</div>
      </div>
      <div className="gaugeData">{label}</div>
    </div>
  );
}

function GaugesBox({ data }: { data: (IndexData | null)[] }) {
  return (
    <div className="box span-3">
      {data.map((d, i) => (
        <div key={i}>
          <h4 className="gauge-title">{INDICES[i].name}</h4>
          <div className="gauge-grid">
            <Gauge label="PCR" value={d?.pcr ?? null} max={2} color={d?.pcr != null && d.pcr >= 1 ? UP : DOWN} />
            <Gauge label="IV" value={d?.iv ?? null} max={50} color={UP} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BarsBox({ title, items, loaded }: { title: string; items: BuildupItem[] | null; loaded: boolean }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil((items?.length ?? 0) / 5));
  const view = (items ?? []).slice(page * 5, page * 5 + 5);
  const max = Math.max(100, ...view.flatMap((x) => [Math.abs(x.priceChange), Math.abs(x.oiChangePercent)]));
  return (
    <div className="box">
      <div className="bar-head">
        <button disabled={page === 0} onClick={() => setPage(page - 1)} title="shift backward">«</button>
        <h4>{title}</h4>
        <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} title="shift forward">»</button>
      </div>
      {!loaded ? <div className="no-data">Loading…</div> : items == null ? <div className="no-data">Data not available</div> : !view.length ? <div className="no-data">No data</div> : view.map((x) => (
        <div className="bar-main" key={x.symbol}>
          <div className="data-flex">
            <div className="image-div"><span title={x.symbol}>{x.symbol.slice(0, 2)}</span></div>
            <div className="bar-data">
              <h5 className="bar-title">{x.symbol}</h5>
              <div className={`singlebar ${x.priceChange < 0 ? "negativeColor" : "positiveColor"}`} title="Price Chg" style={{ width: `${(Math.abs(x.priceChange) / max) * 100}%` }}>{x.price.toFixed(2)}&nbsp;({x.priceChange.toFixed(2)}%)</div>
              <div className={`singlebar ${x.oiChangePercent < 0 ? "negativeColor" : "positiveColor"}`} title="OI Chg" style={{ width: `${(Math.abs(x.oiChangePercent) / max) * 100}%` }}>{x.oiChangePercent.toFixed(2)}%</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function IchartHome() {
  const [indices, setIndices] = useState<(IndexData | null)[]>([null, null]);
  const [buildup, setBuildup] = useState<FutureBuildupData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const idx = await Promise.all(INDICES.map((i) => loadIndex(i.symbol, i.name).catch(() => null)));
      if (alive) setIndices(idx);
      const exp = idx[0]?.expiry;
      const b = exp ? await fetchFutureBuildup("Nifty 50", exp).catch(() => null) : null;
      if (alive) { setBuildup(b); setLoaded(true); }
    };
    load();
    const id = window.setInterval(load, 60000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);

  const all = useMemo(() => buildup ? [...buildup.longBuildup, ...buildup.shortBuildup, ...buildup.shortCovering, ...buildup.longUnwinding] : null, [buildup]);
  const sortBy = (k: keyof BuildupItem, dir: 1 | -1, pred: (x: BuildupItem) => boolean) => all ? [...all].filter(pred).sort((a, b) => dir * (Number(b[k]) - Number(a[k]))) : null;

  return (
    <IchartShell>
      <section className="main-body ichart-home">
        <div className="grid-top">
          <PriceOiBox d={indices[0]} />
          <PriceOiBox d={indices[1]} />
          <GaugesBox data={indices} />
        </div>
        <div className="grid-bars">
          <BarsBox title="Long Buildup" items={buildup?.longBuildup ?? null} loaded={loaded} />
          <BarsBox title="Short Covering" items={buildup?.shortCovering ?? null} loaded={loaded} />
          <BarsBox title="Short Buildup" items={buildup?.shortBuildup ?? null} loaded={loaded} />
          <BarsBox title="Long Unwinding" items={buildup?.longUnwinding ?? null} loaded={loaded} />
          <BarsBox title="Price Gainers" items={sortBy("priceChange", 1, (x) => x.priceChange > 0)} loaded={loaded} />
          <BarsBox title="Price Losers" items={sortBy("priceChange", -1, (x) => x.priceChange < 0)} loaded={loaded} />
          <BarsBox title="OI Gainers" items={sortBy("oiChangePercent", 1, (x) => x.oiChangePercent > 0)} loaded={loaded} />
          <BarsBox title="OI Losers" items={sortBy("oiChangePercent", -1, (x) => x.oiChangePercent < 0)} loaded={loaded} />
          <BarsBox title="IVR" items={null} loaded={loaded} />
          <BarsBox title="IVP" items={null} loaded={loaded} />
        </div>
      </section>
    </IchartShell>
  );
}
