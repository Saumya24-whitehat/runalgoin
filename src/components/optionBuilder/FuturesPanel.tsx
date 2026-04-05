import { Button } from "@/components/ui/button";
import { Position } from "@/services/optionBuilderApi";
import { TrendingUp, TrendingDown } from "lucide-react";

export interface FutureContract {
  name: string;
  expiry: string;
  token: string;
  ltp: number;
  change?: number;
  prevLtp?: number;
}

interface FuturesPanelProps {
  futures: FutureContract[];
  lotSize: number;
  date: string;
  onAddPosition: (position: Omit<Position, "id" | "enabled">) => void;
}

const FuturesPanel = ({ futures, lotSize, date, onAddPosition }: FuturesPanelProps) => {
  if (futures.length === 0) return null;

  const handleAddFuture = (future: FutureContract, action: "Buy" | "Sell") => {
    onAddPosition({
      action,
      lots: 1,
      date,
      expiry: future.expiry,
      strike: 0,
      optType: "FUTURE",
      entryPrice: future.ltp,
      currentPrice: future.ltp,
      IV: 0,
      lotSize,
      instrumentToken: future.token,
    });
  };

  return (
    <div className="border border-border rounded-lg p-3 mb-3">
      <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Futures</h4>
      <div className="space-y-1.5">
        {futures.map((future) => {
          const tickUp = future.prevLtp !== undefined
            ? (future.ltp > future.prevLtp ? true : future.ltp < future.prevLtp ? false : null)
            : null;
          const changeVal = future.change ?? 0;
          const changeColor = changeVal > 0 ? "text-emerald-500" : changeVal < 0 ? "text-red-500" : "text-muted-foreground";

          return (
            <div
              key={future.token}
              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium truncate">{future.name}</span>
                <span className="text-[10px] text-muted-foreground">{future.expiry}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-semibold ${tickUp === true ? "text-emerald-500" : tickUp === false ? "text-red-500" : ""}`}>
                    ₹{future.ltp.toFixed(2)}
                  </span>
                  {changeVal !== 0 && (
                    <span className={`text-[10px] ${changeColor} flex items-center`}>
                      {changeVal > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                      {changeVal > 0 ? "+" : ""}{changeVal.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    className="h-5 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleAddFuture(future, "Buy")}
                  >
                    BUY
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-5 px-2 text-[10px]"
                    onClick={() => handleAddFuture(future, "Sell")}
                  >
                    SELL
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FuturesPanel;
