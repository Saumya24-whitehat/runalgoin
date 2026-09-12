// Backtest engines: NitinBhaiya score, IV Flow verdict and Strike Flow (BP vs Retail)
// Mirrors src/utils/nitinBhaiyaEngine.ts, src/utils/ivFlowSignal.ts and src/utils/strikeFlowAnalysis.ts.

export type Dir = "bullish" | "bearish" | "neutral";

export interface Side {
  oi: number;
  prevOi: number;
  coi: number;
  ltp: number;
  iv: number;
  volume: number;
}

export interface Strike {
  strike: number;
  spot: number;
  ce: Side;
  pe: Side;
}

type RawSide = { market_data?: Record<string, number>; option_greeks?: Record<string, number> };
type RawRow = { strike_price?: number; underlying_spot_price?: number; call_options?: RawSide; put_options?: RawSide };

function toSide(raw?: RawSide): Side {
  const market = raw?.market_data ?? {};
  const greeks = raw?.option_greeks ?? {};
  const oi = Number(market.oi ?? 0);
  const prevOi = Number(market.prev_oi ?? 0);
  return {
    oi,
    prevOi,
    coi: prevOi ? oi - prevOi : Number(market.coi ?? 0),
    ltp: Number(market.ltp ?? 0),
    iv: Number(greeks.iv ?? 0),
    volume: Number(market.volume ?? 0),
  };
}

export function normalizeChain(rows: RawRow[]): Strike[] {
  return rows
    .map((row) => ({
      strike: Number(row.strike_price ?? 0),
      spot: Number(row.underlying_spot_price ?? 0),
      ce: toSide(row.call_options),
      pe: toSide(row.put_options),
    }))
    .filter((row) => row.strike > 0)
    .sort((a, b) => a.strike - b.strike);
}

export function atmIndexOf(chain: Strike[]): number {
  const spot = chain[0]?.spot ?? 0;
  let best = 0;
  chain.forEach((row, i) => {
    if (Math.abs(row.strike - spot) < Math.abs(chain[best].strike - spot)) best = i;
  });
  return best;
}

const decayPct = (now: number, base: number) => (base ? ((base - now) / Math.abs(base)) * 100 : null);

