import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchPCRData, PCRTimeData } from "@/services/pcrApi";
import { formatIndianNumber } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";

const INDICES = ["Nifty 50", "Nifty Bank", "Sensex"] as const;
const STRIKE_COUNT = 5;

interface IndexPCR {
  symbol: string;
  expiry: string;
  time: string;
  ceCoi: number;
  peCoi: number;
  pcrCoi: number;
}

const pcrClass = (pcr: number) =>
  pcr > 1 ? "text-emerald-500" : pcr < 1 ? "text-red-500" : "text-muted-foreground";

const minuteOf = (time: string) => {
  const m = /^(\d{1,2}):?(\d{2})/.exec(time || "");
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
};

/** PCR (COI) of the nearest expiry, 5 strikes around ATM, for Nifty / BankNifty / Sensex. */
export const IndexPCRCoiCard = ({
  cutoffMinute,
  refreshKey,
}: {
  cutoffMinute: number | null;
  refreshKey?: number;
}) => {
  const [series, setSeries] = useState<Record<string, { expiry: string; data: PCRTimeData[] }>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const out: Record<string, { expiry: string; data: PCRTimeData[] }> = {};
    await Promise.all(
      INDICES.map(async (symbol) => {
        try {
          const { data: res, error } = await supabase.functions.invoke("option-chain-proxy", {
            body: { endpoint: "expiry", params: { symbol } },
          });
          if (error) throw error;
          const dates: string[] = Array.isArray(res)
            ? res
            : res?.expiry_dates || res?.expiryDates || res?.data || [];
          if (!dates.length) return;
          const expiry = dates[0];
          const pcr = await fetchPCRData(symbol, expiry, STRIKE_COUNT);
          out[symbol] = { expiry, data: pcr.dataWhole || [] };
        } catch (err) {
          console.error(`PCR (COI) fetch failed for ${symbol}:`, err);
        }
      })
    );
    setSeries(out);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const values = useMemo<IndexPCR[]>(() => {
    return INDICES.map((symbol) => {
      const entry = series[symbol];
      if (!entry || !entry.data.length) return null;
      const eligible =
        cutoffMinute === null
          ? entry.data
          : entry.data.filter((d) => {
              const m = minuteOf(d.time);
              return m === null || m <= cutoffMinute;
            });
      const point = eligible[eligible.length - 1];
      if (!point) return null;
      const ceCoi = Number(point.CE_COI) || 0;
      const peCoi = Number(point.PE_COI) || 0;
      const pcrCoi = Number(point.PCR_COI) || (ceCoi !== 0 ? peCoi / ceCoi : 0);
      return { symbol, expiry: entry.expiry, time: point.time, ceCoi, peCoi, pcrCoi };
    }).filter(Boolean) as IndexPCR[];
  }, [series, cutoffMinute]);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide">PCR (COI) — 5 Strikes</span>
          <span className="text-[10px] text-muted-foreground font-mono">nearest expiry</span>
          {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>

        {values.length === 0 ? (
          <div className="py-3 text-center text-[11px] text-muted-foreground">
            {loading ? "Loading…" : "No data"}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {values.map((v) => (
              <div key={v.symbol} className="rounded-md border border-border/40 p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold">{v.symbol}</span>
                  <span className="text-[9px] text-muted-foreground font-mono">
                    {v.expiry} · {v.time}
                  </span>
                </div>
                <div className={cn("text-lg font-mono font-bold leading-none", pcrClass(v.pcrCoi))}>
                  {v.pcrCoi.toFixed(2)}
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-red-500">CE COI {formatIndianNumber(Math.round(v.ceCoi))}</span>
                  <span className="text-emerald-500">PE COI {formatIndianNumber(Math.round(v.peCoi))}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
