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
SECURITY INVOKER
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

REVOKE EXECUTE ON FUNCTION public.backtest_stats(TEXT, TEXT) FROM anon;