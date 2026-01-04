import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StockDetailPeersProps {
  symbol: string;
  sector: string;
}

interface PeerStock {
  symbol: string;
  company_name: string;
  price: number;
  pe_ratio: number;
  market_cap: number;
  return_52w: number;
}

export const StockDetailPeers = ({ symbol, sector }: StockDetailPeersProps) => {
  const [peers, setPeers] = useState<PeerStock[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchPeers = async () => {
      setLoading(true);

      try {
        // Build the API URL
        const apiUrl = `https://ucvstbihgvuuaficfjsu.supabase.co/functions/v1/market-breadth?index=${encodeURIComponent(sector)}`;

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "sec-ch-ua": `"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"`,
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": `"Windows"`,
            Referer: "https://preview--runalgoin.lovable.app/",
          },
        });

        if (!response.ok) {
          throw new Error("Network response not ok");
        }

        const data = await response.json();

        // Assuming API returns peer stocks under data.peers
        const peersFromApi = data[0].content || [];

        console.log(peersFromApi);
        // Remove the same symbol from the list
        const filteredPeers = peersFromApi.filter((stock: any) => stock.name !== symbol);

        console.log(filteredPeers);
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
    if (value >= 1e12) {
      return `₹${(value / 1e12).toFixed(1)}L Cr`;
    } else if (value >= 1e7) {
      return `₹${(value / 1e7).toFixed(1)} Cr`;
    }
    return `₹${value}`;
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
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium text-foreground">Industry Peers Comparison</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs font-medium">COMPANY</TableHead>
              <TableHead className="text-muted-foreground text-xs font-medium text-right">PRICE</TableHead>
              <TableHead className="text-muted-foreground text-xs font-medium text-right">P/E RATIO</TableHead>
              <TableHead className="text-muted-foreground text-xs font-medium text-right">MARKET CAP</TableHead>
              <TableHead className="text-muted-foreground text-xs font-medium text-right">52W RETURN</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {peers.map((peer, idx) => (
              <TableRow
                key={idx}
                className="border-border hover:bg-muted/30 cursor-pointer transition-colors duration-150"
              >
                {/* Stock Name */}
                <TableCell className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <img src={`/logos/${peer.logoid}.png`} alt={peer.name} className="w-5 h-5 rounded-full" />
                  {peer.name}
                </TableCell>

                {/* Close Price */}
                <TableCell className="text-right text-sm text-foreground">₹{peer.close.toFixed(2)}</TableCell>

                {/* P/E Ratio */}
                <TableCell className="text-right text-sm text-foreground">
                  {peer.price_earnings_ttm.toFixed(2)}
                </TableCell>

                {/* Market Cap */}
                <TableCell className="text-right text-sm text-foreground">
                  {formatMarketCap(peer.market_cap_basic)}
                </TableCell>

                {/* Yearly Performance */}
                <TableCell
                  className={`text-right text-sm font-medium ${
                    peer["Perf.Y"] >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {peer["Perf.Y"] >= 0 ? "+" : ""}
                  {peer["Perf.Y"].toFixed(1)}%
                </TableCell>

                {/* 1 Month Performance */}
                <TableCell
                  className={`text-right text-sm font-medium ${
                    peer["Perf.1M"] >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {peer["Perf.1M"] >= 0 ? "+" : ""}
                  {peer["Perf.1M"].toFixed(1)}%
                </TableCell>

                {/* 3 Month Performance */}
                <TableCell
                  className={`text-right text-sm font-medium ${
                    peer["Perf.3M"] >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {peer["Perf.3M"] >= 0 ? "+" : ""}
                  {peer["Perf.3M"].toFixed(1)}%
                </TableCell>

                {/* 6 Month Performance */}
                <TableCell
                  className={`text-right text-sm font-medium ${
                    peer["Perf.6M"] >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {peer["Perf.6M"] >= 0 ? "+" : ""}
                  {peer["Perf.6M"].toFixed(1)}%
                </TableCell>

                {/* YTD Performance */}
                <TableCell
                  className={`text-right text-sm font-medium ${
                    peer["Perf.YTD"] >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {peer["Perf.YTD"] >= 0 ? "+" : ""}
                  {peer["Perf.YTD"].toFixed(1)}%
                </TableCell>

                {/* RSI */}
                <TableCell
                  className={`text-right text-sm font-medium ${
                    peer.RSI >= 70 ? "text-red-500" : peer.RSI <= 30 ? "text-emerald-500" : "text-foreground"
                  }`}
                >
                  {peer.RSI.toFixed(1)}
                </TableCell>

                {/* 52 Week High / Low */}
                <TableCell className="text-right text-sm text-foreground">
                  {peer.price_52_week_high.toFixed(2)} / {peer.price_52_week_low.toFixed(2)}
                </TableCell>

                {/* SMA20 */}
                <TableCell className="text-right text-sm text-foreground">{peer.SMA20.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
