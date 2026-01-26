import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface ChartBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ChartDataState {
  bars: ChartBar[];
  isLoading: boolean;
  error: string | null;
}

interface TickerData {
  ltp: number;
  ch: number;
  chPer: string;
  c: string;
  symbol: string;
}

interface FIIDataItem {
  Name: string;
  ShortName: string;
  Value: number;
}

interface ClosePrice {
  C: number;
}

interface FIIRecord {
  Date: string;
  FIIDIIData: FIIDataItem[];
  ClosePrice?: ClosePrice[];
}

interface AdvanceDeclineItem {
  time: string;
  advance: number;
  decline: number;
}

// Mapping of API keys to display names
const symbolNameMap: Record<string, string> = {
  "SYML:NSE;NIFTY": "Nifty 50",
  "SYML:NSE;CNX500": "Nifty 500",
  "SYML:NSE;BANKNIFTY": "Nifty Bank",
  "SYML:NSE;SENSEX": "Sensex",
  "SYML:NSE;CNXIT": "Nifty IT",
  "SYML:NSE;CNXFINANCE": "Nifty Finance",
  "SYML:NSE;CNXAUTO": "Nifty Auto",
  "SYML:NSE;NIFTYJR": "Nifty Next 50",
  "SYML:NSE;CNXPSUBANK": "Nifty PSU Bank",
  "SYML:NSE;CNXPHARMA": "Nifty Pharma",
  "SYML:NSE;CNXMETAL": "Nifty Metal",
  "SYML:NSE;NIFTYFINSRV25_50": "Nifty Fin Srv 25/50",
  "SYML:NSE;CNXFMCG": "Nifty FMCG",
  "SYML:NSE;CNXINFRA": "Nifty Infra",
  "SYML:NSE;NIFTYPVTBANK": "Nifty Pvt Bank",
  "SYML:NSE;CNXMEDIA": "Nifty Media",
  "SYML:NSE;CNXREALTY": "Nifty Realty",
  "SYML:NSE;NIFTY_HEALTHCARE": "Nifty Healthcare",
  "SYML:NSE;NIFTY_CONSR_DURBL": "Nifty Consumer Durables",
  "SYML:NSE;NIFTY_OIL_AND_GAS": "Nifty Oil & Gas",
  "SYML:NSE;CNXSMALLCAP": "Nifty Smallcap",
  "SYML:NSE;NIFTY_MID_SELECT": "Nifty Mid Select",
  "SYML:NSE;CNX200": "Nifty 200",
  "SYML:NSE;CNXENERGY": "Nifty Energy",
  "SYML:NSE;CNXCONSUMPTION": "Nifty Consumption",
  "SYML:NSE;CNXMIDCAP": "Nifty Midcap",
  "SYML:NSE;CNXCOMMODITIES": "Nifty Commodities",
  "SYML:NSE;NIFTYMIDCAP50": "Nifty Midcap 50",
  "SYML:NSE;NIFTYSMLCAP250": "Nifty Smallcap 250",
  "SYML:NSE;NIFTYMIDSML400": "Nifty Midsml 400",
  "SYML:NSE;CNXPSE": "Nifty PSE",
  "SYML:NSE;NIFTYMIDCAP150": "Nifty Midcap 150",
  "SYML:NSE;NIFTY_MICROCAP250": "Nifty Microcap 250",
  "SYML:NSE;NIFTYALPHA50": "Nifty Alpha 50",
  "SYML:NSE;NIFTY_TOTAL_MKT": "Nifty Total Mkt",
  "SYML:NSE;CPSE": "CPSE",
  "SYML:NSE;CNX100": "Nifty 100",
  "SYML:NSE;CNXSERVICE": "Nifty Service",
  "SYML:NSE;NIFTY500_MULTICAP": "Nifty 500 Multicap",
  "SYML:NSE;CNXMNC": "Nifty MNC",
  "SYML:NSE;NIFTY_INDIA_MFG": "Nifty India Mfg",
  "SYML:NSE;NIFTY200MOMENTM30": "Nifty 200 Momentum 30",
  "SYML:NSE;NIFTYSMLCAP50": "Nifty Smallcap 50",
  "SYML:NSE;NIFTY_LARGEMID250": "Nifty Largemid 250",
  "SYML:NSE;NIFTY50EQUALWEIGHT": "Nifty 50 Equal Wt",
  "SYML:NSE;NIFTY_IND_DIGITAL": "Nifty Ind Digital",
};

