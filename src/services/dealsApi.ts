import { supabase } from "@/integrations/supabase/client";

export interface DealData {
  client: string;
  type: string;
  company: string;
  qty: string | number;
  price: string | number;
}

export const fetchDealsData = async (fileType: 'bulk' | 'block' | 'short'): Promise<DealData[]> => {
  const { data, error } = await supabase.functions.invoke('deals-data', {
    body: {},
    headers: {},
  });

  // Use query params approach by invoking with the correct URL
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deals-data?file=${fileType}`,
    {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch deals data: ${response.status}`);
  }

  const result = await response.json();
  return result;
};
