import { useState, useMemo, useEffect, useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Position, ExpiryData, formatIndianNumber } from "@/services/optionBuilderApi";
import { ColumnConfig } from "./OptionBuilderSettings";

interface LiveOptionData {
  ltp: number;
  prevLtp?: number;
  cp?: number; // Close price for change calculation
  iv?: number;
  oi?: number;
  volume?: number;
}

interface OptionBuilderChainProps {
  symbol: string;
  expiry: string;
  currentPrice: number;
  lotSize: number;
  expiryData: ExpiryData | null;
  isLoading: boolean;
  onAddPosition: (position: Omit<Position, "id" | "enabled">) => void;
  callColumns?: ColumnConfig[];
  putColumns?: ColumnConfig[];
  liveData?: Record<string, LiveOptionData>;
}

interface StrikeData {
  strike: number;
  callLTP: number;
  callLTPChg: number;
  callTickUp: boolean | null; // true = up tick, false = down tick, null = no change
  callIV: number;
  callDelta: number;
  callTheta: number;
  callGamma: number;
  callVega: number;
  callOI: number;
  callCOI: number;
  callVolume: number;
  callToken: string;
  putLTP: number;
  putLTPChg: number;
  putTickUp: boolean | null; // true = up tick, false = down tick, null = no change
  putIV: number;
  putDelta: number;
  putTheta: number;
  putGamma: number;
  putVega: number;
  putOI: number;
  putCOI: number;
  putVolume: number;
  putToken: string;
}

const DEFAULT_CALL_COLUMNS: ColumnConfig[] = [
  { id: "oi", label: "OI", enabled: true },
  { id: "volume", label: "Vol", enabled: true },
  { id: "iv", label: "IV", enabled: true },
  { id: "ltp", label: "LTP", enabled: true },
];

const DEFAULT_PUT_COLUMNS: ColumnConfig[] = [
  { id: "ltp", label: "LTP", enabled: true },
  { id: "iv", label: "IV", enabled: true },
  { id: "volume", label: "Vol", enabled: true },
  { id: "oi", label: "OI", enabled: true },
];

