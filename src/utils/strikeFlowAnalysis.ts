import { GreeksDataPoint } from "@/services/greeksChartApi";

export type FlowAction =
  | "Long Buildup"
  | "Short Buildup"
  | "Short Covering"
  | "Long Unwinding"
  | "Neutral";

export type PlayerTag = "Retail" | "Big Player" | "Exit / Deflate" | "Mixed";

export interface StrikeFlowRow {
  timestamp: number;
  ltp: number;
  ltpChange: number;
  ltpChangePct: number;
  oi: number;
  oiChange: number;
  coi: number;
  iv: number;
  ivChange: number;
  ivChangePct: number;
  action: FlowAction;
  ivRegime: "Spike" | "Crush" | "Flat";
  player: PlayerTag;
  insight: string;
}

const SPIKE_PCT = 3; // IV % change threshold for spike/crush

/**
 * Candle-to-candle comparison of price vs OI (with IV overlay) to decide
 * whether options are being bought, written, unwound or covered — and
 * whether the flow looks like retail emotion or a quiet big-player move.
 */
export function analyzeStrikeFlow(data: GreeksDataPoint[]): StrikeFlowRow[] {
  const rows: StrikeFlowRow[] = [];

  for (let i = 1; i < data.length; i++) {
    const cur = data[i];
    const prev = data[i - 1];
    if (!cur.ltp && !cur.oi) continue;

    const ltpChange = cur.ltp - prev.ltp;
    const ltpChangePct = prev.ltp ? (ltpChange / prev.ltp) * 100 : 0;
    const oiChange = cur.oi - prev.oi;
    const ivChange = cur.iv - prev.iv;
    const ivChangePct = prev.iv ? (ivChange / prev.iv) * 100 : 0;

    let action: FlowAction = "Neutral";
    if (oiChange > 0 && ltpChange > 0) action = "Long Buildup";
    else if (oiChange > 0 && ltpChange < 0) action = "Short Buildup";
    else if (oiChange < 0 && ltpChange > 0) action = "Short Covering";
    else if (oiChange < 0 && ltpChange < 0) action = "Long Unwinding";

    const ivRegime: StrikeFlowRow["ivRegime"] =
      ivChangePct >= SPIKE_PCT ? "Spike" : ivChangePct <= -SPIKE_PCT ? "Crush" : "Flat";

    const { player, insight } = interpret(action, ivRegime);

    rows.push({
      timestamp: cur.timestamp,
      ltp: cur.ltp,
      ltpChange,
      ltpChangePct,
      oi: cur.oi,
      oiChange,
      coi: cur.coi,
      iv: cur.iv,
      ivChange,
      ivChangePct,
      action,
      ivRegime,
      player,
      insight,
    });
  }

  return rows;
}

function interpret(
  action: FlowAction,
  ivRegime: StrikeFlowRow["ivRegime"]
): { player: PlayerTag; insight: string } {
  if (action === "Neutral")
    return { player: "Mixed", insight: "No clear OI/price commitment — wait for a decisive candle." };

  if (action === "Long Buildup") {
    if (ivRegime === "Spike")
      return {
        player: "Retail",
        insight: "Retail option buying in panic/greed. IV spike = overpaying premium; big player is quietly writing the opposite side.",
      };
    if (ivRegime === "Crush")
      return {
        player: "Big Player",
        insight: "Price up but IV deflating — genuine directional buying without premium hype. Smart-money style entry.",
      };
    return {
      player: "Big Player",
      insight: "Calm, IV-flat buildup of longs — calculated position building, trend usually sustains.",
    };
  }

  if (action === "Short Buildup") {
    if (ivRegime === "Spike")
      return {
        player: "Retail",
        insight: "Writing into an IV spike is unusual — likely forced/emotional shorting. Risky, can be squeezed.",
      };
    if (ivRegime === "Crush")
      return {
        player: "Big Player",
        insight: "Classic writer footprint: OI up, premium and IV falling. Strike acting as a wall / defended level.",
      };
    return {
      player: "Big Player",
      insight: "Quiet IV-flat writing — big player selling premium, expects this strike to hold.",
    };
  }

  if (action === "Short Covering") {
    if (ivRegime === "Spike")
      return {
        player: "Retail",
        insight: "Panic covering with IV blowing up — trapped writers buying back. Sharp but often short-lived move.",
      };
    if (ivRegime === "Crush")
      return {
        player: "Big Player",
        insight: "Orderly covering with IV cooling — position being closed without stress. Momentum may fade.",
      };
    return {
      player: "Big Player",
      insight: "Slow grind covering — writers stepping away calmly, level losing its defence.",
    };
  }

  // Long Unwinding
  if (ivRegime === "Spike")
    return {
      player: "Retail",
      insight: "Buyers exiting while IV spikes — churn and emotion. Direction unreliable here.",
    };
  if (ivRegime === "Crush")
    return {
      player: "Exit / Deflate",
      insight: "IV crush + OI drop = a large position being closed; premium deflating fast. Avoid fresh buys.",
    };
  return {
    player: "Exit / Deflate",
    insight: "Longs booking out quietly — interest in this strike is drying up.",
  };
}

