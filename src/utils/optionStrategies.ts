// Option Strategy Implementations
// Converted from defaultStrategy.html

export interface StrategyPosition {
  action: "Buy" | "Sell";
  lots: number;
  date: string;
  expiry: string;
  strike: number;
  optType: "CE" | "PE";
  entryPrice: number;
  currentPrice: number;
  IV: number;
  lotSize: number;
  instrumentToken?: string;
}

export interface StrategyContext {
  atmStrike: number;
  strikeDiff: number;
  expiry: string;
  date: string;
  lotSize: number;
  // Optional: for live data integration
  getOptionData?: (strike: number, optType: "CE" | "PE") => { price: number; iv: number; token?: string } | null;
}

// Helper to get default price/IV when no live data is available
const getDefaultPrice = (strike: number, atm: number, optType: "CE" | "PE", strikeDiff: number): number => {
  const distance = Math.abs(strike - atm) / strikeDiff;
  const basePrice = 200 - distance * 20;
  return Math.max(basePrice, 10);
};

const getDefaultIV = (): number => 15;

// Helper to create a position
const createPosition = (
  ctx: StrategyContext,
  action: "Buy" | "Sell",
  lots: number,
  strikeOffset: number,
  optType: "CE" | "PE"
): StrategyPosition => {
  const strike = ctx.atmStrike + strikeOffset * ctx.strikeDiff;
  const optionData = ctx.getOptionData?.(strike, optType);
  
  return {
    action,
    lots,
    date: ctx.date,
    expiry: ctx.expiry,
    strike,
    optType,
    entryPrice: optionData?.price ?? getDefaultPrice(strike, ctx.atmStrike, optType, ctx.strikeDiff),
    currentPrice: optionData?.price ?? getDefaultPrice(strike, ctx.atmStrike, optType, ctx.strikeDiff),
    IV: optionData?.iv ?? getDefaultIV(),
    lotSize: ctx.lotSize,
    instrumentToken: optionData?.token,
  };
};

// ===== SINGLE LEG STRATEGIES =====

export const buyCall = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Buy", 1, 0, "CE"),
];

export const sellCall = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Sell", 1, 0, "CE"),
];

export const buyPut = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Buy", 1, 0, "PE"),
];

export const sellPut = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Sell", 1, 0, "PE"),
];

// ===== FUTURES (Synthetic) =====

export const buyFutures = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Buy", 1, 0, "CE"),
  createPosition(ctx, "Sell", 1, 0, "PE"),
];

export const sellFutures = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Sell", 1, 0, "CE"),
  createPosition(ctx, "Buy", 1, 0, "PE"),
];

// ===== STRADDLE =====

export const longStraddle = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Buy", 1, 0, "CE"),
  createPosition(ctx, "Buy", 1, 0, "PE"),
];

export const shortStraddle = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Sell", 1, 0, "CE"),
  createPosition(ctx, "Sell", 1, 0, "PE"),
];

// ===== STRANGLE =====

export const longStrangle = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Buy", 1, 4, "CE"),
  createPosition(ctx, "Buy", 1, -4, "PE"),
];

export const shortStrangle = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Sell", 1, 4, "CE"),
  createPosition(ctx, "Sell", 1, -4, "PE"),
];

// ===== SPREADS =====

export const bullCallSpread = (ctx: StrategyContext, offset: number = -4): StrategyPosition[] => [
  createPosition(ctx, "Buy", 1, 4 + offset, "CE"),
  createPosition(ctx, "Sell", 1, 8 + offset, "CE"),
];

export const bearCallSpread = (ctx: StrategyContext, offset: number = -4): StrategyPosition[] => [
  createPosition(ctx, "Sell", 1, 4 + offset, "CE"),
  createPosition(ctx, "Buy", 1, 8 + offset, "CE"),
];

export const bullPutSpread = (ctx: StrategyContext, offset: number = 4): StrategyPosition[] => [
  createPosition(ctx, "Sell", 1, -(4 - offset), "PE"),
  createPosition(ctx, "Buy", 1, -(8 - offset), "PE"),
];

export const bearPutSpread = (ctx: StrategyContext, offset: number = 4): StrategyPosition[] => [
  createPosition(ctx, "Buy", 1, -(4 - offset), "PE"),
  createPosition(ctx, "Sell", 1, -(8 - offset), "PE"),
];

// ===== IRON CONDOR =====

export const shortIronCondor = (ctx: StrategyContext, offset: number = 0, optType: "" | "CE" | "PE" = ""): StrategyPosition[] => {
  if (optType === "") {
    return [
      createPosition(ctx, "Sell", 1, 4 + offset, "CE"),
      createPosition(ctx, "Sell", 1, -(4 - offset), "PE"),
      createPosition(ctx, "Buy", 1, 8 + offset, "CE"),
      createPosition(ctx, "Buy", 1, -(8 - offset), "PE"),
    ];
  } else {
    // All same option type (used for condors with offset)
    return [
      createPosition(ctx, "Sell", 1, 4 + offset, optType),
      createPosition(ctx, "Sell", 1, -(4 - offset), optType),
      createPosition(ctx, "Buy", 1, 8 + offset, optType),
      createPosition(ctx, "Buy", 1, -(8 - offset), optType),
    ];
  }
};

