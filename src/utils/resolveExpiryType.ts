import type { ExpiryType } from "@/components/optionBuilder/CreateCustomStrategyModal";

/**
 * Classify expiries into weekly and monthly.
 * Monthly expiry = last expiry of that calendar month.
 * Weekly expiry = any expiry that is NOT the last in its month.
 */
function classifyExpiries(expiries: string[]): { weekly: string[]; monthly: string[] } {
  const sorted = [...expiries].sort();
  const monthly: string[] = [];
  const weekly: string[] = [];

  // Group by year-month
  const byMonth = new Map<string, string[]>();
  sorted.forEach((exp) => {
    const key = exp.slice(0, 7); // YYYY-MM
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(exp);
  });

  byMonth.forEach((dates) => {
    const last = dates[dates.length - 1];
    monthly.push(last);
    dates.slice(0, -1).forEach((d) => weekly.push(d));
  });

  return { weekly: weekly.sort(), monthly: monthly.sort() };
}

/**
 * Resolve expiry from available expiries based on the requested type.
 */
export function resolveExpiry(expiries: string[], expiryType: ExpiryType): string | null {
  if (!expiries.length) return null;

  const { weekly, monthly } = classifyExpiries(expiries);

  switch (expiryType) {
    case "current_week":
      return weekly[0] || expiries[0];
    case "next_week":
      return weekly[1] || weekly[0] || expiries[1] || expiries[0];
    case "current_month":
      return monthly[0] || expiries[expiries.length - 1];
    case "next_month":
      return monthly[1] || monthly[0] || expiries[expiries.length - 1];
    default:
      return expiries[0];
  }
}
