CREATE TABLE public.backtest_candles (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  trade_date DATE NOT NULL,
  expiry_type TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  slot TEXT NOT NULL,
  spot NUMERIC NOT NULL,
  nitin_label TEXT,
  nitin_dir TEXT,
  nitin_score NUMERIC,
  iv_label TEXT,
  iv_dir TEXT,
  sf_ratio NUMERIC,
  sf_dir TEXT,
  fwd15 NUMERIC,
  fwd30 NUMERIC,
  fwd60 NUMERIC,
  fwd_close NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (symbol, trade_date, expiry_type, slot)
);

CREATE INDEX idx_backtest_candles_lookup ON public.backtest_candles (symbol, expiry_type, trade_date);

CREATE TABLE public.backtest_days (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  trade_date DATE NOT NULL,
  expiry_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  candles INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (symbol, trade_date, expiry_type)
);

GRANT SELECT ON public.backtest_candles TO authenticated;
GRANT ALL ON public.backtest_candles TO service_role;
GRANT SELECT ON public.backtest_days TO authenticated;
GRANT ALL ON public.backtest_days TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.backtest_candles_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.backtest_days_id_seq TO service_role;

ALTER TABLE public.backtest_candles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view backtest candles" ON public.backtest_candles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in users can view backtest days" ON public.backtest_days FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.backtest_stats(_symbol TEXT, _expiry_type TEXT)
RETURNS TABLE (
  engine TEXT,
  signal TEXT,
  dir TEXT,
  bucket TEXT,
  trades BIGINT,
  win_rate NUMERIC,
  avg_fwd15 NUMERIC,
  avg_fwd30 NUMERIC,
  avg_fwd60 NUMERIC,
  avg_fwd_close NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH base AS (
  SELECT slot, fwd15, fwd30, fwd60, fwd_close,
    CASE
      WHEN slot < '1000' THEN '09:15-10:00'
      WHEN slot < '1100' THEN '10:00-11:00'
      WHEN slot < '1200' THEN '11:00-12:00'
      WHEN slot < '1300' THEN '12:00-13:00'
      WHEN slot < '1400' THEN '13:00-14:00'
      ELSE '14:00-15:30'
    END AS bucket,
    nitin_label, nitin_dir, iv_label, iv_dir, sf_dir
  FROM public.backtest_candles
  WHERE symbol = _symbol AND expiry_type = _expiry_type
),
unpivot AS (
  SELECT 'NitinBhaiya'::TEXT AS engine, nitin_label AS signal, nitin_dir AS dir, bucket, fwd15, fwd30, fwd60, fwd_close FROM base WHERE nitin_dir IS NOT NULL
  UNION ALL
  SELECT 'IV Flow', iv_label, iv_dir, bucket, fwd15, fwd30, fwd60, fwd_close FROM base WHERE iv_dir IS NOT NULL
  UNION ALL
  SELECT 'Strike Flow', sf_dir, sf_dir, bucket, fwd15, fwd30, fwd60, fwd_close FROM base WHERE sf_dir IS NOT NULL
)
SELECT engine, signal, dir, bucket,
  COUNT(*) AS trades,
  ROUND(100.0 * SUM(
    CASE
      WHEN dir = 'bullish' AND fwd30 > 0 THEN 1
      WHEN dir = 'bearish' AND fwd30 < 0 THEN 1
      ELSE 0
    END
  ) / GREATEST(COUNT(*), 1), 2) AS win_rate,
  ROUND(AVG(fwd15)::NUMERIC, 2) AS avg_fwd15,
  ROUND(AVG(fwd30)::NUMERIC, 2) AS avg_fwd30,
  ROUND(AVG(fwd60)::NUMERIC, 2) AS avg_fwd60,
  ROUND(AVG(fwd_close)::NUMERIC, 2) AS avg_fwd_close
FROM unpivot
WHERE dir <> 'neutral'
GROUP BY engine, signal, dir, bucket
ORDER BY engine, signal, bucket;
$$;

GRANT EXECUTE ON FUNCTION public.backtest_stats(TEXT, TEXT) TO authenticated, service_role;