export const longIronCondor = (ctx: StrategyContext, offset: number = 0, optType: "" | "CE" | "PE" = ""): StrategyPosition[] => {
  if (optType === "") {
    return [
      createPosition(ctx, "Buy", 1, 4 + offset, "CE"),
      createPosition(ctx, "Buy", 1, -(4 - offset), "PE"),
      createPosition(ctx, "Sell", 1, 8 + offset, "CE"),
      createPosition(ctx, "Sell", 1, -(8 - offset), "PE"),
    ];
  } else {
    return [
      createPosition(ctx, "Buy", 1, 4 + offset, optType),
      createPosition(ctx, "Buy", 1, -(4 - offset), optType),
      createPosition(ctx, "Sell", 1, 8 + offset, optType),
      createPosition(ctx, "Sell", 1, -(8 - offset), optType),
    ];
  }
};

// ===== BUTTERFLY =====

export const ironButterfly = (ctx: StrategyContext, offset: number = 0, optType: "" | "CE" | "PE" = ""): StrategyPosition[] => {
  if (optType === "") {
    return [
      createPosition(ctx, "Sell", 1, offset, "CE"),
      createPosition(ctx, "Sell", 1, offset, "PE"),
      createPosition(ctx, "Buy", 1, 4 + offset, "CE"),
      createPosition(ctx, "Buy", 1, -(4 - offset), "PE"),
    ];
  } else {
    return [
      createPosition(ctx, "Sell", 2, offset, optType),
      createPosition(ctx, "Buy", 1, 4 + offset, optType),
      createPosition(ctx, "Buy", 1, -(4 - offset), optType),
    ];
  }
};

export const longIronButterfly = (ctx: StrategyContext, offset: number = 0, optType: "" | "CE" | "PE" = ""): StrategyPosition[] => {
  if (optType === "") {
    return [
      createPosition(ctx, "Buy", 1, offset, "CE"),
      createPosition(ctx, "Buy", 1, offset, "PE"),
      createPosition(ctx, "Sell", 1, 4 + offset, "CE"),
      createPosition(ctx, "Sell", 1, -(4 - offset), "PE"),
    ];
  } else {
    return [
      createPosition(ctx, "Buy", 2, offset, optType),
      createPosition(ctx, "Sell", 1, 4 + offset, optType),
      createPosition(ctx, "Sell", 1, -(4 - offset), optType),
    ];
  }
};

// ===== RATIO SPREADS =====

export const callRatioSpread = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Sell", 2, 4, "CE"),
  createPosition(ctx, "Buy", 1, 0, "CE"),
];

export const putRatioSpread = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Sell", 2, -4, "PE"),
  createPosition(ctx, "Buy", 1, 0, "PE"),
];

export const callRatioBackSpread = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Buy", 2, 4, "CE"),
  createPosition(ctx, "Sell", 1, 0, "CE"),
];

export const putRatioBackSpread = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Buy", 2, -4, "PE"),
  createPosition(ctx, "Sell", 1, 0, "PE"),
];

// ===== EXOTIC STRATEGIES =====

export const batman = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Sell", 2, 6, "CE"),
  createPosition(ctx, "Sell", 2, -6, "PE"),
  createPosition(ctx, "Buy", 1, 5, "CE"),
  createPosition(ctx, "Buy", 1, -5, "PE"),
];

export const doublePlateau = (ctx: StrategyContext): StrategyPosition[] => [
  ...shortIronCondor(ctx, 9, "CE"),
  ...shortIronCondor(ctx, -9, "PE"),
];

export const strap = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Buy", 2, 0, "CE"),
  createPosition(ctx, "Buy", 1, 0, "PE"),
];

export const strip = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Buy", 1, 0, "CE"),
  createPosition(ctx, "Buy", 2, 0, "PE"),
];

export const jadeLizard = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Sell", 1, -5, "PE"),
  createPosition(ctx, "Buy", 1, 15, "CE"),
  createPosition(ctx, "Sell", 1, 11, "CE"),
];

export const reverseJadeLizard = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Sell", 1, 5, "CE"),
  createPosition(ctx, "Buy", 1, -15, "PE"),
  createPosition(ctx, "Sell", 1, -11, "PE"),
];

// ===== SYNTHETIC FUTURES =====

export const longSyntheticFuture = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Buy", 1, 0, "CE"),
  createPosition(ctx, "Sell", 1, 0, "PE"),
];

export const shortSyntheticFuture = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Sell", 1, 0, "CE"),
  createPosition(ctx, "Buy", 1, 0, "PE"),
];

// ===== RANGE/RISK =====

export const rangeForward = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Buy", 1, 4, "CE"),
  createPosition(ctx, "Sell", 1, -4, "PE"),
];

export const riskReversal = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Sell", 1, 4, "CE"),
  createPosition(ctx, "Buy", 1, -4, "PE"),
];

// ===== CALENDAR SPREADS =====

