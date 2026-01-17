import { useEffect, RefObject, MutableRefObject } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Position } from "@/services/optionBuilderApi";
import { SimulatorData } from "@/services/optionSimulatorApi";
import { ColumnConfig } from "./OptionBuilderSettings";

interface SimulatorOptionChainProps {
  simulatorData: SimulatorData;
  symbol: string;
  currentPrice: number;
  lotSize: number;
  selectedDate: Date;
  activeExpiry: string;
  addPosition: (position: Omit<Position, "id" | "enabled">) => void;
  callColumns: ColumnConfig[];
  putColumns: ColumnConfig[];
  atmRowRef: RefObject<HTMLTableRowElement>;
  hasScrolledRef: MutableRefObject<boolean>;
}

const formatNumber = (num: number) => {
  if (num >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const SimulatorOptionChain = ({
  simulatorData,
  symbol,
  currentPrice,
  lotSize,
  selectedDate,
  activeExpiry,
  addPosition,
  callColumns,
  putColumns,
  atmRowRef,
  hasScrolledRef,
}: SimulatorOptionChainProps) => {
  const strikeDiff = symbol.includes("Bank") ? 100 : 50;
  const atmStrike = Math.round(currentPrice / strikeDiff) * strikeDiff;

  const enabledCallColumns = callColumns.filter((c) => c.enabled);
  const enabledPutColumns = putColumns.filter((c) => c.enabled);

  // Auto-scroll to ATM when data loads
  useEffect(() => {
    if (simulatorData.strikes.length > 0 && atmRowRef.current && !hasScrolledRef.current) {
      setTimeout(() => {
        atmRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        hasScrolledRef.current = true;
      }, 100);
    }
  }, [simulatorData.strikes.length, atmRowRef, hasScrolledRef]);

  // Reset scroll flag when symbol or expiry changes
  useEffect(() => {
    hasScrolledRef.current = false;
  }, [symbol, activeExpiry, hasScrolledRef]);

  const getCallCellValue = (strike: SimulatorData["strikes"][0], columnId: string) => {
    switch (columnId) {
      case "oi": return formatNumber(strike.ceOI);
      case "volume": return formatNumber(strike.ceVolume);
      case "iv": return strike.ceIV.toFixed(1);
      case "ltp": return strike.cePrice.toFixed(2);
      default: return "";
    }
  };

  const getPutCellValue = (strike: SimulatorData["strikes"][0], columnId: string) => {
    switch (columnId) {
      case "oi": return formatNumber(strike.peOI);
      case "volume": return formatNumber(strike.peVolume);
      case "iv": return strike.peIV.toFixed(1);
      case "ltp": return strike.pePrice.toFixed(2);
      default: return "";
    }
  };

  const handleAddPosition = (
    strike: SimulatorData["strikes"][0],
    optType: "CE" | "PE",
    action: "Buy" | "Sell"
  ) => {
    const price = optType === "CE" ? strike.cePrice : strike.pePrice;
    const iv = optType === "CE" ? strike.ceIV : strike.peIV;

    addPosition({
      action,
      lots: 1,
      date: format(selectedDate, "yyyy-MM-dd"),
      expiry: activeExpiry,
      strike: strike.strike,
      optType,
      entryPrice: price,
      currentPrice: price,
      IV: iv,
      lotSize,
    });
  };

  return (
    <Table>
      <TableHeader className="sticky top-0 bg-background z-10">
        <TableRow>
          {enabledCallColumns.map((col) => (
            <TableHead key={`call-${col.id}`} className="text-center text-emerald-500 text-xs">
              {col.label}
            </TableHead>
          ))}
          <TableHead className="text-center font-bold text-xs">Strike</TableHead>
          {enabledPutColumns.map((col) => (
            <TableHead key={`put-${col.id}`} className="text-center text-red-500 text-xs">
              {col.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {simulatorData.strikes.map((strike) => {
          const isATM = Math.abs(strike.strike - atmStrike) < strikeDiff / 2;
          const isITMCall = strike.strike < currentPrice;
          const isITMPut = strike.strike > currentPrice;

          return (
            <TableRow
              key={strike.strike}
              ref={isATM ? atmRowRef : undefined}
              className={`relative cursor-pointer transition-colors group ${isATM ? "bg-oc-atm font-medium" : ""}`}
            >
              {/* Call Side */}
              {enabledCallColumns.map((col) => {
                const isLtpColumn = col.id === "ltp";
                return (
                  <TableCell
                    key={`call-${col.id}`}
                    className={`text-center text-xs ${isITMCall ? "bg-oc-call-itm" : ""} ${isLtpColumn ? "relative" : ""}`}
                  >
                    {isLtpColumn ? (
                      <>
                        <span className="text-xs font-medium">{getCallCellValue(strike, col.id)}</span>
                        <div className="absolute inset-0 flex items-center justify-center gap-1 bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleAddPosition(strike, "CE", "Buy")}
                          >
                            B
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleAddPosition(strike, "CE", "Sell")}
                          >
                            S
                          </Button>
                        </div>
                      </>
                    ) : (
                      getCallCellValue(strike, col.id)
                    )}
                  </TableCell>
                );
              })}

              {/* Strike */}
              <TableCell className={`text-center font-bold text-xs ${isATM ? "text-oc-atm-text bg-oc-atm" : ""}`}>
                {strike.strike}
              </TableCell>

              {/* Put Side */}
              {enabledPutColumns.map((col) => {
                const isLtpColumn = col.id === "ltp";
                return (
                  <TableCell
                    key={`put-${col.id}`}
                    className={`text-center text-xs ${isITMPut ? "bg-oc-put-itm" : ""} ${isLtpColumn ? "relative" : ""}`}
                  >
                    {isLtpColumn ? (
                      <>
                        <span className="text-xs font-medium">{getPutCellValue(strike, col.id)}</span>
                        <div className="absolute inset-0 flex items-center justify-center gap-1 bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleAddPosition(strike, "PE", "Buy")}
                          >
                            B
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleAddPosition(strike, "PE", "Sell")}
                          >
                            S
                          </Button>
                        </div>
                      </>
                    ) : (
                      getPutCellValue(strike, col.id)
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default SimulatorOptionChain;