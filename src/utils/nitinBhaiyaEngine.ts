export type Direction = "bullish" | "bearish" | "neutral";
export type Activity = "Fresh Long" | "Fresh Short" | "Short Covering" | "Long Unwinding" | "Neutral";

export interface ChainSide {
  oi: number;
  prevOi: number;
  coi: number;
  ltp: number;
  iv: number;
  volume: number;
  delta: number;
  theta: number;
  gamma: number;
  vega: number;
}

export interface ChainStrike {
  strike: number;
  spot: number;
  ce: ChainSide;
  pe: ChainSide;
}

export interface EngineSignal {
  key: string;
  label: string;
  direction: Direction;
  weight: number;
  contribution: number;
  detail: string;
  available: boolean;
}

export interface EngineResult {
  atm: number;
  support: ChainStrike | null;
  resistance: ChainStrike | null;
  pcrCoi: number | null;
  writerSignal: Direction;
  decaySignal: Direction;
  ceDecay: number | null;
  peDecay: number | null;
  eoh: boolean;
  signals: EngineSignal[];
  score: number;
  sentiment: "STRONG BULLISH" | "BULLISH" | "RANGE-BOUND" | "BEARISH" | "STRONG BEARISH" | "EXCHANGE OF HANDS" | "CONFLICT" | "WAIT";
  agreeingEngines: number;
}

const decayPct = (now: number, base: number) => base ? ((base - now) / Math.abs(base)) * 100 : null;

export function classifyActivity(coi: number, premiumChange: number): Activity {
  if (coi > 0 && premiumChange > 0) return "Fresh Long";
  if (coi > 0 && premiumChange < 0) return "Fresh Short";
  if (coi < 0 && premiumChange > 0) return "Short Covering";
  if (coi < 0 && premiumChange < 0) return "Long Unwinding";
  return "Neutral";
}

function normalizeScore(signals: EngineSignal[]) {
  return Math.max(-50, Math.min(50, signals.reduce((sum, signal) => sum + signal.contribution, 0)));
}

