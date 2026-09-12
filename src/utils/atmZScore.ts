import { ChainStrike } from "@/utils/nitinBhaiyaEngine";

export type AtmActivity = "BUYERS ACTIVE" | "WRITERS ACTIVE" | "SHORT COVERING" | "LONG UNWINDING" | "NEUTRAL";
export type AtmSentiment = "STRONG BULLISH" | "BULLISH" | "MILD BULLISH" | "NEUTRAL" | "MILD BEARISH" | "BEARISH" | "STRONG BEARISH";

export interface AtmSnapshot {
  time: string;
  spot: number;
  atm: number;
  ce: { oi: number; coi: number; premium: number; iv: number; volume: number };
  pe: { oi: number; coi: number; premium: number; iv: number; volume: number };
}

export interface MetricReading {
  change: number;
  z: number | null;
}

export interface AtmZScoreRow extends AtmSnapshot {
  cePremium: MetricReading;
  pePremium: MetricReading;
  ceCoi: MetricReading;
  peCoi: MetricReading;
  ceVolume: MetricReading;
  peVolume: MetricReading;
  ceIv: MetricReading;
  peIv: MetricReading;
  ceActivity: AtmActivity;
  peActivity: AtmActivity;
  score: number;
  sentiment: AtmSentiment;
  confirmations: number;
}

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

function expandingZ(values: number[], index: number): number | null {
  const sample = values.slice(0, index + 1).filter(Number.isFinite);
  if (sample.length < 5) return null;
  const mean = sample.reduce((sum, value) => sum + value, 0) / sample.length;
  const variance = sample.reduce((sum, value) => sum + (value - mean) ** 2, 0) / sample.length;
  const deviation = Math.sqrt(variance);
  return deviation > 0 ? clamp((values[index] - mean) / deviation, -3, 3) : 0;
}

function activity(oiChange: number, premiumChange: number): AtmActivity {
  if (oiChange > 0 && premiumChange > 0) return "BUYERS ACTIVE";
  if (oiChange > 0 && premiumChange < 0) return "WRITERS ACTIVE";
  if (oiChange < 0 && premiumChange > 0) return "SHORT COVERING";
  if (oiChange < 0 && premiumChange < 0) return "LONG UNWINDING";
  return "NEUTRAL";
}

function sideDirection(side: "ce" | "pe", value: AtmActivity) {
  const ceDirection: Record<AtmActivity, number> = {
    "BUYERS ACTIVE": 1,
    "WRITERS ACTIVE": -1,
    "SHORT COVERING": 1,
    "LONG UNWINDING": -1,
    NEUTRAL: 0,
  };
  const direction = ceDirection[value];
  return side === "ce" ? direction : -direction;
}

function sentiment(score: number): AtmSentiment {
  if (score >= 35) return "STRONG BULLISH";
  if (score >= 18) return "BULLISH";
  if (score >= 7) return "MILD BULLISH";
  if (score > -7) return "NEUTRAL";
  if (score > -18) return "MILD BEARISH";
  if (score > -35) return "BEARISH";
  return "STRONG BEARISH";
}

export function extractAtmSnapshot(time: string, chain: ChainStrike[]): AtmSnapshot | null {
  if (!chain.length) return null;
  const spot = chain[0].spot;
  const row = chain.reduce((best, item) => Math.abs(item.strike - spot) < Math.abs(best.strike - spot) ? item : best);
  return {
    time,
    spot,
    atm: row.strike,
    ce: { oi: row.ce.oi, coi: row.ce.coi, premium: row.ce.ltp, iv: row.ce.iv, volume: row.ce.volume },
    pe: { oi: row.pe.oi, coi: row.pe.coi, premium: row.pe.ltp, iv: row.pe.iv, volume: row.pe.volume },
  };
}

export function buildAtmZScoreRows(snapshots: AtmSnapshot[]): AtmZScoreRow[] {
  const ordered = [...snapshots].sort((a, b) => a.time.localeCompare(b.time));
  const changes = ordered.map((row, index) => {
    const previous = ordered[index - 1];
    const delta = (current: number, prior: number) => current - prior;
    const volumeRoc = (current: number, prior: number) => prior > 0 ? ((current - prior) / prior) * 100 : 0;
    return {
      cePremium: previous ? delta(row.ce.premium, previous.ce.premium) : 0,
      pePremium: previous ? delta(row.pe.premium, previous.pe.premium) : 0,
      ceCoi: previous ? delta(row.ce.coi, previous.ce.coi) : 0,
      peCoi: previous ? delta(row.pe.coi, previous.pe.coi) : 0,
      ceVolume: previous ? volumeRoc(row.ce.volume, previous.ce.volume) : 0,
      peVolume: previous ? volumeRoc(row.pe.volume, previous.pe.volume) : 0,
      ceIv: previous ? delta(row.ce.iv, previous.ce.iv) : 0,
      peIv: previous ? delta(row.pe.iv, previous.pe.iv) : 0,
    };
  });
  const keys = ["cePremium", "pePremium", "ceCoi", "peCoi", "ceVolume", "peVolume", "ceIv", "peIv"] as const;
  const series = Object.fromEntries(keys.map((key) => [key, changes.map((row) => row[key])])) as Record<(typeof keys)[number], number[]>;

  return ordered.map((snapshot, index) => {
    const reading = (key: (typeof keys)[number]): MetricReading => ({ change: changes[index][key], z: expandingZ(series[key], index) });
    const cePremium = reading("cePremium");
    const pePremium = reading("pePremium");
    const ceCoi = reading("ceCoi");
    const peCoi = reading("peCoi");
    const ceVolume = reading("ceVolume");
    const peVolume = reading("peVolume");
    const ceIv = reading("ceIv");
    const peIv = reading("peIv");
    const ceActivity = activity(ceCoi.change, cePremium.change);
    const peActivity = activity(peCoi.change, pePremium.change);
    const ceDirection = sideDirection("ce", ceActivity);
    const peDirection = sideDirection("pe", peActivity);
    const zOrZero = (value: number | null) => value ?? 0;

    // COI/premium establish activity; volume and IV only confirm its strength.
    const sideScore = (direction: number, coi: MetricReading, premium: MetricReading, volume: MetricReading, iv: MetricReading, active: AtmActivity) => {
      if (!direction) return 0;
      const baseStrength = (Math.abs(zOrZero(coi.z)) + Math.abs(zOrZero(premium.z))) / 2;
      const volumeConfirmation = Math.max(0, zOrZero(volume.z));
      const expectedIvDirection = active === "BUYERS ACTIVE" || active === "SHORT COVERING" ? 1 : -1;
      const ivConfirmation = Math.max(0, zOrZero(iv.z) * expectedIvDirection);
      return direction * (baseStrength * 0.6 + volumeConfirmation * 0.2 + ivConfirmation * 0.2);
    };
    const rawScore = sideScore(ceDirection, ceCoi, cePremium, ceVolume, ceIv, ceActivity)
      + sideScore(peDirection, peCoi, pePremium, peVolume, peIv, peActivity);
    const score = clamp((rawScore / 6) * 50, -50, 50);
    const confirmations = [ceDirection, peDirection].filter((value) => value !== 0 && Math.sign(value) === Math.sign(score)).length;
    return { ...snapshot, cePremium, pePremium, ceCoi, peCoi, ceVolume, peVolume, ceIv, peIv, ceActivity, peActivity, score, sentiment: sentiment(score), confirmations };
  });
}