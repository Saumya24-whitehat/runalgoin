import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TickerItem {
  name: string;
  value: string;
  change: string;
  isPositive: boolean;
}

interface TickerAPIResponse {
  [key: string]: {
    ltp: number;
    ch: number;
    chPer: string;
    symbol: string;
  };
}

const fallbackData: TickerItem[] = [
  { name: "Sensex", value: "85041.45", change: "-367.25", isPositive: false },
  { name: "Nifty 50", value: "26042.30", change: "-99.80", isPositive: false },
  { name: "Nifty Bank", value: "59011.35", change: "-172.25", isPositive: false },
  { name: "Nifty Fin Service", value: "27430.75", change: "-134.75", isPositive: false },
  { name: "Nifty Mid Select", value: "13722.85", change: "-90.25", isPositive: false },
  { name: "Bankex", value: "65990.69", change: "-156.88", isPositive: false },
];

export function TickerRibbon() {
  const [tickerData, setTickerData] = useState<TickerItem[]>(fallbackData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTickerData = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('ticker-data');
        
        if (error) {
          console.error('Error fetching ticker data:', error);
          return;
        }

        if (data && typeof data === 'object' && !data.error) {
          const apiData = data as TickerAPIResponse;
          const formattedData: TickerItem[] = Object.entries(apiData).map(([key, value]) => ({
            name: value.symbol || key,
            value: value.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            change: value.ch >= 0 ? `+${value.ch.toFixed(2)}` : value.ch.toFixed(2),
            isPositive: value.ch >= 0,
          }));
          setTickerData(formattedData);
        }
      } catch (error) {
        console.error('Error fetching ticker data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickerData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchTickerData, 30000);
    return () => clearInterval(interval);
  }, []);

  const repeatedData = [...tickerData, ...tickerData];

  return (
    <div className="bg-ticker-bg border-b border-border overflow-hidden">
      <div className="ticker-scroll flex whitespace-nowrap py-2">
        {repeatedData.map((item, index) => (
          <div
            key={`${item.name}-${index}`}
            className="inline-flex items-center gap-2 px-6 border-r border-border/50 last:border-r-0"
          >
            <span className="font-medium text-sm text-ticker-text">{item.name}</span>
            <span className="font-semibold text-sm text-foreground">{item.value}</span>
            <span
              className={`flex items-center gap-1 text-sm font-medium ${
                item.isPositive ? "text-success" : "text-destructive"
              }`}
            >
              {item.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {item.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
