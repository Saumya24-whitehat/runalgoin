/**
 * IROED Market Sentiment Engine
 * Index-Relative Open Interest, Extrinsic Decay & IV Market Sentiment Engine
 *
 * MarketSentiment = f(COI, ExtrinsicDecay, IV, WriterActivity, BuyerActivity, IndexRevisit)
 */

export type OptionSide = "CE" | "PE";

export type Activity =
  | "Strong Writer"
  | "Writer"
  | "Strong Buyer"
  | "Buyer"
  | "Long Unwinding"
  | "Short Covering"
  | "Mixed"
  | "Flat";

export type Sentiment =
  | "STRONG BULLISH"
  | "BULLISH"
  | "MILD BULLISH"
  | "NEUTRAL"
  | "MILD BEARISH"
  | "BEARISH"
  | "STRONG BEARISH";

export type ConfidenceBand =
  | "Very High"
  | "High"
  | "Medium"
  | "Low"
  | "Very Low";

/** One option leg reading at a snapshot */
export interface LegQuote {
  ltp: number;
  oi: number;
  iv: number;
  volume?: number;
}

export interface StrikeQuote {
  strike: number;
  ce?: LegQuote;
  pe?: LegQuote;
}

/** Raw input snapshot (one timestamp) */
export interface Snapshot {
  timestamp: number;
  time: string;
  index: number;
  atm: number;
  strikes: StrikeQuote[];
}

export interface EngineConfig {
  binSize: number;
  strikeRange: number;
  /** minimum extrinsic value to trust decay maths */
  minExtrinsic: number;
  /** bins the index must travel away before a re-entry counts as a new visit */
  exitBuffer: number;
  /** EMA smoothing factor */
  alpha: number;
}

export const DEFAULT_CONFIG: EngineConfig = {
  binSize: 20,
  strikeRange: 5,
  minExtrinsic: 3,
  exitBuffer: 1,
  alpha: 0.4,
};

export interface StrikeLegResult {
  strike: number;
  side: OptionSide;
  ltp: number;
  oi: number;
  iv: number;
  coi: number;
  positiveCoi: number;
  ivChange: number;
  intrinsic: number;
  extrinsic: number;
  extrinsicChange: number;
  /** same-level decay % vs previous visit (null when unavailable) */
  sameLevelDecayPct: number | null;
  sameLevelIvChange: number | null;
  activity: Activity;
  isWriter: boolean;
  isBuyer: boolean;
  writerScore: number;
}

export interface EngineRow {
  timestamp: number;
  time: string;
  index: number;
  indexBin: number;
  atm: number;

  cePositiveCoi: number;
  pePositiveCoi: number;
  coiBias: number;

  ceWeightedDecay: number | null;
  peWeightedDecay: number | null;
  decayBias: number | null;

  ceWriterRatio: number;
  peWriterRatio: number;
  writerBias: number;

  ceBuyerRatio: number;
  peBuyerRatio: number;
  buyerBias: number;

  ceIvChange: number;
  peIvChange: number;

  ceWall: number | null;
  ceWallScore: number;
  peWall: number | null;
  peWallScore: number;

  rawScore: number;
  smoothedScore: number;
  scoreMomentum: number;

  sentiment: Sentiment;
  confidence: number;
  confidenceBand: ConfidenceBand;
  availability: number;
  agreement: number;
  dataQuality: number;

  persistence: number;
  visitNumber: number;
  referenceTime: string | null;

  dominantActivity: string;
  legs: StrikeLegResult[];
}

const WEIGHTS = { coi: 0.25, decay: 0.3, writer: 0.3, buyer: 0.15 };

export function normalize(diff: number, total: number): number {
  if (!total) return 0;
  return (100 * diff) / total;
}

export function indexBin(index: number, binSize: number): number {
  return Math.round(index / binSize) * binSize;
}

