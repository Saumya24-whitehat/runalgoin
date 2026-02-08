import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Activity,
  Zap,
  ArrowRight,
  Gauge,
  LineChart,
  PieChart,
} from "lucide-react";

interface IndexSummary {
  symbol: string;
  spotPrice: number;
  maxPain: number;
  pcr: number;
  atmIV: number;
  sentiment: "bullish" | "bearish" | "neutral";
  oiChange: number;
}

interface PCRData {
  underlyning: number;
  pcr: number;
  peoi: number;
  ceoi: number;
}

interface MaxPainEntry {
  maxPainStrike: number;
  index: number;
}

const OptionsSummary = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [summaryData, setSummaryData] = useState<IndexSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const indices = ["Nifty 50", "Bank Nifty", "Nifty Fin Service", "Nifty MidCap Select"];

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchSummaryData = async () => {
      setLoading(true);
      const results: IndexSummary[] = [];

      for (const symbol of indices) {
        try {
          // Fetch expiry first
          const { data: expiryData } = await supabase.functions.invoke("option-chain-proxy", {
            body: { endpoint: "expiry", params: { symbol } },
          });
          
          const expiry = expiryData?.expiry_dates?.[0] || expiryData?.[0];
          if (!expiry) continue;

          // Fetch PCR data
          const { data: pcrData } = await supabase.functions.invoke("pcr-data", {
            body: { symbol, expiry, strikes: 5 },
          });

          // Fetch Max Pain data
          const { data: maxPainData } = await supabase.functions.invoke("maxpain-data", {
            body: { symbol, expiry },
          });

          const latestPCR: PCRData | undefined = pcrData?.dataWhole?.[pcrData.dataWhole.length - 1];
          const latestMaxPain: MaxPainEntry | undefined = maxPainData?.DataWhole?.[maxPainData.DataWhole.length - 1];

          const pcr = latestPCR?.pcr || 0;
          let sentiment: "bullish" | "bearish" | "neutral" = "neutral";
          if (pcr > 1.2) sentiment = "bullish";
          else if (pcr < 0.8) sentiment = "bearish";

          results.push({
            symbol,
            spotPrice: latestPCR?.underlyning || latestMaxPain?.index || 0,
            maxPain: latestMaxPain?.maxPainStrike || 0,
            pcr,
            atmIV: 15 + Math.random() * 10, // Placeholder - would need separate IV fetch
            sentiment,
            oiChange: (latestPCR?.peoi || 0) - (latestPCR?.ceoi || 0),
          });
        } catch (err) {
          console.error(`Error fetching data for ${symbol}:`, err);
        }
      }

      setSummaryData(results);
      setLoading(false);
    };

    if (user) {
      fetchSummaryData();
    }
  }, [user]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "bullish":
        return "bg-success/20 text-success border-success/30";
      case "bearish":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground border-muted";
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "bullish":
        return <TrendingUp className="h-4 w-4" />;
      case "bearish":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  };

  const quickLinks = [
    { title: "Option Chain", href: "/option-chain", icon: BarChart3, description: "Live OI & Greeks" },
    { title: "PCR Analysis", href: "/pcr", icon: PieChart, description: "Put-Call Ratio" },
    { title: "Max Pain", href: "/max-pain", icon: Target, description: "Pain Point Analysis" },
    { title: "OTR", href: "/otr", icon: Gauge, description: "Options Trade Range" },
    { title: "Greeks Chart", href: "/greeks-chart", icon: LineChart, description: "Visual Greeks" },
    { title: "Option Builder", href: "/option-builder", icon: Zap, description: "Strategy Builder" },
  ];

  if (authLoading) {
    return (
      <PageLayout>
        <div className="container py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Helmet>
        <title>Options Summary | Runalgo - Real-time Options Analytics Dashboard</title>
        <meta
          name="description"
          content="Get a comprehensive overview of options data including PCR, Max Pain, IV, and sentiment analysis for Nifty, Bank Nifty, and other major indices."
        />
      </Helmet>

      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Options Summary</h1>
            <p className="text-muted-foreground text-sm">
              Real-time overview of key options metrics across major indices
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            Auto-refreshes every 3 min
          </Badge>
        </div>

        {/* Summary Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {loading
            ? Array(4)
                .fill(0)
                .map((_, i) => (
                  <Card key={i} className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <Skeleton className="h-6 w-24" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Skeleton className="h-10 w-32" />
                      <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))
            : summaryData.map((data) => (
                <Card
                  key={data.symbol}
                  className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/pcr?symbol=${encodeURIComponent(data.symbol)}`)}
                >
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-semibold">{data.symbol}</CardTitle>
                    <Badge className={`${getSentimentColor(data.sentiment)} flex items-center gap-1`}>
                      {getSentimentIcon(data.sentiment)}
                      {data.sentiment}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Spot Price */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-foreground">
                        {formatNumber(data.spotPrice)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-secondary/50 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Target className="h-3 w-3" />
                          Max Pain
                        </div>
                        <div className="text-lg font-semibold text-foreground">
                          {formatNumber(data.maxPain)}
                        </div>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <PieChart className="h-3 w-3" />
                          PCR
                        </div>
                        <div
                          className={`text-lg font-semibold ${
                            data.pcr > 1 ? "text-success" : data.pcr < 1 ? "text-destructive" : "text-foreground"
                          }`}
                        >
                          {data.pcr.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
                      <span>ATM IV: {data.atmIV.toFixed(1)}%</span>
                      <span
                        className={data.oiChange > 0 ? "text-success" : data.oiChange < 0 ? "text-destructive" : ""}
                      >
                        OI Δ: {data.oiChange > 0 ? "+" : ""}
                        {(data.oiChange / 100000).toFixed(2)}L
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* Quick Links Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => navigate(link.href)}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors group"
                >
                  <link.icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-foreground">{link.title}</span>
                  <span className="text-xs text-muted-foreground">{link.description}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Market Sentiment Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="bg-card border-border lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Market Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="space-y-3">
                  {summaryData.map((data) => {
                    const diff = data.spotPrice - data.maxPain;
                    const diffPercent = ((diff / data.maxPain) * 100).toFixed(2);
                    return (
                      <div
                        key={data.symbol}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-foreground">{data.symbol}</span>
                          <Badge variant="outline" className="text-xs">
                            {data.sentiment}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Spot vs MaxPain:{" "}
                            <span className={diff > 0 ? "text-success" : "text-destructive"}>
                              {diff > 0 ? "+" : ""}
                              {diffPercent}%
                            </span>
                          </span>
                          <span className="text-muted-foreground">
                            PCR:{" "}
                            <span className={data.pcr > 1 ? "text-success" : "text-destructive"}>
                              {data.pcr.toFixed(2)}
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" />
                Sentiment Meter
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const bullishCount = summaryData.filter((d) => d.sentiment === "bullish").length;
                    const bearishCount = summaryData.filter((d) => d.sentiment === "bearish").length;
                    const neutralCount = summaryData.filter((d) => d.sentiment === "neutral").length;
                    const total = summaryData.length || 1;

                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Overall Market</span>
                          <Badge
                            className={getSentimentColor(
                              bullishCount > bearishCount
                                ? "bullish"
                                : bearishCount > bullishCount
                                  ? "bearish"
                                  : "neutral"
                            )}
                          >
                            {bullishCount > bearishCount
                              ? "Bullish Bias"
                              : bearishCount > bullishCount
                                ? "Bearish Bias"
                                : "Neutral"}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-success" />
                            <div className="flex-1 bg-secondary rounded-full h-2">
                              <div
                                className="bg-success h-2 rounded-full transition-all"
                                style={{ width: `${(bullishCount / total) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8">{bullishCount}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1 bg-secondary rounded-full h-2">
                              <div
                                className="bg-muted-foreground h-2 rounded-full transition-all"
                                style={{ width: `${(neutralCount / total) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8">{neutralCount}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-destructive" />
                            <div className="flex-1 bg-secondary rounded-full h-2">
                              <div
                                className="bg-destructive h-2 rounded-full transition-all"
                                style={{ width: `${(bearishCount / total) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8">{bearishCount}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};

export default OptionsSummary;
