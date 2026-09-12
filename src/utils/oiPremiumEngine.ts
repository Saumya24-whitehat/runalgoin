import { ChainStrike, Activity, classifyActivity } from "@/utils/nitinBhaiyaEngine";

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

export function analyzeOiPremium(current: ChainStrike[], opening: ChainStrike[], radius = 2): OiPremiumSummary {
  if (!current.length || !opening.length) return emptySummary;

  const spot = current[0].spot;
  const sorted = [...current].sort((a, b) => a.strike - b.strike);
  const atmIndex = sorted.reduce((best, row, index) =>
    Math.abs(row.strike - spot) < Math.abs(sorted[best].strike - spot) ? index : best, 0);
  const atm = sorted[atmIndex].strike;
  const window = sorted.slice(Math.max(0, atmIndex - radius), atmIndex + radius + 1);
  const openingMap = new Map(opening.map((row) => [row.strike, row]));

  const rows = window.flatMap<OiPremiumStrikeRow>((row) => {
    const base = openingMap.get(row.strike);
    if (!base) return [];
    const ceCoi = row.ce.oi - base.ce.oi;
    const peCoi = row.pe.oi - base.pe.oi;
    const cePremiumChange = row.ce.ltp - base.ce.ltp;
    const pePremiumChange = row.pe.ltp - base.pe.ltp;
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

  if (!rows.length) return { ...emptySummary, spot, atm };
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