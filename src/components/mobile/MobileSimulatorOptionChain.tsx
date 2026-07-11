import { useState, useEffect, RefObject, MutableRefObject } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Position } from "@/services/optionBuilderApi";
import { SimulatorData } from "@/services/optionSimulatorApi";

interface Props {
  simulatorData: SimulatorData;
  symbol: string;
  currentPrice: number;
  lotSize: number;
  selectedDate: Date;
  activeExpiry: string;
  addPosition: (position: Omit<Position, "id" | "enabled">) => void;
  atmRowRef: RefObject<HTMLTableRowElement>;
  hasScrolledRef: MutableRefObject<boolean>;
}

const fmtCompact = (n: number) => {
  const a = Math.abs(n);
  const s = n < 0 ? "-" : "";
  if (a >= 10000000) return `${s}${(a / 10000000).toFixed(1)}Cr`;
  if (a >= 100000) return `${s}${(a / 100000).toFixed(1)}L`;
  if (a >= 1000) return `${s}${(a / 1000).toFixed(1)}K`;
  return `${s}${Math.round(a)}`;
};

const fmtIN = (n: number) => {
  const x = Math.round(n).toString();
  const last3 = x.substring(x.length - 3);
  const rest = x.substring(0, x.length - 3);
  if (rest === "") return last3;
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
};

const MobileSimulatorOptionChain = ({
  simulatorData, symbol, currentPrice, lotSize, selectedDate, activeExpiry, addPosition, atmRowRef, hasScrolledRef,
}: Props) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const strikeDiff = symbol.includes("Bank") ? 100 : 50;
  const atmStrike = Math.round(currentPrice / strikeDiff) * strikeDiff;

  useEffect(() => {
    if (simulatorData.strikes.length > 0 && atmRowRef.current && !hasScrolledRef.current) {
      setTimeout(() => {
        atmRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        hasScrolledRef.current = true;
      }, 150);
    }
  }, [simulatorData.strikes.length, atmRowRef, hasScrolledRef]);

  useEffect(() => { hasScrolledRef.current = false; }, [symbol, activeExpiry, hasScrolledRef]);

  const handleAdd = (s: SimulatorData["strikes"][0], opt: "CE" | "PE", action: "Buy" | "Sell") => {
    addPosition({
      action, lots: 1, date: format(selectedDate, "yyyy-MM-dd"), expiry: activeExpiry,
      strike: s.strike, optType: opt,
      entryPrice: opt === "CE" ? s.cePrice : s.pePrice,
      currentPrice: opt === "CE" ? s.cePrice : s.pePrice,
      IV: opt === "CE" ? s.ceIV : s.peIV,
      lotSize,
    });
  };

  if (!simulatorData.strikes.length) return null;

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
          {simulatorData.strikes.map((s, idx) => {
            const isATM = Math.abs(s.strike - atmStrike) < strikeDiff / 2;
            const isOpen = expanded === s.strike;
            const prev = idx > 0 ? simulatorData.strikes[idx - 1] : null;
            const showSpot = prev ? (prev.strike < currentPrice && s.strike >= currentPrice) : idx === 0 && s.strike >= currentPrice;

            return (
              <>
                {showSpot && (
                  <tr key={`spot-${s.strike}`} ref={atmRowRef}>
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
                  key={s.strike}
                  onClick={() => setExpanded(isOpen ? null : s.strike)}
                  className={`cursor-pointer transition-colors ${isATM ? "bg-primary/10" : ""} ${isOpen ? "bg-muted/40" : ""}`}
                >
                  <td className={`px-3 py-2 border-b border-border/40 ${isATM ? "border-l border-t border-b border-primary" : ""}`}>
                    <div className="font-bold text-[12.5px] text-red-300">{s.cePrice.toFixed(2)}</div>
                    <div className="text-[9.5px] text-muted-foreground mt-0.5">OI {fmtCompact(s.ceOI)}</div>
                  </td>
                  <td className={`px-1 py-2 text-center border-b border-border/40 ${isATM ? "border-x border-t border-b border-primary bg-primary/5" : ""}`}>
                    <div className="font-bold text-[12.5px] text-foreground">{s.strike}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">IV {((s.ceIV + s.peIV) / 2).toFixed(1)}</div>
                  </td>
                  <td className={`px-3 py-2 text-right border-b border-border/40 ${isATM ? "border-r border-t border-b border-primary" : ""}`}>
                    <div className="font-bold text-[12.5px] text-emerald-300">{s.pePrice.toFixed(2)}</div>
                    <div className="text-[9.5px] text-muted-foreground mt-0.5 text-right">OI {fmtCompact(s.peOI)}</div>
                  </td>
                </tr>
                {isOpen && (
                  <tr key={`exp-${s.strike}`}>
                    <td colSpan={3} className="p-0">
                      <div className="p-2 bg-muted/30 border-b border-border/40 text-[10px] space-y-2">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <Button size="sm" className="h-7 px-3 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white" onClick={(e) => { e.stopPropagation(); handleAdd(s, "CE", "Buy"); }}>B CE</Button>
                          <Button size="sm" variant="destructive" className="h-7 px-3 text-[11px]" onClick={(e) => { e.stopPropagation(); handleAdd(s, "CE", "Sell"); }}>S CE</Button>
                          <span className="text-muted-foreground text-[10px]">•</span>
                          <Button size="sm" className="h-7 px-3 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white" onClick={(e) => { e.stopPropagation(); handleAdd(s, "PE", "Buy"); }}>B PE</Button>
                          <Button size="sm" variant="destructive" className="h-7 px-3 text-[11px]" onClick={(e) => { e.stopPropagation(); handleAdd(s, "PE", "Sell"); }}>S PE</Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-red-400">Call</div>
                            <div className="flex justify-between"><span className="text-muted-foreground">IV</span><span>{s.ceIV.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Δ</span><span>{(s.ceDelta ?? 0).toFixed(3)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Γ</span><span>{(s.ceGamma ?? 0).toFixed(4)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Θ</span><span>{(s.ceTheta ?? 0).toFixed(3)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Vega</span><span>{(s.ceVega ?? 0).toFixed(3)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Vol</span><span>{fmtCompact(s.ceVolume)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">OI</span><span>{fmtIN(s.ceOI)}</span></div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="font-semibold text-emerald-400 text-right">Put</div>
                            <div className="flex justify-between"><span className="text-muted-foreground">IV</span><span>{s.peIV.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Δ</span><span>{(s.peDelta ?? 0).toFixed(3)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Γ</span><span>{(s.peGamma ?? 0).toFixed(4)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Θ</span><span>{(s.peTheta ?? 0).toFixed(3)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Vega</span><span>{(s.peVega ?? 0).toFixed(3)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Vol</span><span>{fmtCompact(s.peVolume)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">OI</span><span>{fmtIN(s.peOI)}</span></div>
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

export default MobileSimulatorOptionChain;
