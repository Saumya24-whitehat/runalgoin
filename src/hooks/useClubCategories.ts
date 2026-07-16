import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ClubCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
}

export function useClubCategories() {
  const [categories, setCategories] = useState<ClubCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("club_categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      if (error) console.error(error);
      setCategories((data || []) as any);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loading };
}
