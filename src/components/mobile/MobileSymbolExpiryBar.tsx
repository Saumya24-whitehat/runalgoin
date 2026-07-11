import { ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal } from "lucide-react";

interface MobileSymbolExpiryBarProps {
  indexSymbols: string[];
  stockSymbols: string[];
  selectedSymbol: string;
  onSymbolChange: (v: string) => void;
  loadingSymbols?: boolean;
  /** If omitted, only the symbol selector is shown */
  expiryDates?: string[];
  selectedExpiry?: string;
  onExpiryChange?: (v: string) => void;
  loadingExpiry?: boolean;
  /** Extra controls shown inside the Filters sheet */
  filtersContent?: ReactNode;
  /** Right-side action buttons (e.g. Refresh/GO). Rendered next to the Filters button. */
  actions?: ReactNode;
  /** Optional top-row content (e.g. LastRefreshBadge) */
  topLeft?: ReactNode;
}

/**
 * Compact mobile control bar: Symbol + Expiry always visible,
 * with a "Filters" button that opens a bottom sheet containing
 * page-specific filters.
 */
export function MobileSymbolExpiryBar({
  indexSymbols,
  stockSymbols,
  selectedSymbol,
  onSymbolChange,
  loadingSymbols,
  expiryDates,
  selectedExpiry,
  onExpiryChange,
  loadingExpiry,
  filtersContent,
  actions,
  topLeft,
}: MobileSymbolExpiryBarProps) {
  return (
    <div className="mb-3 space-y-2 md:hidden">
      {(topLeft || actions || filtersContent) && (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">{topLeft}</div>
          <div className="flex items-center gap-1.5">
            {actions}
            {filtersContent && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 border-primary/50">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-4">{filtersContent}</div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      )}
      <div className={onExpiryChange ? "grid grid-cols-2 gap-2" : ""}>
        <Select value={selectedSymbol} onValueChange={onSymbolChange} disabled={loadingSymbols}>
          <SelectTrigger className="h-9 bg-background/50 text-xs">
            <SelectValue placeholder="Symbol" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] bg-popover">
            {indexSymbols.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-muted/50">INDEX</div>
                {indexSymbols.map((sym) => (
                  <SelectItem key={sym} value={sym}>{sym}</SelectItem>
                ))}
              </>
            )}
            {stockSymbols.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-muted/50 mt-1">STOCKS</div>
                {stockSymbols.map((sym) => (
                  <SelectItem key={sym} value={sym}>{sym}</SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
        {onExpiryChange && (
          <Select
            value={selectedExpiry}
            onValueChange={onExpiryChange}
            disabled={loadingExpiry || !expiryDates || expiryDates.length === 0}
          >
            <SelectTrigger className="h-9 bg-background/50 text-xs">
              <SelectValue placeholder={loadingExpiry ? "Loading..." : "Expiry"} />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              {(expiryDates || []).map((date) => (
                <SelectItem key={date} value={date}>{date}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

    </div>
  );
}

export default MobileSymbolExpiryBar;
