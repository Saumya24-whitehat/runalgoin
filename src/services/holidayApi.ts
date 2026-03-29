import { supabase } from "@/integrations/supabase/client";

export interface NseHoliday {
  date: string; // YYYY-MM-DD
  displayDate: string;
  name: string;
}

export async function fetchNseHolidays(year: number): Promise<NseHoliday[]> {
  const { data, error } = await supabase.functions.invoke("nse-holidays", {
    body: { year },
  });

  if (error) throw new Error(error.message || "Failed to fetch holidays");

  const rows = data?.reportTableData || [];
  return rows.map((r: Record<string, string>) => ({
    date: r["~holiday_dt"],
    displayDate: r["Date"],
    name: r["Holiday"],
  }));
}
