import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchPCRData, PCRTimeData, PCRStrikeData } from "@/services/pcrApi";
import { supabase } from "@/integrations/supabase/client";
import { CalendarIcon, Loader2, RefreshCw } from "lucide-react";
import { LastRefreshBadge } from "@/components/LastRefreshBadge";
import { format } from "date-fns";

interface SymbolGroup {
  indexSymbols: string[];
  stockSymbols: string[];
}

async function fetchSymbolsList(): Promise<SymbolGroup> {
  const { data, error } = await supabase.functions.invoke("option-chain-proxy", {
    body: { endpoint: "symbols" },
  });
  if (error) throw error;
  return {
    indexSymbols: data?.["index symbols"] || [],
    stockSymbols: data?.symbols || [],
  };
}

async function fetchExpiryDates(symbol: string, historicalDate?: string): Promise<string[]> {
  const params: Record<string, string> = { symbol };
  if (historicalDate) params.date = historicalDate;
  const { data, error } = await supabase.functions.invoke("option-chain-proxy", {
    body: { endpoint: "expiry", params },
  });
  if (error) throw error;
  if (Array.isArray(data)) return data;
  if (data?.expiry_dates && Array.isArray(data.expiry_dates)) return data.expiry_dates;
  if (data?.expiryDates && Array.isArray(data.expiryDates)) return data.expiryDates;
  if (data?.data && Array.isArray(data.data)) return data.data;
  return [];
}

interface StrikeOIChange {
  trend: number;
}

interface TimeRowData {
  time: string;
  spot: number;
  atm: number;
  strikes: Record<number, StrikeOIChange>;
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-IN");
}

const AUTO_REFRESH_INTERVAL = 3 * 60 * 1000;

