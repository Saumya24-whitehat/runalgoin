import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface StockDetailPeersProps {
  symbol: string;
  sector: string;
}

interface PeerStock {
  symbol: string;
  name: string;
  company_name: string;
  exchange: string;
  logoid: string;
  close: number;
  price_earnings_ttm: number;
  market_cap_basic: number;
  "Perf.Y": number;
  "Perf.1M": number;
  "Perf.3M": number;
  "Perf.6M": number;
  "Perf.YTD": number;
  RSI: number;
  price_52_week_high: number;
  price_52_week_low: number;
  SMA20: number;
}

type SortKey = keyof PeerStock;

export const StockDetailPeers = ({ symbol, sector }: StockDetailPeersProps) => {
  const [peers, setPeers] = useState<PeerStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("company_name");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    const fetchPeers = async () => {
      setLoading(true);
      try {
        const apiUrl = `https://ucvstbihgvuuaficfjsu.supabase.co/functions/v1/market-breadth?index=${encodeURIComponent(sector)}`;

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0",
            Referer: "https://preview--runalgoin.lovable.app/",
          },
        });

        if (!response.ok) throw new Error("Network response not ok");

        const data = await response.json();
        const peersFromApi: PeerStock[] = data[0]?.content || [];

        const filteredPeers = peersFromApi.filter((p) => p.symbol !== symbol);

        setPeers(filteredPeers);
      } catch (error) {
        console.error("Error fetching peers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPeers();
  }, [symbol, sector]);

  const formatMarketCap = (value: number): string => {
    if (value >= 1e12) return `₹${(value / 1e12).toFixed(1)}L Cr`;
    if (value >= 1e7) return `₹${(value / 1e7).toFixed(1)} Cr`;
    return `₹${value}`;
  };

  // Filter peers by name
  const filteredPeers = useMemo(
    () => peers.filter((p) => (p.name || p.company_name || "").toLowerCase().includes(filterText.toLowerCase())),
    [peers, filterText],
  );

  // Sort peers
  const sortedPeers = useMemo(() => {
    return [...filteredPeers].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortAsc ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      return sortAsc ? (Number(aValue) || 0) - (Number(bValue) || 0) : (Number(bValue) || 0) - (Number(aValue) || 0);
    });
  }, [filteredPeers, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 flex flex-col gap-2">
        <CardTitle className="text-lg font-medium text-foreground">Industry Peers Comparison</CardTitle>
        <input
          type="text"
          placeholder="Filter by company"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="w-full px-2 py-1.5 text-sm rounded-md border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary"
        />
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-background/50 cursor-pointer">
              <TableHead onClick={() => handleSort("company_name")} className="text-xs font-medium">
                COMPANY {sortKey === "company_name" ? (sortAsc ? "▲" : "▼") : ""}
              </TableHead>
              <TableHead onClick={() => handleSort("close")} className="text-xs font-medium text-right">
                PRICE {sortKey === "close" ? (sortAsc ? "▲" : "▼") : ""}
              </TableHead>
              <TableHead onClick={() => handleSort("price_earnings_ttm")} className="text-xs font-medium text-right">
                P/E RATIO {sortKey === "price_earnings_ttm" ? (sortAsc ? "▲" : "▼") : ""}
              </TableHead>
              <TableHead onClick={() => handleSort("market_cap_basic")} className="text-xs font-medium text-right">
                MARKET CAP {sortKey === "market_cap_basic" ? (sortAsc ? "▲" : "▼") : ""}
              </TableHead>
              <TableHead onClick={() => handleSort("Perf.1M")} className="text-xs font-medium text-right">
                1M RETURN {sortKey === "Perf.1M" ? (sortAsc ? "▲" : "▼") : ""}
              </TableHead>
              <TableHead onClick={() => handleSort("Perf.3M")} className="text-xs font-medium text-right">
                3M RETURN {sortKey === "Perf.3M" ? (sortAsc ? "▲" : "▼") : ""}
              </TableHead>
              <TableHead onClick={() => handleSort("Perf.6M")} className="text-xs font-medium text-right">
                6M RETURN {sortKey === "Perf.6M" ? (sortAsc ? "▲" : "▼") : ""}
              </TableHead>
              <TableHead onClick={() => handleSort("Perf.YTD")} className="text-xs font-medium text-right">
                YTD RETURN {sortKey === "Perf.YTD" ? (sortAsc ? "▲" : "▼") : ""}
              </TableHead>
              <TableHead onClick={() => handleSort("Perf.Y")} className="text-xs font-medium text-right">
                52W RETURN {sortKey === "Perf.Y" ? (sortAsc ? "▲" : "▼") : ""}
              </TableHead>
              <TableHead onClick={() => handleSort("RSI")} className="text-xs font-medium text-right">
                RSI {sortKey === "RSI" ? (sortAsc ? "▲" : "▼") : ""}
              </TableHead>
              <TableHead className="text-xs font-medium text-right">52W HIGH/LOW</TableHead>
              <TableHead onClick={() => handleSort("SMA20")} className="text-xs font-medium text-right">
                SMA20 {sortKey === "SMA20" ? (sortAsc ? "▲" : "▼") : ""}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPeers.map((peer, idx) => (
              <TableRow
                key={idx}
                className="border-border hover:bg-muted/30 cursor-pointer transition-colors duration-150"
              >
                <TableCell className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <img
                    src={`https://runalgo.xyz/top/chart/data/svg/${(peer.exchange || "nse").toLowerCase()}_${(peer.name || peer.symbol || "").toLowerCase()}.svg`}
                    alt={peer.company_name}
                    className="w-5 h-5 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  {peer.name || peer.company_name}
                </TableCell>
                <TableCell className="text-right text-sm text-foreground">₹{peer.close?.toFixed(2) || "-"}</TableCell>
                <TableCell className="text-right text-sm text-foreground">
                  {peer.price_earnings_ttm?.toFixed(2) || "-"}
                </TableCell>
                <TableCell className="text-right text-sm text-foreground">
                  {formatMarketCap(peer.market_cap_basic)}
                </TableCell>
                <TableCell
                  className={`text-right text-sm font-medium ${(peer["Perf.1M"] || 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}
                >
                  {(peer["Perf.1M"] || 0) >= 0 ? "+" : ""}
                  {peer["Perf.1M"]?.toFixed(1) || "0.0"}%
                </TableCell>
                <TableCell
                  className={`text-right text-sm font-medium ${(peer["Perf.3M"] || 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}
                >
                  {(peer["Perf.3M"] || 0) >= 0 ? "+" : ""}
                  {peer["Perf.3M"]?.toFixed(1) || "0.0"}%
                </TableCell>
                <TableCell
                  className={`text-right text-sm font-medium ${(peer["Perf.6M"] || 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}
                >
                  {(peer["Perf.6M"] || 0) >= 0 ? "+" : ""}
                  {peer["Perf.6M"]?.toFixed(1) || "0.0"}%
                </TableCell>
                <TableCell
                  className={`text-right text-sm font-medium ${(peer["Perf.YTD"] || 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}
                >
                  {(peer["Perf.YTD"] || 0) >= 0 ? "+" : ""}
                  {peer["Perf.YTD"]?.toFixed(1) || "0.0"}%
                </TableCell>
                <TableCell
                  className={`text-right text-sm font-medium ${(peer["Perf.Y"] || 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}
                >
                  {(peer["Perf.Y"] || 0) >= 0 ? "+" : ""}
                  {peer["Perf.Y"]?.toFixed(1) || "0.0"}%
                </TableCell>
                <TableCell
                  className={`text-right text-sm font-medium ${(peer.RSI || 0) >= 70 ? "text-red-500" : (peer.RSI || 0) <= 30 ? "text-emerald-500" : "text-foreground"}`}
                >
                  {peer.RSI?.toFixed(1) || "-"}
                </TableCell>
                <TableCell className="text-right text-sm text-foreground">
                  {peer.price_52_week_high?.toFixed(2) || "-"} / {peer.price_52_week_low?.toFixed(2) || "-"}
                </TableCell>
                <TableCell className="text-right text-sm text-foreground">{peer.SMA20?.toFixed(2) || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
