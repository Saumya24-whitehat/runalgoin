import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { SessionManager } from "@/components/SessionManager";
import { useTableStyles } from "@/components/admin/TableStyleSettings";
import { Loader2 } from "lucide-react";

// Eagerly loaded pages (landing + auth — needed immediately)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Welcome from "./pages/Welcome";
import { FirstLoginGuard } from "@/components/FirstLoginGuard";

// Lazy-loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const OptionChain = lazy(() => import("./pages/OptionChain"));
const SupportResistance = lazy(() => import("./pages/SupportResistance"));
const OptionHeatMap = lazy(() => import("./pages/OptionHeatMap"));
const PCR = lazy(() => import("./pages/PCR"));
const PCRLongShort = lazy(() => import("./pages/PCRLongShort"));
const PCRAllStrikes = lazy(() => import("./pages/PCRAllStrikes"));
const TOI = lazy(() => import("./pages/TOI"));
const MaxPain = lazy(() => import("./pages/MaxPain"));
const OTR = lazy(() => import("./pages/OTR"));

const OptionBuilder = lazy(() => import("./pages/OptionBuilder"));
const OptionSimulator = lazy(() => import("./pages/OptionSimulator"));
const FutureBuildup = lazy(() => import("./pages/FutureBuildup"));
const FutureOpenHighLow = lazy(() => import("./pages/FutureOpenHighLow"));
const FutureRollover = lazy(() => import("./pages/FutureRollover"));
const FuturesOiBreakup = lazy(() => import("./pages/FuturesOiBreakup"));
const MarketBreadth = lazy(() => import("./pages/MarketBreadth"));
const OptionsChart = lazy(() => import("./pages/OptionsChart"));
const GreeksChart = lazy(() => import("./pages/GreeksChart"));
const StrategyCharts = lazy(() => import("./pages/StrategyCharts"));
const PremiumDecay = lazy(() => import("./pages/PremiumDecay"));
const Indices = lazy(() => import("./pages/Indices"));
const FII = lazy(() => import("./pages/FII"));
const IPO = lazy(() => import("./pages/IPO"));
const StockScreeners = lazy(() => import("./pages/StockScreeners"));
const JackpotScanner = lazy(() => import("./pages/JackpotScanner"));
const JackpotDetail = lazy(() => import("./pages/JackpotDetail"));
const AllSectors = lazy(() => import("./pages/AllSectors"));
const SectorAnalysis = lazy(() => import("./pages/SectorAnalysis"));
const IndexDetail = lazy(() => import("./pages/IndexDetail"));
const StockDetail = lazy(() => import("./pages/StockDetail"));
const Plans = lazy(() => import("./pages/Plans"));
const Admin = lazy(() => import("./pages/Admin"));
const Profile = lazy(() => import("./pages/Profile"));
const OptionsSummary = lazy(() => import("./pages/OptionsSummary"));
const Documentation = lazy(() => import("./pages/Documentation"));
const Videos = lazy(() => import("./pages/Videos"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Support = lazy(() => import("./pages/Support"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const OIAcrossExpiries = lazy(() => import("./pages/OIAcrossExpiries"));
const OIChangeTrend = lazy(() => import("./pages/OIChangeTrend"));
const CandlestickPatternChart = lazy(() => import("./pages/dev/CandlestickPatternChart"));
const ApiMonitor = lazy(() => import("./pages/ApiMonitor"));
const Holidays = lazy(() => import("./pages/Holidays"));
const TrendingStocks = lazy(() => import("./pages/TrendingStocks"));
const MomentumReport = lazy(() => import("./pages/MomentumReport"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function TableStyleApplier() {
  useTableStyles();
  return null;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark" storageKey="runalgo-theme">
        <AuthProvider>
          <SessionManager />
          <TableStyleApplier />
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<PageLoader />}>
              <FirstLoginGuard />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/option-chain" element={<OptionChain />} />
                <Route path="/support-resistance" element={<SupportResistance />} />
                <Route path="/option-heatmap" element={<OptionHeatMap />} />
                <Route path="/pcr" element={<PCR />} />
                <Route path="/pcr-long-short" element={<PCRLongShort />} />
                <Route path="/pcr-all-strikes" element={<PCRAllStrikes />} />
                <Route path="/toi" element={<TOI />} />
                <Route path="/max-pain" element={<MaxPain />} />
                <Route path="/otr" element={<OTR />} />
                <Route path="/algo" element={<Algo />} />
                <Route path="/option-builder" element={<OptionBuilder />} />
                <Route path="/option-simulator" element={<OptionSimulator />} />
                <Route path="/future-buildup" element={<FutureBuildup />} />
                <Route path="/future-open-high-low" element={<FutureOpenHighLow />} />
                <Route path="/future-rollover" element={<FutureRollover />} />
                <Route path="/futures-oi-breakup" element={<FuturesOiBreakup />} />
                <Route path="/market-breadth" element={<MarketBreadth />} />
                <Route path="/options-chart" element={<OptionsChart />} />
                <Route path="/greeks-chart" element={<GreeksChart />} />
                <Route path="/strategy-charts" element={<StrategyCharts />} />
                <Route path="/premium-decay" element={<PremiumDecay />} />
                <Route path="/indices" element={<Indices />} />
                <Route path="/fii" element={<FII />} />
                <Route path="/ipo" element={<IPO />} />
                <Route path="/stock-screeners" element={<StockScreeners />} />
                <Route path="/jackpot-scanner" element={<JackpotScanner />} />
                <Route path="/jackpot-detail" element={<JackpotDetail />} />
                <Route path="/all-sectors" element={<AllSectors />} />
                <Route path="/sector-analysis" element={<SectorAnalysis />} />
                <Route path="/index-detail" element={<IndexDetail />} />
                <Route path="/stock-detail" element={<StockDetail />} />
                <Route path="/plans" element={<Plans />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/options-summary" element={<OptionsSummary />} />
                <Route path="/documentation" element={<Documentation />} />
                <Route path="/videos" element={<Videos />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/support" element={<Support />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/oi-across-expiries" element={<OIAcrossExpiries />} />
                <Route path="/oi-change-trend" element={<OIChangeTrend />} />
                <Route path="/dev/candlestick-patterns" element={<CandlestickPatternChart />} />
                <Route path="/api-monitor" element={<ApiMonitor />} />
                <Route path="/holidays" element={<Holidays />} />
                <Route path="/trending-stocks" element={<TrendingStocks />} />
                <Route path="/momentum-report" element={<MomentumReport />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
