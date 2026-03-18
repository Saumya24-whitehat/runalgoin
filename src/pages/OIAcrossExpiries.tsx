import { useState, useEffect, useCallback, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fetchPCRData, PCRTimeData } from "@/services/pcrApi";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface SymbolGroup {
  indexSymbols: string[];
  stockSymbols: string[];
}

interface ExpiryData {
  expiry: string;
  latestData: PCRTimeData | null;
}

const OIAcrossExpiries = () => {
  const { toast } = useToast();
  const [symbols, setSymbols] = useState<SymbolGroup>({ indexSymbols: [], stockSymbols: [] });
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("Nifty 50");
  const [strikeCount, setStrikeCount] = useState(5);
  const [loadingSymbols, setLoadingSymbols] = useState(true);
  const [loadingExpiry, setLoadingExpiry] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [expiryDataList, setExpiryDataList] = useState<ExpiryData[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const isInitialFetch = useRef(true);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch symbols
  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("option-chain-proxy", {
          body: { endpoint: "symbols" },
        });
        if (error) throw error;
        setSymbols({
          indexSymbols: data?.["index symbols"] || [],
          stockSymbols: data?.symbols || [],
        });
      } catch (err) {
        console.error("Error fetching symbols:", err);
      } finally {
        setLoadingSymbols(false);
      }
    };
    fetchSymbols();
  }, []);

  // Fetch expiry dates
  useEffect(() => {
    if (!selectedSymbol) return;
    if (symbols.indexSymbols.length > 0 || symbols.stockSymbols.length > 0) {
      const isIndex = symbols.indexSymbols.includes(selectedSymbol);
      setStrikeCount(isIndex ? 5 : 2);
    }

    const fetchExpiry = async () => {
      setLoadingExpiry(true);
      setExpiryDates([]);
      setExpiryDataList([]);
      try {
        const { data, error } = await supabase.functions.invoke("option-chain-proxy", {
          body: { endpoint: "expiry", params: { symbol: selectedSymbol } },
        });
        if (error) throw error;
        let dates: string[] = [];
        if (Array.isArray(data)) dates = data;
        else if (data?.expiry_dates) dates = data.expiry_dates;
        else if (data?.expiryDates) dates = data.expiryDates;
        else if (data?.data) dates = data.data;
        setExpiryDates(dates);
      } catch (err) {
        console.error("Error fetching expiry dates:", err);
      } finally {
        setLoadingExpiry(false);
      }
    };
    fetchExpiry();
  }, [selectedSymbol, symbols]);

  // Fetch data for all expiries
  const fetchAllExpiries = useCallback(async (silent = false) => {
    if (!selectedSymbol || expiryDates.length === 0) return;
    if (!silent) setLoadingData(true);
    try {
      const expiriesToFetch = expiryDates.slice(0, 4);
      const results = await Promise.all(
        expiriesToFetch.map(async (expiry) => {
          try {
            const response = await fetchPCRData(selectedSymbol, expiry, strikeCount);
            const latest = response.dataWhole?.length > 0
              ? response.dataWhole[response.dataWhole.length - 1]
              : null;
            return { expiry, latestData: latest };
          } catch {
            return { expiry, latestData: null };
          }
        })
      );
      setExpiryDataList(results.filter((r) => r.latestData !== null));
      setLastRefreshed(new Date());
      isInitialFetch.current = false;
    } catch (err) {
      console.error("Error fetching all expiries:", err);
      if (!silent) toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      if (!silent) setLoadingData(false);
    }
  }, [selectedSymbol, expiryDates, strikeCount, toast]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    if (expiryDataList.length > 0) {
      autoRefreshRef.current = setInterval(() => {
        fetchAllExpiries(true);
      }, 30000);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [fetchAllExpiries, expiryDataList.length]);

  const handleGo = () => {
    isInitialFetch.current = true;
    fetchAllExpiries();
  };

  // Get unified strikes across all expiries
  const getUnifiedStrikes = (): number[] => {
    const strikeSet = new Set<number>();
    expiryDataList.forEach(({ latestData }) => {
      latestData?.dataThis?.forEach((s) => strikeSet.add(s.Strike));
    });
    return Array.from(strikeSet).sort((a, b) => a - b);
  };

  const atm = expiryDataList[0]?.latestData?.atm || 0;
  const strikes = getUnifiedStrikes();

  // Build chart data: each row = { strike, type: "CE"|"PE", [expiry_oi]: val, [expiry_coi]: val }
  // We'll build a flat structure for horizontal bars per strike+type
  const buildChartRows = () => {
    const rows: Array<Record<string, any>> = [];
    // Reverse so highest strike is at top
    const sortedStrikes = [...strikes].reverse();
    sortedStrikes.forEach((strike) => {
      // CE row
      const ceRow: Record<string, any> = { label: `${strike} CE`, strike, type: "CE" };
      // PE row
      const peRow: Record<string, any> = { label: `${strike} PE`, strike, type: "PE" };
      expiryDataList.forEach(({ expiry, latestData }) => {
        const strikeData = latestData?.dataThis?.find((s) => s.Strike === strike);
        ceRow[`${expiry}_OI`] = strikeData?.["CE OI"] || 0;
        ceRow[`${expiry}_COI`] = strikeData?.["CE COI"] || 0;
        peRow[`${expiry}_OI`] = strikeData?.["PE OI"] || 0;
        peRow[`${expiry}_COI`] = strikeData?.["PE COI"] || 0;
      });
      rows.push(ceRow);
      rows.push(peRow);
    });
    return rows;
  };

  const chartRows = buildChartRows();

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  // Separate OI and COI data
  const buildOIData = () => chartRows;
  const buildCOIData = () => chartRows;

  // Colors for CE (red shades) and PE (green shades) per expiry
  const ceColors = ["#dc2626", "#ef4444", "#f87171", "#fca5a5"];
  const peColors = ["#16a34a", "#22c55e", "#4ade80", "#86efac"];

  const getBarColor = (type: string, expiryIdx: number) => {
    return type === "CE" ? ceColors[expiryIdx % ceColors.length] : peColors[expiryIdx % peColors.length];
  };

  // Custom bar shape that uses row type to pick color
  const renderChart = (dataKey: "OI" | "COI", title: string) => {
    if (expiryDataList.length === 0) return null;

    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div style={{ height: Math.max(400, chartRows.length * 22) }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartRows}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={formatValue}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={75}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))",
                    fontSize: 11,
                  }}
                  formatter={(value: number, name: string) => [formatValue(value), name]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(value) => (
                    <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>
                  )}
                />
                {expiryDataList.map(({ expiry }, idx) => (
                  <Bar
                    key={`${expiry}_${dataKey}`}
                    dataKey={`${expiry}_${dataKey}`}
                    name={`${expiry}`}
                    stackId="a"
                    isAnimationActive={false}
                  >
                    {chartRows.map((row, i) => (
                      <Cell key={i} fill={getBarColor(row.type, idx)} />
                    ))}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Better approach: separate charts per expiry with CE/PE bars
  const renderExpiryChart = (expiryData: ExpiryData, idx: number, dataKey: "OI" | "COI", isFirst: boolean) => {
    const { expiry, latestData } = expiryData;
    if (!latestData?.dataThis) return null;

    const sortedStrikes = [...strikes].reverse();
    const rows: Array<Record<string, any>> = [];
    sortedStrikes.forEach((strike) => {
      const sd = latestData.dataThis.find((s) => s.Strike === strike);
      const ceKey = dataKey === "OI" ? "CE OI" : "CE COI";
      const peKey = dataKey === "OI" ? "PE OI" : "PE COI";
      rows.push({
        label: `${strike} CE`,
        strike,
        type: "CE",
        value: sd?.[ceKey] || 0,
      });
      rows.push({
        label: `${strike} PE`,
        strike,
        type: "PE",
        value: sd?.[peKey] || 0,
      });
    });

    // Find the label closest to ATM for the reference line
    const underlying = expiryDataList[0]?.latestData?.underlyning || 0;
    // Find the nearest strike to the underlying price
    const nearestStrike = strikes.reduce((prev, curr) =>
      Math.abs(curr - underlying) < Math.abs(prev - underlying) ? curr : prev, strikes[0]);
    const refLabel = `${nearestStrike} CE`;

    const leftMargin = isFirst ? 70 : 5;

    return (
      <div key={`${expiry}_${dataKey}`} className="flex-1 min-w-[200px]">
        <h4 className="text-xs font-medium text-center mb-1 text-muted-foreground">
          {expiry} {dataKey}
        </h4>
        <div style={{ height: Math.max(350, rows.length * 20) }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 5, right: 10, left: leftMargin, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={formatValue}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={isFirst ? 65 : 0}
                tick={isFirst ? { fill: "hsl(var(--muted-foreground))", fontSize: 9 } : false}
                tickLine={isFirst}
                axisLine={isFirst}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--popover-foreground))",
                  fontSize: 11,
                }}
                formatter={(value: number) => [formatValue(value), dataKey]}
              />
              <ReferenceLine
                y={refLabel}
                stroke="hsl(var(--primary))"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: isFirst ? `Spot: ${underlying.toFixed(0)}` : "",
                  position: "right",
                  fill: "hsl(var(--primary))",
                  fontSize: 9,
                }}
              />
              <Bar dataKey="value" isAnimationActive={false}>
                {rows.map((row, i) => (
                  <Cell key={i} fill={row.type === "CE" ? ceColors[idx] : peColors[idx]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // Use recharts Cell for per-bar coloring
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>

      <ProFeatureGate featureName="OI Across Expiries">
        <main className="container px-3 sm:px-4 py-4 sm:py-6 space-y-4">
          {/* Controls */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1.5 min-w-[160px]">
                  <label className="text-xs font-medium text-muted-foreground">Symbol</label>
                  <Select value={selectedSymbol} onValueChange={setSelectedSymbol} disabled={loadingSymbols}>
                    <SelectTrigger className="bg-background/50 h-9 text-xs">
                      <SelectValue placeholder="Select Symbol" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] bg-popover">
                      {symbols.indexSymbols.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-muted/50">INDEX</div>
                          {symbols.indexSymbols.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </>
                      )}
                      {symbols.stockSymbols.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-primary bg-muted/50 mt-1">STOCKS</div>
                          {symbols.stockSymbols.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 w-20">
                  <label className="text-xs font-medium text-muted-foreground">Strikes</label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={strikeCount}
                    onChange={(e) => setStrikeCount(parseInt(e.target.value) || 5)}
                    className="bg-secondary h-9 text-xs"
                  />
                </div>

                <Button onClick={handleGo} disabled={loadingData || loadingExpiry || expiryDates.length === 0} className="h-9">
                  {loadingData ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <BarChart3 className="h-4 w-4 mr-1" />}
                  Load All Expiries
                </Button>

                {loadingExpiry && <span className="text-xs text-muted-foreground">Loading expiries...</span>}
                {!loadingExpiry && expiryDates.length > 0 && (
                  <span className="text-xs text-muted-foreground">{expiryDates.length} expiries found</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ATM info + last refreshed */}
          {atm > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div>
                ATM: <span className="font-semibold text-foreground">{atm}</span>
                {" | "}Spot: <span className="font-semibold text-foreground">{expiryDataList[0]?.latestData?.underlyning?.toFixed(2)}</span>
              </div>
              {lastRefreshed && (
                <div>Last updated: <span className="font-semibold text-foreground">{lastRefreshed.toLocaleTimeString()}</span></div>
              )}
            </div>
          )}

          {/* Charts */}
          {loadingData && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Fetching data for all expiries...</span>
            </div>
          )}

          {!loadingData && expiryDataList.length > 0 && (
            <div className="space-y-6">
              {/* COI Section first */}
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Change in OI (COI) Across Expiries
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 overflow-x-auto">
                  <div className="flex gap-2">
                    {expiryDataList.map((ed, idx) => renderExpiryChart(ed, idx, "COI", idx === 0))}
                  </div>
                </CardContent>
              </Card>

              {/* OI Section */}
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Open Interest (OI) Across Expiries
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 overflow-x-auto">
                  <div className="flex gap-2">
                    {expiryDataList.map((ed, idx) => renderExpiryChart(ed, idx, "OI", idx === 0))}
                  </div>
                </CardContent>
              </Card>

              {/* Data Table */}
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Strike Data Table</CardTitle>
                </CardHeader>
                <CardContent className="p-2 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="border border-border p-1.5 bg-muted/50 sticky left-0 z-10" rowSpan={2}>Strike</th>
                        <th className="border border-border p-1.5 bg-muted/50 sticky left-[60px] z-10" rowSpan={2}>Type</th>
                        {expiryDataList.map(({ expiry }) => (
                          <th key={`${expiry}_h`} className="border border-border p-1.5 bg-muted/50 text-center" colSpan={2}>
                            {expiry}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {expiryDataList.map(({ expiry }) => (
                          <>
                            <th key={`${expiry}_oi`} className="border border-border p-1 bg-muted/30 text-center">OI</th>
                            <th key={`${expiry}_coi`} className="border border-border p-1 bg-muted/30 text-center">COI</th>
                          </>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {strikes.map((strike) => {
                        const isATM = strike === atm;
                        return ["CE", "PE"].map((type) => (
                          <tr
                            key={`${strike}_${type}`}
                            className={`${isATM ? "bg-accent/30" : ""} ${type === "CE" ? "text-destructive" : "text-emerald-500"}`}
                          >
                            {type === "CE" && (
                              <td className="border border-border p-1.5 font-medium text-foreground sticky left-0 bg-card z-10" rowSpan={2}>
                                {strike}
                              </td>
                            )}
                            <td className="border border-border p-1 font-medium sticky left-[60px] bg-card z-10">{type}</td>
                            {expiryDataList.map(({ expiry, latestData }) => {
                              const sd = latestData?.dataThis?.find((s) => s.Strike === strike);
                              const oiKey = type === "CE" ? "CE OI" : "PE OI";
                              const coiKey = type === "CE" ? "CE COI" : "PE COI";
                              const oi = sd?.[oiKey] || 0;
                              const coi = sd?.[coiKey] || 0;
                              return (
                                <>
                                  <td key={`${expiry}_${type}_oi`} className="border border-border p-1 text-right font-mono">
                                    {formatValue(oi)}
                                  </td>
                                  <td key={`${expiry}_${type}_coi`} className={`border border-border p-1 text-right font-mono ${coi > 0 ? "text-emerald-500" : coi < 0 ? "text-destructive" : ""}`}>
                                    {formatValue(coi)}
                                  </td>
                                </>
                              );
                            })}
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {!loadingData && expiryDataList.length === 0 && expiryDates.length > 0 && (
            <div className="text-center py-20 text-muted-foreground">
              Click "Load All Expiries" to fetch OI data across all expiry dates
            </div>
          )}
        </main>
      </ProFeatureGate>

      <Footer />
    </div>
  );
};

export default OIAcrossExpiries;
