import { ChainStrike } from "@/utils/nitinBhaiyaEngine";

/**
 * Premium Decay engine — Method A (Far-OTM equidistant), Nitin framework.
 *
 * Normalized premium: ITM → premium - |spot - strike| (extrinsic only)
 *                     OTM → premium + |strike - spot| (framework adjustment)
 * Then normalized % = adjusted / spot * 100 so levels are comparable across spot moves.
 *
 * Rule: CE Decay < PE Decay → CE holds value better → Bullish decay bias (and vice versa).
 */

export interface DecayPair {
  distance: number;      // strikes away from ATM (1..5)
  ceStrike: number;
  peStrike: number;
  ceBaseNorm: number | null;
  ceNowNorm: number | null;
  peBaseNorm: number | null;
  peNowNorm: number | null;
  ceDecay: number | null;   // % decay vs baseline (positive = premium eroded)
  peDecay: number | null;
  ceRetention: number | null;
  peRetention: number | null;
  betterSide: "CE" | "PE" | "—";
}

export interface DecaySnapshot {
  spot: number;
  atm: number;
  avgCeDecay: number | null;
  avgPeDecay: number | null;
  avgCeRetention: number | null;
  avgPeRetention: number | null;
  betterSide: "CE" | "PE" | "—";
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
}

/**
 * Adjusted premium % as per the source Excel model:
 *  ATM  -> premium / ATM strike * 100 (no adjustment)
 *  ITM  -> (premium - distance from ATM) / ATM strike * 100
 *  OTM  -> (premium + distance from ATM) / ATM strike * 100
 * Distance and denominator are both based on the ATM STRIKE (not spot).
 */
export function normalizedPremium(ltp: number, strike: number, atm: number, side: "ce" | "pe"): number | null {
  if (!ltp || !atm) return null;
  const distance = Math.abs(strike - atm);
  const itm = side === "ce" ? strike < atm : strike > atm;
  const adjusted = distance === 0 ? ltp : itm ? ltp - distance : ltp + distance;
  if (adjusted <= 0) return null;
  return (adjusted / atm) * 100;
}

function decayPct(now: number | null, base: number | null): number | null {
  if (now === null || base === null || !base) return null;
  return ((base - now) / base) * 100;
}

function retention(now: number | null, base: number | null): number | null {
  if (now === null || base === null || !base) return null;
  return (now / base) * 100;
}

/** ATM strike and step from a chain. */
export function chainAtm(chain: ChainStrike[]): { atm: number; step: number; spot: number } {
  const spot = chain.find((c) => c.spot)?.spot ?? 0;
  if (!chain.length || !spot) return { atm: 0, step: 0, spot };
  const atmRow = chain.reduce((p, c) => (Math.abs(c.strike - spot) < Math.abs(p.strike - spot) ? c : p), chain[0]);
  const idx = chain.findIndex((c) => c.strike === atmRow.strike);
  const step = idx > 0 ? Math.abs(chain[idx].strike - chain[idx - 1].strike) : idx + 1 < chain.length ? Math.abs(chain[idx + 1].strike - chain[idx].strike) : 50;
  return { atm: atmRow.strike, step, spot };
}

/**
 * Select fixed equidistant pairs from the BASELINE chain (strikes fixed at 09:45 ATM ±pairs),
 * then measure current chain premiums on those same strikes.
 */
export function computeDecayPairs(current: ChainStrike[], baseline: ChainStrike[], pairs = 5): DecayPair[] {
  const { atm, step } = chainAtm(baseline.length ? baseline : current);
  if (!atm || !step) return [];
  const curMap = new Map(current.map((c) => [c.strike, c]));
  const baseMap = new Map(baseline.map((c) => [c.strike, c]));
  const out: DecayPair[] = [];
  for (let i = pairs; i >= 1; i--) {
    const ceStrike = atm + i * step;
    const peStrike = atm - i * step;
    const curCe = curMap.get(ceStrike); const baseCe = baseMap.get(ceStrike);
    const curPe = curMap.get(peStrike); const basePe = baseMap.get(peStrike);
    const ceNowNorm = curCe ? normalizedPremium(curCe.ce.ltp, ceStrike, curCe.spot, "ce") : null;
    const ceBaseNorm = baseCe ? normalizedPremium(baseCe.ce.ltp, ceStrike, baseCe.spot, "ce") : null;
    const peNowNorm = curPe ? normalizedPremium(curPe.pe.ltp, peStrike, curPe.spot, "pe") : null;
    const peBaseNorm = basePe ? normalizedPremium(basePe.pe.ltp, peStrike, basePe.spot, "pe") : null;
    const ceDecay = decayPct(ceNowNorm, ceBaseNorm);
    const peDecay = decayPct(peNowNorm, peBaseNorm);
    let betterSide: DecayPair["betterSide"] = "—";
    if (ceDecay !== null && peDecay !== null) betterSide = ceDecay < peDecay ? "CE" : ceDecay > peDecay ? "PE" : "—";
    out.push({ distance: i, ceStrike, peStrike, ceBaseNorm, ceNowNorm, peBaseNorm, peNowNorm, ceDecay, peDecay, ceRetention: retention(ceNowNorm, ceBaseNorm), peRetention: retention(peNowNorm, peBaseNorm), betterSide });
  }
  return out;
}

const avg = (vals: (number | null)[]): number | null => {
  const v = vals.filter((x): x is number => x !== null && Number.isFinite(x));
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};

/** Aggregate a snapshot into the decay verdict. */
export function summarizeDecay(pairs: DecayPair[], spot: number, atm: number): DecaySnapshot {
  const avgCeDecay = avg(pairs.map((p) => p.ceDecay));
  const avgPeDecay = avg(pairs.map((p) => p.peDecay));
  let betterSide: DecaySnapshot["betterSide"] = "—";
  let sentiment: DecaySnapshot["sentiment"] = "NEUTRAL";
  if (avgCeDecay !== null && avgPeDecay !== null) {
    const diff = avgCeDecay - avgPeDecay; // +ve => CE decaying more => PE holds better => bearish
    if (Math.abs(diff) < 1) { betterSide = "—"; sentiment = "NEUTRAL"; }
    else if (diff < 0) { betterSide = "CE"; sentiment = "BULLISH"; }
    else { betterSide = "PE"; sentiment = "BEARISH"; }
  }
  return {
    spot, atm, avgCeDecay, avgPeDecay,
    avgCeRetention: avg(pairs.map((p) => p.ceRetention)),
    avgPeRetention: avg(pairs.map((p) => p.peRetention)),
    betterSide, sentiment,
  };
}
