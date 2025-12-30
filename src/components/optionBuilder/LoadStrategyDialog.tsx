import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Position, formatIndianNumber } from "@/services/optionBuilderApi";
import { Trash2, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface SavedStrategy {
  id: string;
  name: string;
  description: string;
  type: string;
  positions: Position[];
  symbol: string;
  createdAt: string;
}

interface LoadStrategyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (strategy: SavedStrategy) => void;
  onDelete: (id: string) => void;
  strategies: SavedStrategy[];
}

const LoadStrategyDialog = ({
  isOpen,
  onClose,
  onLoad,
  onDelete,
  strategies,
}: LoadStrategyDialogProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStrategies = strategies.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculatePnL = (positions: Position[]): number => {
    return positions
      .filter((p) => p.enabled)
      .reduce((total, p) => {
        if (p.exitPrice !== undefined) {
          return (
            total +
            (p.exitPrice - p.entryPrice) *
              p.lots *
              p.lotSize *
              (p.action === "Buy" ? 1 : -1)
          );
        }
        return (
          total +
          (p.currentPrice - p.entryPrice) *
            p.lots *
            p.lotSize *
            (p.action === "Buy" ? 1 : -1)
        );
      }, 0);
  };

  const handleLoad = (strategy: SavedStrategy) => {
    onLoad(strategy);
    onClose();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this strategy?")) {
      onDelete(id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Load Strategy</DialogTitle>
          <DialogDescription>
            Select a saved strategy to load
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search strategies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[400px] mt-4">
          {filteredStrategies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {strategies.length === 0
                ? "No saved strategies yet"
                : "No strategies match your search"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStrategies.map((strategy) => {
                const pnl = calculatePnL(strategy.positions);
                const isProfit = pnl >= 0;

                return (
                  <div
                    key={strategy.id}
                    className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors group"
                    onClick={() => handleLoad(strategy)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{strategy.name}</h4>
                          <span className="text-xs px-2 py-0.5 bg-muted rounded">
                            {strategy.type}
                          </span>
                        </div>
                        {strategy.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {strategy.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{strategy.symbol}</span>
                          <span>{strategy.positions.length} legs</span>
                          <span
                            className={`font-medium ${
                              isProfit ? "text-emerald-500" : "text-red-500"
                            }`}
                          >
                            {isProfit ? "+" : ""}₹{formatIndianNumber(Math.round(pnl))}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                        onClick={(e) => handleDelete(e, strategy.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoadStrategyDialog;
