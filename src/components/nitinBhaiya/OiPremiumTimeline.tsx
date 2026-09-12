import { useEffect, useMemo, useRef, useState } from "react";
import { History, LineChart as LineChartIcon } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIndianNumber } from "@/lib/formatNumber";
import { fetchNitinChainAt } from "@/services/nitinBhaiyaApi";
import { analyzeOiPremium, OiPremiumRange, OiPremiumSummary } from "@/utils/oiPremiumEngine";
import { ChainStrike } from "@/utils/nitinBhaiyaEngine";

const allSlots = Array.from({ length: 126 }, (_, index) => {
  const total = 9 * 60 + 15 + index * 3;
  return total <= 15 * 60 + 30 ? `${String(Math.floor(total / 60)).padStart(2, "0")}${String(total % 60).padStart(2, "0")}` : null;
}).filter((value): value is string => Boolean(value));

function istNowSlot() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return `${String(hour).padStart(2, "0")}${String(Math.floor(minute / 3) * 3).padStart(2, "0")}`;
}

interface TimelineRow extends OiPremiumSummary { time: string }
interface Props {
  symbol: string;
  expiry: string;
  date: string;
  time: string;
  opening: ChainStrike[];
  prevClose: ChainStrike[];
  refreshKey: number;
  onLatest?: (summary: OiPremiumSummary | null) => void;
}

const n = (value: number) => formatIndianNumber(Math.round(value));
const signed = (value: number, decimals = 0) => `${value > 0 ? "+" : ""}${decimals ? value.toFixed(decimals) : n(value)}`;
const tone = (value: string) => value.includes("BULLISH") ? "text-success" : value.includes("BEARISH") ? "text-destructive" : "text-muted-foreground";

