import { fetchPCRData, PCRTimeData } from "@/services/pcrApi";
import { fetchGreeksData } from "@/services/greeksChartApi";
import type { Snapshot, StrikeQuote } from "@/utils/iroedEngine";

/** epoch -> seconds */
const toSec = (t: number) => (t > 1e12 ? Math.round(t / 1000) : t);

// Candle timestamps have IST baked into their UTC parts (project convention),
// so read UTC hours/minutes directly — no timezone conversion.
const fmtTimeLabel = (sec: number) => {
  const d = new Date(toSec(sec) * 1000);
  const h = d.getUTCHours().toString().padStart(2, "0");
  const m = d.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
};

export interface IroedDataResult {
  snapshots: Snapshot[];
  strikes: number[];
  atm: number | null;
  spot: number | null;
  /** strikes for which greeks (IV) data was unavailable */
  missing: number[];
}

function nearest(rows: PCRTimeData[], sec: number): PCRTimeData | undefined {
  let best: PCRTimeData | undefined;
  let bestDiff = Infinity;
  for (const r of rows) {
    const d = Math.abs(toSec(r.timestamp) - sec);
    if (d < bestDiff) {
      bestDiff = d;
      best = r;
    }
  }
  return best;
}

/**
 * Assembles per-timestamp option-chain snapshots (premium, OI, IV per CE/PE leg)
 * plus the index price, which the IROED engine consumes.
 */
export async function fetchIroedSnapshots(params: {
  symbol: string;
  expiry: string;
  strikeRange: number;
  timeframe: string;
  historicalDate?: string;
}): Promise<IroedDataResult> {
  const { symbol, expiry, strikeRange, timeframe, historicalDate } = params;

  const pcr = await fetchPCRData(symbol, expiry, strikeRange + 2, historicalDate);
  const rows = [...(pcr.dataWhole || [])].sort(
    (a, b) => toSec(a.timestamp) - toSec(b.timestamp)
  );
  if (!rows.length) return { snapshots: [], strikes: [], atm: null, spot: null, missing: [] };

  const last = rows[rows.length - 1];
  const atm = last.atm;
  const allStrikes = (last.dataThis || [])
    .map((d) => Number(d.Strike))
    .sort((a, b) => a - b);

  let step = 50;
  for (let i = 1; i < allStrikes.length; i++) {
    const d = allStrikes[i] - allStrikes[i - 1];
    if (d > 0) step = Math.min(step, d);
  }

  const strikes = allStrikes.filter(
    (s) => Math.abs(s - atm) <= strikeRange * step + 1
  );

  // Fetch IV / OI / LTP series per strike per side
  const results = await Promise.all(
    strikes.flatMap((strike) =>
      (["Call", "Put"] as const).map(async (side) => {
        try {
          const res = await fetchGreeksData(symbol, expiry, strike, side, timeframe);
          const raw = side === "Call" ? res.callData : res.putData;
          return { strike, side, raw: raw || {} };
        } catch {
          return { strike, side, raw: {} as Record<string, number[]> };
        }
      })
    )
  );

  const missing: number[] = [];
  // strike -> side -> timestamp(sec) -> leg
  const legMap = new Map<
    string,
    Map<number, { ltp: number; oi: number; iv: number }>
  >();
  const timestamps = new Set<number>();

  for (const r of results) {
    const entries = Object.entries(r.raw);
    if (!entries.length) {
      if (!missing.includes(r.strike)) missing.push(r.strike);
      continue;
    }
    const m = new Map<number, { ltp: number; oi: number; iv: number }>();
    for (const [ts, v] of entries) {
      const sec = toSec(parseInt(ts, 10));
      if (!Number.isFinite(sec)) continue;
      const ltp = v[0] || 0;
      const oi = v[1] || 0;
      const iv = v[2] || 0;
      if (!ltp && !oi) continue;
      m.set(sec, { ltp, oi, iv });
      timestamps.add(sec);
    }
    legMap.set(`${r.strike}|${r.side}`, m);
  }

  const sortedTs = [...timestamps].sort((a, b) => a - b);

  const snapshots: Snapshot[] = sortedTs.map((sec) => {
    const ref = nearest(rows, sec);
    const strikeQuotes: StrikeQuote[] = strikes.map((strike) => {
      const ce = legMap.get(`${strike}|Call`)?.get(sec);
      const pe = legMap.get(`${strike}|Put`)?.get(sec);
      return { strike, ce, pe };
    });
    return {
      timestamp: sec,
      time: ref?.time ? fmtTimeLabel(sec) : fmtTimeLabel(sec),
      index: ref?.underlyning ?? 0,
      atm: ref?.atm ?? atm,
      strikes: strikeQuotes,
    };
  });

  return {
    snapshots: snapshots.filter((s) => s.index > 0),
    strikes,
    atm,
    spot: last.underlyning ?? null,
    missing,
  };
}
