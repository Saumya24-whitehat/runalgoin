import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { SessionManager } from "@/components/SessionManager";
import { useTableStyles } from "@/components/admin/TableStyleSettings";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import OptionChain from "./pages/OptionChain";
import SupportResistance from "./pages/SupportResistance";
import OptionHeatMap from "./pages/OptionHeatMap";
import PCR from "./pages/PCR";
import PCRLongShort from "./pages/PCRLongShort";
import PCRAllStrikes from "./pages/PCRAllStrikes";
import TOI from "./pages/TOI";
import MaxPain from "./pages/MaxPain";
import OTR from "./pages/OTR";
import Algo from "./pages/Algo";
import OptionBuilder from "./pages/OptionBuilder";
import OptionSimulator from "./pages/OptionSimulator";
import FutureBuildup from "./pages/FutureBuildup";
import FutureOpenHighLow from "./pages/FutureOpenHighLow";
import FutureRollover from "./pages/FutureRollover";
import MarketBreadth from "./pages/MarketBreadth";
import OptionsChart from "./pages/OptionsChart";
import Indices from "./pages/Indices";
import FII from "./pages/FII";
import IPO from "./pages/IPO";
import StockScreeners from "./pages/StockScreeners";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to apply saved table styles
function TableStyleApplier() {
  useTableStyles();
  return null;
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
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
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
              <Route path="/market-breadth" element={<MarketBreadth />} />
              <Route path="/options-chart" element={<OptionsChart />} />
              <Route path="/indices" element={<Indices />} />
              <Route path="/fii" element={<FII />} />
              <Route path="/ipo" element={<IPO />} />
              <Route path="/stock-screeners" element={<StockScreeners />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
