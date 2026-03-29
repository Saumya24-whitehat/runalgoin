import { CalendarOff } from "lucide-react";
import { useMarketStatus } from "@/hooks/useMarketStatus";

export function MarketClosedBanner() {
  const { isTodayClosed, closedReason, lastWorkingDay } = useMarketStatus();

  if (!isTodayClosed) return null;

  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-md px-4 py-2 mb-3 flex items-center gap-3">
      <CalendarOff className="h-5 w-5 text-destructive shrink-0" />
      <div className="text-sm">
        <span className="font-medium text-destructive">Market Closed</span>
        {closedReason && (
          <span className="text-muted-foreground"> — {closedReason}</span>
        )}
        <span className="text-muted-foreground">
          {" "}• Showing last trading day ({lastWorkingDay}) data
        </span>
      </div>
    </div>
  );
}
