import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Position, ExpiryData, formatIndianNumber } from "@/services/optionBuilderApi";

interface LiveOptionData {
  ltp: number;
  prevLtp?: number;
  cp?: number;
  iv?: number;
  oi?: number;
  volume?: number;
}

interface Props {
  symbol: string;
  expiry: string;
  currentPrice: number;
  lotSize: number;
  expiryData: ExpiryData | null;
  isLoading: boolean;
  onAddPosition: (position: Omit<Position, "id" | "enabled">) => void;
  liveData?: Record<string, LiveOptionData>;
}

interface Row {
  strike: number;
  ceLTP: number; ceChg: number; ceIV: number; ceOI: number; ceCOI: number; ceVol: number;
  ceDelta: number; ceGamma: number; ceTheta: number; ceVega: number; ceToken: string;
  peLTP: number; peChg: number; peIV: number; peOI: number; peCOI: number; peVol: number;
  peDelta: number; peGamma: number; peTheta: number; peVega: number; peToken: string;
}

const fmtCompact = (n: number) => {
  const a = Math.abs(n);
  const s = n < 0 ? "-" : "";
  if (a >= 10000000) return `${s}${(a / 10000000).toFixed(1)}Cr`;
  if (a >= 100000) return `${s}${(a / 100000).toFixed(1)}L`;
  if (a >= 1000) return `${s}${(a / 1000).toFixed(1)}K`;
  return `${s}${Math.round(a)}`;
};
const pctColor = (v: number) => (v > 0 ? "text-oc-positive" : v < 0 ? "text-oc-negative" : "text-muted-foreground");

