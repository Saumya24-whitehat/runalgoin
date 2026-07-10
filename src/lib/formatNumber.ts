/**
 * Indian-market compact number formatting.
 * - < 1,000            -> raw (e.g. 987)
 * - < 1 lakh           -> "K"      (e.g. 12.3K)
 * - < 1 crore          -> "L"      (e.g. 4.5L)
 * - >= 1 crore         -> "Cr"     (e.g. 1.3Cr)
 *
 * Also exports `formatIndianNumber` for the exact grouped value
 * (12,34,567 style) suitable for tooltips / expanded rows.
 */
export function formatCompactIndian(
  value: number | null | undefined,
  fractionDigits = 1
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs < 1_000) return `${sign}${abs.toFixed(0)}`;
  if (abs < 1_00_000) return `${sign}${(abs / 1_000).toFixed(fractionDigits)}K`;
  if (abs < 1_00_00_000)
    return `${sign}${(abs / 1_00_000).toFixed(fractionDigits)}L`;
  return `${sign}${(abs / 1_00_00_000).toFixed(fractionDigits)}Cr`;
}

/** Full Indian-grouped number: 1234567 -> "12,34,567" */
export function formatIndianNumber(
  value: number | null | undefined,
  fractionDigits = 0
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}