const OIChangeTrend = () => {
  const [searchParams] = useSearchParams();
  const urlSymbol = searchParams.get("symbol");
  const urlExpiry = searchParams.get("expiry");

  const [selectedSymbol, setSelectedSymbol] = useState(urlSymbol || "Nifty 50");
  const [selectedExpiry, setSelectedExpiry] = useState(urlExpiry || "");
  const [strikeCount, setStrikeCount] = useState(5);
  const [historicalDate, setHistoricalDate] = useState<Date | undefined>();

  const historicalDateStr = historicalDate ? format(historicalDate, "yyyy-MM-dd") : undefined;

  const { data: symbols = { indexSymbols: [], stockSymbols: [] }, isLoading: loadingSymbols } = useQuery({
    queryKey: ["option-symbols"],
    queryFn: fetchSymbolsList,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: expiryDates = [], isLoading: loadingExpiry } = useQuery({
    queryKey: ["option-expiry", selectedSymbol, historicalDateStr],
    queryFn: () => fetchExpiryDates(selectedSymbol, historicalDateStr),
    enabled: !!selectedSymbol,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (expiryDates.length > 0) {
      if (urlExpiry && expiryDates.includes(urlExpiry)) {
        setSelectedExpiry(urlExpiry);
      } else if (!expiryDates.includes(selectedExpiry)) {
        setSelectedExpiry(expiryDates[0]);
      }
    }
  }, [expiryDates]);

  useEffect(() => {
    if (symbols.indexSymbols.length > 0 || symbols.stockSymbols.length > 0) {
      const isIndex = symbols.indexSymbols.includes(selectedSymbol);
      setStrikeCount(isIndex ? 5 : 2);
    }
  }, [selectedSymbol, symbols]);

  const {
    data: pcrResponse,
    isLoading: loadingData,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["pcr-data-oict", selectedSymbol, selectedExpiry, historicalDateStr],
    queryFn: () => fetchPCRData(selectedSymbol, selectedExpiry, 110, historicalDateStr),
    enabled: !!selectedSymbol && !!selectedExpiry && !loadingExpiry,
    staleTime: AUTO_REFRESH_INTERVAL,
    gcTime: 10 * 60 * 1000,
    refetchInterval: AUTO_REFRESH_INTERVAL,
    refetchOnWindowFocus: false,
  });

  const rawData = pcrResponse?.dataWhole || [];

  // Get ATM from latest candle
  const latestATM = useMemo(() => {
    if (rawData.length === 0) return 0;
    return rawData[rawData.length - 1].atm;
  }, [rawData]);

  // Compute visible strikes based on ATM and user strikeCount
  const visibleStrikes = useMemo(() => {
    if (rawData.length === 0 || !latestATM) return [];
    // Collect all unique strikes
    const strikeSet = new Set<number>();
    rawData.forEach((td) => {
      td.dataThis?.forEach((s) => strikeSet.add(s.Strike));
    });
    const sorted = Array.from(strikeSet).sort((a, b) => a - b);
    // Find ATM index
    const atmIdx = sorted.findIndex((s) => s >= latestATM);
    if (atmIdx === -1) return sorted;
    const start = Math.max(0, atmIdx - strikeCount);
    const end = Math.min(sorted.length, atmIdx + strikeCount + 1);
    return sorted.slice(start, end);
  }, [rawData, latestATM, strikeCount]);

  // Compute OI change from previous candle per strike per time (reversed: latest first)
  const tableData = useMemo(() => {
    if (rawData.length === 0) return [];

    const rows: TimeRowData[] = [];

    for (let i = 0; i < rawData.length; i++) {
      const current = rawData[i];
      const prev = i > 0 ? rawData[i - 1] : null;

      const currentMap = new Map<number, PCRStrikeData>();
      current.dataThis?.forEach((s) => currentMap.set(s.Strike, s));

      const prevMap = new Map<number, PCRStrikeData>();
      prev?.dataThis?.forEach((s) => prevMap.set(s.Strike, s));

      const strikes: Record<number, StrikeOIChange> = {};

      visibleStrikes.forEach((strike) => {
        const cur = currentMap.get(strike);
        const prv = prevMap?.get(strike);

        if (!cur || !prv || i === 0) {
          strikes[strike] = { trend: 0 };
        } else {
          const ceChange = cur["CE OI"] - prv["CE OI"];
          const peChange = cur["PE OI"] - prv["PE OI"];
          strikes[strike] = { trend: peChange - ceChange };
        }
      });

      rows.push({
        time: current.time,
        spot: current.underlyning,
        atm: current.atm,
        strikes,
      });
    }

    return rows.reverse();
  }, [rawData, visibleStrikes]);

  return (
    <PageLayout>
      <ProFeatureGate featureName="OI Change Trend">
        <main className="container px-3 sm:px-4 py-4 sm:py-6 space-y-4">
          <div className="flex justify-end">
            <LastRefreshBadge lastRefresh={pcrResponse ? new Date() : null} isFetching={isFetching} />
          </div>
          {/* Controls */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-4 items-end">
                {/* Symbol */}
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Symbol</label>
                  <Select value={selectedSymbol} onValueChange={setSelectedSymbol} disabled={loadingSymbols}>
                    <SelectTrigger className="w-full bg-background/50 h-9 text-xs sm:text-sm">
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

                {/* Expiry */}
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Expiry</label>
                  <Select value={selectedExpiry} onValueChange={setSelectedExpiry} disabled={loadingExpiry || expiryDates.length === 0}>
                    <SelectTrigger className="w-full bg-secondary text-secondary-foreground h-9 text-xs sm:text-sm">
                      <SelectValue placeholder={loadingExpiry ? "Loading..." : "Select"} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      {expiryDates.map((date) => (
                        <SelectItem key={date} value={date}>{date}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Strike Count */}
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Strikes</label>
                  <Input
                    type="number"
                    value={strikeCount}
                    onChange={(e) => setStrikeCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-9 text-xs sm:text-sm bg-background/50"
                    min={1}
                    max={30}
                  />
                </div>

                {/* Historical Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Historical</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-9 text-xs sm:text-sm bg-background/50 justify-start">
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {historicalDate ? format(historicalDate, "dd MMM") : "Live"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover" align="start">
                      <Calendar mode="single" selected={historicalDate} onSelect={setHistoricalDate} />
                      {historicalDate && (
                        <div className="p-2 border-t border-border">
                          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setHistoricalDate(undefined)}>
                            Clear
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Refresh */}
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">&nbsp;</label>
                  <Button onClick={() => refetch()} disabled={isFetching} className="w-full h-9 text-xs sm:text-sm" variant="outline">
                    <RefreshCw className={`h-3 w-3 mr-1 ${isFetching ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          {loadingData ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : tableData.length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                No data available. Select a symbol and expiry.
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-lg font-heading">
                  Strike-wise OI Change & Trend
                  {isFetching && <Loader2 className="inline-block h-4 w-4 animate-spin ml-2" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto relative">
                  <Table>
                     <TableHeader className="sticky top-0 z-10">
                      <TableRow className="bg-secondary">
                        <TableHead className="text-xs font-semibold whitespace-nowrap bg-secondary sticky left-0 z-20 min-w-[60px]">
                          Time
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-right whitespace-nowrap bg-secondary min-w-[70px]">
                          Spot
                        </TableHead>
                        {visibleStrikes.map((strike) => (
                          <TableHead
                            key={strike}
                            className={`text-xs font-bold text-center whitespace-nowrap bg-secondary border-l border-border/30 min-w-[80px] ${strike === latestATM ? "!bg-primary/20" : ""}`}
                          >
                            {strike}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableData.map((row, idx) => {
                        const isLast = idx === tableData.length - 1;
                        return (
                          <TableRow key={row.time} className={idx === 0 ? "bg-primary/5" : ""}>
                            <TableCell className="font-medium whitespace-nowrap sticky left-0 bg-card/90 z-10">
                              {row.time}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {row.spot.toFixed(2)}
                            </TableCell>
                            {visibleStrikes.map((strike) => {
                              const s = row.strikes[strike] || { trend: 0 };
                              const isATM = strike === row.atm;
                              return (
                                <TableCell
                                  key={`${row.time}-${strike}`}
                                  className={`text-center font-semibold border-l border-border/20 ${isATM ? "ring-2 ring-primary ring-inset bg-primary/10" : ""} ${isLast ? "text-muted-foreground" : s.trend > 0 ? "text-emerald-400" : s.trend < 0 ? "text-red-400" : "text-muted-foreground"}`}
                                >
                                  {isLast ? "—" : formatNumber(s.trend)}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </ProFeatureGate>
    </PageLayout>
  );
};

export default OIChangeTrend;
