import { RefreshCw } from "lucide-react";

interface LastRefreshBadgeProps {
  lastRefresh: Date | null;
  isFetching?: boolean;
}

export const LastRefreshBadge = ({ lastRefresh, isFetching }: LastRefreshBadgeProps) => {
  if (!lastRefresh) return null;

  const timeStr = lastRefresh.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
      <span>Last refreshed: <span className="font-medium text-foreground">{timeStr}</span></span>
    </div>
  );
};