const MobileOptionBuilderChain = ({
  symbol, expiry, currentPrice, lotSize, expiryData, isLoading, onAddPosition, liveData = {},
}: Props) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const spotRef = useRef<HTMLTableRowElement>(null);
  const scrolled = useRef(false);

  const strikeDiff = symbol.includes("Bank") ? 100 : 50;
  const atmStrike = Math.round(currentPrice / strikeDiff) * strikeDiff;

  const rows: Row[] = useMemo(() => {
    if (!expiryData?.data) return [];
    return expiryData.data.map((item, idx) => {
      const c = item.call_options; const p = item.put_options;
      const cToken = expiryData.ceToken?.[idx] || c?.instrument_key || "";
      const pToken = expiryData.peToken?.[idx] || p?.instrument_key || "";
      const cLive = liveData[cToken] || liveData[`NSE_FO|${cToken}`];
      const pLive = liveData[pToken] || liveData[`NSE_FO|${pToken}`];
      const ceLTP = cLive?.ltp ?? c?.market_data?.ltp ?? 0;
      const ceClose = cLive?.cp ?? (c?.market_data as { close?: number })?.close ?? c?.market_data?.ltp ?? 0;
      const peLTP = pLive?.ltp ?? p?.market_data?.ltp ?? 0;
      const peClose = pLive?.cp ?? (p?.market_data as { close?: number })?.close ?? p?.market_data?.ltp ?? 0;
      const ceOI = cLive?.oi ?? c?.market_data?.oi ?? 0;
      const peOI = pLive?.oi ?? p?.market_data?.oi ?? 0;
      const cPrevOI = c?.market_data?.prev_oi || ceOI;
      const pPrevOI = p?.market_data?.prev_oi || peOI;
      return {
        strike: item.strike_price,
        ceLTP, ceChg: ceClose ? ((ceLTP - ceClose) / ceClose) * 100 : 0,
        ceIV: cLive?.iv ?? c?.option_greeks?.iv ?? 0, ceOI, ceCOI: ceOI - cPrevOI,
        ceVol: cLive?.volume ?? c?.market_data?.volume ?? 0,
        ceDelta: c?.option_greeks?.delta || 0, ceGamma: c?.option_greeks?.gamma || 0,
        ceTheta: c?.option_greeks?.theta || 0, ceVega: c?.option_greeks?.vega || 0, ceToken: cToken,
        peLTP, peChg: peClose ? ((peLTP - peClose) / peClose) * 100 : 0,
        peIV: pLive?.iv ?? p?.option_greeks?.iv ?? 0, peOI, peCOI: peOI - pPrevOI,
        peVol: pLive?.volume ?? p?.market_data?.volume ?? 0,
        peDelta: p?.option_greeks?.delta || 0, peGamma: p?.option_greeks?.gamma || 0,
        peTheta: p?.option_greeks?.theta || 0, peVega: p?.option_greeks?.vega || 0, peToken: pToken,
      };
    });
  }, [expiryData, liveData]);

  let atmIdx = 0;
  for (let i = 0; i < rows.length; i++) {
    if (Math.abs(rows[i].strike - atmStrike) < strikeDiff / 2) { atmIdx = i; break; }
  }

  useEffect(() => { scrolled.current = false; }, [symbol, expiry]);
  useEffect(() => {
    if (!scrolled.current && rows.length > 0 && spotRef.current) {
      setTimeout(() => {
        spotRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        scrolled.current = true;
      }, 150);
    }
  }, [rows.length]);

  const handleAdd = (r: Row, opt: "CE" | "PE", action: "Buy" | "Sell") => {
    const today = new Date().toISOString().split("T")[0];
    onAddPosition({
      action, lots: 1, date: today, expiry, strike: r.strike, optType: opt,
      entryPrice: opt === "CE" ? r.ceLTP : r.peLTP,
      currentPrice: opt === "CE" ? r.ceLTP : r.peLTP,
      IV: opt === "CE" ? r.ceIV : r.peIV,
      lotSize,
      delta: opt === "CE" ? r.ceDelta : r.peDelta,
      gamma: opt === "CE" ? r.ceGamma : r.peGamma,
      theta: opt === "CE" ? r.ceTheta : r.peTheta,
      vega: opt === "CE" ? r.ceVega : r.peVega,
      instrumentToken: opt === "CE" ? r.ceToken : r.peToken,
    });
  };

  if (rows.length === 0 && !isLoading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">No option chain data for {expiry}</div>;
  }

  return (
    <div className="max-h-[70vh] overflow-y-auto rounded-md border border-border/60 bg-card" style={{ WebkitOverflowScrolling: "touch" }}>
      <table className="w-full border-collapse text-[11.5px]">
        <thead>
          <tr>
            <th className="sticky top-0 z-10 bg-background/95 backdrop-blur px-3 py-1.5 text-left text-[9.5px] font-bold uppercase text-red-400 border-b border-border">Call</th>
            <th className="sticky top-0 z-10 bg-background/95 backdrop-blur px-1 py-1.5 text-center text-[9.5px] font-bold uppercase text-indigo-300 border-b border-border">Strike</th>
            <th className="sticky top-0 z-10 bg-background/95 backdrop-blur px-3 py-1.5 text-right text-[9.5px] font-bold uppercase text-emerald-400 border-b border-border">Put</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => {
            const isATM = idx === atmIdx;
            const isOpen = expanded === r.strike;
            const showSpot = idx === atmIdx;
            return (
              <>
                {showSpot && (
                  <tr key={`spot-${r.strike}`} ref={spotRef}>
                    <td colSpan={3} className="p-0">
                      <div className="flex items-center justify-between bg-muted/60 px-3 py-1.5 text-[9.5px] text-muted-foreground border-y border-red-500">
                        <span>ATM {atmStrike}</span>
                        <span className="bg-red-600 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded tracking-wide">Spot {currentPrice.toFixed(2)}</span>
                        <span>Lot {lotSize}</span>
                      </div>
                    </td>
                  </tr>
                )}
                <tr
                  key={r.strike}
                  onClick={() => setExpanded(isOpen ? null : r.strike)}
                  className={`cursor-pointer transition-colors ${isATM ? "bg-primary/10" : ""} ${isOpen ? "bg-muted/40" : ""}`}
                >
                  <td className={`px-3 py-2 border-b border-border/40 ${isATM ? "border-l border-t border-b border-primary" : ""}`}>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-bold text-[12.5px] text-red-300">{r.ceLTP.toFixed(2)}</span>
                      <span className={`text-[10px] font-bold ${pctColor(r.ceChg)}`}>{r.ceChg >= 0 ? "+" : ""}{r.ceChg.toFixed(1)}%</span>
                    </div>
                    <div className="text-[9.5px] text-muted-foreground mt-0.5">OI {fmtCompact(r.ceOI)}</div>
                  </td>
                  <td className={`px-1 py-2 text-center border-b border-border/40 ${isATM ? "border-x border-t border-b border-primary bg-primary/5" : ""}`}>
                    <div className="font-bold text-[12.5px] text-foreground">{r.strike}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">IV {((r.ceIV + r.peIV) / 2).toFixed(1)}</div>
                  </td>
                  <td className={`px-3 py-2 text-right border-b border-border/40 ${isATM ? "border-r border-t border-b border-primary" : ""}`}>
                    <div className="flex items-baseline gap-1.5 justify-end">
                      <span className={`text-[10px] font-bold ${pctColor(r.peChg)}`}>{r.peChg >= 0 ? "+" : ""}{r.peChg.toFixed(1)}%</span>
                      <span className="font-bold text-[12.5px] text-emerald-300">{r.peLTP.toFixed(2)}</span>
                    </div>
                    <div className="text-[9.5px] text-muted-foreground mt-0.5 text-right">OI {fmtCompact(r.peOI)}</div>
                  </td>
                </tr>
                {isOpen && (
                  <tr key={`exp-${r.strike}`}>
                    <td colSpan={3} className="p-0">
                      <div className="p-2 bg-muted/30 border-b border-border/40 text-[10px] space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <Button size="sm" className="h-7 px-3 text-[11px] bg-success hover:bg-success/80 text-success-foreground" onClick={(e) => { e.stopPropagation(); handleAdd(r, "CE", "Buy"); }}>B CE</Button>
                          <Button size="sm" variant="destructive" className="h-7 px-3 text-[11px]" onClick={(e) => { e.stopPropagation(); handleAdd(r, "CE", "Sell"); }}>S CE</Button>
                          <span className="text-muted-foreground text-[10px]">•</span>
                          <Button size="sm" className="h-7 px-3 text-[11px] bg-success hover:bg-success/80 text-success-foreground" onClick={(e) => { e.stopPropagation(); handleAdd(r, "PE", "Buy"); }}>B PE</Button>
                          <Button size="sm" variant="destructive" className="h-7 px-3 text-[11px]" onClick={(e) => { e.stopPropagation(); handleAdd(r, "PE", "Sell"); }}>S PE</Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-red-400">Call Greeks</div>
                            <div className="flex justify-between"><span className="text-muted-foreground">IV</span><span>{r.ceIV.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Δ</span><span>{r.ceDelta.toFixed(3)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Γ</span><span>{r.ceGamma.toFixed(4)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Θ</span><span>{r.ceTheta.toFixed(3)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Vega</span><span>{r.ceVega.toFixed(3)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Vol</span><span>{fmtCompact(r.ceVol)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">OI</span><span>{formatIndianNumber(r.ceOI)}</span></div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="font-semibold text-emerald-400 text-right">Put Greeks</div>
                            <div className="flex justify-between"><span className="text-muted-foreground">IV</span><span>{r.peIV.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Δ</span><span>{r.peDelta.toFixed(3)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Γ</span><span>{r.peGamma.toFixed(4)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Θ</span><span>{r.peTheta.toFixed(3)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Vega</span><span>{r.peVega.toFixed(3)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Vol</span><span>{fmtCompact(r.peVol)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">OI</span><span>{formatIndianNumber(r.peOI)}</span></div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default MobileOptionBuilderChain;
