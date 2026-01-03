import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { fetchDeliveryData, DeliveryData } from "@/services/indexDetailApi";

interface IndexDetailDeliveriesProps {
  indexSymbol: string;
}

export const IndexDetailDeliveries = ({ indexSymbol }: IndexDetailDeliveriesProps) => {
  const [data, setData] = useState<DeliveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'dateWise' | 'stockWise'>('dateWise');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const result = await fetchDeliveryData(indexSymbol);
      if (result) {
        setData(result);
      }
      setLoading(false);
    };

    loadData();
  }, [indexSymbol]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No delivery data available
      </div>
    );
  }

  const formatCrores = (value: number) => {
    return (value / 10000000).toFixed(2) + ' Cr.';
  };

  const calculateDeliveryPercent = (delivery: number, traded: number) => {
    if (traded === 0) return 0;
    return (delivery / traded) * 100;
  };

  return (
    <div className="space-y-4">
      {/* View Mode Buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={viewMode === 'dateWise' ? 'default' : 'outline'}
          onClick={() => setViewMode('dateWise')}
        >
          Date Wise
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'stockWise' ? 'default' : 'outline'}
          onClick={() => setViewMode('stockWise')}
        >
          Stock Wise
        </Button>
      </div>

      {viewMode === 'dateWise' ? (
        <div className="space-y-4">
          {data.total_df.slice().reverse().slice(0, 15).map((item) => {
            const deliveryPct = calculateDeliveryPercent(item.COP_DELIV_QTY, item.CH_TOT_TRADED_QTY);
            
            return (
              <div key={item.mTIMESTAMP} className="border border-border rounded-lg p-4 bg-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-primary font-medium">{item.mTIMESTAMP}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">0</span>
                    <span className="text-sm text-muted-foreground">0%</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground min-w-[100px]">
                    Delivery {formatCrores(item.COP_DELIV_QTY)}
                  </span>
                  <div className="flex-1 h-5 rounded overflow-hidden flex">
                    <div 
                      className="bg-primary h-full flex items-center justify-center text-[10px] text-primary-foreground font-medium"
                      style={{ width: `${deliveryPct}%` }}
                    >
                      {deliveryPct.toFixed(0)}%
                    </div>
                    <div 
                      className="bg-amber-500 h-full"
                      style={{ width: `${100 - deliveryPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground min-w-[100px] text-right">
                    Trade {formatCrores(item.CH_TOT_TRADED_QTY)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3">
          {data.last_day_df.map((item) => {
            const deliveryPct = calculateDeliveryPercent(item.COP_DELIV_QTY, item.CH_TOT_TRADED_QTY);
            
            return (
              <div key={item.CH_SYMBOL} className="border border-border rounded-lg p-3 bg-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-primary font-medium">{item.CH_SYMBOL}</span>
                  <span className="text-sm font-mono">₹{item.CH_LAST_TRADED_PRICE.toLocaleString()}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-4 rounded overflow-hidden flex bg-muted">
                    <div 
                      className="bg-primary h-full flex items-center justify-center text-[9px] text-primary-foreground font-medium"
                      style={{ width: `${deliveryPct}%` }}
                    >
                      {deliveryPct.toFixed(0)}%
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatCrores(item.COP_DELIV_QTY)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
