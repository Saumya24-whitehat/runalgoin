import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp, Loader2 } from "lucide-react";
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

export function TickerRibbon() {
  const [tickerData, setTickerData] = useState<TickerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchTickerData = async () => {
      try {
        setHasError(false);
        const { data, error } = await supabase.functions.invoke('ticker-data');
        
        if (error) {
          console.error('Error fetching ticker data:', error);
          setHasError(true);
          setTickerData([]);
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
          setHasError(false);
        } else {
          setHasError(true);
          setTickerData([]);
        }
      } catch (error) {
        console.error('Error fetching ticker data:', error);
        setHasError(true);
        setTickerData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickerData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchTickerData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-ticker-bg border-b border-border overflow-hidden py-2">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading market data...</span>
        </div>
      </div>
    );
  }

  // Show error state if no data
  if (hasError || tickerData.length === 0) {
    return (
      <div className="bg-ticker-bg border-b border-border overflow-hidden py-2">
        <div className="flex items-center justify-center text-destructive">
          <span className="text-sm font-medium">⚠️ Unable to fetch market data from API</span>
        </div>
      </div>
    );
  }

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
