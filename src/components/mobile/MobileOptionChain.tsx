import { useState, useEffect, useRef } from "react";
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

type ViewMode = "ltp_oi" | "oi_iv" | "ltp_greeks" | "oi_greeks";

interface Props {
  rows: OptionData[];
  spotPrice: number;
  maxCallOI: number;
  maxPutOI: number;
  viewMode?: ViewMode;
}

const pctColor = (v: number) => (v > 0 ? "text-oc-positive" : v < 0 ? "text-oc-negative" : "text-muted-foreground");

const MobileOptionChain = ({ rows, spotPrice, maxCallOI, maxPutOI, viewMode = "ltp_oi" }: Props) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const spotRef = useRef<HTMLTableRowElement>(null);
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

  // Renders the primary + secondary line for a call/put cell based on viewMode
  const renderSide = (
    side: "call" | "put",
    md: OptionData["call_options"]["market_data"],
    gr: OptionData["call_options"]["option_greeks"],
  ) => {
    const close = md.close_price || md.ltp;
    const chgPct = close ? ((md.ltp - close) / close) * 100 : 0;
    const coi = md.oi - (md.prev_oi || 0);
    const ltpColor = side === "call" ? "text-red-300" : "text-emerald-300";
    const align = side === "call" ? "" : "justify-end";
    const alignText = side === "call" ? "" : "text-right";

    const primary = (main: string, mainCls: string, sub?: { text: string; cls?: string }) => (
      <>
        <div className={`flex items-baseline gap-1.5 ${align}`}>
          {side === "put" && sub && <span className={`text-[10px] font-bold ${sub.cls ?? "text-muted-foreground"}`}>{sub.text}</span>}
          <span className={`font-bold text-[12.5px] ${mainCls}`}>{main}</span>
          {side === "call" && sub && <span className={`text-[10px] font-bold ${sub.cls ?? "text-muted-foreground"}`}>{sub.text}</span>}
        </div>
      </>
    );

    const secondary = (label: string) => (
      <div className={`text-[9.5px] text-muted-foreground mt-0.5 ${alignText}`}>{label}</div>
    );

    switch (viewMode) {
      case "oi_iv":
        return (
          <>
            {primary(formatCompactIndian(md.oi), "text-foreground", { text: `IV ${gr.iv.toFixed(1)}` })}
            {secondary(`ΔOI ${coi >= 0 ? "+" : ""}${formatCompactIndian(coi)}`)}
          </>
        );
      case "ltp_greeks":
        return (
          <>
            {primary(md.ltp.toFixed(2), ltpColor, { text: `${chgPct >= 0 ? "+" : ""}${chgPct.toFixed(1)}%`, cls: pctColor(chgPct) })}
            {secondary(`Δ ${gr.delta.toFixed(2)}  IV ${gr.iv.toFixed(1)}`)}
          </>
        );
      case "oi_greeks":
        return (
          <>
            {primary(formatCompactIndian(md.oi), "text-foreground", { text: `Δ ${gr.delta.toFixed(2)}` })}
            {secondary(`IV ${gr.iv.toFixed(1)}  θ ${gr.theta.toFixed(2)}`)}
          </>
        );
      case "ltp_oi":
      default:
        return (
          <>
            {primary(md.ltp.toFixed(2), ltpColor, { text: `${chgPct >= 0 ? "+" : ""}${chgPct.toFixed(1)}%`, cls: pctColor(chgPct) })}
            {secondary(`OI ${formatCompactIndian(md.oi)}`)}
          </>
        );
    }
  };

  return (
    <div
      className="max-h-[75vh] overflow-y-auto rounded-md border border-border/60 bg-card"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <table className="w-full border-collapse text-[11.5px]">
        <thead>
          <tr>
            <th className="sticky top-0 z-10 bg-background/95 backdrop-blur px-3 py-1.5 text-left text-[9.5px] font-bold uppercase tracking-wider text-red-400 border-b border-border">Call</th>
            <th className="sticky top-0 z-10 bg-background/95 backdrop-blur px-1 py-1.5 text-center text-[9.5px] font-bold uppercase tracking-wider text-indigo-300 border-b border-border">Strike</th>
            <th className="sticky top-0 z-10 bg-background/95 backdrop-blur px-3 py-1.5 text-right text-[9.5px] font-bold uppercase tracking-wider text-emerald-400 border-b border-border">Put</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const callMd = row.call_options.market_data;
            const putMd = row.put_options.market_data;
            const callGr = row.call_options.option_greeks;
            const putGr = row.put_options.option_greeks;
            const isATM = idx === atmIdx;
            const isOpen = expanded === row.strike_price;
            const showSpot = idx === atmIdx;

            return (
              <>
                {showSpot && (
                  <tr key={`spot-${row.strike_price}`} ref={spotRef} className="spotrow">
                    <td colSpan={3} className="p-0">
                      <div className="flex items-center justify-between bg-muted/60 px-3 py-1.5 text-[9.5px] text-muted-foreground border-y border-red-500">
                        <span>Max CE {formatCompactIndian(maxCallOI)}</span>
                        <span className="bg-red-600 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded tracking-wide">
                          Spot {spotPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span>Max PE {formatCompactIndian(maxPutOI)}</span>
                      </div>
                    </td>
                  </tr>
                )}
                <tr
                  key={row.strike_price}
                  onClick={() => setExpanded(isOpen ? null : row.strike_price)}
                  className={`cursor-pointer transition-colors ${isATM ? "bg-primary/10" : ""} ${isOpen ? "bg-muted/40" : ""}`}
                >
                  <td className={`px-3 py-2 border-b border-border/40 ${isATM ? "border-l border-t border-b border-primary" : ""} ${callMd.oi === maxCallOI ? "ring-1 ring-inset ring-cyan-500/30" : ""}`}>
                    {renderSide("call", callMd, callGr)}
                  </td>
                  <td className={`px-1 py-2 text-center border-b border-border/40 ${isATM ? "border-x border-t border-b border-primary bg-primary/5" : ""}`}>
                    <div className="font-bold text-[12.5px] text-foreground">{row.strike_price.toLocaleString("en-IN")}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">PCR {row.pcr?.toFixed(2) ?? "-"}</div>
                  </td>
                  <td className={`px-3 py-2 text-right border-b border-border/40 ${isATM ? "border-r border-t border-b border-primary" : ""} ${putMd.oi === maxPutOI ? "ring-1 ring-inset ring-cyan-500/30" : ""}`}>
                    {renderSide("put", putMd, putGr)}
                  </td>
                </tr>
                {isOpen && (
                  <tr key={`exp-${row.strike_price}`}>
                    <td colSpan={3} className="p-0">
                      <div className="grid grid-cols-2 gap-2 p-2 bg-muted/30 border-b border-border/40 text-[10px]">
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

export default MobileOptionChain;
