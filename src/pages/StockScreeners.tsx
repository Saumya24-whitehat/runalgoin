import { useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScanCategoryList } from "@/components/stockScreener/ScanCategoryList";
import { ScreenerResultsTable } from "@/components/stockScreener/ScreenerResultsTable";
import { ConditionInput } from "@/components/stockScreener/ConditionInput";
import {
  scanStocks,
  ScanResult,
  ScanExample,
} from "@/services/stockScreenerApi";
import { Loader2, Search, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminPaletteButton } from "@/components/admin/AdminPaletteButton";

export default function StockScreeners() {
  const { toast } = useToast();
  const [condition, setCondition] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [activeTab, setActiveTab] = useState<"presets" | "custom">("presets");

  const handleScan = useCallback(async () => {
    if (!condition.trim()) {
      toast({
        title: "Condition Required",
        description: "Please enter a scan condition",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const data = await scanStocks(condition, 100);

      if (!data.success) {
        toast({
          title: "Scan Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        });
        return;
      }

      setResult(data);

      if (data.data.length === 0) {
        toast({
          title: "No Results",
          description: "No stocks matched your scan criteria",
        });
      } else {
        toast({
          title: "Scan Complete",
          description: `Found ${data.data.length} stocks`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to scan stocks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [condition, toast]);

  const handleSelectScan = useCallback(
    (scan: ScanExample) => {
      setCondition(scan.condition);
      setActiveTab("custom");
      // Auto-run the scan
      setTimeout(async () => {
        setIsLoading(true);
        try {
          const data = await scanStocks(scan.condition, 100);
          if (data.success) {
            setResult(data);
            if (data.data.length > 0) {
              toast({
                title: scan.title,
                description: `Found ${data.data.length} stocks`,
              });
            } else {
              toast({
                title: "No Results",
                description: "No stocks matched the scan criteria",
              });
            }
          } else {
            toast({
              title: "Scan Failed",
              description: data.error || "Unknown error",
              variant: "destructive",
            });
          }
        } catch {
          toast({
            title: "Error",
            description: "Failed to run scan",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }, 100);
    },
    [toast]
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TickerRibbon />
      <Navbar />
      <AdminPaletteButton />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" />
            Stock Screener
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Scan stocks using technical, fundamental, and price-based conditions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-240px)] min-h-[600px]">
          {/* Left Panel - Scan Selection */}
          <div className="lg:col-span-4 xl:col-span-3">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-2">
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as "presets" | "custom")}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="presets" className="flex-1">
                      <FileText className="h-4 w-4 mr-1" />
                      Preset Scans
                    </TabsTrigger>
                    <TabsTrigger value="custom" className="flex-1">
                      <Search className="h-4 w-4 mr-1" />
                      Custom
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                {activeTab === "presets" ? (
                  <ScanCategoryList onSelectScan={handleSelectScan} />
                ) : (
                  <div className="p-4">
                    <ConditionInput
                      condition={condition}
                      onConditionChange={setCondition}
                      onScan={handleScan}
                      isLoading={isLoading}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-8 xl:col-span-9">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  Scan Results
                  {result && (
                    <span className="text-sm font-normal text-muted-foreground">
                      ({result.data.length} stocks)
                    </span>
                  )}
                </CardTitle>
                {isLoading && (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                )}
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Scanning stocks...</p>
                  </div>
                ) : result ? (
                  result.data.length > 0 ? (
                    <ScreenerResultsTable result={result} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                      <AlertCircle className="h-12 w-12" />
                      <p>No stocks matched your scan criteria</p>
                      <code className="text-sm text-primary/80 bg-accent px-3 py-1 rounded">
                        {result.condition}
                      </code>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                    <Search className="h-12 w-12" />
                    <div className="text-center">
                      <p className="font-medium">No Scan Results Yet</p>
                      <p className="text-sm mt-1">
                        Select a preset scan or create a custom condition to get
                        started
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
