import { RefreshCw, Timer } from "lucide-react";
import { useState, useEffect } from "react";

interface LastRefreshBadgeProps {
  lastRefresh: Date | null;
  isFetching?: boolean;
  refreshIntervalMs?: number; // default 60000 (1 min)
}

export const LastRefreshBadge = ({ lastRefresh, isFetching, refreshIntervalMs = 60000 }: LastRefreshBadgeProps) => {
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!lastRefresh) return;

    const calcRemaining = () => {
      const elapsed = Date.now() - lastRefresh.getTime();
      const remaining = Math.max(0, Math.ceil((refreshIntervalMs - elapsed) / 1000));
      setCountdown(remaining);
    };

    calcRemaining();
    const timer = setInterval(calcRemaining, 1000);
    return () => clearInterval(timer);
  }, [lastRefresh, refreshIntervalMs]);

  if (!lastRefresh) return null;

  const timeStr = lastRefresh.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
        <span>Last refreshed: <span className="font-medium text-foreground">{timeStr}</span></span>
      </div>
      {countdown !== null && !isFetching && (
        <div className="flex items-center gap-1 text-amber-500">
          <Timer className="h-3 w-3" />
          <span className="font-medium">{countdown}s</span>
        </div>
      )}
      {isFetching && (
        <span className="text-primary font-medium">Refreshing...</span>
      )}
    </div>
  );
};
