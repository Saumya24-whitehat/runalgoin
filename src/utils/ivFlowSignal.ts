import { GreeksDataPoint } from "@/services/greeksChartApi";

export type SideSignal =
  | "Writing"
  | "Buying"
  | "Short Covering"
  | "Long Unwinding"
  | "Mixed";

export type Verdict =
  | "Very Strong Bullish"
  | "Strong Bullish"
  | "Bullish"
  | "Range / Neutral"
  | "Bearish"
  | "Strong Bearish"
  | "Very Strong Bearish";

export interface IvFlowRow {
  timestamp: number;
  ce: SideSnapshot;
  pe: SideSnapshot;
  verdict: Verdict;
  meaning: string;
}

export interface SideSnapshot {
  ltp: number;
  oi: number;
  iv: number;
  oiChange: number;
  premiumChange: number;
  ivChange: number;
  /** IV rate of change vs first non-zero IV of the day (%) */
  ivRoc: number;
  ivDir: "up" | "down" | "flat";
  signal: SideSignal;
}

const FLAT_EPS = 1e-9;

function classifySide(
  ivDir: "up" | "down" | "flat",
  oiChange: number,
  premiumChange: number
): SideSignal {
  const oiUp = oiChange > 0;
  const oiDown = oiChange < 0;
  const premUp = premiumChange > 0;
  const premDown = premiumChange < 0;

  if (ivDir === "down" && oiUp && premDown) return "Writing";
  if (ivDir === "up" && oiUp && premUp) return "Buying";
  if (ivDir === "up" && oiDown && premUp) return "Short Covering";
  if (ivDir === "down" && oiDown && premDown) return "Long Unwinding";
  return "Mixed";
}

function buildSnapshots(data: GreeksDataPoint[]): SideSnapshot[] {
  const firstIv = data.find((d) => d.iv !== 0)?.iv ?? 0;
  const snaps: SideSnapshot[] = [];

  for (let i = 1; i < data.length; i++) {
    const cur = data[i];
    const prev = data[i - 1];
    if (!cur.ltp && !cur.oi) continue;

    const oiChange = cur.oi - prev.oi;
    const premiumChange = cur.ltp - prev.ltp;
    const ivChange = cur.iv - prev.iv;
    const ivRoc = firstIv ? ((cur.iv - firstIv) / firstIv) * 100 : 0;
    const ivDir: SideSnapshot["ivDir"] =
      ivChange > FLAT_EPS ? "up" : ivChange < -FLAT_EPS ? "down" : "flat";

    snaps.push({
      ltp: cur.ltp,
      oi: cur.oi,
      iv: cur.iv,
      oiChange,
      premiumChange,
      ivChange,
      ivRoc,
      ivDir,
      signal: classifySide(ivDir, oiChange, premiumChange),
    });
  }
  return snaps;
}

function combineSignals(ce: SideSignal, pe: SideSignal): { verdict: Verdict; meaning: string } {
  // Range
  if (ce === "Writing" && pe === "Writing")
    return { verdict: "Range / Neutral", meaning: "Dono-side writing — range bound, directional move nahi." };

  // Bullish family
  if (ce === "Buying" && pe === "Writing")
    return { verdict: "Strong Bullish", meaning: "CE buying + PE writing — strong bullish pressure." };
  if (ce === "Short Covering" && pe === "Writing")
    return { verdict: "Very Strong Bullish", meaning: "CE short covering + PE writing — very strong bullish." };
  if (ce === "Buying" && pe === "Short Covering")
    return { verdict: "Strong Bullish", meaning: "CE buying + PE short covering — strong bullish." };

  // Bearish family
  if (ce === "Writing" && pe === "Buying")
    return { verdict: "Strong Bearish", meaning: "CE writing + PE buying — strong bearish pressure." };
  if (ce === "Writing" && pe === "Short Covering")
    return { verdict: "Very Strong Bearish", meaning: "CE writing + PE short covering — very strong bearish." };

  // Soft directional hints
  if (ce === "Buying")
    return { verdict: "Bullish", meaning: "CE buying dominant, PE side mixed — bullish bias." };
  if (pe === "Buying")
    return { verdict: "Bearish", meaning: "PE buying dominant, CE side mixed — bearish bias." };
  if (ce === "Writing")
    return { verdict: "Bearish", meaning: "CE writing dominant — upside capped, bearish bias." };
  if (pe === "Writing")
    return { verdict: "Bullish", meaning: "PE writing dominant — downside protected, bullish bias." };

  return { verdict: "Range / Neutral", meaning: "Mixed signals — no clear directional commitment." };
}