// Priority order for fixed indices
const prioritySymbols = ["SYML:NSE;NIFTY", "SYML:NSE;CNX500", "SYML:NSE;BANKNIFTY"];

export function IndicesSection() {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState<"nifty" | "sensex">("nifty");
  const [activeChart, setActiveChart] = useState<"nifty50" | "nifty500" | "niftybank">("nifty50");
  const [activeSlide, setActiveSlide] = useState(0);
  const [tickerData, setTickerData] = useState<Record<string, TickerData> | null>(null);
  const [fiiData, setFiiData] = useState<FIIRecord[] | null>(null);
  const [advanceDeclineData, setAdvanceDeclineData] = useState<Record<string, AdvanceDeclineItem> | null>(null);

  // Fetch ticker data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("ticker-data");
        if (!error && data) {
          setTickerData(data);
        }
      } catch (err) {
        console.error("Error fetching ticker data:", err);
      }
    };
    fetchData();
  }, []);

  // Fetch FII data
  useEffect(() => {
    const fetchFiiData = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("fii-data");
        if (!error && data) {
          setFiiData(data);
        }
      } catch (err) {
        console.error("Error fetching FII data:", err);
      }
    };
    fetchFiiData();
  }, []);

  // Fetch Advance/Decline data
  useEffect(() => {
    const fetchAdvanceDecline = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("advance-decline");
        if (!error && data) {
          setAdvanceDeclineData(data);
        }
      } catch (err) {
        console.error("Error fetching advance/decline data:", err);
      }
    };
    fetchAdvanceDecline();
  }, []);

  // Get current index data
  const getCurrentIndexData = () => {
    if (!tickerData) {
      return { value: "--", change: "--", isPositive: false };
    }

    const key = activeIndex === "nifty" ? "Nifty 50" : "Sensex";
    const data = tickerData[key];

    if (!data) {
      return { value: "--", change: "--", isPositive: false };
    }

    const value = data.ltp?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "--";
    const change = data.ch >= 0 ? `+${data.ch.toFixed(2)}` : data.ch.toFixed(2);
    const isPositive = data.ch >= 0;

    return { value, change, isPositive };
  };

  // Get FII Cash data for calendar bars
  const getFiiCalendarData = () => {
    if (!fiiData || fiiData.length === 0) return [];

    // Get last 10 days of data
    return fiiData
      .slice(0, 10)
      .map((record) => {
        const fiiCM = record.FIIDIIData?.find((item) => item.ShortName === "FII CM*");
        const date = new Date(record.Date);
        return {
          nifty: record.ClosePrice?.[0]?.C || 0,
          day: date.getDate(),
          value: fiiCM?.Value || 0,
          isPositive: (fiiCM?.Value || 0) >= 0,
        };
      })
      .reverse();
  };

  // Get latest FII Cash value
  const getLatestFiiCash = () => {
    if (!fiiData || fiiData.length === 0) {
      return { value: "--", isPositive: false, date: "--" };
    }

    const latest = fiiData[0];
    const fiiCM = latest.FIIDIIData?.find((item) => item.ShortName === "FII CM*");
    const date = new Date(latest.Date);
    const formattedDate = `${date.getDate()} ${date.toLocaleString("en-US", { month: "short" })} ${date.getFullYear()}`;

    return {
      value: fiiCM?.Value?.toFixed(2) || "0.00",
      isPositive: (fiiCM?.Value || 0) >= 0,
      date: formattedDate,
    };
  };

  // Get sorted advance/decline data
  const getSortedAdvanceDeclineData = () => {
    if (!advanceDeclineData) return [];

    const items = Object.entries(advanceDeclineData).map(([key, data]) => ({
      key,
      name: symbolNameMap[key] || key.replace("SYML:NSE;", ""),
      advance: data.advance,
      decline: data.decline,
      time: data.time,
    }));

    // Sort: priority symbols first, then rest
    const priorityItems = prioritySymbols
      .map((sym) => items.find((item) => item.key === sym))
      .filter(Boolean) as typeof items;

    const otherItems = items.filter((item) => !prioritySymbols.includes(item.key));

    return [...priorityItems, ...otherItems];
  };

  const indexData = getCurrentIndexData();
  const fiiCalendarData = getFiiCalendarData();
  console.log(fiiCalendarData);
  const latestFii = getLatestFiiCash();
  const advanceDeclineItems = getSortedAdvanceDeclineData();

  const IndexCard = () => (
    <Card className="bg-card border-border h-full">
      <CardContent className="p-4 h-full flex flex-col">
        {/* Tabs */}
        <div className="flex gap-6 mb-4 border-b border-border pb-2">
          <button
            onClick={() => setActiveIndex("nifty")}
            className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
              activeIndex === "nifty" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            NIFTY
          </button>
          <button
            onClick={() => setActiveIndex("sensex")}
            className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
              activeIndex === "sensex" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            SENSEX
          </button>
        </div>

        {/* Price and Mini Chart */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold">{indexData.value}</span>
              <span className={`text-sm ${indexData.isPositive ? "text-success" : "text-destructive"}`}>
                ({indexData.change})
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{latestFii.date}</div>
          </div>
          {/* Mini Line Chart with real Nifty data */}
          {(() => {
            const niftyPrices = fiiCalendarData.map((d) => d.nifty).filter((p) => p > 0);
            if (niftyPrices.length < 2) {
              return (
                <svg className="w-24 h-12" viewBox="0 0 100 40">
                  <text x="50" y="25" textAnchor="middle" fill="currentColor" fontSize="8">Loading...</text>
                </svg>
              );
            }
            const minPrice = Math.min(...niftyPrices);
            const maxPrice = Math.max(...niftyPrices);
            const priceRange = maxPrice - minPrice || 1;
            const chartWidth = 100;
            const chartHeight = 36;
            const padding = 2;
            
            const points = niftyPrices
              .map((price, i) => {
                const x = (i / (niftyPrices.length - 1)) * chartWidth;
                const y = padding + ((maxPrice - price) / priceRange) * chartHeight;
                return `${x},${y}`;
              })
              .join(" ");
            
            const isPositive = niftyPrices[niftyPrices.length - 1] >= niftyPrices[0];
            const strokeColor = isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))";
            
            return (
              <svg className="w-24 h-12" viewBox="0 0 100 40">
                <polyline
                  points={points}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {niftyPrices.map((price, i) => {
                  const x = (i / (niftyPrices.length - 1)) * chartWidth;
                  const y = padding + ((maxPrice - price) / priceRange) * chartHeight;
                  return <circle key={i} cx={x} cy={y} r="2" fill={strokeColor} />;
                })}
              </svg>
            );
          })()}
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-border my-4" />

        {/* FII Cash with Bar Calendar */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-muted-foreground">FII Cash</div>
              <div className={`text-lg font-semibold ${latestFii.isPositive ? "text-success" : "text-destructive"}`}>
                {latestFii.value} Cr.
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{latestFii.date}</div>
            </div>
          </div>

          {/* FII Calendar Bars - Stacked style like reference */}
          <div className="flex items-end justify-end gap-0.5 h-12 mt-2">
            {fiiCalendarData.map((item, idx) => {
              // Scale bars relative to max value
              const maxValue = Math.max(...fiiCalendarData.map((d) => Math.abs(d.value)));
              const heightPercent = maxValue > 0 ? (Math.abs(item.value) / maxValue) * 100 : 20;
              const barHeight = Math.max(heightPercent, 15);

              return (
                <div
                  key={idx}
                  className={`flex items-center justify-center rounded-sm text-[8px] font-medium text-white ${
                    item.isPositive ? "bg-success" : "bg-destructive"
                  }`}
                  style={{
                    height: `${barHeight}%`,
                    minHeight: "16px",
                    width: "20px",
                  }}
                >
                  {item.day}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Chart data state
  const [chartData, setChartData] = useState<Record<string, ChartDataState>>({
    nifty50: { bars: [], isLoading: false, error: null },
    nifty500: { bars: [], isLoading: false, error: null },
    niftybank: { bars: [], isLoading: false, error: null },
  });

  // Symbol mapping for chart API
  const chartSymbolMap: Record<"nifty50" | "nifty500" | "niftybank", string> = {
    nifty50: "NSE_INDEX|Nifty 50",
    nifty500: "NSE_INDEX|Nifty 500",
    niftybank: "NSE_INDEX|Nifty Bank",
  };

  // Fetch chart data when activeChart changes
  useEffect(() => {
    const fetchChartData = async () => {
      if (chartData[activeChart].bars.length > 0) return; // Already fetched

      setChartData((prev) => ({
        ...prev,
        [activeChart]: { ...prev[activeChart], isLoading: true, error: null },
      }));

      try {
        const today = new Date();
        const fromDate = new Date(today);
        fromDate.setDate(today.getDate() - 5);

        const formatDate = (d: Date) => d.toISOString().split("T")[0];
        const symbol = encodeURIComponent(chartSymbolMap[activeChart]);

        const url = `https://runalgo.xyz/top/chart/upstox_data_fetcher.php?symbol=${symbol}&interval=5minute&from=${formatDate(fromDate)}&to=${formatDate(today)}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.success && data.bars) {
          setChartData((prev) => ({
            ...prev,
            [activeChart]: { bars: data.bars, isLoading: false, error: null },
          }));
        } else {
          throw new Error("Invalid data");
        }
      } catch (err) {
        console.error("Error fetching chart data:", err);
        setChartData((prev) => ({
          ...prev,
          [activeChart]: { bars: [], isLoading: false, error: "Failed to load" },
        }));
      }
    };

    fetchChartData();
  }, [activeChart]);

  // Compute chart rendering data
  const chartRenderData = useMemo(() => {
    const bars = chartData[activeChart].bars;
    if (bars.length === 0) {
      return { points: "", areaPath: "", yLabels: [], xLabels: [], lastPrice: 0, isPositive: true };
    }

    // Get today's data only (last trading session)
    const todayStart = new Date();
    todayStart.setHours(9, 15, 0, 0);
    const todayBars = bars.filter((b) => b.time >= todayStart.getTime());
    const displayBars = todayBars.length > 10 ? todayBars : bars.slice(-75);

    if (displayBars.length === 0) {
      return { points: "", areaPath: "", yLabels: [], xLabels: [], lastPrice: 0, isPositive: true };
    }

    const opens = displayBars.map((b) => b.open);
    const closes = displayBars.map((b) => b.close);
    const allPrices = [...opens, ...closes];
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice || 1;

    const chartWidth = 320;
    const chartHeight = 120;
    const paddingLeft = 60;
    const paddingTop = 20;
    const paddingBottom = 30;

    const points = displayBars
      .map((bar, i) => {
        const x = paddingLeft + (i / (displayBars.length - 1)) * chartWidth;
        const y = paddingTop + ((maxPrice - bar.close) / priceRange) * chartHeight;
        return `${x},${y}`;
      })
      .join(" ");

    const firstPoint = `${paddingLeft},${paddingTop + ((maxPrice - displayBars[0].close) / priceRange) * chartHeight}`;
    const lastX = paddingLeft + chartWidth;
    const lastY = paddingTop + ((maxPrice - displayBars[displayBars.length - 1].close) / priceRange) * chartHeight;
    const areaPath = `M${firstPoint} ${points
      .split(" ")
      .map((p) => `L${p}`)
      .join(" ")} L${lastX},${paddingTop + chartHeight} L${paddingLeft},${paddingTop + chartHeight} Z`;

    // Y-axis labels (5 levels)
    const yLabels = Array.from({ length: 5 }, (_, i) => {
      const price = maxPrice - (i / 4) * priceRange;
      const y = paddingTop + (i / 4) * chartHeight;
      return { price: price.toLocaleString("en-IN", { maximumFractionDigits: 2 }), y: y + 4 };
    });

    // X-axis labels (6 time points)
    const xLabels = [0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => {
      const idx = Math.floor(ratio * (displayBars.length - 1));
      const bar = displayBars[idx];
      const date = new Date(bar.time);
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const period = hours >= 12 ? "PM" : "AM";
      const displayHour = hours > 12 ? hours - 12 : hours || 12;
      return {
        label: `${displayHour}:${minutes} ${period}`,
        x: paddingLeft + ratio * chartWidth,
      };
    });

    const firstPrice = displayBars[0].open;
    const lastPrice = displayBars[displayBars.length - 1].close;
    const isPositive = lastPrice >= firstPrice;

    return { points, areaPath, yLabels, xLabels, lastPrice, isPositive, lastY };
  }, [chartData, activeChart]);

  const ChartCard = () => (
    <Card className="bg-card border-border h-full">
      <CardContent className="p-4 h-full flex flex-col">
        {/* Tabs */}
        <div className="flex gap-6 mb-4 border-b border-border pb-2">
          {(["nifty50", "nifty500", "niftybank"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveChart(tab)}
              className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                activeChart === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
              }`}
            >
              {tab === "nifty50" ? "Nifty 50" : tab === "nifty500" ? "Nifty 500" : "Nifty Bank"}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="flex-1 relative">
          {chartData[activeChart].isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
          ) : chartData[activeChart].error ? (
            <div className="flex items-center justify-center h-full text-destructive text-sm">
              {chartData[activeChart].error}
            </div>
          ) : chartRenderData.points ? (
            <svg viewBox="0 0 400 180" className="w-full h-full">
              {/* Grid lines */}
              {chartRenderData.yLabels.map((label, i) => (
                <line
                  key={i}
                  x1="60"
                  y1={label.y - 4}
                  x2="380"
                  y2={label.y - 4}
                  stroke="hsl(var(--border))"
                  strokeWidth="0.5"
                />
              ))}

              {/* Y-axis labels */}
              {chartRenderData.yLabels.map((label, i) => (
                <text key={i} x="55" y={label.y} fill="hsl(var(--muted-foreground))" fontSize="9" textAnchor="end">
                  {label.price}
                </text>
              ))}

              {/* Area gradient */}
              <defs>
                <linearGradient id="chartGradientDynamic" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop
                    offset="0%"
                    stopColor={chartRenderData.isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                    stopOpacity="0.3"
                  />
                  <stop
                    offset="100%"
                    stopColor={chartRenderData.isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>

              {/* Area fill */}
              <path d={chartRenderData.areaPath} fill="url(#chartGradientDynamic)" />

              {/* Line */}
              <polyline
                points={chartRenderData.points}
                fill="none"
                stroke={chartRenderData.isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                strokeWidth="2"
              />

              {/* Current price indicator */}
              <rect
                x="340"
                y={(chartRenderData.lastY || 80) - 8}
                width="55"
                height="16"
                fill={chartRenderData.isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                rx="2"
              />
              <text
                x="367"
                y={(chartRenderData.lastY || 80) + 3}
                fill="white"
                fontSize="8"
                textAnchor="middle"
                fontWeight="600"
              >
                {chartRenderData.lastPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </text>

              {/* X-axis labels */}
              {chartRenderData.xLabels.map((label, i) => (
                <text key={i} x={label.x} y="165" fill="hsl(var(--muted-foreground))" fontSize="9" textAnchor="middle">
                  {label.label}
                </text>
              ))}
            </svg>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">No data</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
  const AdvanceDeclineBar = ({ item }: { item: { key: string; name: string; advance: number; decline: number } }) => {
    const total = item.advance + item.decline;
    const advancePercent = total > 0 ? (item.advance / total) * 100 : 50;
    const declinePercent = total > 0 ? (item.decline / total) * 100 : 50;

    const handleIndexClick = () => {
      navigate(`/market-breadth?index=${encodeURIComponent(item.key)}`);
    };

    return (
      <div className="flex items-center gap-3">
        {/* Index Name */}
        <span 
          className="w-24 text-foreground font-medium cursor-pointer hover:text-primary transition-colors"
          onClick={handleIndexClick}
        >
          {item.name}
        </span>

        {/* Fixed-width container for counts + bars */}
        <div className="flex items-center gap-1 w-[260px]">
          {/* Advance count */}
          <span className="text-xs text-success w-9 text-right">▲{item.advance}</span>

          {/* Advance bar (flexible width) */}
          <div className="h-4 bg-success rounded-l" style={{ flexBasis: `${advancePercent}%` }} />

          {/* Decline bar (flexible width) */}
          <div className="h-4 bg-destructive rounded-r" style={{ flexBasis: `${declinePercent}%` }} />

          {/* Decline count */}
          <span className="text-xs text-destructive w-9 text-left">▼{item.decline}</span>
        </div>
      </div>
    );
  };

  const AdvancesCard = () => (
    <Card className="bg-card border-border h-full">
      <CardContent className="p-4 h-full flex flex-col">
        <h3 className="font-semibold mb-3">Advances/Declines</h3>

        {/* Scrollable - only shows 3 items initially, scroll for more */}
        <ScrollArea className="h-[50vh] md:h-[200px]">
          <div className="space-y-3 pr-2">
            {advanceDeclineItems.map((item, idx) => (
              <AdvanceDeclineBar key={idx} item={item} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  const slides = [<IndexCard key="index" />, <ChartCard key="chart" />, <AdvancesCard key="advances" />];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Indices</h2>
        <a href="/indices" className="text-primary text-sm hover:underline">
          View All &gt;
        </a>
      </div>

      {/* Desktop Grid - 3 columns */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-4">
        <IndexCard />
        <ChartCard />
        <AdvancesCard />
      </div>

      {/* Mobile Carousel */}
      <div className="lg:hidden">
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          >
            {slides.map((slide, i) => (
              <div key={i} className="w-full flex-shrink-0 min-h-[280px]">
                {slide}
              </div>
            ))}
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-4">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                activeSlide === i ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