/** NitinBhaiya weighted engine — returns label, direction and score (-50..50). */
export function runNitin(current: Strike[], baseline: Strike[]) {
  if (!current.length) return { label: "WAIT", dir: "neutral" as Dir, score: 0 };
  const idx = atmIndexOf(current);
  const atmRow = current[idx];
  const window = current.slice(Math.max(0, idx - 2), idx + 3);
  const baseMap = new Map(baseline.map((row) => [row.strike, row]));
  const baseAtm = baseMap.get(atmRow.strike);

  const cePrem = baseAtm ? atmRow.ce.ltp - baseAtm.ce.ltp : 0;
  const pePrem = baseAtm ? atmRow.pe.ltp - baseAtm.pe.ltp : 0;
  const ceIv = baseAtm ? atmRow.ce.iv - baseAtm.ce.iv : 0;
  const peIv = baseAtm ? atmRow.pe.iv - baseAtm.pe.iv : 0;
  const ceWriting = atmRow.ce.coi > 0 && cePrem < 0 && ceIv <= 0;
  const peWriting = atmRow.pe.coi > 0 && pePrem < 0 && peIv <= 0;
  const writer: Dir = peWriting === ceWriting ? "neutral" : peWriting ? "bullish" : "bearish";

  const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
  const ceDecay = avg(
    window.map((row) => {
      const base = baseMap.get(row.strike);
      return base ? decayPct(row.ce.ltp, base.ce.ltp) : null;
    }).filter((v): v is number => v !== null),
  );
  const peDecay = avg(
    window.map((row) => {
      const base = baseMap.get(row.strike);
      return base ? decayPct(row.pe.ltp, base.pe.ltp) : null;
    }).filter((v): v is number => v !== null),
  );
  const decay: Dir = ceDecay === null || peDecay === null || ceDecay === peDecay ? "neutral" : ceDecay < peDecay ? "bullish" : "bearish";

  const ceCoi = window.reduce((s, r) => s + Math.max(0, r.ce.coi), 0);
  const peCoi = window.reduce((s, r) => s + Math.max(0, r.pe.coi), 0);
  const coiDir: Dir = peCoi === ceCoi ? "neutral" : peCoi > ceCoi ? "bullish" : "bearish";
  const ivDir: Dir = !baseAtm ? "neutral" : ceIv > 0 && peIv <= 0 ? "bullish" : peIv > 0 && ceIv <= 0 ? "bearish" : "neutral";
  const volume = window.reduce((s, r) => s + r.ce.volume + r.pe.volume, 0);
  const netCoi = window.reduce((s, r) => s + Math.abs(r.ce.coi) + Math.abs(r.pe.coi), 0);
  const eoh = volume > 0 && netCoi / volume < 0.05;

  const parts: Array<{ dir: Dir; weight: number; available: boolean }> = [
    { dir: writer, weight: 0.25, available: Boolean(baseAtm) },
    { dir: decay, weight: 0.2, available: ceDecay !== null && peDecay !== null },
    { dir: ivDir, weight: 0.2, available: Boolean(baseAtm) },
    { dir: eoh ? "neutral" : coiDir, weight: 0.1, available: true },
  ];
  const score = Math.max(
    -50,
    Math.min(50, parts.reduce((sum, p) => sum + (p.available ? (p.dir === "bullish" ? p.weight * 50 : p.dir === "bearish" ? -p.weight * 50 : 0) : 0), 0)),
  );
  const bull = parts.filter((p) => p.available && p.dir === "bullish").length;
  const bear = parts.filter((p) => p.available && p.dir === "bearish").length;
  const agreeing = Math.max(bull, bear);
  const conflict = ivDir !== "neutral" && decay !== "neutral" && ivDir !== decay;

  let label: string;
  if (eoh) label = "EXCHANGE OF HANDS";
  else if (conflict) label = "CONFLICT";
  else if (agreeing < 2) label = "WAIT";
  else if (score >= 25) label = "STRONG BULLISH";
  else if (score >= 10) label = "BULLISH";
  else if (score > -10) label = "RANGE-BOUND";
  else if (score > -25) label = "BEARISH";
  else label = "STRONG BEARISH";

  const dir: Dir = label.includes("BULLISH") ? "bullish" : label.includes("BEARISH") ? "bearish" : "neutral";
  return { label, dir, score };
}

type SideSignal = "Writing" | "Buying" | "Short Covering" | "Long Unwinding" | "Mixed";

function classifySide(ivChange: number, oiChange: number, premChange: number): SideSignal {
  const up = ivChange > 0;
  const down = ivChange < 0;
  if (down && oiChange > 0 && premChange < 0) return "Writing";
  if (up && oiChange > 0 && premChange > 0) return "Buying";
  if (up && oiChange < 0 && premChange > 0) return "Short Covering";
  if (down && oiChange < 0 && premChange < 0) return "Long Unwinding";
  return "Mixed";
}

