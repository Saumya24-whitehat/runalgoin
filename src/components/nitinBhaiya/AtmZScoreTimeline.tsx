import { useEffect, useMemo, useRef, useState } from "react";
import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIndianNumber } from "@/lib/formatNumber";
import { fetchNitinChainAt } from "@/services/nitinBhaiyaApi";
import { AtmSnapshot, AtmZScoreRow, buildAtmZScoreRows, extractAtmSnapshot } from "@/utils/atmZScore";

const allSlots = Array.from({ length: 126 }, (_, i) => {
  const total = 9 * 60 + 15 + i * 3;
  return total <= 15 * 60 + 30 ? `${String(Math.floor(total / 60)).padStart(2, "0")}${String(total % 60).padStart(2, "0")}` : null;
}).filter((value): value is string => Boolean(value));

function istNowSlot() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Math.floor(Number(parts.find((part) => part.type === "minute")?.value ?? 0) / 3) * 3;
  return `${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}`;
}

const signed = (value: number, digits = 2) => `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
const z = (value: number | null) => value === null ? "—" : signed(value);
const sentimentTone = (value: string) => value.includes("BULLISH") ? "text-success" : value.includes("BEARISH") ? "text-destructive" : "text-muted-foreground";
const activityTone = (value: string) => value.includes("BUYERS") || value.includes("COVERING") ? "text-success" : value.includes("WRITERS") || value.includes("UNWINDING") ? "text-destructive" : "text-muted-foreground";

interface Props {
  symbol: string;
  expiry: string;
  date: string;
  time: string;
  refreshKey: number;
  onLatest: (row: AtmZScoreRow | null) => void;
}

export function AtmZScoreTimeline({ symbol, expiry, date, time, refreshKey, onLatest }: Props) {
  const [snapshots, setSnapshots] = useState<Map<string, AtmSnapshot>>(new Map());
  const [loading, setLoading] = useState(false);
  const cache = useRef(new Map<string, AtmSnapshot>());
  const generation = useRef(0);
  const slots = useMemo(() => {
    const cutoff = time || (date ? "1530" : istNowSlot());
    return allSlots.filter((slot) => slot <= cutoff);
  }, [time, date, refreshKey]);

  useEffect(() => {
    generation.current += 1;
    cache.current = new Map();
    setSnapshots(new Map());
    onLatest(null);
  }, [symbol, expiry, date, refreshKey, onLatest]);

  useEffect(() => {
    if (!symbol || !expiry || !slots.length) return;
    const run = generation.current;
    const missing = slots.filter((slot) => !cache.current.has(slot));
    if (!missing.length) return;
    setLoading(true);
    (async () => {
      for (let index = 0; index < missing.length; index += 4) {
        const batch = missing.slice(index, index + 4);
        const results = await Promise.all(batch.map(async (slot) => {
          try {
            const chain = await fetchNitinChainAt(symbol, expiry, slot, date || undefined);
            return extractAtmSnapshot(slot, chain);
          } catch {
            return null;
          }
        }));
        if (generation.current !== run) return;
        results.forEach((row) => { if (row) cache.current.set(row.time, row); });
        setSnapshots(new Map(cache.current));
      }
      if (generation.current === run) setLoading(false);
    })();
  }, [symbol, expiry, date, slots]);

  const rows = useMemo(() => buildAtmZScoreRows(slots.map((slot) => snapshots.get(slot)).filter((row): row is AtmSnapshot => Boolean(row))), [slots, snapshots]);
  useEffect(() => { onLatest(rows[rows.length - 1] ?? null); }, [rows, onLatest]);
  const displayRows = [...rows].reverse();

  return <Card className="overflow-hidden rounded-none">
    <CardHeader className="py-3"><CardTitle className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><History className="h-4 w-4" />ATM 3-Minute Normalized Table</span><span className="font-mono text-[10px] text-muted-foreground">{loading ? "Loading snapshots…" : `${rows.length}/${slots.length} snapshots`}</span></CardTitle></CardHeader>
    <CardContent className="p-0"><div className="max-h-[560px] overflow-auto"><table className="w-full min-w-[1540px] text-[10px]">
      <thead className="sticky top-0 z-10 bg-muted"><tr>{["TIME", "SPOT", "ATM", "CE ΔPREM", "CE PREM Z", "CE ΔCOI", "CE COI Z", "CE VOL ROC", "CE VOL Z", "CE ΔIV", "CE IV Z", "CE ACTIVITY", "PE ΔPREM", "PE PREM Z", "PE ΔCOI", "PE COI Z", "PE VOL ROC", "PE VOL Z", "PE ΔIV", "PE IV Z", "PE ACTIVITY", "SCORE", "SENTIMENT"].map((heading) => <th key={heading} className="whitespace-nowrap px-1 py-2 text-center font-semibold">{heading}</th>)}</tr></thead>
      <tbody>{displayRows.map((row) => <tr key={row.time} className="border-t hover:bg-muted/50">
        <td className="px-1 py-1.5 text-center font-mono font-bold">{row.time.slice(0, 2)}:{row.time.slice(2)}</td>
        <td className="px-1 py-1.5 text-right font-mono">{row.spot.toFixed(2)}</td><td className="bg-muted/70 px-1 py-1.5 text-right font-mono font-bold">{formatIndianNumber(row.atm)}</td>
        <Metric value={signed(row.cePremium.change)} /><Metric value={z(row.cePremium.z)} strong /><Metric value={formatIndianNumber(Math.round(row.ceCoi.change))} /><Metric value={z(row.ceCoi.z)} strong /><Metric value={`${signed(row.ceVolume.change)}%`} /><Metric value={z(row.ceVolume.z)} strong /><Metric value={signed(row.ceIv.change)} /><Metric value={z(row.ceIv.z)} strong />
        <td className={`whitespace-nowrap px-1 py-1.5 text-center font-semibold ${activityTone(row.ceActivity)}`}>{row.ceActivity}</td>
        <Metric value={signed(row.pePremium.change)} /><Metric value={z(row.pePremium.z)} strong /><Metric value={formatIndianNumber(Math.round(row.peCoi.change))} /><Metric value={z(row.peCoi.z)} strong /><Metric value={`${signed(row.peVolume.change)}%`} /><Metric value={z(row.peVolume.z)} strong /><Metric value={signed(row.peIv.change)} /><Metric value={z(row.peIv.z)} strong />
        <td className={`whitespace-nowrap px-1 py-1.5 text-center font-semibold ${activityTone(row.peActivity)}`}>{row.peActivity}</td>
        <td className={`px-1 py-1.5 text-right font-mono font-bold ${sentimentTone(row.sentiment)}`}>{signed(row.score, 1)}</td><td className={`whitespace-nowrap px-1 py-1.5 text-center font-bold ${sentimentTone(row.sentiment)}`}>{row.sentiment}</td>
      </tr>)}
      {!displayRows.length && !loading && <tr><td colSpan={23} className="px-3 py-8 text-center text-muted-foreground">No ATM snapshots available.</td></tr>}</tbody>
    </table></div></CardContent>
  </Card>;
}

function Metric({ value, strong = false }: { value: string; strong?: boolean }) {
  return <td className={`px-1 py-1.5 text-right font-mono ${strong ? "font-bold text-primary" : ""}`}>{value}</td>;
}