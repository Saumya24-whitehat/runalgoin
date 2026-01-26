import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Play, Loader2, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConditionInputProps {
  condition: string;
  onConditionChange: (condition: string) => void;
  onScan: () => void;
  isLoading: boolean;
}

const helpExamples = [
  { syntax: "close>high[1]", desc: "Current close above previous day's high" },
  { syntax: "RSI<30", desc: "RSI below 30" },
  { syntax: "volume>volume[1]*2", desc: "Volume spike (2x previous)" },
  { syntax: "SMA50>SMA200", desc: "50 SMA above 200 SMA" },
  { syntax: "close>open and volume>100000", desc: "Multiple conditions" },
];

export function ConditionInput({
  condition,
  onConditionChange,
  onScan,
  isLoading,
}: ConditionInputProps) {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      onScan();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Scan Condition</label>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => setShowHelp(!showHelp)}
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              Syntax Help
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium text-xs">Common Syntax:</p>
              {helpExamples.map((ex, i) => (
                <div key={i} className="text-xs">
                  <code className="text-primary">{ex.syntax}</code>
                  <span className="text-muted-foreground"> - {ex.desc}</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      <Textarea
        value={condition}
        onChange={(e) => onConditionChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter scan condition (e.g., close>high[1])"
        className="font-mono text-sm min-h-[80px] resize-none"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Press Ctrl+Enter to scan
        </span>
        <Button onClick={onScan} disabled={isLoading || !condition.trim()}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Scan Stocks
            </>
          )}
        </Button>
      </div>

      {showHelp && (
        <div className="mt-3 p-3 rounded-lg bg-accent/50 border border-border">
          <h4 className="font-medium text-sm mb-2">Syntax Reference</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <h5 className="font-medium text-muted-foreground mb-1">Price Data</h5>
              <ul className="space-y-1">
                <li><code className="text-primary">close</code> - Current close price</li>
                <li><code className="text-primary">open</code> - Current open price</li>
                <li><code className="text-primary">high</code> - Current high price</li>
                <li><code className="text-primary">low</code> - Current low price</li>
                <li><code className="text-primary">volume</code> - Current volume</li>
                <li><code className="text-primary">high[1]</code> - Previous day's high</li>
                <li><code className="text-primary">close[5]</code> - Close 5 days ago</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-muted-foreground mb-1">Technical Indicators</h5>
              <ul className="space-y-1">
                <li><code className="text-primary">RSI</code> - Relative Strength Index</li>
                <li><code className="text-primary">SMA50</code> - 50-day Simple MA</li>
                <li><code className="text-primary">SMA200</code> - 200-day Simple MA</li>
                <li><code className="text-primary">EMA12</code> - 12-day Exponential MA</li>
                <li><code className="text-primary">MACD.macd</code> - MACD line</li>
                <li><code className="text-primary">MACD.signal</code> - Signal line</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-muted-foreground mb-1">Fundamental Data</h5>
              <ul className="space-y-1">
                <li><code className="text-primary">market_cap_basic</code> - Market cap</li>
                <li><code className="text-primary">price_earnings_ttm</code> - P/E ratio</li>
                <li><code className="text-primary">dividends_yield_current</code> - Dividend yield</li>
                <li><code className="text-primary">price_52_week_high</code> - 52W High</li>
                <li><code className="text-primary">price_52_week_low</code> - 52W Low</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-muted-foreground mb-1">Operators</h5>
              <ul className="space-y-1">
                <li><code className="text-primary">&gt;</code> - Greater than</li>
                <li><code className="text-primary">&lt;</code> - Less than</li>
                <li><code className="text-primary">&gt;=</code> - Greater than or equal</li>
                <li><code className="text-primary">&lt;=</code> - Less than or equal</li>
                <li><code className="text-primary">and</code> - Logical AND</li>
                <li><code className="text-primary">or</code> - Logical OR</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