export function classifySentiment(score: number): Sentiment {
  if (score >= 60) return "STRONG BULLISH";
  if (score >= 30) return "BULLISH";
  if (score >= 10) return "MILD BULLISH";
  if (score > -10) return "NEUTRAL";
  if (score > -30) return "MILD BEARISH";
  if (score > -60) return "BEARISH";
  return "STRONG BEARISH";
}

export function confidenceBand(c: number): ConfidenceBand {
  if (c >= 80) return "Very High";
  if (c >= 65) return "High";
  if (c >= 50) return "Medium";
  if (c >= 35) return "Low";
  return "Very Low";
}

function intrinsicOf(side: OptionSide, index: number, strike: number): number {
  return side === "CE" ? Math.max(index - strike, 0) : Math.max(strike - index, 0);
}

function classifyActivity(
  coi: number,
  ivChange: number,
  extrinsicChange: number
): Activity {
  const flatIv = Math.abs(ivChange) < 0.05;
  if (coi > 0) {
    if (extrinsicChange < 0 && ivChange < 0) return "Strong Writer";
    if (extrinsicChange < 0 && flatIv) return "Writer";
    if (extrinsicChange > 0 && ivChange > 0) return "Strong Buyer";
    if (extrinsicChange > 0 && flatIv) return "Buyer";
    return "Mixed";
  }
  if (coi < 0) {
    if (extrinsicChange < 0) return "Long Unwinding";
    return "Short Covering";
  }
  return "Flat";
}

/** Sentiment implied by a single leg's activity */
export function legSentiment(side: OptionSide, activity: Activity): string {
  const map: Record<string, string> = {
    "CE|Strong Writer": "Strong Bearish",
    "CE|Writer": "Bearish",
    "CE|Strong Buyer": "Strong Bullish",
    "CE|Buyer": "Bullish",
    "PE|Strong Writer": "Strong Bullish",
    "PE|Writer": "Bullish",
    "PE|Strong Buyer": "Strong Bearish",
    "PE|Buyer": "Bearish",
    "CE|Long Unwinding": "Mild Bearish",
    "CE|Short Covering": "Mild Bullish",
    "PE|Long Unwinding": "Mild Bullish",
    "PE|Short Covering": "Mild Bearish",
  };
  return map[`${side}|${activity}`] || "Neutral";
}

interface Visit {
  bin: number;
  visitNumber: number;
  /** index of last snapshot inside this visit */
  lastIdx: number;
  firstIdx: number;
}

interface VisitTracking {
  visitNumber: number;
  /** reference snapshot index = last snapshot of the previous visit to this bin */
  prevVisitIdx: number | null;
  /** first snapshot of the first visit of the day to this bin */
  firstVisitIdx: number | null;
}

/**
 * Detect index-bin visits with an exit buffer (hysteresis) so that a
 * continuous stay inside the same zone counts as a single visit.
 */
function trackVisits(snapshots: Snapshot[], cfg: EngineConfig): VisitTracking[] {
  const history: Visit[] = [];
  const out: VisitTracking[] = [];
  let current: Visit | null = null;

  snapshots.forEach((snap, i) => {
    const bin = indexBin(snap.index, cfg.binSize);
    const sameZone =
      current !== null &&
      Math.abs(bin - current.bin) <= cfg.exitBuffer * cfg.binSize;

    if (sameZone && current) {
      current.lastIdx = i;
      const prior = history.filter((v) => v.bin === current!.bin);
      out.push({
        visitNumber: current.visitNumber,
        prevVisitIdx: prior.length ? prior[prior.length - 1].lastIdx : null,
        firstVisitIdx: prior.length ? prior[0].firstIdx : current.firstIdx,
      });
      return;
    }

    if (current) history.push(current);
    const prior = history.filter((v) => v.bin === bin);
    current = {
      bin,
      visitNumber: prior.length + 1,
      firstIdx: i,
      lastIdx: i,
    };
    out.push({
      visitNumber: current.visitNumber,
      prevVisitIdx: prior.length ? prior[prior.length - 1].lastIdx : null,
      firstVisitIdx: prior.length ? prior[0].firstIdx : i,
    });
  });

  return out;
}