const OptionBuilderChain = ({
  symbol,
  expiry,
  currentPrice,
  lotSize,
  expiryData,
  isLoading,
  onAddPosition,
  callColumns = DEFAULT_CALL_COLUMNS,
  putColumns = DEFAULT_PUT_COLUMNS,
  liveData = {},
}: OptionBuilderChainProps) => {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const atmRowRef = useRef<HTMLTableRowElement>(null);
  const hasScrolledRef = useRef(false);

  const strikeDiff = symbol.includes("Bank") ? 100 : 50;
  const atmStrike = Math.round(currentPrice / strikeDiff) * strikeDiff;

  // Transform expiry data into strike data array with live updates
  const strikeData: StrikeData[] = useMemo(() => {
    if (!expiryData || !expiryData.data || expiryData.data.length === 0) {
      return [];
    }

    return expiryData.data.map((item, idx) => {
      const callData = item.call_options;
      const putData = item.put_options;

      const callPrevOI = callData?.market_data?.prev_oi || callData?.market_data?.oi || 0;
      const putPrevOI = putData?.market_data?.prev_oi || putData?.market_data?.oi || 0;

      // Get tokens for live data lookup
      const callToken = expiryData.ceToken?.[idx] || callData?.instrument_key || "";
      const putToken = expiryData.peToken?.[idx] || putData?.instrument_key || "";

      // Check for live data using multiple token formats
      const callLiveData = liveData[callToken] || liveData[`NSE_FO|${callToken}`];
      const putLiveData = liveData[putToken] || liveData[`NSE_FO|${putToken}`];

      // Use live LTP if available, otherwise use static data
      const callLTP = callLiveData?.ltp ?? callData?.market_data?.ltp ?? 0;
      // Use close price from live feed if available, otherwise from static data
      const callClose = callLiveData?.cp ?? (callData?.market_data as { close?: number })?.close ?? callData?.market_data?.ltp ?? 0;
      const putLTP = putLiveData?.ltp ?? putData?.market_data?.ltp ?? 0;
      const putClose = putLiveData?.cp ?? (putData?.market_data as { close?: number })?.close ?? putData?.market_data?.ltp ?? 0;

      // Determine tick direction (compare current LTP with previous LTP)
      const callTickUp = callLiveData?.prevLtp !== undefined 
        ? (callLTP > callLiveData.prevLtp ? true : callLTP < callLiveData.prevLtp ? false : null)
        : null;
      const putTickUp = putLiveData?.prevLtp !== undefined 
        ? (putLTP > putLiveData.prevLtp ? true : putLTP < putLiveData.prevLtp ? false : null)
        : null;

      // Use live IV if available
      const callIV = callLiveData?.iv ?? callData?.option_greeks?.iv ?? 0;
      const putIV = putLiveData?.iv ?? putData?.option_greeks?.iv ?? 0;

      // Use live OI if available
      const callOI = callLiveData?.oi ?? callData?.market_data?.oi ?? 0;
      const putOI = putLiveData?.oi ?? putData?.market_data?.oi ?? 0;

      // Use live volume if available
      const callVolume = callLiveData?.volume ?? callData?.market_data?.volume ?? 0;
      const putVolume = putLiveData?.volume ?? putData?.market_data?.volume ?? 0;

      return {
        strike: item.strike_price,
        callLTP,
        callLTPChg: callLTP - callClose,
        callTickUp,
        callIV,
        callDelta: callData?.option_greeks?.delta || 0,
        callTheta: callData?.option_greeks?.theta || 0,
        callGamma: callData?.option_greeks?.gamma || 0,
        callVega: callData?.option_greeks?.vega || 0,
        callOI,
        callCOI: callOI - callPrevOI,
        callVolume,
        callToken,
        putLTP,
        putLTPChg: putLTP - putClose,
        putTickUp,
        putIV,
        putDelta: putData?.option_greeks?.delta || 0,
        putTheta: putData?.option_greeks?.theta || 0,
        putGamma: putData?.option_greeks?.gamma || 0,
        putVega: putData?.option_greeks?.vega || 0,
        putOI,
        putCOI: putOI - putPrevOI,
        putVolume,
        putToken,
      };
    });
  }, [expiryData, liveData]);

  // Auto-scroll to ATM when data loads
  useEffect(() => {
    if (strikeData.length > 0 && atmRowRef.current && containerRef.current && !hasScrolledRef.current) {
      setTimeout(() => {
        atmRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        hasScrolledRef.current = true;
      }, 100);
    }
  }, [strikeData.length]);

  // Reset scroll flag when symbol or expiry changes
  useEffect(() => {
    hasScrolledRef.current = false;
  }, [symbol, expiry]);

  const handleAddPosition = (strike: number, optType: "CE" | "PE", action: "Buy" | "Sell") => {
    const data = strikeData.find((s) => s.strike === strike);
    if (!data) return;

    const today = new Date().toISOString().split("T")[0];
    const price = optType === "CE" ? data.callLTP : data.putLTP;
    const iv = optType === "CE" ? data.callIV : data.putIV;
    const delta = optType === "CE" ? data.callDelta : data.putDelta;
    const theta = optType === "CE" ? data.callTheta : data.putTheta;
    const gamma = optType === "CE" ? data.callGamma : data.putGamma;
    const vega = optType === "CE" ? data.callVega : data.putVega;
    const token = optType === "CE" ? data.callToken : data.putToken;

    onAddPosition({
      action,
      lots: 1,
      date: today,
      expiry,
      strike,
      optType,
      entryPrice: price,
      currentPrice: price,
      IV: iv,
      lotSize,
      delta,
      gamma,
      theta,
      vega,
      instrumentToken: token,
    });
  };

  // Format OI/COI as full Indian numbers, other values abbreviated
  const formatOIValue = (num: number) => formatIndianNumber(Math.round(num));
  
  const formatNumber = (num: number) => {
    if (num >= 10000000) {
      return `${(num / 10000000).toFixed(1)}Cr`;
    }
    if (num >= 100000) {
      return `${(num / 100000).toFixed(1)}L`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const enabledCallColumns = callColumns.filter((c) => c.enabled);
  const enabledPutColumns = putColumns.filter((c) => c.enabled);

  const getCallCellValue = (row: StrikeData, columnId: string) => {
    switch (columnId) {
      case "oi":
        return formatOIValue(row.callOI);
      case "coi":
        return formatOIValue(row.callCOI);
      case "volume":
        return formatNumber(row.callVolume);
      case "iv":
        return row.callIV.toFixed(1);
      case "ltp":
        return row.callLTP.toFixed(2);
      case "ltp_chg":
        return row.callLTPChg.toFixed(2);
      case "delta":
        return row.callDelta.toFixed(2);
      case "gamma":
        return row.callGamma.toFixed(4);
      case "theta":
        return row.callTheta.toFixed(2);
      case "vega":
        return row.callVega.toFixed(2);
      default:
        return "";
    }
  };

  const getPutCellValue = (row: StrikeData, columnId: string) => {
    switch (columnId) {
      case "oi":
        return formatOIValue(row.putOI);
      case "coi":
        return formatOIValue(row.putCOI);
      case "volume":
        return formatNumber(row.putVolume);
      case "iv":
        return row.putIV.toFixed(1);
      case "ltp":
        return row.putLTP.toFixed(2);
      case "ltp_chg":
        return row.putLTPChg.toFixed(2);
      case "delta":
        return row.putDelta.toFixed(2);
      case "gamma":
        return row.putGamma.toFixed(4);
      case "theta":
        return row.putTheta.toFixed(2);
      case "vega":
        return row.putVega.toFixed(2);
      default:
        return "";
    }
  };

  const getLTPChgColor = (value: number) => {
    if (value > 0) return "text-oc-positive";
    if (value < 0) return "text-oc-negative";
    return "";
  };

  // Get tick direction color for LTP (based on whether price went up or down from last tick)
  const getTickColor = (tickUp: boolean | null) => {
    if (tickUp === true) return "text-oc-positive";
    if (tickUp === false) return "text-oc-negative";
    return "";
  };

  if (strikeData.length === 0 && !isLoading) {
    return <div className="text-center py-8 text-muted-foreground">No option chain data available for {expiry}</div>;
  }

  return (
    <div ref={containerRef} className="relative w-full overflow-auto max-h-[400px] rounded-lg border border-border">
      <Table>
        <TableHeader className="sticky top-0 z-20">
          <TableRow>
            <TableHead colSpan={enabledCallColumns.length} className="text-center bg-red-800 text-white font-bold text-sm py-2">
              CALL
            </TableHead>
            <TableHead className="text-center bg-indigo-900 text-white font-bold text-sm py-2">
              Strike
            </TableHead>
            <TableHead colSpan={enabledPutColumns.length} className="text-center bg-green-800 text-white font-bold text-sm py-2">
              PUT
            </TableHead>
          </TableRow>
          <TableRow className="bg-muted">
            {enabledCallColumns.map((col) => (
              <TableHead key={`call-${col.id}`} className="text-center text-xs p-1">
                {col.label}
              </TableHead>
            ))}
            <TableHead className="text-center font-bold text-xs p-1 bg-indigo-900/50">ATM</TableHead>
            {enabledPutColumns.map((col) => (
              <TableHead key={`put-${col.id}`} className="text-center text-xs p-1">
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {strikeData.map((row) => {
            const isATM = Math.abs(row.strike - atmStrike) < strikeDiff / 2;
            const isITMCall = row.strike < currentPrice;
            const isITMPut = row.strike > currentPrice;
            const isHovered = hoveredRow === row.strike;

            return (
              <TableRow
                key={row.strike}
                ref={isATM ? atmRowRef : undefined}
                className={`
                  relative cursor-pointer transition-colors
                  ${isATM ? "bg-oc-atm font-medium" : ""}
                  ${isHovered ? "bg-muted" : ""}
                `}
                onMouseEnter={() => setHoveredRow(row.strike)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Call Side */}
                {enabledCallColumns.map((col) => {
                  const isLtpColumn = col.id === "ltp";
                  const isLtpChgColumn = col.id === "ltp_chg";
                  return (
                    <TableCell
                      key={`call-${col.id}`}
                      className={`text-center text-xs ${isITMCall ? "bg-red-950/30" : ""} ${isLtpColumn ? "relative" : ""} ${isLtpChgColumn ? getLTPChgColor(row.callLTPChg) : ""}`}
                    >
                      {isLtpColumn ? (
                        <>
                          <span className={`text-xs font-medium transition-colors ${getTickColor(row.callTickUp)}`}>
                            {getCallCellValue(row, col.id)}
                          </span>
                          {isHovered && (
                            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-background/90">
                              <Button
                                size="sm"
                                className="h-6 px-2 text-xs bg-success hover:bg-success/80 text-success-foreground"
                                onClick={() => handleAddPosition(row.strike, "CE", "Buy")}
                              >
                                B
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-6 px-2 text-xs"
                                onClick={() => handleAddPosition(row.strike, "CE", "Sell")}
                              >
                                S
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        getCallCellValue(row, col.id)
                      )}
                    </TableCell>
                  );
                })}

                {/* Strike */}
                <TableCell className={`text-center font-bold text-xs ${isATM ? "text-oc-atm-text bg-oc-atm" : "bg-indigo-900/30"}`}>
                  {row.strike}
                </TableCell>

                {/* Put Side */}
                {enabledPutColumns.map((col) => {
                  const isLtpColumn = col.id === "ltp";
                  const isLtpChgColumn = col.id === "ltp_chg";
                  return (
                    <TableCell
                      key={`put-${col.id}`}
                      className={`text-center text-xs ${isITMPut ? "bg-emerald-950/30" : ""} ${isLtpColumn ? "relative" : ""} ${isLtpChgColumn ? getLTPChgColor(row.putLTPChg) : ""}`}
                    >
                      {isLtpColumn ? (
                        <>
                          <span className={`text-xs font-medium transition-colors ${getTickColor(row.putTickUp)}`}>
                            {getPutCellValue(row, col.id)}
                          </span>
                          {isHovered && (
                            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-background/90">
                              <Button
                                size="sm"
                                className="h-6 px-2 text-xs bg-success hover:bg-success/80 text-success-foreground"
                                onClick={() => handleAddPosition(row.strike, "PE", "Buy")}
                              >
                                B
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-6 px-2 text-xs"
                                onClick={() => handleAddPosition(row.strike, "PE", "Sell")}
                              >
                                S
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        getPutCellValue(row, col.id)
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default OptionBuilderChain;
