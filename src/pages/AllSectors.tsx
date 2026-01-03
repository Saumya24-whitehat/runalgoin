import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SectorData {
  stock_column: {
    pk: number;
    get_full_name: string;
    absolute_url: string;
    NSEcode: string;
    BSEcode: string;
    ISIN: string;
  };
  week_changeP: number;
  day_changeP: number;
  month_changeP: number;
}

interface RankedSector {
  name: string;
  change: number;
  rank: number;
}

const AllSectors = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [sectorsData, setSectorsData] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke("indices-data", {
          body: { activeRange: "week" },
        });

        if (!error && data?.body?.index?.tableData) {
          setSectorsData(data.body.index.tableData);
        }
      } catch (err) {
        console.error("Error fetching sectors data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Generate ranked data for each time period
  const getRankedData = (
    data: SectorData[],
    getChange: (item: SectorData) => number
  ): RankedSector[] => {
    return data
      .filter((item) => {
        const name = item.stock_column.get_full_name.toUpperCase();
        return name.includes("NIFTY");
      })
      .map((item) => ({
        name: item.stock_column.get_full_name.toUpperCase(),
        change: getChange(item),
        rank: 0,
      }))
      .sort((a, b) => b.change - a.change)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  };

  const dayRanked = getRankedData(sectorsData, (d) => d.day_changeP);
  const weekRanked = getRankedData(sectorsData, (d) => d.week_changeP);
  const monthRanked = getRankedData(sectorsData, (d) => d.month_changeP);

  const maxRows = Math.max(dayRanked.length, weekRanked.length, monthRanked.length);

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-success";
    if (change < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "" : "";
    return `${sign}${change.toFixed(2)}`;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50">
          <TickerRibbon />
          <Navbar />
        </div>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>

      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">All Sectors Analysis</h1>
        </div>

        {/* Ranked Table */}
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="bg-[#0a3d2e] py-3 px-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center text-sm font-semibold text-white">Rank</div>
              <div className="text-center text-sm font-semibold text-white">1D</div>
              <div className="text-center text-sm font-semibold text-white">1W</div>
              <div className="text-center text-sm font-semibold text-white">1M</div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {sectorsData.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-muted-foreground">No data available</div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {Array.from({ length: maxRows }, (_, index) => {
                  const dayItem = dayRanked[index];
                  const weekItem = weekRanked[index];
                  const monthItem = monthRanked[index];
                  const rank = index + 1;

                  return (
                    <div
                      key={index}
                      className="grid grid-cols-4 gap-4 py-3 px-4 hover:bg-secondary/30 transition-colors"
                    >
                      {/* Rank */}
                      <div className="flex items-center justify-center">
                        <span className="text-sm font-medium text-muted-foreground">{rank}</span>
                      </div>

                      {/* 1D Column */}
                      <div className="flex items-center justify-center">
                        {dayItem && (
                          <span className={`text-sm font-medium text-center ${getChangeColor(dayItem.change)}`}>
                            {dayItem.name} ({formatChange(dayItem.change)})
                          </span>
                        )}
                      </div>

                      {/* 1W Column */}
                      <div className="flex items-center justify-center">
                        {weekItem && (
                          <span className={`text-sm font-medium text-center ${getChangeColor(weekItem.change)}`}>
                            {weekItem.name} ({formatChange(weekItem.change)})
                          </span>
                        )}
                      </div>

                      {/* 1M Column */}
                      <div className="flex items-center justify-center">
                        {monthItem && (
                          <span className={`text-sm font-medium text-center ${getChangeColor(monthItem.change)}`}>
                            {monthItem.name} ({formatChange(monthItem.change)})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default AllSectors;
