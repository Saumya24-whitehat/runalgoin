import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { StrikeData } from "@/types/optionChain";

interface HeatMapIVChartProps {
  data: StrikeData[];
  atm: number;
}

export function HeatMapIVChart({ data, atm }: HeatMapIVChartProps) {
  const chartData = data.map((item) => ({
    strike: item.Strike,
    "CE IV": item.CE_IV,
    "PE IV": item.PE_IV,
    isATM: item.Strike === atm,
  }));

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="strike"
            angle={-45}
            textAnchor="end"
            height={60}
            className="text-xs fill-muted-foreground"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            label={{
              value: "Implied Volatility",
              angle: -90,
              position: "insideLeft",
              fill: "hsl(var(--muted-foreground))",
              style: { textAnchor: "middle" },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              color: "hsl(var(--popover-foreground))",
            }}
            formatter={(value: number) => value.toFixed(2)}
          />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            formatter={(value) => (
              <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>
            )}
          />
          <ReferenceLine
            x={atm}
            stroke="hsl(var(--atm-highlight))"
            strokeWidth={2}
            label={{
              value: "ATM",
              position: "top",
              fill: "hsl(var(--atm-highlight))",
            }}
          />
          <Bar
            dataKey="CE IV"
            fill="hsl(var(--call-color))"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="PE IV"
            fill="hsl(var(--put-color))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
