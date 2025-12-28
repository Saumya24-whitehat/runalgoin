import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

// Mock data
const indicesData = {
  nifty: { value: "26,042.30", change: "-99.80", isPositive: false },
  sensex: { value: "85,912.45", change: "+245.32", isPositive: true }
};

const fiiData = {
  value: "-317.56",
  isPositive: false,
  calendar: [
    { day: 15, positive: false },
    { day: 16, positive: false },
    { day: 17, positive: false },
    { day: 18, positive: false },
    { day: 19, positive: false },
    { day: 22, positive: true },
    { day: 23, positive: true },
    { day: 24, positive: true },
    { day: 26, positive: false },
  ]
};

const advancesDeclines = [
  { name: "Nifty 50", advances: 15, declines: 35, change: "0.4%", isPositive: false },
  { name: "Nifty 500", advances: 174, declines: 320, change: "0.3%", isPositive: false },
  { name: "Nifty Bank", advances: 7, declines: 5, change: "0.3%", isPositive: false },
];

export function IndicesSection() {
  const [activeIndex, setActiveIndex] = useState<"nifty" | "sensex">("nifty");
  const [activeChart, setActiveChart] = useState<"nifty50" | "nifty500" | "niftybank">("nifty50");
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-scroll for mobile carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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
              <span className="text-xl font-bold">{indicesData[activeIndex].value}</span>
              <span className={`text-sm ${indicesData[activeIndex].isPositive ? "text-success" : "text-destructive"}`}>
                ({indicesData[activeIndex].change})
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">26 Dec 2025</div>
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

        {/* FII Cash */}
        <div className="flex items-start justify-between flex-1">
          <div>
            <div className="text-sm text-muted-foreground">FII Cash</div>
            <div className={`text-lg font-semibold ${fiiData.isPositive ? "text-success" : "text-destructive"}`}>
              {fiiData.value} Cr.
            </div>
            <div className="text-xs text-muted-foreground mt-1">26 Dec 2025</div>
          </div>
          {/* Calendar Heatmap */}
          <div className="grid grid-cols-5 gap-1">
            <div className="grid grid-rows-2 gap-1">
              <div className="w-6 h-6 rounded bg-destructive/80 flex items-center justify-center text-[10px] font-medium text-white">15</div>
              <div className="w-6 h-6 rounded bg-destructive/80 flex items-center justify-center text-[10px] font-medium text-white">17</div>
            </div>
            <div className="grid grid-rows-2 gap-1">
              <div className="w-6 h-6 rounded bg-destructive/80 flex items-center justify-center text-[10px] font-medium text-white">16</div>
              <div className="w-6 h-6 rounded bg-destructive/80 flex items-center justify-center text-[10px] font-medium text-white">18</div>
            </div>
            <div className="grid grid-rows-2 gap-1">
              <div className="w-6 h-6 rounded bg-success/80 flex items-center justify-center text-[10px] font-medium text-white"></div>
              <div className="w-6 h-6 rounded bg-destructive/80 flex items-center justify-center text-[10px] font-medium text-white">19</div>
            </div>
            <div className="grid grid-rows-2 gap-1">
              <div className="w-6 h-6 rounded bg-success/80 flex items-center justify-center text-[10px] font-medium text-white">22</div>
              <div className="w-6 h-6 rounded bg-destructive/80 flex items-center justify-center text-[10px] font-medium text-white"></div>
            </div>
            <div className="grid grid-rows-2 gap-1">
              <div className="w-6 h-6 rounded bg-success/80 flex items-center justify-center text-[10px] font-medium text-white">23</div>
              <div className="w-6 h-6 rounded bg-success/80 flex items-center justify-center text-[10px] font-medium text-white">24</div>
            </div>
            <div className="grid grid-rows-2 gap-1 col-start-5">
              <div className="w-6 h-6 rounded bg-destructive/80 flex items-center justify-center text-[10px] font-medium text-white">26</div>
              <div className="w-6 h-6 rounded bg-transparent"></div>
            </div>
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

  const AdvancesCard = () => (
    <Card className="bg-card border-border h-full">
      <CardContent className="p-4 h-full flex flex-col">
        <h3 className="font-semibold mb-4">Advances/Declines</h3>
        <div className="space-y-4 flex-1">
          {advancesDeclines.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.name}</span>
                <span className={item.isPositive ? "text-success" : "text-destructive"}>
                  {item.isPositive ? "▲" : "▼"}{item.change}
                </span>
              </div>
              <div className="flex items-center gap-1 h-5">
                {/* Advances bar */}
                <div className="flex items-center">
                  <span className="text-xs text-success mr-1">▲{item.advances}</span>
                  <div 
                    className="h-4 bg-success rounded-l"
                    style={{ width: `${(item.advances / (item.advances + item.declines)) * 150}px` }}
                  />
                </div>
                {/* Declines bar */}
                <div className="flex items-center">
                  <div 
                    className="h-4 bg-destructive rounded-r"
                    style={{ width: `${(item.declines / (item.advances + item.declines)) * 150}px` }}
                  />
                  <span className="text-xs text-destructive ml-1">▼{item.declines}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
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