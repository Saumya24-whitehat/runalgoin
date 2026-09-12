import { supabase } from "@/integrations/supabase/client";

export type ExpiryType = "weekly" | "monthly";

export interface BacktestStatRow {
  engine: string;
  signal: string;
  dir: string;
  bucket: string;
  trades: number;
  win_rate: number;
  avg_fwd15: number | null;
  avg_fwd30: number | null;
  avg_fwd60: number | null;
  avg_fwd_close: number | null;
}

export interface DayProgress {
  trade_date: string;
  status: string;
  candles: number;
}

/** Weekday dates (Mon-Fri) from oldest to newest for the given lookback in days. */
export function buildTradingDates(days: number, endDate = new Date()): string[] {
  const dates: string[] = [];
  for (let i = days; i >= 1; i--) {
    const day = new Date(endDate);
    day.setDate(day.getDate() - i);
    const weekday = day.getDay();
    if (weekday === 0 || weekday === 6) continue;
    dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
}

export async function fetchProcessedDays(symbol: string, expiryType: ExpiryType): Promise<DayProgress[]> {
  const { data, error } = await supabase
    .from("backtest_days")
    .select("trade_date, status, candles")
    .eq("symbol", symbol)
    .eq("expiry_type", expiryType);
  if (error) throw error;
  return data ?? [];
}

export async function runBacktestDay(symbol: string, date: string, expiryType: ExpiryType) {
  const { data, error } = await supabase.functions.invoke("backtest-day", { body: { symbol, date, expiryType } });
  if (error) throw error;
  return data as { status: string; candles: number; expiry?: string };
}

export async function fetchBacktestStats(symbol: string, expiryType: ExpiryType): Promise<BacktestStatRow[]> {
  const { data, error } = await supabase.rpc("backtest_stats", { _symbol: symbol, _expiry_type: expiryType });
  if (error) throw error;
  return (data ?? []) as BacktestStatRow[];
}

export interface OverallRow {
  engine: string;
  signal: string;
  dir: string;
  trades: number;
  winRate: number;
  avgFwd30: number;
  avgFwd60: number;
  bestBucket: string | null;
  bestBucketWinRate: number | null;
}

/** Roll bucket-level rows up to one row per engine + signal, keeping the best time window. */
export function rollUp(rows: BacktestStatRow[]): OverallRow[] {
  const groups = new Map<string, BacktestStatRow[]>();
  rows.forEach((row) => {
    const key = `${row.engine}|${row.signal}|${row.dir}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });

  const result: OverallRow[] = [];
  groups.forEach((items, key) => {
    const [engine, signal, dir] = key.split("|");
    const trades = items.reduce((sum, item) => sum + Number(item.trades), 0);
    const weighted = (pick: (row: BacktestStatRow) => number | null) =>
      trades ? items.reduce((sum, item) => sum + Number(pick(item) ?? 0) * Number(item.trades), 0) / trades : 0;
    const eligible = items.filter((item) => Number(item.trades) >= 30);
    const best = eligible.length
      ? eligible.reduce((top, item) => (Number(item.win_rate) > Number(top.win_rate) ? item : top))
      : null;
    result.push({
      engine,
      signal,
      dir,
      trades,
      winRate: weighted((row) => row.win_rate),
      avgFwd30: weighted((row) => row.avg_fwd30),
      avgFwd60: weighted((row) => row.avg_fwd60),
      bestBucket: best ? best.bucket : null,
      bestBucketWinRate: best ? Number(best.win_rate) : null,
    });
  });

  return result.sort((a, b) => b.winRate - a.winRate);
}

export interface CoverageRow {
  symbol: string;
  expiry_type: string;
  days: number;
  candles: number;
  from_date: string | null;
  to_date: string | null;
}

/** Kitna data process ho chuka hai — symbol + expiry wise. */
export async function fetchCoverage(): Promise<CoverageRow[]> {
  const { data, error } = await supabase
    .from("backtest_days")
    .select("symbol, expiry_type, trade_date, candles")
    .eq("status", "done");
  if (error) throw error;
  const map = new Map<string, CoverageRow>();
  (data ?? []).forEach((row) => {
    const key = `${row.symbol}|${row.expiry_type}`;
    const current = map.get(key) ?? {
      symbol: row.symbol as string,
      expiry_type: row.expiry_type as string,
      days: 0,
      candles: 0,
      from_date: null,
      to_date: null,
    };
    current.days += 1;
    current.candles += Number(row.candles ?? 0);
    const date = row.trade_date as string;
    if (!current.from_date || date < current.from_date) current.from_date = date;
    if (!current.to_date || date > current.to_date) current.to_date = date;
    map.set(key, current);
  });
  return [...map.values()].sort((a, b) => a.symbol.localeCompare(b.symbol) || a.expiry_type.localeCompare(b.expiry_type));
}

export interface CombinedRow extends OverallRow {
  symbol: string;
  expiryType: ExpiryType;
}

/** Chaar combos (2 symbol x 2 expiry) ka rolled-up result ek list me. */
export async function fetchAllResults(symbols: string[]): Promise<CombinedRow[]> {
  const combos = symbols.flatMap((symbol) =>
    (["weekly", "monthly"] as ExpiryType[]).map((expiryType) => ({ symbol, expiryType })),
  );
  const results = await Promise.all(
    combos.map(async (combo) => {
      const rows = await fetchBacktestStats(combo.symbol, combo.expiryType);
      return rollUp(rows).map((row) => ({ ...row, symbol: combo.symbol, expiryType: combo.expiryType }));
    }),
  );
  return results.flat();
}

export interface EngineScore {
  engine: string;
  dir: string;
  trades: number;
  winRate: number;
  avgFwd30: number;
}

/** Engine + direction wise overall bharosa. */
export function engineScores(rows: CombinedRow[]): EngineScore[] {
  const map = new Map<string, { trades: number; win: number; move: number }>();
  rows.forEach((row) => {
    const key = `${row.engine}|${row.dir}`;
    const current = map.get(key) ?? { trades: 0, win: 0, move: 0 };
    current.trades += row.trades;
    current.win += row.winRate * row.trades;
    current.move += row.avgFwd30 * row.trades;
    map.set(key, current);
  });
  return [...map.entries()]
    .map(([key, value]) => {
      const [engine, dir] = key.split("|");
      return {
        engine,
        dir,
        trades: value.trades,
        winRate: value.trades ? value.win / value.trades : 0,
        avgFwd30: value.trades ? value.move / value.trades : 0,
      };
    })
    .sort((a, b) => b.winRate - a.winRate);
}
