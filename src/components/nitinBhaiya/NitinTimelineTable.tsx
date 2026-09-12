import { useEffect, useMemo, useRef, useState } from "react";
import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIndianNumber } from "@/lib/formatNumber";
import { fetchNitinChainAt } from "@/services/nitinBhaiyaApi";
import { ChainStrike, runNitinBhaiyaEngine } from "@/utils/nitinBhaiyaEngine";

const n = (value: number) => formatIndianNumber(Math.round(value));
const tone = (value: string) => value.includes("BULLISH") ? "text-success" : value.includes("BEARISH") ? "text-destructive" : "text-muted-foreground";

const allSlots = Array.from({ length: 126 }, (_, i) => {
  const total = 9 * 60 + 15 + i * 3;
  return total <= 15 * 60 + 30 ? `${String(Math.floor(total / 60)).padStart(2, "0")}${String(total % 60).padStart(2, "0")}` : null;
}).filter((value): value is string => Boolean(value));

function istNowSlot() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const floored = Math.floor(minute / 3) * 3;
  return `${String(hour).padStart(2, "0")}${String(floored).padStart(2, "0")}`;
}

interface TimelineRow {
  time: string;
  spot: number;
  atm: number;
  ceCoi: number;
  peCoi: number;
  pcrCoi: number | null;
  ceDecay: number | null;
  peDecay: number | null;
  ceIv: number;
  peIv: number;
  writer: string;
  score: number;
  sentiment: string;
}

interface Props {
  symbol: string;
  expiry: string;
  date: string;
  time: string;
  baseline: ChainStrike[];
  refreshKey: number;
}

export function NitinTimelineTable({ symbol, expiry, date, time, baseline, refreshKey }: Props) {
  const [rows, setRows] = useState<Map<string, TimelineRow>>(new Map());
  const [loading, setLoading] = useState(false);
  const cache = useRef(new Map<string, TimelineRow>());
  const pending = useRef(false);

  const slots = useMemo(() => {
    const cutoff = time || (date ? "1530" : istNowSlot());
    return allSlots.filter((slot) => slot <= cutoff);
  }, [time, date, refreshKey]);

  useEffect(() => {
    setRows(new Map());
    cache.current = new Map();
  }, [symbol, expiry, date]);

  useEffect(() => {
    if (!symbol || !expiry || !slots.length || pending.current) return;
    const missing = slots.filter((slot) => !cache.current.has(slot));
    if (!missing.length) { setRows(new Map(cache.current)); return; }
    pending.current = true;
    setLoading(true);
    (async () => {
      for (let i = 0; i < missing.length; i += 4) {
        const batch = missing.slice(i, i + 4);
        const results = await Promise.all(batch.map(async (slot) => {
          try {
            const chain = await fetchNitinChainAt(symbol, expiry, slot, date || undefined);
            if (!chain.length) return null;
            const engine = runNitinBhaiyaEngine(chain, baseline);
            const spot = chain[0].spot;
            const ceCoi = chain.reduce((sum, row) => sum + row.ce.coi, 0);
            const peCoi = chain.reduce((sum, row) => sum + row.pe.coi, 0);
            const atmRow = chain.reduce((best, row) => Math.abs(row.strike - spot) < Math.abs(best.strike - spot) ? row : best);
            const row: TimelineRow = {
              time: slot, spot, atm: engine.atm, ceCoi, peCoi, pcrCoi: engine.pcrCoi,
              ceDecay: engine.ceDecay, peDecay: engine.peDecay, ceIv: atmRow.ce.iv, peIv: atmRow.pe.iv,
              writer: engine.writerSignal.toUpperCase(), score: engine.score, sentiment: engine.sentiment,
            };
            return row;
          } catch { return null; }
        }));
        results.forEach((row) => { if (row) cache.current.set(row.time, row); });
        setRows(new Map(cache.current));
      }
      pending.current = false;
      setLoading(false);
    })();
    return () => { pending.current = false; };
  }, [symbol, expiry, slots, baseline]);

  const ordered = useMemo(() => slots.map((slot) => rows.get(slot)).filter((row): row is TimelineRow => Boolean(row)).reverse(), [slots, rows]);

  return <Card className="m-3 overflow-hidden rounded-none">
    <CardHeader className="py-3"><CardTitle className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><History className="h-4 w-4" />3-Minute Timeframe Table</span><span className="font-mono text-[10px] text-muted-foreground">{loading ? "Loading snapshots…" : `${ordered.length}/${slots.length} snapshots`}</span></CardTitle></CardHeader>
    <CardContent className="p-0"><div className="max-h-[420px] overflow-auto"><table className="w-full min-w-[1080px] text-[10px]">
      <thead className="sticky top-0 bg-muted"><tr>{['TIME (IST)','SPOT','ATM','CE COI','PE COI','PCR (COI)','CE DECAY %','PE DECAY %','CE IV','PE IV','WRITER','SCORE','SENTIMENT'].map((h) => <th key={h} className="px-1 py-2 text-center font-semibold">{h}</th>)}</tr></thead>
      <tbody>{ordered.map((row) => <tr key={row.time} className="border-t hover:bg-muted/50">
        <td className="px-1 py-1.5 text-center font-mono font-bold">{row.time.slice(0, 2)}:{row.time.slice(2)}</td>
        <td className="px-1 py-1.5 text-right font-mono">{row.spot.toFixed(2)}</td>
        <td className="px-1 py-1.5 text-right font-mono">{n(row.atm)}</td>
        <td className={`px-1 py-1.5 text-right font-mono ${row.ceCoi >= 0 ? "text-success" : "text-destructive"}`}>{n(row.ceCoi)}</td>
        <td className={`px-1 py-1.5 text-right font-mono ${row.peCoi >= 0 ? "text-success" : "text-destructive"}`}>{n(row.peCoi)}</td>
        <td className="px-1 py-1.5 text-right font-mono">{row.pcrCoi?.toFixed(2) ?? '—'}</td>
        <td className="px-1 py-1.5 text-right font-mono">{row.ceDecay?.toFixed(2) ?? '—'}</td>
        <td className="px-1 py-1.5 text-right font-mono">{row.peDecay?.toFixed(2) ?? '—'}</td>
        <td className="px-1 py-1.5 text-right font-mono">{row.ceIv.toFixed(2)}</td>
        <td className="px-1 py-1.5 text-right font-mono">{row.peIv.toFixed(2)}</td>
        <td className={`px-1 py-1.5 text-center font-semibold ${tone(row.writer + "ISH")}`}>{row.writer}</td>
        <td className={`px-1 py-1.5 text-right font-mono font-bold ${row.score >= 0 ? "text-success" : "text-destructive"}`}>{row.score >= 0 ? '+' : ''}{row.score.toFixed(1)}</td>
        <td className={`px-1 py-1.5 text-center font-semibold ${tone(row.sentiment)}`}>{row.sentiment}</td>
      </tr>)}
      {!ordered.length && !loading && <tr><td colSpan={13} className="px-3 py-6 text-center text-muted-foreground">No snapshots available yet.</td></tr>}</tbody>
    </table></div></CardContent>
  </Card>;
}
