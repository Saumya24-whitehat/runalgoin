import { ChainStrike } from "@/utils/nitinBhaiyaEngine";

export interface AtmProbabilityTargets {
  atm: number;
  putTarget: number;
  callTarget: number;
}

const nearestRow = (chain: ChainStrike[], target: number) =>
  chain.reduce((best, row) =>
    Math.abs(row.strike - target) < Math.abs(best.strike - target) ? row : best
  );

export function getAtmProbabilityTargets(chain: ChainStrike[]): AtmProbabilityTargets | null {
  if (!chain.length) return null;

  const spot = chain[0].spot;
  const atm = nearestRow(chain, spot).strike;
  const distance = Math.abs(atm % 100) < 0.001 ? 100 : 150;

  return {
    atm,
    putTarget: nearestRow(chain, atm - distance).strike,
    callTarget: nearestRow(chain, atm + distance).strike,
  };
}