import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { SessionManager } from "@/components/SessionManager";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import OptionChain from "./pages/OptionChain";
import SupportResistance from "./pages/SupportResistance";
import OptionHeatMap from "./pages/OptionHeatMap";
import PCR from "./pages/PCR";
import PCRLongShort from "./pages/PCRLongShort";
import TOI from "./pages/TOI";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark" storageKey="runalgo-theme">
        <AuthProvider>
          <SessionManager />
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
              <Route path="/toi" element={<TOI />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