export const actionColor: Record<FlowAction, string> = {
  "Long Buildup": "text-emerald-500",
  "Short Buildup": "text-red-500",
  "Short Covering": "text-sky-500",
  "Long Unwinding": "text-amber-500",
  Neutral: "text-muted-foreground",
};

export interface FlowSummaryStats {
  totalCandles: number;
  byAction: Record<
    Exclude<FlowAction, "Neutral">,
    { count: number; totalCoi: number; totalAbsCoi: number }
  >;
  byPlayer: Record<PlayerTag, { count: number; totalAbsCoi: number }>;
}

export function computeFlowSummary(rows: StrikeFlowRow[]): FlowSummaryStats {
  const byAction: FlowSummaryStats["byAction"] = {
    "Long Buildup": { count: 0, totalCoi: 0, totalAbsCoi: 0 },
    "Short Buildup": { count: 0, totalCoi: 0, totalAbsCoi: 0 },
    "Short Covering": { count: 0, totalCoi: 0, totalAbsCoi: 0 },
    "Long Unwinding": { count: 0, totalCoi: 0, totalAbsCoi: 0 },
  };

  const byPlayer: FlowSummaryStats["byPlayer"] = {
    Retail: { count: 0, totalAbsCoi: 0 },
    "Big Player": { count: 0, totalAbsCoi: 0 },
    "Exit / Deflate": { count: 0, totalAbsCoi: 0 },
    Mixed: { count: 0, totalAbsCoi: 0 },
  };

  for (const r of rows) {
    if (r.action !== "Neutral") {
      byAction[r.action].count += 1;
      byAction[r.action].totalCoi += r.coi;
      byAction[r.action].totalAbsCoi += Math.abs(r.coi);
    }
    byPlayer[r.player].count += 1;
    byPlayer[r.player].totalAbsCoi += Math.abs(r.coi);
  }

  return {
    totalCandles: rows.length,
    byAction,
    byPlayer,
  };
}

export type FlowMatrix = Record<
  Exclude<FlowAction, "Neutral">,
  Record<"Retail" | "Big Player", { count: number; totalCoi: number; totalAbsCoi: number }>
>;

export interface SentimentTotals {
  bullish: number;
  bearish: number;
  ratio: number | null;
}

export function getSentiment(
  action: Exclude<FlowAction, "Neutral">,
  player: "Retail" | "Big Player"
): "Bullish" | "Bearish" {
  if (player === "Big Player") {
    return action === "Long Buildup" || action === "Short Covering" ? "Bullish" : "Bearish";
  }
  return action === "Short Buildup" || action === "Long Unwinding" ? "Bullish" : "Bearish";
}

export function computeFlowMatrix(rows: StrikeFlowRow[]): FlowMatrix {
  const matrix: FlowMatrix = {
    "Long Buildup": {
      Retail: { count: 0, totalCoi: 0, totalAbsCoi: 0 },
      "Big Player": { count: 0, totalCoi: 0, totalAbsCoi: 0 },
    },
    "Short Buildup": {
      Retail: { count: 0, totalCoi: 0, totalAbsCoi: 0 },
      "Big Player": { count: 0, totalCoi: 0, totalAbsCoi: 0 },
    },
    "Short Covering": {
      Retail: { count: 0, totalCoi: 0, totalAbsCoi: 0 },
      "Big Player": { count: 0, totalCoi: 0, totalAbsCoi: 0 },
    },
    "Long Unwinding": {
      Retail: { count: 0, totalCoi: 0, totalAbsCoi: 0 },
      "Big Player": { count: 0, totalCoi: 0, totalAbsCoi: 0 },
    },
  };

  for (const r of rows) {
    if (r.action === "Neutral") continue;
    if (r.player !== "Retail" && r.player !== "Big Player") continue;
    const cell = matrix[r.action][r.player];
    cell.count += 1;
    cell.totalCoi += r.coi;
    cell.totalAbsCoi += Math.abs(r.coi);
  }

  return matrix;
}

export function computeSentimentTotals(
  matrix: FlowMatrix,
  player: "Retail" | "Big Player"
): SentimentTotals {
  const bullishActions: Exclude<FlowAction, "Neutral">[] =
    player === "Big Player"
      ? ["Long Buildup", "Short Covering"]
      : ["Short Buildup", "Long Unwinding"];
  const bearishActions: Exclude<FlowAction, "Neutral">[] =
    player === "Big Player"
      ? ["Short Buildup", "Long Unwinding"]
      : ["Long Buildup", "Short Covering"];

  const bullish = bullishActions.reduce((sum, a) => sum + matrix[a][player].totalAbsCoi, 0);
  const bearish = bearishActions.reduce((sum, a) => sum + matrix[a][player].totalAbsCoi, 0);

  return {
    bullish,
    bearish,
    ratio: bearish > 0 ? bullish / bearish : bullish > 0 ? Infinity : null,
  };
}

