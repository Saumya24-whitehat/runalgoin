import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PCRSentimentGaugeProps {
  pcrOI: number;
  pcrCOI: number;
}

function getSentimentText(pcr: number): string {
  if (pcr < 0.5) return "Extremely Bearish";
  if (pcr < 0.7) return "Very Bearish";
  if (pcr < 0.9) return "Bearish";
  if (pcr < 1.1) return "Neutral";
  if (pcr < 1.3) return "Bullish";
  if (pcr < 1.5) return "Very Bullish";
  return "Extremely Bullish";
}

function getTradingInsight(pcrOI: number, pcrCOI: number): string {
  const avgPCR = (pcrOI + pcrCOI) / 2;
  
  if (avgPCR < 0.7) {
    return "Market shows bearish sentiment with PCR OI below 0.8. Watch for support levels and potential reversal signals.";
  } else if (avgPCR < 0.9) {
    return "Market sentiment is mildly bearish. Consider protective strategies and monitor key support levels.";
  } else if (avgPCR < 1.1) {
    return "Market is in neutral zone. Wait for clear directional signals before taking large positions.";
  } else if (avgPCR < 1.3) {
    return "Market shows bullish sentiment. Consider bullish strategies but watch resistance levels.";
  } else {
    return "Strong bullish sentiment indicated. However, extremely high PCR may signal potential reversal.";
  }
}

export function PCRSentimentGauge({ pcrOI, pcrCOI }: PCRSentimentGaugeProps) {
  // Calculate position on gauge (0-100)
  // PCR ranges from 0.3 to 2.0 typically
  const normalizedPCR = Math.max(0.3, Math.min(2.0, pcrOI));
  const gaugePosition = ((normalizedPCR - 0.3) / (2.0 - 0.3)) * 100;
  
  const sentiment = getSentimentText(pcrOI);
  const insight = getTradingInsight(pcrOI, pcrCOI);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-lg font-heading">Market Sentiment Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gauge Section */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">Overall Market Sentiment</p>
            <div className="relative">
              {/* Gauge Background */}
              <div className="h-4 rounded-full overflow-hidden flex">
                <div className="flex-1 bg-gradient-to-r from-red-500 via-red-400 to-red-300" />
                <div className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-300" />
                <div className="flex-1 bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500" />
              </div>
              
              {/* Indicator */}
              <div 
                className="absolute top-0 w-1 h-6 bg-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1"
                style={{ left: `${gaugePosition}%` }}
              />
              
              {/* Labels */}
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>Bearish</span>
                <span>Neutral</span>
                <span>Bullish</span>
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <span className={`text-xl font-bold ${
                pcrOI < 0.9 ? 'text-red-400' : pcrOI < 1.1 ? 'text-yellow-400' : 'text-emerald-400'
              }`}>
                {sentiment}
              </span>
            </div>
          </div>
          
          {/* Trading Insight Section */}
          <div>
            <h4 className="text-base font-semibold mb-3">Trading Insight</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {insight}
            </p>
            
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground">PCR OI</p>
                <p className={`text-lg font-bold ${pcrOI < 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {pcrOI.toFixed(3)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground">PCR COI</p>
                <p className={`text-lg font-bold ${pcrCOI < 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {pcrCOI.toFixed(3)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
