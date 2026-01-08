import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface SymbolGroup {
  indexSymbols: string[];
  stockSymbols: string[];
}

interface GreeksChartControlsProps {
  symbols: SymbolGroup;
  expiryDates: string[];
  strikes: number[];
  selectedSymbol: string;
  selectedExpiry: string;
  selectedStrike: number;
  selectedTimeframe: string;
  loadingSymbols: boolean;
  loadingExpiry: boolean;
  loadingStrikes: boolean;
  loadingData: boolean;
  onSymbolChange: (symbol: string) => void;
  onExpiryChange: (expiry: string) => void;
  onStrikeChange: (strike: number) => void;
  onTimeframeChange: (timeframe: string) => void;
  onGo: () => void;
}

const timeframes = [
  { value: "1min", label: "1 min" },
  { value: "3min", label: "3 min" },
  { value: "5min", label: "5 min" },
  { value: "15min", label: "15 min" },
  { value: "30min", label: "30 min" },
  { value: "60min", label: "60 min" },
];

export const GreeksChartControls = ({
  symbols,
  expiryDates,
  strikes,
  selectedSymbol,
  selectedExpiry,
  selectedStrike,
  selectedTimeframe,
  loadingSymbols,
  loadingExpiry,
  loadingStrikes,
  loadingData,
  onSymbolChange,
  onExpiryChange,
  onStrikeChange,
  onTimeframeChange,
  onGo,
}: GreeksChartControlsProps) => {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Symbol Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Select Symbol:</span>
        <Select value={selectedSymbol} onValueChange={onSymbolChange} disabled={loadingSymbols}>
          <SelectTrigger className="w-[140px] bg-background">
            <SelectValue placeholder="Select Symbol" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] bg-popover">
            {symbols.indexSymbols.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-muted/50">INDEX</div>
                {symbols.indexSymbols.map((sym) => (
                  <SelectItem key={sym} value={sym}>{sym}</SelectItem>
                ))}
              </>
            )}
            {symbols.stockSymbols.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-muted/50 mt-1">STOCKS</div>
                {symbols.stockSymbols.map((sym) => (
                  <SelectItem key={sym} value={sym}>{sym}</SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Expiry Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Expiry Date:</span>
        <Select
          value={selectedExpiry}
          onValueChange={onExpiryChange}
          disabled={loadingExpiry || expiryDates.length === 0}
        >
          <SelectTrigger className="w-[140px] bg-secondary text-secondary-foreground">
            <SelectValue placeholder={loadingExpiry ? "Loading..." : "Select expiry"} />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {expiryDates.map((date) => (
              <SelectItem key={date} value={date}>{date}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Strike Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Select Strike Price:</span>
        <Select
          value={selectedStrike.toString()}
          onValueChange={(v) => onStrikeChange(parseInt(v))}
          disabled={loadingStrikes || strikes.length === 0}
        >
          <SelectTrigger className="w-[120px] bg-secondary text-secondary-foreground">
            <SelectValue placeholder={loadingStrikes ? "Loading..." : "Strike"} />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50 max-h-[300px]">
            {strikes.map((strike) => (
              <SelectItem key={strike} value={strike.toString()}>{strike}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timeframe Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Timeframe:</span>
        <Select value={selectedTimeframe} onValueChange={onTimeframeChange}>
          <SelectTrigger className="w-[100px] bg-secondary text-secondary-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {timeframes.map((tf) => (
              <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* GO Button */}
      <Button
        onClick={onGo}
        disabled={loadingData || !selectedSymbol || !selectedExpiry || !selectedStrike}
        className="bg-primary hover:bg-primary/90 px-8"
      >
        {loadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : "GO"}
      </Button>
    </div>
  );
};