function selectedStrikes(snap: Snapshot, cfg: EngineConfig): StrikeQuote[] {
  const step = strikeStep(snap.strikes);
  const lo = snap.atm - cfg.strikeRange * step;
  const hi = snap.atm + cfg.strikeRange * step;
  return snap.strikes
    .filter((s) => s.strike >= lo - 1 && s.strike <= hi + 1)
    .sort((a, b) => a.strike - b.strike);
}

export function strikeStep(strikes: StrikeQuote[]): number {
  const sorted = [...strikes].map((s) => s.strike).sort((a, b) => a - b);
  let step = Infinity;
  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i] - sorted[i - 1];
    if (d > 0) step = Math.min(step, d);
  }
  return Number.isFinite(step) ? step : 50;
}

function quoteAt(snap: Snapshot | undefined, strike: number) {
  return snap?.strikes.find((s) => s.strike === strike);
}

export function runIroedEngine(
  snapshots: Snapshot[],
  config: Partial<EngineConfig> = {}
): EngineRow[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const ordered = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);
  const visits = trackVisits(ordered, cfg);
  const rows: EngineRow[] = [];

  for (let i = 1; i < ordered.length; i++) {
    const snap = ordered[i];
    const prev = ordered[i - 1];
    const visit = visits[i];
    const refSnap =
      visit.prevVisitIdx !== null ? ordered[visit.prevVisitIdx] : undefined;

    const legs: StrikeLegResult[] = [];

    for (const sq of selectedStrikes(snap, cfg)) {
      const prevQ = quoteAt(prev, sq.strike);
      const refQ = quoteAt(refSnap, sq.strike);

      (["CE", "PE"] as OptionSide[]).forEach((side) => {
        const key = side === "CE" ? "ce" : "pe";
        const cur = sq[key];
        const old = prevQ?.[key];
        if (!cur || !old || !cur.ltp || !cur.oi) return;

        const intrinsic = intrinsicOf(side, snap.index, sq.strike);
        const extrinsic = Math.max(cur.ltp - intrinsic, 0);
        const prevExtrinsic = Math.max(
          old.ltp - intrinsicOf(side, prev.index, sq.strike),
          0
        );

        const coi = cur.oi - old.oi;
        const ivChange = cur.iv && old.iv ? cur.iv - old.iv : 0;
        const extrinsicChange = extrinsic - prevExtrinsic;

        let sameLevelDecayPct: number | null = null;
        let sameLevelIvChange: number | null = null;
        const refLeg = refQ?.[key];
        if (refLeg && refLeg.ltp && refSnap) {
          const refExtrinsic = Math.max(
            refLeg.ltp - intrinsicOf(side, refSnap.index, sq.strike),
            0
          );
          if (refExtrinsic >= cfg.minExtrinsic) {
            sameLevelDecayPct =
              ((refExtrinsic - extrinsic) / refExtrinsic) * 100;
          }
          if (refLeg.iv && cur.iv) sameLevelIvChange = cur.iv - refLeg.iv;
        }

        const activity = classifyActivity(coi, ivChange, extrinsicChange);
        const isWriter = activity === "Strong Writer" || activity === "Writer";
        const isBuyer = activity === "Strong Buyer" || activity === "Buyer";
        const writerScore = isWriter
          ? Math.max(coi, 0) * (activity === "Strong Writer" ? 1 : 0.6)
          : 0;

        legs.push({
          strike: sq.strike,
          side,
          ltp: cur.ltp,
          oi: cur.oi,
          iv: cur.iv,
          coi,
          positiveCoi: Math.max(coi, 0),
          ivChange,
          intrinsic,
          extrinsic,
          extrinsicChange,
          sameLevelDecayPct,
          sameLevelIvChange,
          activity,
          isWriter,
          isBuyer,
          writerScore,
        });
      });
    }

    if (!legs.length) continue;

    const ce = legs.filter((l) => l.side === "CE");
    const pe = legs.filter((l) => l.side === "PE");
    const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0);

    const cePositiveCoi = sum(ce.map((l) => l.positiveCoi));
    const pePositiveCoi = sum(pe.map((l) => l.positiveCoi));
    const coiBias = normalize(
      pePositiveCoi - cePositiveCoi,
      pePositiveCoi + cePositiveCoi
    );

    // OI weighted same-level decay
    const weightedDecay = (arr: StrikeLegResult[]): number | null => {
      const valid = arr.filter((l) => l.sameLevelDecayPct !== null && l.oi > 0);
      if (!valid.length) return null;
      const w = sum(valid.map((l) => l.oi));
      if (!w) return null;
      return sum(valid.map((l) => (l.sameLevelDecayPct as number) * l.oi)) / w;
    };
    const ceWeightedDecay = weightedDecay(ce);
    const peWeightedDecay = weightedDecay(pe);

    let decayBias: number | null = null;
    if (ceWeightedDecay !== null || peWeightedDecay !== null) {
      const ced = Math.max(ceWeightedDecay ?? 0, 0);
      const ped = Math.max(peWeightedDecay ?? 0, 0);
      decayBias = normalize(ped - ced, ped + ced);
      // decay must be confirmed by fresh OI on the same side
      if (decayBias > 0 && pePositiveCoi <= 0) decayBias *= 0.5;
      if (decayBias < 0 && cePositiveCoi <= 0) decayBias *= 0.5;
    }

    const ratio = (arr: StrikeLegResult[], pick: (l: StrikeLegResult) => boolean) => {
      const total = sum(arr.map((l) => l.positiveCoi));
      if (!total) return 0;
      return (100 * sum(arr.filter(pick).map((l) => l.positiveCoi))) / total;
    };

    const ceWriterRatio = ratio(ce, (l) => l.isWriter);
    const peWriterRatio = ratio(pe, (l) => l.isWriter);
    const ceBuyerRatio = ratio(ce, (l) => l.isBuyer);
    const peBuyerRatio = ratio(pe, (l) => l.isBuyer);

    const writerBias = peWriterRatio - ceWriterRatio;
    const buyerBias = ceBuyerRatio - peBuyerRatio;

    const avgIv = (arr: StrikeLegResult[]) =>
      arr.length ? sum(arr.map((l) => l.ivChange)) / arr.length : 0;
    const ceIvChange = avgIv(ce);
    const peIvChange = avgIv(pe);

    // Final score with weight re-normalisation
    const components: { value: number; weight: number }[] = [
      { value: coiBias, weight: WEIGHTS.coi },
      { value: writerBias, weight: WEIGHTS.writer },
      { value: buyerBias, weight: WEIGHTS.buyer },
    ];
    if (decayBias !== null)
      components.push({ value: decayBias, weight: WEIGHTS.decay });

    const totalWeight = sum(components.map((c) => c.weight));
    const rawScore =
      totalWeight > 0
        ? sum(components.map((c) => c.value * c.weight)) / totalWeight
        : 0;

    const prevRow = rows[rows.length - 1];
    const smoothedScore = prevRow
      ? cfg.alpha * rawScore + (1 - cfg.alpha) * prevRow.smoothedScore
      : rawScore;
    const scoreMomentum = prevRow ? rawScore - prevRow.rawScore : 0;

    const sentiment = classifySentiment(smoothedScore);

    // Confidence
    const availability = (totalWeight / 1) * 100;
    const dir = Math.sign(rawScore);
    const agreeList = components.filter((c) => Math.sign(c.value) === dir && dir !== 0);
    const agreement = components.length
      ? (agreeList.length / components.length) * 100
      : 0;

    const usable = legs.filter(
      (l) => l.iv > 0 && l.oi > 0 && l.extrinsic >= cfg.minExtrinsic
    ).length;
    const dataQuality = legs.length ? (usable / legs.length) * 100 : 0;

    const confidence =
      0.4 * availability + 0.4 * agreement + 0.2 * dataQuality;

    // Writer walls
    const bestWall = (arr: StrikeLegResult[]) => {
      const cands = arr.filter((l) => l.writerScore > 0);
      if (!cands.length) return { strike: null as number | null, score: 0 };
      const best = cands.reduce((a, b) => (b.writerScore > a.writerScore ? b : a));
      return { strike: best.strike, score: best.writerScore };
    };
    const ceWall = bestWall(ce);
    const peWall = bestWall(pe);

    // Persistence of directional sentiment
    const bullish = smoothedScore >= 10;
    const bearish = smoothedScore <= -10;
    let persistence = 0;
    if (bullish || bearish) {
      persistence = 1;
      for (let k = rows.length - 1; k >= 0; k--) {
        const s = rows[k].smoothedScore;
        if ((bullish && s >= 10) || (bearish && s <= -10)) persistence++;
        else break;
      }
    }

    // Dominant activity label
    const dominantActivity = (() => {
      const ceW = ceWriterRatio;
      const peW = peWriterRatio;
      const strong = Math.abs(ceW - peW) >= 40;
      if (peW > ceW + 10) return strong ? "Strong PE Writing" : "PE Writing";
      if (ceW > peW + 10) return strong ? "Strong CE Writing" : "CE Writing";
      if (ceBuyerRatio > peBuyerRatio + 15) return "CE Buying";
      if (peBuyerRatio > ceBuyerRatio + 15) return "PE Buying";
      return "Mixed Writers";
    })();

    rows.push({
      timestamp: snap.timestamp,
      time: snap.time,
      index: snap.index,
      indexBin: indexBin(snap.index, cfg.binSize),
      atm: snap.atm,
      cePositiveCoi,
      pePositiveCoi,
      coiBias,
      ceWeightedDecay,
      peWeightedDecay,
      decayBias,
      ceWriterRatio,
      peWriterRatio,
      writerBias,
      ceBuyerRatio,
      peBuyerRatio,
      buyerBias,
      ceIvChange,
      peIvChange,
      ceWall: ceWall.strike,
      ceWallScore: ceWall.score,
      peWall: peWall.strike,
      peWallScore: peWall.score,
      rawScore,
      smoothedScore,
      scoreMomentum,
      sentiment,
      confidence,
      confidenceBand: confidenceBand(confidence),
      availability,
      agreement,
      dataQuality,
      persistence,
      visitNumber: visit.visitNumber,
      referenceTime: refSnap ? refSnap.time : null,
      dominantActivity,
      legs,
    });
  }

  return rows;
}

export const sentimentColor: Record<Sentiment, string> = {
  "STRONG BULLISH": "text-emerald-400",
  BULLISH: "text-emerald-500",
  "MILD BULLISH": "text-emerald-600",
  NEUTRAL: "text-muted-foreground",
  "MILD BEARISH": "text-red-600",
  BEARISH: "text-red-500",
  "STRONG BEARISH": "text-red-400",
};

export const activityColor: Record<Activity, string> = {
  "Strong Writer": "bg-sky-500/20 text-sky-400",
  Writer: "bg-sky-500/10 text-sky-500",
  "Strong Buyer": "bg-emerald-500/20 text-emerald-400",
  Buyer: "bg-emerald-500/10 text-emerald-500",
  "Long Unwinding": "bg-amber-500/15 text-amber-500",
  "Short Covering": "bg-violet-500/15 text-violet-500",
  Mixed: "bg-muted text-muted-foreground",
  Flat: "bg-muted text-muted-foreground",
};
