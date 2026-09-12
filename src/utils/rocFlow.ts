/**
 * Plain rate-of-change metrics per candle for ATM +/- N strikes.
 * No verdicts, no scoring — only net numbers.
 */
import type { Snapshot } from "@/utils/iroedEngine";
import { strikeStep } from "@/utils/iroedEngine";

export interface RocRow {
  timestamp: number;
  time: string;
  index: number;
  indexRoc: number | null;

  ceExtrinsic: number;
  peExtrinsic: number;
  ceDecayRoc: number | null;
  peDecayRoc: number | null;

  ceIv: number;
  peIv: number;
  ceIvRoc: number | null;
  peIvRoc: number | null;

  ceOi: number;
  peOi: number;
  ceCoi: number;
  peCoi: number;
  ceCoiRoc: number | null;
  peCoiRoc: number | null;
}

const pct = (cur: number, prev: number): number | null => {
  if (!prev) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
};

function aggregate(snap: Snapshot, range: number) {
  const step = strikeStep(snap.strikes);
  const lo = snap.atm - range * step - 1;
  const hi = snap.atm + range * step + 1;
  const rows = snap.strikes.filter((s) => s.strike >= lo && s.strike <= hi);

  let ceExtrinsic = 0;
  let peExtrinsic = 0;
  let ceOi = 0;
  let peOi = 0;
  let ceIvSum = 0;
  let ceIvN = 0;
  let peIvSum = 0;
  let peIvN = 0;

  for (const s of rows) {
    if (s.ce?.ltp) {
      ceExtrinsic += Math.max(s.ce.ltp - Math.max(snap.index - s.strike, 0), 0);
      ceOi += s.ce.oi || 0;
      if (s.ce.iv > 0) {
        ceIvSum += s.ce.iv;
        ceIvN++;
      }
    }
    if (s.pe?.ltp) {
      peExtrinsic += Math.max(s.pe.ltp - Math.max(s.strike - snap.index, 0), 0);
      peOi += s.pe.oi || 0;
      if (s.pe.iv > 0) {
        peIvSum += s.pe.iv;
        peIvN++;
      }
    }
  }

  return {
    ceExtrinsic,
    peExtrinsic,
    ceOi,
    peOi,
    ceIv: ceIvN ? ceIvSum / ceIvN : 0,
    peIv: peIvN ? peIvSum / peIvN : 0,
  };
}

export function buildRocRows(snapshots: Snapshot[], range: number): RocRow[] {
  const ordered = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);
  const aggs = ordered.map((s) => aggregate(s, range));
  const out: RocRow[] = [];

  for (let i = 1; i < ordered.length; i++) {
    const snap = ordered[i];
    const cur = aggs[i];
    const prev = aggs[i - 1];
    const prevRow = out[out.length - 1];

    const ceCoi = cur.ceOi - prev.ceOi;
    const peCoi = cur.peOi - prev.peOi;

    out.push({
      timestamp: snap.timestamp,
      time: snap.time,
      index: snap.index,
      indexRoc: pct(snap.index, ordered[i - 1].index),

      ceExtrinsic: cur.ceExtrinsic,
      peExtrinsic: cur.peExtrinsic,
      ceDecayRoc: pct(cur.ceExtrinsic, prev.ceExtrinsic),
      peDecayRoc: pct(cur.peExtrinsic, prev.peExtrinsic),

      ceIv: cur.ceIv,
      peIv: cur.peIv,
      ceIvRoc: pct(cur.ceIv, prev.ceIv),
      peIvRoc: pct(cur.peIv, prev.peIv),

      ceOi: cur.ceOi,
      peOi: cur.peOi,
      ceCoi,
      peCoi,
      ceCoiRoc: prevRow ? pct(ceCoi, prevRow.ceCoi) : null,
      peCoiRoc: prevRow ? pct(peCoi, prevRow.peCoi) : null,
    });
  }

  return out;
}
