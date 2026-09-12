import { useEffect, useMemo, useRef, useState } from "react";
import { History, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchNitinChainAt } from "@/services/nitinBhaiyaApi";
import { ChainStrike } from "@/utils/nitinBhaiyaEngine";
import { chainAtm, computeDecayPairs, summarizeDecay } from "@/utils/premiumDecayEngine";

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

interface DecayRow {
  time: string;
  spot: number;
  ceDecay: number | null;
  peDecay: number | null;
  ceRetention: number | null;
  peRetention: number | null;
  betterSide: string;
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

const sentTone = (s: string) => s === "BULLISH" ? "text-emerald-400" : s === "BEARISH" ? "text-red-400" : "text-muted-foreground";
const fmt = (v: number | null, suffix = "%") => v === null ? "—" : `${v.toFixed(2)}${suffix}`;

export function PremiumDecayTimeline({ symbol, expiry, date, time, baseline, refreshKey }: Props) {
  const [rows, setRows] = useState<Map<string, DecayRow>>(new Map());
  const [loading, setLoading] = useState(false);
  const cache = useRef(new Map<string, DecayRow>());
  const pending = useRef(false);

  const slots = useMemo(() => {
    const cutoff = time || (date ? "1530" : istNowSlot());
    return allSlots.filter((slot) => slot > "0945" && slot <= cutoff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, date, refreshKey]);

  useEffect(() => { setRows(new Map()); cache.current = new Map(); }, [symbol, expiry, date]);

  useEffect(() => {
    if (!symbol || !expiry || !slots.length || !baseline.length || pending.current) return;
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
            const pairs = computeDecayPairs(chain, baseline, 5);
            const { spot, atm } = chainAtm(chain);
            const s = summarizeDecay(pairs, spot, atm);
            const row: DecayRow = {
              time: slot, spot,
              ceDecay: s.avgCeDecay, peDecay: s.avgPeDecay,
              ceRetention: s.avgCeRetention, peRetention: s.avgPeRetention,
              betterSide: s.betterSide, sentiment: s.sentiment,
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
  }, [symbol, expiry, slots, baseline, date]);

  const ordered = useMemo(() => slots.map((slot) => rows.get(slot)).filter((row): row is DecayRow => Boolean(row)).reverse(), [slots, rows]);

  // Reversal detection: latest sentiment vs the previous different sentiment.
  const reversal = useMemo(() => {
    if (ordered.length < 2) return null;
    const latest = ordered[0].sentiment;
    const prev = ordered.slice(1).find((r) => r.sentiment !== "NEUTRAL" && r.sentiment !== latest);
    if (!prev || latest === "NEUTRAL") return null;
    return { from: prev.sentiment, to: latest, at: latest === "NEUTRAL" ? "" : ordered[0].time };
  }, [ordered]);

  return (
    <Card className="m-3 overflow-hidden rounded-none">
      <CardHeader className="py-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2"><History className="h-4 w-4" />Premium Decay Timeline (vs 09:45 baseline)</span>
          <span className="font-mono text-[10px] text-muted-foreground">{loading ? "Loading snapshots…" : `${ordered.length}/${slots.length} snapshots`}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {reversal && (
          <div className="mx-3 mb-2 flex items-start gap-2 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <p className="text-amber-300 font-medium">
              ⚠️ PREMIUM DECAY REVERSAL — {reversal.from} → {reversal.to} at {reversal.at ? `${reversal.at.slice(0, 2)}:${reversal.at.slice(2)}` : "latest"}. Holding side flip hua hai, direction low confidence.
            </p>
          </div>
        )}
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[860px] text-[10px] tabular-nums">
            <thead className="sticky top-0 bg-muted">
              <tr>{["TIME (IST)", "SPOT", "CE DECAY %", "PE DECAY %", "CE RETENTION", "PE RETENTION", "BETTER HOLDING", "DECAY SENTIMENT"].map((h) => <th key={h} className="px-1 py-2 text-center font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {ordered.map((row) => (
                <tr key={row.time} className="border-t hover:bg-muted/50">
                  <td className="px-1 py-1.5 text-center font-mono font-bold">{row.time.slice(0, 2)}:{row.time.slice(2)}</td>
                  <td className="px-1 py-1.5 text-right font-mono">{row.spot.toFixed(2)}</td>
                  <td className={`px-1 py-1.5 text-right font-mono ${row.ceDecay !== null && row.peDecay !== null && row.ceDecay < row.peDecay ? "text-emerald-400 font-semibold" : ""}`}>{fmt(row.ceDecay)}</td>
                  <td className={`px-1 py-1.5 text-right font-mono ${row.ceDecay !== null && row.peDecay !== null && row.peDecay < row.ceDecay ? "text-emerald-400 font-semibold" : ""}`}>{fmt(row.peDecay)}</td>
                  <td className="px-1 py-1.5 text-right font-mono">{fmt(row.ceRetention)}</td>
                  <td className="px-1 py-1.5 text-right font-mono">{fmt(row.peRetention)}</td>
                  <td className="px-1 py-1.5 text-center font-semibold">{row.betterSide}</td>
                  <td className={`px-1 py-1.5 text-center font-semibold ${sentTone(row.sentiment)}`}>{row.sentiment === "BULLISH" ? "🟢 BULLISH" : row.sentiment === "BEARISH" ? "🔴 BEARISH" : "⚪ NEUTRAL"}</td>
                </tr>
              ))}
              {!ordered.length && !loading && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Snapshots abhi available nahi hain — 09:45 ke baad ke candles aate hi table bharega.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
