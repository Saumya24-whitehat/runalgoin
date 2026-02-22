import { fetchWithFallback } from "./directApi";

export interface DealData {
  client: string;
  type: string;
  company: string;
  qty: string | number;
  price: string | number;
}

export const fetchDealsData = async (fileType: 'bulk' | 'block' | 'short'): Promise<DealData[]> => {
  return fetchWithFallback<DealData[]>({
    directPath: `/navbar/marketpage/get_deals_data.php`,
    edgeFunctionName: "deals-data",
    queryParams: { file: fileType },
  });
};
