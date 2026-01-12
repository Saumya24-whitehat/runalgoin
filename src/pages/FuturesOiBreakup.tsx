import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
} from "recharts";
import { fetchFutureOiBreakup, processFutureOiData, ProcessedFutureOiData } from "@/services/futureOiBreakupApi";
import { RefreshCw, TrendingUp, TrendingDown, Activity, BarChart3, Loader2, Calendar } from "lucide-react";

const SYMBOLS = [
  { value: "Nifty 50", label: "NIFTY" },
  { value: "Nifty Bank", label: "BANKNIFTY" },
  { value: "NIFTY FIN SERVICE", label: "FINNIFTY" },
  { value: "NIFTY MID SELECT", label: "MIDCPNIFTY" },
];

// Generate next 4 Thursday expiries
const generateExpiries = () => {
  const expiries: { value: string; label: string }[] = [];
  const today = new Date();
  let date = new Date(today);

  for (let i = 0; i < 30 && expiries.length < 4; i++) {
    if (date.getDay() === 4) {
      // Thursday
      if (date >= today) {
        expiries.push({
          value: format(date, "yyyy-MM-dd"),
          label: format(date, "dd MMM yyyy"),
        });
      }
    }
    date = addDays(date, 1);
  }

  return expiries;
};

export default function FuturesOiBreakup() {
  const [symbol, setSymbol] = useState("Nifty 50");
  const [expiry, setExpiry] = useState("");
  const [expiries, setExpiries] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const generatedExpiries = generateExpiries();
    setExpiries(generatedExpiries);
    if (generatedExpiries.length > 0 && !expiry) {
      setExpiry(generatedExpiries[0].value);
    }
  }, []);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["futureOiBreakup", symbol, expiry],
    queryFn: () => fetchFutureOiBreakup(symbol, expiry),
    enabled: !!expiry,
    refetchInterval: 60000,
  });

  const processedData = data?.data ? processFutureOiData(data.data) : [];

  const chartData = processedData.map((row) => ({
    time: format(new Date(row.time), "HH:mm"),
    price: row.close,
    vwap: row.vwap,
    oi: row.oi,
  }));

  const getBuildupBadge = (buildup: string) => {
    switch (buildup) {
      case "Long Buildup":
        return <Badge className="bg-success/20 text-success border-success/30">{buildup}</Badge>;
      case "Short Buildup":
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">{buildup}</Badge>;
      case "Short Covering":
        return <Badge className="bg-success/50 text-success border-success/30">{buildup}</Badge>;
      case "Long Unwinding":
        return <Badge className="bg-destructive/50 text-destructive border-destructive/30">{buildup}</Badge>;
      default:
        return <Badge variant="secondary">{buildup}</Badge>;
    }
  };

  const formatNumber = (num: number, decimals = 2) => {
    if (Math.abs(num) >= 10000000) {
      return (num / 10000000).toFixed(decimals) + " Cr";
    } else if (Math.abs(num) >= 100000) {
      return (num / 100000).toFixed(decimals) + " L";
    }
    return num.toLocaleString("en-IN", { maximumFractionDigits: decimals });
  };

  const currentSymbolLabel = SYMBOLS.find((s) => s.value === symbol)?.label || symbol;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>

      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <BarChart3 className="h-7 w-7 text-primary" />
              Futures OI Breakup
            </h1>
            <p className="text-muted-foreground mt-1">Intraday OI analysis with price and VWAP correlation</p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Select Symbol" />
              </SelectTrigger>
              <SelectContent>
                {SYMBOLS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger className="w-40">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select Expiry" />
              </SelectTrigger>
              <SelectContent>
                {expiries.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <ProFeatureGate featureName="Futures OI Breakup">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-destructive mb-4">Failed to load data</p>
              <Button onClick={() => refetch()}>Retry</Button>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              {processedData.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Activity className="h-4 w-4" />
                        Current Price
                      </div>
                      <p className="font-heading text-xl font-bold text-foreground">
                        ₹{processedData[processedData.length - 1]?.close.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <TrendingUp className="h-4 w-4" />
                        Day High
                      </div>
                      <p className="font-heading text-xl font-bold text-success">
                        ₹{processedData[processedData.length - 1]?.dayHigh.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <TrendingDown className="h-4 w-4" />
                        Day Low
                      </div>
                      <p className="font-heading text-xl font-bold text-destructive">
                        ₹{processedData[processedData.length - 1]?.dayLow.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <BarChart3 className="h-4 w-4" />
                        Total OI Change
                      </div>
                      <p
                        className={`font-heading text-xl font-bold ${
                          processedData[processedData.length - 1]?.totalOiChange >= 0
                            ? "text-success"
                            : "text-destructive"
                        }`}
                      >
                        {formatNumber(processedData[processedData.length - 1]?.totalOiChange || 0)}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Data Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Intraday OI Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky top-0 bg-card">Time</TableHead>
                          <TableHead className="sticky top-0 bg-card text-right">OI</TableHead>
                          <TableHead className="sticky top-0 bg-card text-right">Total OI Chg (Day)</TableHead>
                          <TableHead className="sticky top-0 bg-card text-right">Total OI Chg % (Day)</TableHead>
                          <TableHead className="sticky top-0 bg-card text-right">Day High</TableHead>
                          <TableHead className="sticky top-0 bg-card text-right">Day Low</TableHead>
                          <TableHead className="sticky top-0 bg-card text-right">Price</TableHead>
                          <TableHead className="sticky top-0 bg-card text-right">VWAP</TableHead>
                          <TableHead className="sticky top-0 bg-card text-right">Price Chg</TableHead>
                          <TableHead className="sticky top-0 bg-card text-right">Volume</TableHead>
                          <TableHead className="sticky top-0 bg-card text-right">OI Chg</TableHead>
                          <TableHead className="sticky top-0 bg-card">Buildup</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {processedData.reverse().map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{format(new Date(row.time), "HH:mm")}</TableCell>
                            <TableCell className="text-right">{formatNumber(row.oi)}</TableCell>
                            <TableCell
                              className={`text-right ${row.totalOiChange >= 0 ? "text-success" : "text-destructive"}`}
                            >
                              {row.totalOiChange >= 0 ? "+" : ""}
                              {formatNumber(row.totalOiChange)}
                            </TableCell>
                            <TableCell
                              className={`text-right ${row.totalOiChangePercent >= 0 ? "text-success" : "text-destructive"}`}
                            >
                              {row.totalOiChangePercent >= 0 ? "+" : ""}
                              {row.totalOiChangePercent.toFixed(2)}%
                            </TableCell>
                            <TableCell
                              className={row.isNewDayHigh ? "text-right bg-success" : "text-right text-success"}
                            >
                              ₹{row.dayHigh.toFixed(2)}
                            </TableCell>
                            <TableCell
                              className={row.isNewDayLow ? "text-right bg-destructive" : "text-right text-destructive"}
                            >
                              ₹{row.dayLow.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-medium">₹{row.close.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-warning">₹{row.vwap.toFixed(2)}</TableCell>
                            <TableCell
                              className={`text-right ${row.priceChange >= 0 ? "text-success" : "text-destructive"}`}
                            >
                              {row.priceChange >= 0 ? "+" : ""}₹{row.priceChange.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">{formatNumber(row.volume)}</TableCell>
                            <TableCell
                              className={`text-right ${row.oiChange >= 0 ? "text-success" : "text-destructive"}`}
                            >
                              {row.oiChange >= 0 ? "+" : ""}
                              {formatNumber(row.oiChange)}
                            </TableCell>
                            <TableCell>{getBuildupBadge(row.buildup)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Price & VWAP Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      {currentSymbolLabel} Price & VWAP
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="time"
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                            axisLine={{ stroke: "hsl(var(--border))" }}
                          />
                          <YAxis
                            domain={["auto", "auto"]}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                            axisLine={{ stroke: "hsl(var(--border))" }}
                            tickFormatter={(val) => val.toFixed(0)}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                            labelStyle={{ color: "hsl(var(--foreground))" }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="price"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                            name="Price"
                          />
                          <Line
                            type="monotone"
                            dataKey="vwap"
                            stroke="blue"
                            strokeWidth={2}
                            dot={false}
                            name="VWAP"
                            strokeDasharray="5 5"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* OI Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Open Interest
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="time"
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                            axisLine={{ stroke: "hsl(var(--border))" }}
                          />
                          <YAxis
                            domain={["auto", "auto"]}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                            axisLine={{ stroke: "hsl(var(--border))" }}
                            tickFormatter={(val) => formatNumber(val, 1)}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                            labelStyle={{ color: "hsl(var(--foreground))" }}
                            formatter={(value: number) => [formatNumber(value), "OI"]}
                          />
                          <Legend />
                          <Bar dataKey="oi" fill="hsl(var(--primary) / 0.6)" name="Open Interest" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </ProFeatureGate>
      </main>

      <Footer />
    </div>
  );
}