export function OiPremiumTimeline({ symbol, expiry, date, time, opening, prevClose, refreshKey, onLatest }: Props) {
  const [chains, setChains] = useState<Map<string, ChainStrike[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const cache = useRef(new Map<string, ChainStrike[]>());
  const pending = useRef(false);

  const slots = useMemo(() => {
    const cutoff = time || (date ? "1530" : istNowSlot());
    return allSlots.filter((slot) => slot <= cutoff);
  }, [time, date, refreshKey]);

  useEffect(() => {
    setChains(new Map());
    cache.current = new Map();
  }, [symbol, expiry, date]);

  useEffect(() => {
    if (!symbol || !expiry || !opening.length || !slots.length || pending.current) return;
    const missing = slots.filter((slot) => !cache.current.has(slot));
    if (!missing.length) { setChains(new Map(cache.current)); return; }
    pending.current = true;
    setLoading(true);
    (async () => {
      for (let index = 0; index < missing.length; index += 4) {
        const batch = missing.slice(index, index + 4);
        const results = await Promise.all(batch.map(async (slot) => {
          try {
            const chain = await fetchNitinChainAt(symbol, expiry, slot, date || undefined);
            return chain.length ? { slot, chain } : null;
          } catch { return null; }
        }));
        results.forEach((item) => { if (item) cache.current.set(item.slot, item.chain); });
        setChains(new Map(cache.current));
      }
      pending.current = false;
      setLoading(false);
    })();
    return () => { pending.current = false; };
  }, [symbol, expiry, date, slots, opening]);

  // Sequential pass: each candle's strike window unions with everything visited earlier.
  const ordered = useMemo(() => {
    let range: OiPremiumRange | null = null;
    const rows: TimelineRow[] = [];
    slots.forEach((slot) => {
      const chain = chains.get(slot);
      if (!chain) return;
      const summary = analyzeOiPremium(chain, opening, prevClose, 2, range);
      if (summary.range) range = summary.range;
      rows.push({ time: slot, ...summary });
    });
    return rows;
  }, [slots, chains, opening, prevClose]);

  useEffect(() => { onLatest?.(ordered.length ? ordered[ordered.length - 1] : null); }, [ordered, onLatest]);

  // Chart series: CE/PE premium delta per candle, their gap (CE Δ − PE Δ) and the
  // anchor average of the gap = cumulative mean from the first candle of the day.
  const chartData = useMemo(() => {
    let gapSum = 0;
    return ordered.map((row, index) => {
      const gap = row.cePremiumChange - row.pePremiumChange;
      gapSum += gap;
      return {
        time: `${row.time.slice(0, 2)}:${row.time.slice(2)}`,
        ceDelta: Number(row.cePremiumChange.toFixed(2)),
        peDelta: Number(row.pePremiumChange.toFixed(2)),
        gap: Number(gap.toFixed(2)),
        anchorAvg: Number((gapSum / (index + 1)).toFixed(2)),
      };
    });
  }, [ordered]);

  const display = useMemo(() => [...ordered].reverse(), [ordered]);

  return <>
    <Card className="m-3 overflow-hidden rounded-none">
      <CardHeader className="py-3"><CardTitle className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><LineChartIcon className="h-4 w-4" />Premium Gap Chart (CE Δ − PE Δ · anchor average)</span><span className="font-mono text-[10px] text-muted-foreground">Gap = CE Premium Δ minus PE Premium Δ · Anchor Avg = din ka cumulative average</span></CardTitle></CardHeader>
      <CardContent className="p-2">
        {chartData.length ? <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} minTickGap={40} />
            <YAxis tick={{ fontSize: 10 }} width={70} tickFormatter={(value: number) => value.toFixed(0)} />
            <Tooltip formatter={(value: number, name: string) => [value.toFixed(2), name]} contentStyle={{ fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="ceDelta" name="CE Premium Δ" stroke="hsl(0 72% 51%)" dot={false} strokeWidth={1.2} isAnimationActive={false} />
            <Line type="monotone" dataKey="peDelta" name="PE Premium Δ" stroke="hsl(142 71% 45%)" dot={false} strokeWidth={1.2} isAnimationActive={false} />
            <Line type="monotone" dataKey="gap" name="Gap (CE Δ − PE Δ)" stroke="hsl(var(--primary))" dot={false} strokeWidth={1.6} isAnimationActive={false} />
            <Line type="monotone" dataKey="anchorAvg" name="Anchor Avg of Gap" stroke="hsl(var(--foreground))" strokeDasharray="6 3" dot={false} strokeWidth={1.4} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer> : <p className="px-3 py-6 text-center text-[11px] text-muted-foreground">{loading ? "Loading chart…" : "No data available."}</p>}
      </CardContent>
    </Card>
    <Card className="m-3 overflow-hidden rounded-none">
    <CardHeader className="py-3"><CardTitle className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><History className="h-4 w-4" />OI + Premium · 3-Minute Table (cumulative strikes · premium vs prev close 15:30)</span><span className="font-mono text-[10px] text-muted-foreground">{loading ? "Loading snapshots…" : `${display.length}/${slots.length} snapshots`}</span></CardTitle></CardHeader>
    <CardContent className="p-0"><div className="max-h-[480px] overflow-auto"><table className="w-full min-w-[1120px] text-[10px]">
      <thead className="sticky top-0 bg-muted"><tr>{["TIME (IST)", "SPOT", "ATM", "USED STRIKES", "CE COI", "CE PREMIUM Δ", "CE ACTIVITY", "PE COI", "PE PREMIUM Δ", "PE ACTIVITY", "MARKET READING"].map((heading) => <th key={heading} className="px-1 py-2 text-center font-semibold">{heading}</th>)}</tr></thead>
      <tbody>{display.map((row) => <tr key={row.time} className="border-t hover:bg-muted/50">
        <td className="px-1 py-1.5 text-center font-mono font-bold">{row.time.slice(0, 2)}:{row.time.slice(2)}</td>
        <td className="px-1 py-1.5 text-right font-mono">{row.spot.toFixed(2)}</td>
        <td className="px-1 py-1.5 text-right font-mono font-bold">{n(row.atm)}</td>
        <td className="px-1 py-1.5 text-center font-mono">{row.strikeRange}</td>
        <td className={row.ceCoi >= 0 ? "px-1 py-1.5 text-right font-mono text-success" : "px-1 py-1.5 text-right font-mono text-destructive"}>{signed(row.ceCoi)}</td>
        <td className="px-1 py-1.5 text-right font-mono">{signed(row.cePremiumChange, 2)}</td>
        <td className="px-1 py-1.5 text-center font-semibold">{row.ceActivity}</td>
        <td className={row.peCoi >= 0 ? "px-1 py-1.5 text-right font-mono text-success" : "px-1 py-1.5 text-right font-mono text-destructive"}>{signed(row.peCoi)}</td>
        <td className="px-1 py-1.5 text-right font-mono">{signed(row.pePremiumChange, 2)}</td>
        <td className="px-1 py-1.5 text-center font-semibold">{row.peActivity}</td>
        <td className={`px-1 py-1.5 text-center font-semibold ${tone(row.reading)}`}>{row.reading}</td>
      </tr>)}
      {!display.length && !loading && <tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">No snapshots available yet.</td></tr>}</tbody>
    </table></div></CardContent>
  </Card>;
}
