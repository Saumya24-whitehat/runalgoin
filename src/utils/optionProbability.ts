// Option chain probability calculator (Excel NORMSDIST based)

export function normsdist(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = 1 - d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x >= 0 ? p : 1 - p;
}

export interface ProbabilityResult {
  zScore: number;
  expectedVol: number;
  winning: number; // %
  opposite: number; // %
}

/** Put side target (target < CMP): NORMSDIST(LN(target/cmp)/(putIv*SQRT(days/365))) */
export function putTargetProbability(cmp: number, target: number, putIvPct: number, days: number): ProbabilityResult | null {
  if (cmp <= 0 || target <= 0 || putIvPct <= 0 || days <= 0) return null;
  const expectedVol = (putIvPct / 100) * Math.sqrt(days / 365);
  if (!expectedVol) return null;
  const zScore = Math.log(target / cmp) / expectedVol;
  const winning = normsdist(zScore) * 100;
  return { zScore, expectedVol, winning, opposite: 100 - winning };
}

/** Call side target (target > CMP): 1 - NORMSDIST(LN(target/cmp)/(callIv*SQRT(days/365))) */
export function callTargetProbability(cmp: number, target: number, callIvPct: number, days: number): ProbabilityResult | null {
  if (cmp <= 0 || target <= 0 || callIvPct <= 0 || days <= 0) return null;
  const expectedVol = (callIvPct / 100) * Math.sqrt(days / 365);
  if (!expectedVol) return null;
  const zScore = Math.log(target / cmp) / expectedVol;
  const winning = (1 - normsdist(zScore)) * 100;
  return { zScore, expectedVol, winning, opposite: 100 - winning };
}

export function probabilitySentiment(putWin: number | null, callWin: number | null): string {
  if (putWin === null || callWin === null) return "NO DATA";
  const diff = putWin - callWin;
  if (diff > 10) return "BEARISH";
  if (diff > 3) return "MILD BEARISH";
  if (diff < -10) return "BULLISH";
  if (diff < -3) return "MILD BULLISH";
  return "NEUTRAL";
}
