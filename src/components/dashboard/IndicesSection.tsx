import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

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

interface FIIRecord {
  Date: string;
  FIIDIIData: FIIDataItem[];
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
const prioritySymbols = [
  "SYML:NSE;NIFTY",
  "SYML:NSE;CNX500",
  "SYML:NSE;BANKNIFTY",
];

export function IndicesSection() {
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
        const { data, error } = await supabase.functions.invoke('ticker-data');
        if (!error && data) {
          setTickerData(data);
        }
      } catch (err) {
        console.error('Error fetching ticker data:', err);
      }
    };
    fetchData();
  }, []);

  // Fetch FII data
  useEffect(() => {
    const fetchFiiData = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('fii-data');
        if (!error && data) {
          setFiiData(data);
        }
      } catch (err) {
        console.error('Error fetching FII data:', err);
      }
    };
    fetchFiiData();
  }, []);

  // Fetch Advance/Decline data
  useEffect(() => {
    const fetchAdvanceDecline = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('advance-decline');
        if (!error && data) {
          setAdvanceDeclineData(data);
        }
      } catch (err) {
        console.error('Error fetching advance/decline data:', err);
      }
    };
    fetchAdvanceDecline();
  }, []);

  // Auto-scroll for mobile carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
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

    const value = data.ltp?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "--";
    const change = data.ch >= 0 ? `+${data.ch.toFixed(2)}` : data.ch.toFixed(2);
    const isPositive = data.ch >= 0;

    return { value, change, isPositive };
  };

  // Get FII Cash data for calendar bars
  const getFiiCalendarData = () => {
    if (!fiiData || fiiData.length === 0) return [];
    
    // Get last 10 days of data
    return fiiData.slice(0, 10).map(record => {
      const fiiCM = record.FIIDIIData?.find(item => item.ShortName === "FII CM*");
      const date = new Date(record.Date);
      return {
        day: date.getDate(),
        value: fiiCM?.Value || 0,
        isPositive: (fiiCM?.Value || 0) >= 0
      };
    }).reverse();
  };

  // Get latest FII Cash value
  const getLatestFiiCash = () => {
    if (!fiiData || fiiData.length === 0) {
      return { value: "--", isPositive: false, date: "--" };
    }
    
    const latest = fiiData[0];
    const fiiCM = latest.FIIDIIData?.find(item => item.ShortName === "FII CM*");
    const date = new Date(latest.Date);
    const formattedDate = `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
    
    return {
      value: fiiCM?.Value?.toFixed(2) || "0.00",
      isPositive: (fiiCM?.Value || 0) >= 0,
      date: formattedDate
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
      .map(sym => items.find(item => item.key === sym))
      .filter(Boolean) as typeof items;
    
    const otherItems = items.filter(item => !prioritySymbols.includes(item.key));

    return [...priorityItems, ...otherItems];
  };

  const indexData = getCurrentIndexData();
  const fiiCalendarData = getFiiCalendarData();
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
              activeIndex === "nifty" 
                ? "border-primary text-foreground" 
                : "border-transparent text-muted-foreground"
            }`}
          >
            NIFTY
          </button>
          <button
            onClick={() => setActiveIndex("sensex")}
            className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
              activeIndex === "sensex" 
                ? "border-primary text-foreground" 
                : "border-transparent text-muted-foreground"
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
          {/* Mini Line Chart */}
          <svg className="w-24 h-12" viewBox="0 0 100 40">
            <polyline 
              points="0,30 15,28 25,32 35,25 45,22 55,28 65,15 75,12 85,18 100,10" 
              fill="none" 
              stroke="#EAB308" 
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {[0,15,25,35,45,55,65,75,85,100].map((x, i) => {
              const y = [30,28,32,25,22,28,15,12,18,10][i];
              return <circle key={i} cx={x} cy={y} r="2.5" fill="#EAB308" />;
            })}
          </svg>
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
              const maxValue = Math.max(...fiiCalendarData.map(d => Math.abs(d.value)));
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
                    minHeight: '16px',
                    width: '20px'
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
                activeChart === tab 
                  ? "border-primary text-foreground" 
                  : "border-transparent text-muted-foreground"
              }`}
            >
              {tab === "nifty50" ? "Nifty 50" : tab === "nifty500" ? "Nifty 500" : "Nifty Bank"}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="flex-1 relative">
          <svg viewBox="0 0 400 180" className="w-full h-full">
            {/* Grid lines */}
            <line x1="50" y1="20" x2="380" y2="20" stroke="hsl(var(--border))" strokeWidth="0.5" />
            <line x1="50" y1="50" x2="380" y2="50" stroke="hsl(var(--border))" strokeWidth="0.5" />
            <line x1="50" y1="80" x2="380" y2="80" stroke="hsl(var(--border))" strokeWidth="0.5" />
            <line x1="50" y1="110" x2="380" y2="110" stroke="hsl(var(--border))" strokeWidth="0.5" />
            <line x1="50" y1="140" x2="380" y2="140" stroke="hsl(var(--border))" strokeWidth="0.5" />
            
            {/* Y-axis labels */}
            <text x="45" y="24" fill="hsl(var(--muted-foreground))" fontSize="9" textAnchor="end">26,120</text>
            <text x="45" y="54" fill="hsl(var(--muted-foreground))" fontSize="9" textAnchor="end">26,100</text>
            <text x="45" y="84" fill="hsl(var(--muted-foreground))" fontSize="9" textAnchor="end">26,080</text>
            <text x="45" y="114" fill="hsl(var(--muted-foreground))" fontSize="9" textAnchor="end">26,060</text>
            <text x="45" y="144" fill="hsl(var(--muted-foreground))" fontSize="9" textAnchor="end">26,020</text>

            {/* Area gradient */}
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity="0.3" />
                <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Area fill */}
            <path 
              d="M60,20 L100,25 L140,30 L180,35 L220,60 L260,80 L300,100 L340,120 L370,130 L370,150 L60,150 Z" 
              fill="url(#chartGradient)"
            />

            {/* Line */}
            <polyline 
              points="60,20 100,25 140,30 180,35 220,60 260,80 300,100 340,120 370,130" 
              fill="none" 
              stroke="hsl(var(--destructive))" 
              strokeWidth="2"
            />

            {/* Current price indicator */}
            <rect x="350" y="125" width="45" height="16" fill="hsl(var(--destructive))" rx="2" />
            <text x="372" y="136" fill="white" fontSize="8" textAnchor="middle" fontWeight="600">26,042.30</text>

            {/* X-axis labels */}
            <text x="80" y="165" fill="hsl(var(--muted-foreground))" fontSize="9" textAnchor="middle">10 AM</text>
            <text x="140" y="165" fill="hsl(var(--muted-foreground))" fontSize="9" textAnchor="middle">11 AM</text>
            <text x="200" y="165" fill="hsl(var(--muted-foreground))" fontSize="9" textAnchor="middle">12 PM</text>
            <text x="260" y="165" fill="hsl(var(--muted-foreground))" fontSize="9" textAnchor="middle">01 PM</text>
            <text x="320" y="165" fill="hsl(var(--muted-foreground))" fontSize="9" textAnchor="middle">02 PM</text>
            <text x="370" y="165" fill="hsl(var(--muted-foreground))" fontSize="9" textAnchor="middle">03 PM</text>
          </svg>
        </div>
      </CardContent>
    </Card>
  );

  const AdvanceDeclineBar = ({ item }: { item: { name: string; advance: number; decline: number } }) => {
    const total = item.advance + item.decline;
    const advancePercent = total > 0 ? (item.advance / total) * 100 : 50;
    const declinePercent = total > 0 ? (item.decline / total) * 100 : 50;
    
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground font-medium">{item.name}</span>
        </div>
        <div className="flex items-center gap-0 h-5">
          {/* Advances count */}
          <span className="text-xs text-success mr-1 w-7 text-right">▲{item.advance}</span>
          {/* Advance bar */}
          <div 
            className="h-4 bg-success rounded-l"
            style={{ width: `${advancePercent}%`, maxWidth: '120px', minWidth: '8px' }}
          />
          {/* Decline bar */}
          <div 
            className="h-4 bg-destructive rounded-r"
            style={{ width: `${declinePercent}%`, maxWidth: '120px', minWidth: '8px' }}
          />
          {/* Declines count */}
          <span className="text-xs text-destructive ml-1 w-8">▼{item.decline}</span>
        </div>
      </div>
    );
  };

  const AdvancesCard = () => (
    <Card className="bg-card border-border h-full">
      <CardContent className="p-4 h-full flex flex-col">
        <h3 className="font-semibold mb-3">Advances/Declines</h3>
        
        {/* Scrollable indices */}
        <ScrollArea className="flex-1">
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
        <a href="#" className="text-primary text-sm hover:underline">View All &gt;</a>
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
