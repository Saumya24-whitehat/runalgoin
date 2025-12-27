import { TrendingDown, TrendingUp } from "lucide-react";

interface TickerItem {
  name: string;
  value: string;
  change: string;
  isPositive: boolean;
}

const tickerData: TickerItem[] = [
  { name: "Sensex", value: "85041.45", change: "-367.25", isPositive: false },
  { name: "Nifty 50", value: "26042.3", change: "-99.8", isPositive: false },
  { name: "Nifty Bank", value: "59011.35", change: "-172.25", isPositive: false },
  { name: "Nifty Fin Service", value: "27430.75", change: "-134.75", isPositive: false },
  { name: "Nifty Mid Select", value: "13722.85", change: "-90.25", isPositive: false },
  { name: "Bankex", value: "65990.69", change: "-156.88", isPositive: false },
  { name: "Nifty IT", value: "44250.30", change: "+125.40", isPositive: true },
  { name: "Nifty Auto", value: "23456.78", change: "+89.50", isPositive: true },
];

export function TickerRibbon() {
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
