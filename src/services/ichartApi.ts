/**
 * iChart rebuild — data mapping.
 * Every ichart.in PHP endpoint used by the rebuilt pages is replaced by OptionWorld data:
 *  - SymNamesApi / Symbol_List_SB_Api / getSymbolDashboardInputs  -> option-chain {action:getSymbols}
 *  - getExpiryDatesforDate / getExpiryDates_SB_Api / SymExpDatesApi -> option-chain {action:getExpiryDates, date}
 *  - getOptionChainState / OptionChain_SB_Api / getOptionChainData   -> option-chain {action:getOptionChain, time, date}
 *  - getDataForOptionOIStatsBeta* (OI totals, PCR, max pain)          -> computed locally from the same chain
 * ichart session / login / broker endpoints are intentionally not ported.
 */
import { fetchNitinChainAt, fetchNitinExpiries, fetchNitinSymbols } from "./nitinBhaiyaApi";
import { ChainStrike } from "@/utils/nitinBhaiyaEngine";

export const fetchIchartSymbols = fetchNitinSymbols;
export const fetchIchartExpiries = fetchNitinExpiries;
export const fetchIchartChain = fetchNitinChainAt;

export function computeMaxPain(rows: ChainStrike[]): number | null {
  let best: number | null = null;
  let bestPain = Infinity;
  for (const s of rows) {
    let pain = 0;
    for (const r of rows) {
      if (s.strike > r.strike) pain += (s.strike - r.strike) * r.ce.oi;
      if (s.strike < r.strike) pain += (r.strike - s.strike) * r.pe.oi;
    }
    if (pain < bestPain) { bestPain = pain; best = s.strike; }
  }
  return best;
}

export function findAtm(rows: ChainStrike[]): number {
  const spot = rows[0]?.spot ?? 0;
  return rows.reduce((b, r) => (Math.abs(r.strike - spot) < Math.abs(b - spot) ? r.strike : b), rows[0]?.strike ?? 0);
}
