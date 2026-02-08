import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, BarChart } from "lucide-react";

interface MarketBreadthCardProps {
  symbol: string;
}

interface AdvanceDeclineData {
  advances: number;
  declines: number;
  unchanged: number;
}

export const MarketBreadthCard = ({ symbol }: MarketBreadthCardProps) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdvanceDeclineData | null>(null);

  useEffect(() => {
    const loadBreadthData = async () => {
      setLoading(true);
      try {
        const { data: result, error } = await supabase.functions.invoke("advance-decline");

        if (error) throw error;

        // The advance-decline API returns data for all indices
        // We need to extract the relevant one based on symbol
        if (result) {
          // The API returns an object with time-keyed entries
          // Each entry has advance and decline counts
          const entries = Object.entries(result);
          if (entries.length > 0) {
            // Get the latest entry
            const latestKey = entries[entries.length - 1][0];
            const latestData = result[latestKey] as { advance?: number; decline?: number };
            
            setData({
              advances: latestData?.advance || 0,
              declines: latestData?.decline || 0,
              unchanged: 0,
            });
          }
        }
      } catch (err) {
        console.error("Error fetching advance/decline data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (symbol) {
      loadBreadthData();
    }
  }, [symbol]);

  const advances = data?.advances || 0;
  const declines = data?.declines || 0;
  const unchanged = data?.unchanged || 0;
  const total = advances + declines + unchanged;
  const advancePercent = total > 0 ? (advances / total) * 100 : 0;
  const declinePercent = total > 0 ? (declines / total) * 100 : 0;
  const advDecRatio = declines > 0 ? (advances / declines).toFixed(2) : advances > 0 ? "∞" : "0";

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (total === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart className="h-4 w-4 text-primary" />
            Market Breadth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground text-sm py-4">
            No breadth data available for {symbol}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart className="h-4 w-4 text-primary" />
          Market Breadth
          {total > 0 && <span className="text-xs text-muted-foreground font-normal">({total} stocks)</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Advance/Decline Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-success flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Advances: {advances} ({advancePercent.toFixed(1)}%)
            </span>
            <span className="text-destructive flex items-center gap-1">
              Declines: {declines} ({declinePercent.toFixed(1)}%)
              <TrendingDown className="h-3 w-3" />
            </span>
          </div>
          <div className="h-4 flex rounded-full overflow-hidden bg-muted">
            <div 
              className="bg-success transition-all duration-500" 
              style={{ width: `${advancePercent}%` }}
            />
            {unchanged > 0 && (
              <div 
                className="bg-muted-foreground/30" 
                style={{ width: `${(unchanged / total) * 100}%` }}
              />
            )}
            <div 
              className="bg-destructive transition-all duration-500" 
              style={{ width: `${declinePercent}%` }}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-success/10 rounded-lg p-2">
            <div className="text-lg font-bold text-success">{advances}</div>
            <div className="text-[10px] text-muted-foreground">Advancing</div>
          </div>
          <div className="bg-muted rounded-lg p-2">
            <div className="text-lg font-bold text-foreground">{advDecRatio}</div>
            <div className="text-[10px] text-muted-foreground">A/D Ratio</div>
          </div>
          <div className="bg-destructive/10 rounded-lg p-2">
            <div className="text-lg font-bold text-destructive">{declines}</div>
            <div className="text-[10px] text-muted-foreground">Declining</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
