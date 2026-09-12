import { useEffect, useMemo, useRef, useState } from "react";
import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchNitinChainAt } from "@/services/nitinBhaiyaApi";
import { callTargetProbability, probabilitySentiment, putTargetProbability } from "@/utils/optionProbability";

const allSlots = Array.from({ length: 126 }, (_, i) => {
  const total = 9 * 60 + 15 + i * 3;
  return total <= 15 * 60 + 30 ? `${String(Math.floor(total / 60)).padStart(2, "0")}${String(total % 60).padStart(2, "0")}` : null;
}).filter((value): value is string => Boolean(value));

function istNowSlot() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return `${String(hour).padStart(2, "0")}${String(Math.floor(minute / 3) * 3).padStart(2, "0")}`;
}

const tone = (value: string) => value.includes("BULLISH") ? "text-success" : value.includes("BEARISH") ? "text-destructive" : "text-muted-foreground";

interface Row {
  time: string;
  spot: number;
  putTarget: number;
  callTarget: number;
  putIv: number;
  callIv: number;
  putWin: number | null;
  callWin: number | null;
  closeAbove: number | null;
  closeBelow: number | null;
  sentiment: string;
}

interface Props {
  symbol: string;
  expiry: string;
  date: string;
  time: string;
  days: number;
  putTarget: number;
  callTarget: number;
  refreshKey: number;
}

export function ProbabilityTimelineTable({ symbol, expiry, date, time, days, putTarget, callTarget, refreshKey }: Props) {
  const [rows, setRows] = useState<Map<string, Row>>(new Map());
  const [loading, setLoading] = useState(false);
  const cache = useRef(new Map<string, Row>());
  const pending = useRef(false);

  const slots = useMemo(() => {
    const cutoff = time || (date ? "1530" : istNowSlot());
    return allSlots.filter((slot) => slot <= cutoff);
  }, [time, date, refreshKey]);

  useEffect(() => {
    setRows(new Map());
    cache.current = new Map();
  }, [symbol, expiry, date, days, putTarget, callTarget]);

  useEffect(() => {
    if (!symbol || !expiry || !slots.length || !putTarget || !callTarget || pending.current) return;
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
            const spot = chain[0].spot;
            const nearest = (target: number) => chain.reduce((best, row) => Math.abs(row.strike - target) < Math.abs(best.strike - target) ? row : best);
            const putRow = nearest(putTarget);
            const callRow = nearest(callTarget);
            const putIv = putRow.pe.iv;
            const callIv = callRow.ce.iv;
            const put = putTargetProbability(spot, putTarget, putIv, days);
            const call = callTargetProbability(spot, callTarget, callIv, days);
            const row: Row = {
              time: slot, spot, putTarget, callTarget, putIv, callIv,
              putWin: put?.winning ?? null, callWin: call?.winning ?? null,
              closeAbove: put ? put.opposite : null, closeBelow: call ? call.opposite : null,
              sentiment: probabilitySentiment(put?.winning ?? null, call?.winning ?? null),
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
  }, [symbol, expiry, slots, date, days, putTarget, callTarget]);

  const ordered = useMemo(() => slots.map((slot) => rows.get(slot)).filter((row): row is Row => Boolean(row)).reverse(), [slots, rows]);
  const pct = (value: number | null) => value === null ? "—" : `${value.toFixed(2)}%`;

  return <Card className="overflow-hidden rounded-none">
    <CardHeader className="py-3"><CardTitle className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><History className="h-4 w-4" />Time-wise Probability Table (3 min)</span><span className="font-mono text-[10px] text-muted-foreground">{loading ? "Loading snapshots…" : `${ordered.length}/${slots.length} snapshots`}</span></CardTitle></CardHeader>
    <CardContent className="p-0"><div className="max-h-[460px] overflow-auto"><table className="w-full min-w-[900px] text-[10px]">
      <thead className="sticky top-0 bg-muted"><tr>{['TIME (IST)', 'CMP', 'PUT TARGET', 'PUT IV %', 'PUT WIN %', 'CLOSE ABOVE %', 'CALL TARGET', 'CALL IV %', 'CALL WIN %', 'CLOSE BELOW %', 'SENTIMENT'].map((h) => <th key={h} className="px-1 py-2 text-center font-semibold">{h}</th>)}</tr></thead>
      <tbody>{ordered.map((row) => <tr key={row.time} className="border-t hover:bg-muted/50">
        <td className="px-1 py-1.5 text-center font-mono font-bold">{row.time.slice(0, 2)}:{row.time.slice(2)}</td>
        <td className="px-1 py-1.5 text-right font-mono">{row.spot.toFixed(2)}</td>
        <td className="px-1 py-1.5 text-right font-mono">{row.putTarget}</td>
        <td className="px-1 py-1.5 text-right font-mono">{row.putIv.toFixed(2)}</td>
        <td className="px-1 py-1.5 text-right font-mono font-bold text-destructive">{pct(row.putWin)}</td>
        <td className="px-1 py-1.5 text-right font-mono">{pct(row.closeAbove)}</td>
        <td className="px-1 py-1.5 text-right font-mono">{row.callTarget}</td>
        <td className="px-1 py-1.5 text-right font-mono">{row.callIv.toFixed(2)}</td>
        <td className="px-1 py-1.5 text-right font-mono font-bold text-success">{pct(row.callWin)}</td>
        <td className="px-1 py-1.5 text-right font-mono">{pct(row.closeBelow)}</td>
        <td className={`px-1 py-1.5 text-center font-semibold ${tone(row.sentiment)}`}>{row.sentiment}</td>
      </tr>)}
      {!ordered.length && !loading && <tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">No snapshots available yet.</td></tr>}</tbody>
    </table></div></CardContent>
  </Card>;
}
