import { useCallback, useState } from "react";
import { Activity, BarChart3, Gauge, Waves } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { LastRefreshBadge } from "@/components/LastRefreshBadge";
import { AtmZScoreTimeline } from "@/components/nitinBhaiya/AtmZScoreTimeline";
import { NitinControls } from "@/components/nitinBhaiya/NitinControls";
import { Card, CardContent } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { useNitinBhaiyaAnalysis } from "@/hooks/useNitinBhaiyaAnalysis";
import { formatIndianNumber } from "@/lib/formatNumber";
import { AtmZScoreRow } from "@/utils/atmZScore";

const tone = (value: string) => value.includes("BULLISH") ? "text-success" : value.includes("BEARISH") ? "text-destructive" : "text-muted-foreground";

export default function NitinBhaiyaAtm() {
  const state = useNitinBhaiyaAnalysis();
  const [latest, setLatest] = useState<AtmZScoreRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const handleLatest = useCallback((row: AtmZScoreRow | null) => setLatest(row), []);
  return <PageLayout showFooter={false}>
    <SEO title="ATM Z-Score Analysis | OptionWorld" description="ATM-only option chain analysis using normalized premium, COI, volume and IV Z-scores in 3-minute intervals." path="/nitinbhaiya/atm" />
    <section className="mx-auto w-full max-w-[1800px] py-3">
      <div className="flex items-start justify-between gap-3 px-3 pb-3"><div><p className="font-mono text-[10px] uppercase text-primary">NitinBhaiya Intelligence</p><h1>ATM Normalized Z-Score</h1><p className="text-muted-foreground">Only each candle's current ATM strike is analyzed.</p></div>{state.lastRefresh && <LastRefreshBadge lastRefresh={state.lastRefresh} />}</div>
      <NitinControls symbols={state.symbols} expiries={state.expiries} symbol={state.symbol} expiry={state.expiry} date={state.date} time={state.time} loading={state.loading} onSymbol={state.setSymbol} onExpiry={state.setExpiry} onDate={state.setDate} onTime={state.setTime} onRefresh={() => { state.refresh(); setRefreshKey((value) => value + 1); }} />
      {state.error && <div className="m-3 border-l-4 border-destructive bg-muted p-3 text-destructive">{state.error}</div>}
      <div className="grid grid-cols-2 gap-px border-y bg-border lg:grid-cols-5">
        <Summary icon={Activity} label="Spot" value={latest ? latest.spot.toFixed(2) : "—"} />
        <Summary icon={Gauge} label="Current ATM" value={latest ? formatIndianNumber(latest.atm) : "—"} />
        <Summary icon={Waves} label="Normalized Score" value={latest ? `${latest.score > 0 ? "+" : ""}${latest.score.toFixed(1)} / 50` : "—"} tone={latest?.sentiment} />
        <Summary icon={BarChart3} label="CE Activity" value={latest?.ceActivity ?? "—"} />
        <Summary icon={BarChart3} label="PE Activity" value={latest?.peActivity ?? "—"} />
      </div>
      <div className="p-3"><AtmZScoreTimeline symbol={state.symbol} expiry={state.expiry} date={state.date} time={state.time} refreshKey={refreshKey} onLatest={handleLatest} /></div>
      <div className="grid gap-px border-y bg-border sm:grid-cols-2"><div className="bg-card p-3"><p className="text-[10px] uppercase text-muted-foreground">Latest Sentiment</p><p className={`mt-1 font-mono text-lg font-bold ${tone(latest?.sentiment ?? "")}`}>{latest?.sentiment ?? "WAITING"}</p></div><div className="bg-card p-3"><p className="text-[10px] uppercase text-muted-foreground">Method</p><p className="mt-1 text-xs text-muted-foreground">COI + premium identify activity. Volume RoC and IV confirm it. Z-scores use only earlier session readings.</p></div></div>
    </section>
  </PageLayout>;
}

function Summary({ icon: Icon, label, value, tone: sentiment }: { icon: React.ElementType; label: string; value: string; tone?: string }) {
  return <Card className="rounded-none border-0"><CardContent className="p-3"><p className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground"><Icon className="h-3 w-3" />{label}</p><p className={`mt-1 truncate font-mono text-sm font-bold ${sentiment ? tone(sentiment) : ""}`}>{value}</p></CardContent></Card>;
}