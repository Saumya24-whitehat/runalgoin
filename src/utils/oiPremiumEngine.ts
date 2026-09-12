import { ChainStrike, Activity, classifyActivity } from "@/utils/nitinBhaiyaEngine";

export interface OiPremiumRange { min: number; max: number }

export interface OiPremiumStrikeRow {
  strike: number;
  isAtm: boolean;
  ceCoi: number;
  cePremiumChange: number;
  ceActivity: Activity;
  peCoi: number;
  pePremiumChange: number;
  peActivity: Activity;
}

export interface OiPremiumSummary {
  spot: number;
  atm: number;
  strikeRange: string;
  range: OiPremiumRange | null;
  rows: OiPremiumStrikeRow[];
  ceCoi: number;
  peCoi: number;
  cePremiumChange: number;
  pePremiumChange: number;
  ceActivity: Activity;
  peActivity: Activity;
  reading: string;
}

const emptySummary: OiPremiumSummary = {
  spot: 0,
  atm: 0,
  strikeRange: "—",
  range: null,
  rows: [],
  ceCoi: 0,
  peCoi: 0,
  cePremiumChange: 0,
  pePremiumChange: 0,
  ceActivity: "Neutral",
  peActivity: "Neutral",
  reading: "WAIT",
};

function marketReading(ce: Activity, pe: Activity) {
  if (pe === "Fresh Short" && ce === "Fresh Long") return "STRONG BULLISH";
  if (ce === "Fresh Short" && pe === "Fresh Long") return "STRONG BEARISH";
  if (ce === "Fresh Short" && pe === "Fresh Short") return "RANGE · BOTH-SIDE WRITING";
  if (pe === "Fresh Short") return "BULLISH SUPPORT";
  if (ce === "Fresh Short") return "BEARISH PRESSURE";
  if (ce === "Short Covering" && pe !== "Fresh Long") return "BULLISH SUPPORT";
  if (pe === "Short Covering" && ce !== "Fresh Long") return "BEARISH PRESSURE";
  if (ce === "Fresh Long") return "CALL BUYING · AWAIT PE SUPPORT";
  if (pe === "Fresh Long") return "PUT BUYING · BEARISH PRESSURE";
  if (ce === "Long Unwinding" && pe === "Long Unwinding") return "BUYERS EXITING · NEUTRAL";
  return "NEUTRAL";
}

/**
 * ATM ±radius window of this snapshot, unioned with every window already visited
 * during the session (priorRange), so strikes the market has passed through stay
 * in the COI calculation for the rest of the day.
 *
 * COI baseline   = today's opening (09:15) OI.
 * Premium change = ABSOLUTE LTP difference versus the PREVIOUS SESSION's 15:30
 * closing premium (prevClose chain). If prevClose is unavailable, falls back to
 * the opening chain so the page still renders.
 */
export function analyzeOiPremium(
  current: ChainStrike[],
  opening: ChainStrike[],
  prevClose?: ChainStrike[],
  radius = 2,
  priorRange?: OiPremiumRange | null,
): OiPremiumSummary {
  if (!current.length || !opening.length) return emptySummary;
  const premiumBase = prevClose?.length ? prevClose : opening;

  const spot = current[0].spot;
  const sorted = [...current].sort((a, b) => a.strike - b.strike);
  const atmIndex = sorted.reduce((best, row, index) =>
    Math.abs(row.strike - spot) < Math.abs(sorted[best].strike - spot) ? index : best, 0);
  const atm = sorted[atmIndex].strike;
  const window = sorted.slice(Math.max(0, atmIndex - radius), atmIndex + radius + 1);
  if (!window.length) return { ...emptySummary, spot, atm };

  const range: OiPremiumRange = {
    min: Math.min(window[0].strike, priorRange?.min ?? window[0].strike),
    max: Math.max(window[window.length - 1].strike, priorRange?.max ?? window[window.length - 1].strike),
  };

  const openingMap = new Map(opening.map((row) => [row.strike, row]));
  const openingSpot = opening[0]?.spot ?? spot;

  const rows = sorted
    .filter((row) => row.strike >= range.min && row.strike <= range.max)
    .flatMap<OiPremiumStrikeRow>((row) => {
      const base = openingMap.get(row.strike);
      if (!base) return [];
      const ceCoi = row.ce.oi - base.ce.oi;
      const peCoi = row.pe.oi - base.pe.oi;
      const cePremiumChange = ceTimeValue(row.ce.ltp, row.strike, spot) - ceTimeValue(base.ce.ltp, row.strike, openingSpot);
      const pePremiumChange = peTimeValue(row.pe.ltp, row.strike, spot) - peTimeValue(base.pe.ltp, row.strike, openingSpot);
      return [{
        strike: row.strike,
        isAtm: row.strike === atm,
        ceCoi,
        cePremiumChange,
        ceActivity: classifyActivity(ceCoi, cePremiumChange),
        peCoi,
        pePremiumChange,
        peActivity: classifyActivity(peCoi, pePremiumChange),
      }];
    });

  if (!rows.length) return { ...emptySummary, spot, atm, range };
  const ceCoi = rows.reduce((sum, row) => sum + row.ceCoi, 0);
  const peCoi = rows.reduce((sum, row) => sum + row.peCoi, 0);
  const cePremiumChange = rows.reduce((sum, row) => sum + row.cePremiumChange, 0);
  const pePremiumChange = rows.reduce((sum, row) => sum + row.pePremiumChange, 0);
  const ceActivity = classifyActivity(ceCoi, cePremiumChange);
  const peActivity = classifyActivity(peCoi, pePremiumChange);

  return {
    spot,
    atm,
    strikeRange: `${rows[0].strike}–${rows[rows.length - 1].strike}`,
    range,
    rows,
    ceCoi,
    peCoi,
    cePremiumChange,
    pePremiumChange,
    ceActivity,
    peActivity,
    reading: marketReading(ceActivity, peActivity),
  };
}
