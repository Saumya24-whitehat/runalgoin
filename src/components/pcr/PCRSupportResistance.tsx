import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PCRStrikeData } from "@/services/pcrApi";

interface PCRSupportResistanceProps {
  data: PCRStrikeData[];
  spotPrice: number;
  atm: number;
}

export function PCRSupportResistance({ data, spotPrice, atm }: PCRSupportResistanceProps) {
  // Find max OI strikes for support and resistance
  const sortedByPEOI = [...data].sort((a, b) => b["PE OI"] - a["PE OI"]);
  const sortedByCEOI = [...data].sort((a, b) => b["CE OI"] - a["CE OI"]);

  // Support levels (high PE OI below spot)
  const supportLevels = sortedByPEOI
    .filter(s => s.Strike <= spotPrice)
    .slice(0, 2);

  // Resistance levels (high CE OI above spot)  
  const resistanceLevels = sortedByCEOI
    .filter(s => s.Strike >= spotPrice)
    .slice(0, 2);

  const strongSupport = supportLevels[0]?.Strike;
  const support = supportLevels[1]?.Strike || supportLevels[0]?.Strike;
  const resistance = resistanceLevels[1]?.Strike || resistanceLevels[0]?.Strike;
  const strongResistance = resistanceLevels[0]?.Strike;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-lg font-heading">Support & Resistance Levels</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-3">
          <div className="text-center p-4 rounded-lg bg-red-950/30 border border-red-500/30">
            <p className="text-xs text-muted-foreground mb-1">Strong Resistance</p>
            <p className="text-lg font-bold text-red-400">{strongResistance || '-'}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-red-950/20 border border-red-500/20">
            <p className="text-xs text-muted-foreground mb-1">Resistance</p>
            <p className="text-lg font-bold text-red-400">
              {resistance ? `Strong ${resistance}` : '-'}
            </p>
          </div>
          <div className="text-center p-4 rounded-lg bg-secondary/50 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Current</p>
            <p className="text-lg font-bold text-foreground">{spotPrice.toFixed(2)}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
            <p className="text-xs text-muted-foreground mb-1">Support</p>
            <p className="text-lg font-bold text-emerald-400">
              {support ? `Strong ${support}` : '-'}
            </p>
          </div>
          <div className="text-center p-4 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
            <p className="text-xs text-muted-foreground mb-1">Strong Support</p>
            <p className="text-lg font-bold text-emerald-400">{strongSupport || '-'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
