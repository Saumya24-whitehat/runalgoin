import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatCompactIndian, formatIndianNumber } from "@/lib/formatNumber";

interface OptionData {
  strike_price: number;
  pcr: number;
  call_options: {
    market_data: { ltp: number; close_price: number; volume: number; oi: number; prev_oi: number; bid_price: number; ask_price: number };
    option_greeks: { iv: number; delta: number; theta: number; gamma: number; vega: number };
  };
  put_options: {
    market_data: { ltp: number; close_price: number; volume: number; oi: number; prev_oi: number; bid_price: number; ask_price: number };
    option_greeks: { iv: number; delta: number; theta: number; gamma: number; vega: number };
  };
}

interface Props {
  rows: OptionData[];
  spotPrice: number;
  maxCallOI: number;
  maxPutOI: number;
}

const pctColor = (v: number) => (v > 0 ? "text-oc-positive" : v < 0 ? "text-oc-negative" : "text-muted-foreground");

const MobileOptionChain = ({ rows, spotPrice, maxCallOI, maxPutOI }: Props) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);

  // Find ATM index
  let atmIdx = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].strike_price >= spotPrice) { atmIdx = i; break; }
    atmIdx = i;
  }

  useEffect(() => {
    if (!scrolledRef.current && rows.length > 0 && spotRef.current) {
      setTimeout(() => {
        spotRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        scrolledRef.current = true;
      }, 150);
    }
  }, [rows.length]);

  useEffect(() => { scrolledRef.current = false; }, [spotPrice]);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1" style={{ WebkitOverflowScrolling: "touch" }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-20 grid grid-cols-[1fr_auto_1fr] gap-1 text-[10px] font-semibold px-1 py-1.5 bg-background border-b border-border">
        <div className="text-center text-red-500">CALL</div>
        <div className="text-center text-foreground px-2">STRIKE</div>
        <div className="text-center text-emerald-500">PUT</div>
      </div>

      {rows.map((row, idx) => {
        const callMd = row.call_options.market_data;
        const putMd = row.put_options.market_data;
        const callGr = row.call_options.option_greeks;
        const putGr = row.put_options.option_greeks;
        const callCOI = callMd.oi - callMd.prev_oi;
        const putCOI = putMd.oi - putMd.prev_oi;
        const callClose = callMd.close_price || callMd.ltp;
        const putClose = putMd.close_price || putMd.ltp;
        const callChgPct = callClose ? ((callMd.ltp - callClose) / callClose) * 100 : 0;
        const putChgPct = putClose ? ((putMd.ltp - putClose) / putClose) * 100 : 0;
        const isCallITM = row.strike_price < spotPrice;
        const isPutITM = row.strike_price > spotPrice;
        const isATM = idx === atmIdx;
        const isMaxCall = callMd.oi === maxCallOI;
        const isMaxPut = putMd.oi === maxPutOI;
        const isOpen = expanded === row.strike_price;
        const showSpot = idx === atmIdx;

        return (
          <div key={row.strike_price}>
            {showSpot && (
              <div ref={spotRef} className="my-2 border-y-2 border-red-500 bg-card/80 px-2 py-1.5 flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground">Max CE {formatCompactIndian(maxCallOI)}</span>
                <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs font-semibold">
                  SPOT {spotPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] text-muted-foreground">Max PE {formatCompactIndian(maxPutOI)}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : row.strike_price)}
              className={`w-full grid grid-cols-[1fr_auto_1fr] gap-1 rounded-md border text-[11px] transition-colors
                ${isATM ? "border-primary/60 bg-primary/5" : "border-border/40"}
                ${isOpen ? "bg-muted/40" : ""}
              `}
              aria-expanded={isOpen}
            >
              {/* CALL side */}
              <div className={`px-2 py-2 text-left ${isCallITM ? "bg-red-950/20" : ""} ${isMaxCall ? "ring-1 ring-cyan-500/40" : ""} rounded-l-md`}>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="font-semibold text-foreground">{callMd.ltp.toFixed(2)}</span>
                  <span className={`text-[9px] ${pctColor(callChgPct)}`}>{callChgPct >= 0 ? "+" : ""}{callChgPct.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                  <span>OI {formatCompactIndian(callMd.oi)}</span>
                  <span className={pctColor(callCOI)}>{callCOI >= 0 ? "+" : ""}{formatCompactIndian(callCOI)}</span>
                </div>
              </div>

              {/* STRIKE */}
              <div className={`px-2 py-2 min-w-[70px] flex flex-col items-center justify-center border-x border-border/40 ${isATM ? "bg-indigo-500/10" : "bg-indigo-900/10"}`}>
                <span className="font-bold text-foreground text-xs">{row.strike_price.toLocaleString("en-IN")}</span>
                <span className="text-[9px] text-muted-foreground">PCR {row.pcr?.toFixed(2) ?? "-"}</span>
              </div>

              {/* PUT side */}
              <div className={`px-2 py-2 text-right ${isPutITM ? "bg-emerald-950/20" : ""} ${isMaxPut ? "ring-1 ring-cyan-500/40" : ""} rounded-r-md`}>
                <div className="flex items-baseline justify-between gap-1">
                  <span className={`text-[9px] ${pctColor(putChgPct)}`}>{putChgPct >= 0 ? "+" : ""}{putChgPct.toFixed(1)}%</span>
                  <span className="font-semibold text-foreground">{putMd.ltp.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                  <span className={pctColor(putCOI)}>{putCOI >= 0 ? "+" : ""}{formatCompactIndian(putCOI)}</span>
                  <span>OI {formatCompactIndian(putMd.oi)}</span>
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="grid grid-cols-2 gap-2 mt-1 mb-2 p-2 rounded-md bg-muted/30 border border-border/40 text-[10px]">
                <div className="space-y-0.5">
                  <div className="font-semibold text-red-400">Call Greeks</div>
                  <div className="flex justify-between"><span className="text-muted-foreground">IV</span><span>{callGr.iv.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Delta</span><span>{callGr.delta.toFixed(3)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Gamma</span><span>{callGr.gamma.toFixed(4)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Theta</span><span>{callGr.theta.toFixed(3)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Vega</span><span>{callGr.vega.toFixed(3)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Vol</span><span>{formatCompactIndian(callMd.volume)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">OI</span><span>{formatIndianNumber(callMd.oi)}</span></div>
                </div>
                <div className="space-y-0.5">
                  <div className="font-semibold text-emerald-400 text-right">Put Greeks</div>
                  <div className="flex justify-between"><span className="text-muted-foreground">IV</span><span>{putGr.iv.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Delta</span><span>{putGr.delta.toFixed(3)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Gamma</span><span>{putGr.gamma.toFixed(4)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Theta</span><span>{putGr.theta.toFixed(3)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Vega</span><span>{putGr.vega.toFixed(3)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Vol</span><span>{formatCompactIndian(putMd.volume)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">OI</span><span>{formatIndianNumber(putMd.oi)}</span></div>
                </div>
                <div className="col-span-2 flex justify-center text-muted-foreground pt-1">
                  <ChevronUp className="w-3 h-3" />
                </div>
              </div>
            )}
            {!isOpen && idx === atmIdx && (
              <div className="flex justify-center text-muted-foreground -mt-0.5">
                <ChevronDown className="w-3 h-3 opacity-40" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MobileOptionChain;