export function runNitinBhaiyaEngine(current: ChainStrike[], baseline: ChainStrike[]): EngineResult {
  if (!current.length) {
    return { atm: 0, support: null, resistance: null, pcrCoi: null, writerSignal: "neutral", decaySignal: "neutral", ceDecay: null, peDecay: null, eoh: false, signals: [], score: 0, sentiment: "WAIT", agreeingEngines: 0 };
  }
  const spot = current[0].spot;
  const atmRow = current.reduce((best, row) => Math.abs(row.strike - spot) < Math.abs(best.strike - spot) ? row : best);
  const atmIndex = current.findIndex((row) => row.strike === atmRow.strike);
  const window = current.slice(Math.max(0, atmIndex - 2), atmIndex + 3);
  const baselineMap = new Map(baseline.map((row) => [row.strike, row]));
  const baseAtm = baselineMap.get(atmRow.strike);
  const cePremiumChange = baseAtm ? atmRow.ce.ltp - baseAtm.ce.ltp : 0;
  const pePremiumChange = baseAtm ? atmRow.pe.ltp - baseAtm.pe.ltp : 0;
  const ceIvChange = baseAtm ? atmRow.ce.iv - baseAtm.ce.iv : 0;
  const peIvChange = baseAtm ? atmRow.pe.iv - baseAtm.pe.iv : 0;
  const ceWriting = atmRow.ce.coi > 0 && cePremiumChange < 0 && ceIvChange <= 0;
  const peWriting = atmRow.pe.coi > 0 && pePremiumChange < 0 && peIvChange <= 0;
  const writerSignal: Direction = peWriting === ceWriting ? "neutral" : peWriting ? "bullish" : "bearish";

  const ceDecays = window.map((row) => {
    const base = baselineMap.get(row.strike);
    return base ? decayPct(row.ce.ltp, base.ce.ltp) : null;
  }).filter((value): value is number => value !== null);
  const peDecays = window.map((row) => {
    const base = baselineMap.get(row.strike);
    return base ? decayPct(row.pe.ltp, base.pe.ltp) : null;
  }).filter((value): value is number => value !== null);
  const ceDecay = ceDecays.length ? ceDecays.reduce((a, b) => a + b, 0) / ceDecays.length : null;
  const peDecay = peDecays.length ? peDecays.reduce((a, b) => a + b, 0) / peDecays.length : null;
  const decaySignal: Direction = ceDecay === null || peDecay === null || ceDecay === peDecay ? "neutral" : ceDecay < peDecay ? "bullish" : "bearish";

  const ceCoi = window.reduce((sum, row) => sum + Math.max(0, row.ce.coi), 0);
  const peCoi = window.reduce((sum, row) => sum + Math.max(0, row.pe.coi), 0);
  const pcrCoi = ceCoi ? peCoi / ceCoi : null;
  const coiDirection: Direction = peCoi === ceCoi ? "neutral" : peCoi > ceCoi ? "bullish" : "bearish";
  const ivDirection: Direction = !baseAtm ? "neutral" : ceIvChange > 0 && peIvChange <= 0 ? "bullish" : peIvChange > 0 && ceIvChange <= 0 ? "bearish" : "neutral";
  const totalVolume = window.reduce((sum, row) => sum + row.ce.volume + row.pe.volume, 0);
  const netCoi = window.reduce((sum, row) => sum + Math.abs(row.ce.coi) + Math.abs(row.pe.coi), 0);
  const eoh = totalVolume > 0 && netCoi / totalVolume < 0.05;
  const resistance = current.reduce((best, row) => row.ce.oi > (best?.ce.oi ?? -1) ? row : best, null as ChainStrike | null);
  const support = current.reduce((best, row) => row.pe.oi > (best?.pe.oi ?? -1) ? row : best, null as ChainStrike | null);
  const itmCe = current.find((row) => row.strike < spot && baselineMap.has(row.strike));
  const itmPe = [...current].reverse().find((row) => row.strike > spot && baselineMap.has(row.strike));
  let itmDirection: Direction = "neutral";
  if (itmCe && itmPe) {
    const ceBase = baselineMap.get(itmCe.strike);
    const peBase = baselineMap.get(itmPe.strike);
    if (ceBase && peBase) {
      const ceDiscount = ceBase.ce.ltp - itmCe.ce.ltp;
      const peDiscount = peBase.pe.ltp - itmPe.pe.ltp;
      itmDirection = peDiscount === ceDiscount ? "neutral" : peDiscount > ceDiscount ? "bullish" : "bearish";
    }
  }
  const makeSignal = (key: string, label: string, direction: Direction, weight: number, detail: string, available = true): EngineSignal => ({
    key, label, direction, weight, detail, available,
    contribution: available ? (direction === "bullish" ? weight * 50 : direction === "bearish" ? -weight * 50 : 0) : 0,
  });
  const signals = [
    makeSignal("writer", "Writer Signal", writerSignal, 0.25, peWriting && ceWriting ? "Both sides writing" : peWriting ? "PE writing active" : ceWriting ? "CE writing active" : "No confirmed writer", Boolean(baseAtm)),
    makeSignal("decay", "Relative Decay", decaySignal, 0.20, ceDecay === null || peDecay === null ? "09:45 reference unavailable" : `CE ${ceDecay.toFixed(2)}% · PE ${peDecay.toFixed(2)}%`, ceDecay !== null && peDecay !== null),
    makeSignal("iv", "IV Rate of Change", ivDirection, 0.20, baseAtm ? `CE ${ceIvChange.toFixed(2)} · PE ${peIvChange.toFixed(2)}` : "09:45 reference unavailable", Boolean(baseAtm)),
    makeSignal("eoh", "Exchange of Hands", eoh ? "neutral" : coiDirection, 0.10, eoh ? "High volume / low net COI" : "No EoH condition"),
    makeSignal("participant", "Participant OI", "neutral", 0.10, "Daily participant confirmation pending", false),
    makeSignal("vix", "VIX Regime", "neutral", 0.08, "VIX context unavailable in chain response", false),
    makeSignal("itm", "ITM Discount", itmDirection, 0.07, itmDirection === "neutral" ? "No clear discount edge" : `${itmDirection} cross-check`, Boolean(itmCe && itmPe)),
  ];
  const score = normalizeScore(signals);
  const bullishCount = signals.filter((s) => s.available && s.direction === "bullish").length;
  const bearishCount = signals.filter((s) => s.available && s.direction === "bearish").length;
  const agreeingEngines = Math.max(bullishCount, bearishCount);
  const conflict = ivDirection !== "neutral" && decaySignal !== "neutral" && ivDirection !== decaySignal;
  let sentiment: EngineResult["sentiment"];
  if (eoh) sentiment = "EXCHANGE OF HANDS";
  else if (conflict) sentiment = "CONFLICT";
  else if (agreeingEngines < 2) sentiment = "WAIT";
  else if (score >= 35) sentiment = "STRONG BULLISH";
  else if (score >= 15) sentiment = "BULLISH";
  else if (score > -15) sentiment = "RANGE-BOUND";
  else if (score > -35) sentiment = "BEARISH";
  else sentiment = "STRONG BEARISH";
  return { atm: atmRow.strike, support, resistance, pcrCoi, writerSignal, decaySignal, ceDecay, peDecay, eoh, signals, score, sentiment, agreeingEngines };
}
