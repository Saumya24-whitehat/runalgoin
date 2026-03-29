import { useQuery } from "@tanstack/react-query";
import { fetchNseHolidays } from "@/services/holidayApi";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns whether today is a market holiday/weekend
 * and the last working day date string (YYYY-MM-DD).
 */
export function useMarketStatus() {
  const today = new Date();
  const year = today.getFullYear();

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ["nse-holidays", year],
    queryFn: () => fetchNseHolidays(year),
    staleTime: 24 * 60 * 60 * 1000, // cache 24h
  });

  // Also fetch special trading days from DB
  const { data: specialDays = [] } = useQuery({
    queryKey: ["special-trading-days", year],
    queryFn: async () => {
      const { data } = await supabase
        .from("special_trading_days")
        .select("*")
        .gte("date", `${year}-01-01`)
        .lte("date", `${year}-12-31`);
      return data || [];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });

  const holidayDates = new Set(holidays.map((h) => h.date));

  // Check if a date is a special trading day (overrides holiday/weekend)
  const specialTradingDates = new Set(
    specialDays
      .filter((d: any) => d.type === "trading_day")
      .map((d: any) => d.date)
  );

  const isMarketClosed = (d: Date): boolean => {
    const dateStr = formatDate(d);
    // Special trading day overrides everything
    if (specialTradingDates.has(dateStr)) return false;
    // Weekend
    const day = d.getDay();
    if (day === 0 || day === 6) return true;
    // Holiday
    if (holidayDates.has(dateStr)) return true;
    return false;
  };

  const getLastWorkingDay = (): string => {
    const d = new Date(today);
    // Start from today, go backwards
    // If today is open and market hours haven't started, use previous day
    // For simplicity: if today is closed, go back; otherwise today
    if (isMarketClosed(d)) {
      // go back until we find open day
      for (let i = 0; i < 10; i++) {
        d.setDate(d.getDate() - 1);
        if (!isMarketClosed(d)) break;
      }
    }
    return formatDate(d);
  };

  const todayStr = formatDate(today);
  const isTodayClosed = !isLoading && isMarketClosed(today);
  const lastWorkingDay = !isLoading ? getLastWorkingDay() : todayStr;

  // Find today's holiday name if applicable
  const todayHoliday = holidays.find((h) => h.date === todayStr);
  const closedReason = isTodayClosed
    ? todayHoliday
      ? todayHoliday.name
      : today.getDay() === 0
        ? "Sunday"
        : today.getDay() === 6
          ? "Saturday"
          : "Market Closed"
    : null;

  return {
    isTodayClosed,
    lastWorkingDay,
    closedReason,
    isLoading,
    holidays,
  };
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
