import { useState, useEffect, useRef } from "react";
import { PCRStrikeData } from "@/services/pcrApi";

interface Props {
  data: PCRStrikeData[];
  atm: number;
  spotPrice: number;
  pcrOI: number;
  pcrCOI: number;
}

function fmt(v: number): string {
  const x = Math.round(v).toString();
  const last3 = x.substring(x.length - 3);
  const rest = x.substring(0, x.length - 3);
  if (rest === "") return last3;
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}

const sign = (v: number) => (v >= 0 ? "+" : "");
const chgColor = (v: number) => (v > 0 ? "text-oc-positive" : v < 0 ? "text-oc-negative" : "text-muted-foreground");

const MobilePCROptionsChain = ({ data, atm, spotPrice, pcrOI, pcrCOI }: Props) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const spotRef = useRef<HTMLTableRowElement>(null);
  const scrolled = useRef(false);

  useEffect(() => { scrolled.current = false; }, [spotPrice]);
  useEffect(() => {
    if (!scrolled.current && data.length > 0 && spotRef.current) {
      setTimeout(() => {
        spotRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        scrolled.current = true;
      }, 150);
    }
  }, [data.length]);

  if (!data || data.length === 0) return null;

  const totalCEOI = data.reduce((s, r) => s + r["CE OI"], 0);
  const totalPEOI = data.reduce((s, r) => s + r["PE OI"], 0);

  // Find spot index — first row where strike >= spot
  let spotIdx = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i].Strike >= spotPrice) { spotIdx = i; break; }
    spotIdx = i;
  }

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
          {data.map((row, idx) => {
            const isATM = row.Strike === atm;
            const isOpen = expanded === row.Strike;
            const pcr = row["CE OI"] > 0 ? row["PE OI"] / row["CE OI"] : 0;
            const showSpot = idx === spotIdx;

            return (
              <>
                {showSpot && (
                  <tr key={`spot-${row.Strike}`} ref={spotRef}>
                    <td colSpan={3} className="p-0">
                      <div className="flex items-center justify-between bg-muted/60 px-3 py-1.5 text-[9.5px] text-muted-foreground border-y border-red-500">
                        <span>PCR OI {pcrOI.toFixed(2)}</span>
                        <span className="bg-red-600 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded tracking-wide">
                          Spot {spotPrice.toFixed(2)}
                        </span>
                        <span>PCR COI {pcrCOI.toFixed(2)}</span>
                      </div>
                    </td>
                  </tr>
                )}
                <tr
                  key={row.Strike}
                  onClick={() => setExpanded(isOpen ? null : row.Strike)}
                  className={`cursor-pointer transition-colors ${isATM ? "bg-primary/10" : ""} ${isOpen ? "bg-muted/40" : ""}`}
                >
                  <td className={`px-3 py-2 border-b border-border/40 ${isATM ? "border-l border-t border-b border-primary" : ""}`}>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-bold text-[12.5px] text-red-300">{row["CE LTP"].toFixed(2)}</span>
                      <span className={`text-[10px] font-bold ${chgColor(row["CE COI"])}`}>{sign(row["CE COI"])}{fmt(row["CE COI"])}</span>
                    </div>
                    <div className="text-[9.5px] text-muted-foreground mt-0.5">OI {fmt(row["CE OI"])}</div>
                  </td>
                  <td className={`px-1 py-2 text-center border-b border-border/40 ${isATM ? "border-x border-t border-b border-primary bg-primary/5" : ""}`}>
                    <div className="font-bold text-[12.5px] text-foreground">{row.Strike.toLocaleString("en-IN")}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">PCR {pcr.toFixed(2)}</div>
                  </td>
                  <td className={`px-3 py-2 text-right border-b border-border/40 ${isATM ? "border-r border-t border-b border-primary" : ""}`}>
                    <div className="flex items-baseline gap-1.5 justify-end">
                      <span className={`text-[10px] font-bold ${chgColor(row["PE COI"])}`}>{sign(row["PE COI"])}{fmt(row["PE COI"])}</span>
                      <span className="font-bold text-[12.5px] text-emerald-300">{row["PE LTP"].toFixed(2)}</span>
                    </div>
                    <div className="text-[9.5px] text-muted-foreground mt-0.5 text-right">OI {fmt(row["PE OI"])}</div>
                  </td>
                </tr>
                {isOpen && (
                  <tr key={`exp-${row.Strike}`}>
                    <td colSpan={3} className="p-0">
                      <div className="grid grid-cols-2 gap-2 p-2 bg-muted/30 border-b border-border/40 text-[10px]">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-red-400">Call</div>
                          <div className="flex justify-between"><span className="text-muted-foreground">OI</span><span>{fmt(row["CE OI"])}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">COI</span><span className={chgColor(row["CE COI"])}>{sign(row["CE COI"])}{fmt(row["CE COI"])}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">LTP</span><span>{row["CE LTP"].toFixed(2)}</span></div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-semibold text-emerald-400 text-right">Put</div>
                          <div className="flex justify-between"><span className="text-muted-foreground">OI</span><span>{fmt(row["PE OI"])}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">COI</span><span className={chgColor(row["PE COI"])}>{sign(row["PE COI"])}{fmt(row["PE COI"])}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">LTP</span><span>{row["PE LTP"].toFixed(2)}</span></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
          <tr className="bg-muted/40 font-bold text-[10.5px]">
            <td className="px-3 py-1.5 text-red-400">Total OI {fmt(totalCEOI)}</td>
            <td className="px-1 py-1.5 text-center text-indigo-300">Total</td>
            <td className="px-3 py-1.5 text-right text-emerald-400">Total OI {fmt(totalPEOI)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default MobilePCROptionsChain;