// Note: Calendar spreads require different expiries - these are simplified versions
export const longCalendarWithCalls = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Buy", 1, 0, "CE"),
  createPosition(ctx, "Sell", 1, 0, "CE"),
];

export const longCalendarWithPuts = (ctx: StrategyContext): StrategyPosition[] => [
  createPosition(ctx, "Buy", 1, 0, "PE"),
  createPosition(ctx, "Sell", 1, 0, "PE"),
];

// ===== CONDORS (Directional) =====

export const bullCondor = (ctx: StrategyContext): StrategyPosition[] => shortIronCondor(ctx, 5);

export const bearCondor = (ctx: StrategyContext): StrategyPosition[] => shortIronCondor(ctx, -5);

// ===== BUTTERFLY (Directional) =====

export const bullButterfly = (ctx: StrategyContext): StrategyPosition[] => ironButterfly(ctx, 5);

export const bearButterfly = (ctx: StrategyContext): StrategyPosition[] => ironButterfly(ctx, -5);

// ===== STRATEGY MAPPING =====

export type StrategyId = 
  | "buy-call" | "sell-call" | "buy-put" | "sell-put"
  | "buy-futures" | "sell-futures"
  | "long-straddle" | "short-straddle"
  | "long-strangle" | "short-strangle"
  | "bull-call-spread" | "bear-call-spread" | "bull-put-spread" | "bear-put-spread"
  | "short-iron-condor" | "long-iron-condor"
  | "iron-butterfly" | "long-iron-butterfly"
  | "call-ratio-spread" | "put-ratio-spread"
  | "call-ratio-back-spread" | "put-ratio-back-spread"
  | "batman" | "double-plateu" | "strap" | "strip"
  | "jade-lizard" | "reverse-jade-lizard"
  | "long-synthetic-fut" | "short-synthetic-future"
  | "range-forward" | "risk-reversal"
  | "long-calendar-with-calls-BuaBwyDA" | "long-calendar-with-puts"
  | "bull-condor" | "bear-condor"
  | "bull-butterfly" | "bear-butterfly";

export const getStrategyPositions = (strategyId: string, ctx: StrategyContext): StrategyPosition[] => {
  switch (strategyId) {
    // Single leg
    case "buy-call":
      return buyCall(ctx);
    case "sell-call":
      return sellCall(ctx);
    case "buy-put":
      return buyPut(ctx);
    case "sell-put":
      return sellPut(ctx);
    
    // Futures
    case "buy-futures":
      return buyFutures(ctx);
    case "sell-futures":
      return sellFutures(ctx);
    
    // Straddle
    case "long-straddle":
      return longStraddle(ctx);
    case "short-straddle":
      return shortStraddle(ctx);
    
    // Strangle
    case "long-strangle":
      return longStrangle(ctx);
    case "short-strangle":
      return shortStrangle(ctx);
    
    // Spreads
    case "bull-call-spread":
      return bullCallSpread(ctx, -4);
    case "bear-call-spread":
      return bearCallSpread(ctx, -4);
    case "bull-put-spread":
      return bullPutSpread(ctx, 4);
    case "bear-put-spread":
      return bearPutSpread(ctx, 4);
    
    // Iron Condor
    case "short-iron-condor":
      return shortIronCondor(ctx);
    case "long-iron-condor":
      return longIronCondor(ctx);
    
    // Butterfly
    case "iron-butterfly":
      return ironButterfly(ctx);
    case "long-iron-butterfly":
      return longIronButterfly(ctx);
    
    // Ratio Spreads
    case "call-ratio-spread":
      return callRatioSpread(ctx);
    case "put-ratio-spread":
      return putRatioSpread(ctx);
    case "call-ratio-back-spread":
      return callRatioBackSpread(ctx);
    case "put-ratio-back-spread":
      return putRatioBackSpread(ctx);
    
    // Exotic
    case "batman":
      return batman(ctx);
    case "double-plateu":
      return doublePlateau(ctx);
    case "strap":
      return strap(ctx);
    case "strip":
      return strip(ctx);
    case "jade-lizard":
      return jadeLizard(ctx);
    case "reverse-jade-lizard":
      return reverseJadeLizard(ctx);
    
    // Synthetic
    case "long-synthetic-fut":
      return longSyntheticFuture(ctx);
    case "short-synthetic-future":
      return shortSyntheticFuture(ctx);
    
    // Range/Risk
    case "range-forward":
      return rangeForward(ctx);
    case "risk-reversal":
      return riskReversal(ctx);
    
    // Calendar (simplified)
    case "long-calendar-with-calls-BuaBwyDA":
      return longCalendarWithCalls(ctx);
    case "long-calendar-with-puts":
      return longCalendarWithPuts(ctx);
    
    // Directional Condors
    case "bull-condor":
      return bullCondor(ctx);
    case "bear-condor":
      return bearCondor(ctx);
    
    // Directional Butterflies
    case "bull-butterfly":
      return bullButterfly(ctx);
    case "bear-butterfly":
      return bearButterfly(ctx);
    
    default:
      console.warn(`Unknown strategy: ${strategyId}`);
      return [];
  }
};
