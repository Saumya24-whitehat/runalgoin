import { StrikeData } from "@/types/optionChain";
import { cn } from "@/lib/utils";

interface HeatMapOptionTableProps {
  data: StrikeData[];
  atm: number;
  type: "oi" | "iv" | "ltp";
  spotPrice: number;
}

export function HeatMapOptionTable({ data, atm, type, spotPrice }: HeatMapOptionTableProps) {
  const formatNumber = (num: number, decimals: number = 2) => {
    if (Math.abs(num) >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (Math.abs(num) >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toFixed(decimals);
  };

  const formatPercent = (num: number) => {
    return num.toFixed(2);
  };

  const getColorClass = (value: number) => {
    if (value > 0) return "text-success";
    if (value < 0) return "text-destructive";
    return "";
  };

  const isCallITM = (strike: number) => strike < spotPrice;
  const isPutITM = (strike: number) => strike > spotPrice;

  const renderOITable = () => (
    <table className="options-table w-full text-xs">
      <thead>
        <tr>
          <th colSpan={3} className="border-b border-r border-border text-call-color py-2">CALL</th>
          <th rowSpan={2} className="border-b border-r border-border bg-secondary py-2">Strike</th>
          <th colSpan={3} className="border-b border-border text-put-color py-2">PUT</th>
        </tr>
        <tr>
          <th className="border-b border-border py-1">COI%</th>
          <th className="border-b border-border py-1">COI</th>
          <th className="border-b border-r border-border py-1">OI</th>
          <th className="border-b border-border py-1">OI</th>
          <th className="border-b border-border py-1">COI</th>
          <th className="border-b border-border py-1">COI%</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => {
          const isATM = row.Strike === atm;
          const callITM = isCallITM(row.Strike);
          const putITM = isPutITM(row.Strike);
          return (
            <tr key={row.Strike} className={cn(isATM && "bg-atm-highlight/20")}>
              <td className={cn("py-1 px-2 text-center", callITM && "bg-red-950/30", getColorClass(row["CE_COI%"]))}>{formatPercent(row["CE_COI%"])}</td>
              <td className={cn("py-1 px-2 text-center", callITM && "bg-red-950/30")}>{formatNumber(row.CE_COI, 0)}</td>
              <td className={cn("border-r border-border py-1 px-2 text-center", callITM && "bg-red-950/30")}>{formatNumber(row.CE_OI, 0)}</td>
              <td className={cn("border-r border-border font-medium py-1 px-2 text-center", isATM && "text-atm-highlight font-bold")}>
                {row.Strike}
              </td>
              <td className={cn("py-1 px-2 text-center", putITM && "bg-emerald-950/30")}>{formatNumber(row.PE_OI, 0)}</td>
              <td className={cn("py-1 px-2 text-center", putITM && "bg-emerald-950/30")}>{formatNumber(row.PE_COI, 0)}</td>
              <td className={cn("py-1 px-2 text-center", putITM && "bg-emerald-950/30", getColorClass(row["PE_COI%"]))}>{formatPercent(row["PE_COI%"])}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const renderIVTable = () => (
    <table className="options-table w-full text-xs">
      <thead>
        <tr>
          <th className="border-b border-border text-call-color py-2">Call IV</th>
          <th className="border-b border-border bg-secondary py-2">Strike</th>
          <th className="border-b border-border text-put-color py-2">Put IV</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => {
          const isATM = row.Strike === atm;
          const callITM = isCallITM(row.Strike);
          const putITM = isPutITM(row.Strike);
          return (
            <tr key={row.Strike} className={cn(isATM && "bg-atm-highlight/20")}>
              <td className={cn("py-1 px-2 text-center", callITM && "bg-red-950/30")}>{row.CE_IV.toFixed(2)}</td>
              <td className={cn("font-medium py-1 px-2 text-center", isATM && "text-atm-highlight font-bold")}>{row.Strike}</td>
              <td className={cn("py-1 px-2 text-center", putITM && "bg-emerald-950/30")}>{row.PE_IV.toFixed(2)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const renderLTPTable = () => (
    <table className="options-table w-full text-xs">
      <thead>
        <tr>
          <th colSpan={3} className="border-b border-r border-border text-call-color py-2">CALL</th>
          <th rowSpan={2} className="border-b border-r border-border bg-secondary py-2">Strike</th>
          <th colSpan={3} className="border-b border-border text-put-color py-2">PUT</th>
        </tr>
        <tr>
          <th className="border-b border-border py-1">LTP Chg %</th>
          <th className="border-b border-border py-1">LTP Chg</th>
          <th className="border-b border-r border-border py-1">LTP</th>
          <th className="border-b border-border py-1">LTP</th>
          <th className="border-b border-border py-1">LTP Chg</th>
          <th className="border-b border-border py-1">LTP Chg %</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => {
          const isATM = row.Strike === atm;
          const callITM = isCallITM(row.Strike);
          const putITM = isPutITM(row.Strike);
          return (
            <tr key={row.Strike} className={cn(isATM && "bg-atm-highlight/20")}>
              <td className={cn("py-1 px-2 text-center", callITM && "bg-red-950/30", getColorClass(row["CE_LTP_CHG%"]))}>{formatPercent(row["CE_LTP_CHG%"])}</td>
              <td className={cn("py-1 px-2 text-center", callITM && "bg-red-950/30", getColorClass(row.CE_LTP_CHG))}>{formatNumber(row.CE_LTP_CHG)}</td>
              <td className={cn("border-r border-border py-1 px-2 text-center", callITM && "bg-red-950/30")}>{formatNumber(row.CE_LTP)}</td>
              <td className={cn("border-r border-border font-medium py-1 px-2 text-center", isATM && "text-atm-highlight font-bold")}>
                {row.Strike}
              </td>
              <td className={cn("py-1 px-2 text-center", putITM && "bg-emerald-950/30")}>{formatNumber(row.PE_LTP)}</td>
              <td className={cn("py-1 px-2 text-center", putITM && "bg-emerald-950/30", getColorClass(row.PE_LTP_CHG))}>{formatNumber(row.PE_LTP_CHG)}</td>
              <td className={cn("py-1 px-2 text-center", putITM && "bg-emerald-950/30", getColorClass(row["PE_LTP_CHG%"]))}>{formatPercent(row["PE_LTP_CHG%"])}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      {type === "oi" && renderOITable()}
      {type === "iv" && renderIVTable()}
      {type === "ltp" && renderLTPTable()}
    </div>
  );
}
