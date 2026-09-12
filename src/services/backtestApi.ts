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
