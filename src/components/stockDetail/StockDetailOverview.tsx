import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { fetchStockConsolidated, ConsolidatedData } from "@/services/stockDetailApi";

interface StockDetailOverviewProps {
  symbol: string;
}

export const StockDetailOverview = ({ symbol }: StockDetailOverviewProps) => {
  const [data, setData] = useState<ConsolidatedData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await fetchStockConsolidated(symbol);
      setData(result);
      setLoading(false);
    };
    fetchData();
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No data available for {symbol}
      </div>
    );
  }

  const growthData = [
    { title: "Compounded Sales Growth", data: data.Table_3 },
    { title: "Compounded Profit Growth", data: data.Table_4 },
    { title: "Stock Price CAGR", data: data.Table_5 },
    { title: "Return on Equity", data: data.Table_6 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {growthData.map((section, idx) => (
        <Card key={idx} className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {section.data?.map((item, i) => {
                const keys = Object.keys(item);
                const label = item[keys[0]];
                const value = item[keys[1]];
                return (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`font-medium ${
                      String(value).startsWith('-') ? 'text-red-500' : 'text-emerald-500'
                    }`}>{value}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Ratios */}
      {data.Table_9 && (
        <Card className="bg-card border-border md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Key Ratios (Latest)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {data.Table_9.map((item, i) => {
                const keys = Object.keys(item);
                const label = item['Unnamed: 0'];
                const latestKey = keys[keys.length - 1];
                const value = item[latestKey];
                return (
                  <div key={i} className="text-center">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-semibold text-foreground">{value}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