/**
 * Merge CE & PE candle series by timestamp and classify each candle into
 * writer/buyer signals plus an overall bullish/bearish verdict.
 */
export function analyzeIvFlow(
  callData: GreeksDataPoint[],
  putData: GreeksDataPoint[]
): IvFlowRow[] {
  const ceSnaps = buildSnapshots(callData);
  const peSnaps = buildSnapshots(putData);

  const peMap = new Map(peSnaps.map((s) => [s.timestamp, s]));
  const rows: IvFlowRow[] = [];

  for (const ce of ceSnaps) {
    const pe = peMap.get(ce.timestamp);
    if (!pe) continue;
    const { verdict, meaning } = combineSignals(ce.signal, pe.signal);
    rows.push({ timestamp: ce.timestamp, ce, pe, verdict, meaning });
  }

  return rows;
}

export interface IvFlowSummary {
  total: number;
  byVerdict: Record<Verdict, number>;
  ceBySignal: Record<SideSignal, number>;
  peBySignal: Record<SideSignal, number>;
  bullishPct: number;
  bearishPct: number;
}

export function computeIvFlowSummary(rows: IvFlowRow[]): IvFlowSummary {
  const byVerdict: Record<Verdict, number> = {
    "Very Strong Bullish": 0,
    "Strong Bullish": 0,
    Bullish: 0,
    "Range / Neutral": 0,
    Bearish: 0,
    "Strong Bearish": 0,
    "Very Strong Bearish": 0,
  };
  const blank = (): Record<SideSignal, number> => ({
    Writing: 0,
    Buying: 0,
    "Short Covering": 0,
    "Long Unwinding": 0,
    Mixed: 0,
  });
  const ceBySignal = blank();
  const peBySignal = blank();

  for (const r of rows) {
    byVerdict[r.verdict] += 1;
    ceBySignal[r.ce.signal] += 1;
    peBySignal[r.pe.signal] += 1;
  }

  const bullish = byVerdict["Very Strong Bullish"] + byVerdict["Strong Bullish"] + byVerdict["Bullish"];
  const bearish = byVerdict["Very Strong Bearish"] + byVerdict["Strong Bearish"] + byVerdict["Bearish"];
  const dir = bullish + bearish;

  return {
    total: rows.length,
    byVerdict,
    ceBySignal,
    peBySignal,
    bullishPct: dir ? (bullish / dir) * 100 : 0,
    bearishPct: dir ? (bearish / dir) * 100 : 0,
  };
}

export const verdictColor: Record<Verdict, string> = {
  "Very Strong Bullish": "text-emerald-400",
  "Strong Bullish": "text-emerald-500",
  Bullish: "text-emerald-600",
  "Range / Neutral": "text-muted-foreground",
  Bearish: "text-red-600",
  "Strong Bearish": "text-red-500",
  "Very Strong Bearish": "text-red-400",
};

export const signalColor: Record<SideSignal, string> = {
  Writing: "bg-sky-500/15 text-sky-500",
  Buying: "bg-emerald-500/15 text-emerald-500",
  "Short Covering": "bg-violet-500/15 text-violet-500",
  "Long Unwinding": "bg-amber-500/15 text-amber-500",
  Mixed: "bg-muted text-muted-foreground",
};
