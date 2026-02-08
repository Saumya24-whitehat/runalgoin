import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, BarChart } from "lucide-react";

// Mapping of API keys to display names
const symbolNameMap: Record<string, string> = {
  "SYML:NSE;NIFTY": "Nifty 50",
  "SYML:NSE;CNX500": "Nifty 500",
  "SYML:NSE;BANKNIFTY": "Nifty Bank",
  "SYML:NSE;SENSEX": "Sensex",
  "SYML:NSE;CNXIT": "Nifty IT",
  "SYML:NSE;CNXFINANCE": "Nifty Finance",
  "SYML:NSE;CNXAUTO": "Nifty Auto",
  "SYML:NSE;NIFTYJR": "Nifty Next 50",
  "SYML:NSE;CNXPSUBANK": "Nifty PSU Bank",
  "SYML:NSE;CNXPHARMA": "Nifty Pharma",
  "SYML:NSE;CNXMETAL": "Nifty Metal",
  "SYML:NSE;NIFTYFINSRV25_50": "Nifty Fin Srv 25/50",
  "SYML:NSE;CNXFMCG": "Nifty FMCG",
  "SYML:NSE;CNXINFRA": "Nifty Infra",
  "SYML:NSE;NIFTYPVTBANK": "Nifty Pvt Bank",
  "SYML:NSE;CNXMEDIA": "Nifty Media",
  "SYML:NSE;CNXREALTY": "Nifty Realty",
  "SYML:NSE;NIFTY_HEALTHCARE": "Nifty Healthcare",
  "SYML:NSE;NIFTY_CONSR_DURBL": "Nifty Consumer Durables",
  "SYML:NSE;NIFTY_OIL_AND_GAS": "Nifty Oil & Gas",
  "SYML:NSE;CNXSMALLCAP": "Nifty Smallcap",
  "SYML:NSE;NIFTY_MID_SELECT": "Nifty Mid Select",
  "SYML:NSE;CNX200": "Nifty 200",
  "SYML:NSE;CNXENERGY": "Nifty Energy",
  "SYML:NSE;CNXCONSUMPTION": "Nifty Consumption",
  "SYML:NSE;CNXMIDCAP": "Nifty Midcap",
  "SYML:NSE;CNXCOMMODITIES": "Nifty Commodities",
  "SYML:NSE;NIFTYMIDCAP50": "Nifty Midcap 50",
  "SYML:NSE;NIFTYSMLCAP250": "Nifty Smallcap 250",
  "SYML:NSE;NIFTYMIDSML400": "Nifty Midsml 400",
  "SYML:NSE;CNXPSE": "Nifty PSE",
  "SYML:NSE;NIFTYMIDCAP150": "Nifty Midcap 150",
  "SYML:NSE;NIFTY_MICROCAP250": "Nifty Microcap 250",
  "SYML:NSE;NIFTYALPHA50": "Nifty Alpha 50",
  "SYML:NSE;NIFTY_TOTAL_MKT": "Nifty Total Mkt",
  "SYML:NSE;CPSE": "CPSE",
  "SYML:NSE;CNX100": "Nifty 100",
  "SYML:NSE;CNXSERVICE": "Nifty Service",
  "SYML:NSE;NIFTY500_MULTICAP": "Nifty 500 Multicap",
  "SYML:NSE;CNXMNC": "Nifty MNC",
  "SYML:NSE;NIFTY_INDIA_MFG": "Nifty India Mfg",
  "SYML:NSE;NIFTY200MOMENTM30": "Nifty 200 Momentum 30",
  "SYML:NSE;NIFTYSMLCAP50": "Nifty Smallcap 50",
  "SYML:NSE;NIFTY_LARGEMID250": "Nifty Largemid 250",
  "SYML:NSE;NIFTY50EQUALWEIGHT": "Nifty 50 Equal Wt",
  "SYML:NSE;NIFTY_IND_DIGITAL": "Nifty Ind Digital",
};

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

        // Get the display name for the symbol to use as the key
        const indexKey = symbolNameMap[symbol] || "Nifty 50";

        if (result && result[indexKey]) {
          const latestData = result[indexKey] as { advance?: number; decline?: number };
          
          setData({
            advances: latestData?.advance || 0,
            declines: latestData?.decline || 0,
            unchanged: 0,
          });
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