/** IV Flow: ATM CE/PE candle-to-candle IV + OI + premium classification. */
export function runIvFlow(current: Strike[], previous: Strike[]) {
  if (!current.length || !previous.length) return { label: "Range / Neutral", dir: "neutral" as Dir };
  const atmRow = current[atmIndexOf(current)];
  const prevRow = previous.find((row) => row.strike === atmRow.strike);
  if (!prevRow) return { label: "Range / Neutral", dir: "neutral" as Dir };

  const ce = classifySide(atmRow.ce.iv - prevRow.ce.iv, atmRow.ce.oi - prevRow.ce.oi, atmRow.ce.ltp - prevRow.ce.ltp);
  const pe = classifySide(atmRow.pe.iv - prevRow.pe.iv, atmRow.pe.oi - prevRow.pe.oi, atmRow.pe.ltp - prevRow.pe.ltp);

  let label = "Range / Neutral";
  if (ce === "Writing" && pe === "Writing") label = "Range / Neutral";
  else if (ce === "Buying" && pe === "Writing") label = "Strong Bullish";
  else if (ce === "Short Covering" && pe === "Writing") label = "Very Strong Bullish";
  else if (ce === "Buying" && pe === "Short Covering") label = "Strong Bullish";
  else if (ce === "Writing" && pe === "Buying") label = "Strong Bearish";
  else if (ce === "Writing" && pe === "Short Covering") label = "Very Strong Bearish";
  else if (ce === "Buying") label = "Bullish";
  else if (pe === "Buying") label = "Bearish";
  else if (ce === "Writing") label = "Bearish";
  else if (pe === "Writing") label = "Bullish";

  const dir: Dir = label.includes("Bullish") ? "bullish" : label.includes("Bearish") ? "bearish" : "neutral";
  return { label, dir };
}

type Action = "Long Buildup" | "Short Buildup" | "Short Covering" | "Long Unwinding" | "Neutral";

function action(oiChange: number, premChange: number): Action {
  if (oiChange > 0 && premChange > 0) return "Long Buildup";
  if (oiChange > 0 && premChange < 0) return "Short Buildup";
  if (oiChange < 0 && premChange > 0) return "Short Covering";
  if (oiChange < 0 && premChange < 0) return "Long Unwinding";
  return "Neutral";
}

function isBigPlayer(act: Action, ivChangePct: number): boolean {
  if (act === "Neutral") return false;
  if (ivChangePct >= 3) return false; // IV spike => retail emotion
  if (act === "Long Unwinding") return false; // exit / deflate bucket
  return true;
}

/** Strike Flow: Big-player bullish vs bearish COI ratio over ATM +-5 strikes. */
export function runStrikeFlow(current: Strike[], previous: Strike[]) {
  if (!current.length || !previous.length) return { ratio: null as number | null, dir: "neutral" as Dir };
  const idx = atmIndexOf(current);
  const window = current.slice(Math.max(0, idx - 5), idx + 6);
  const prevMap = new Map(previous.map((row) => [row.strike, row]));
  let bullish = 0;
  let bearish = 0;

  for (const row of window) {
    const prev = prevMap.get(row.strike);
    if (!prev) continue;
    for (const key of ["ce", "pe"] as const) {
      const cur = row[key];
      const old = prev[key];
      const oiChange = cur.oi - old.oi;
      const premChange = cur.ltp - old.ltp;
      const ivPct = old.iv ? ((cur.iv - old.iv) / old.iv) * 100 : 0;
      const act = action(oiChange, premChange);
      if (!isBigPlayer(act, ivPct)) continue;
      // CE side: writing is bearish, buying bullish. PE side is inverted.
      const bullishForCe = act === "Long Buildup" || act === "Short Covering";
      const bullishSide = key === "ce" ? bullishForCe : !bullishForCe;
      if (bullishSide) bullish += Math.abs(oiChange);
      else bearish += Math.abs(oiChange);
    }
  }

  const ratio = bearish > 0 ? bullish / bearish : bullish > 0 ? 99 : null;
  const dir: Dir = ratio === null ? "neutral" : ratio >= 1.15 ? "bullish" : ratio <= 0.85 ? "bearish" : "neutral";
  return { ratio, dir };
}

/** Market session slots: 09:15 -> 15:30 in 3-minute steps as HHMM strings. */
export function sessionSlots(): string[] {
  const slots: string[] = [];
  for (let minutes = 9 * 60 + 15; minutes <= 15 * 60 + 30; minutes += 3) {
    const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mm = String(minutes % 60).padStart(2, "0");
    slots.push(`${hh}${mm}`);
  }
  return slots;
}
