import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupportResistanceData } from "@/services/kundaliApi";

interface PCRSupportResistanceProps {
  supportResistanceData: SupportResistanceData | null;
  spotPrice: number;
  loading?: boolean;
}

export function PCRSupportResistance({ supportResistanceData, spotPrice, loading }: PCRSupportResistanceProps) {
  if (loading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-lg font-heading">Support & Resistance Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="text-center p-4 rounded-lg bg-secondary/50 border border-border animate-pulse">
                <p className="text-xs text-muted-foreground mb-1">Loading...</p>
                <p className="text-lg font-bold text-muted-foreground">--</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!supportResistanceData) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-lg font-heading">Support & Resistance Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="text-center p-4 rounded-lg bg-secondary/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">--</p>
                <p className="text-lg font-bold text-muted-foreground">--</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-lg font-heading">Support & Resistance Levels</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-3">
          <div className="text-center p-4 rounded-lg bg-red-950/30 border border-red-500/30">
            <p className="text-xs text-muted-foreground mb-1">Strong Resistance</p>
            <p className="text-lg font-bold text-red-400">{supportResistanceData.strongResistance}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-red-950/20 border border-red-500/20">
            <p className="text-xs text-muted-foreground mb-1">Resistance</p>
            <p className="text-lg font-bold text-red-400">{supportResistanceData.resistance}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-secondary/50 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Current</p>
            <p className="text-lg font-bold text-foreground">{spotPrice.toFixed(2)}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
            <p className="text-xs text-muted-foreground mb-1">Support</p>
            <p className="text-lg font-bold text-emerald-400">{supportResistanceData.support}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
            <p className="text-xs text-muted-foreground mb-1">Strong Support</p>
            <p className="text-lg font-bold text-emerald-400">{supportResistanceData.strongSupport}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
