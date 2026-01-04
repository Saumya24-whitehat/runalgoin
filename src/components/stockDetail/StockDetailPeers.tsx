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
        const peersFromApi = data?.peers || [];

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
    return `₹${value.toLocaleString("en-IN")}`;
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
              <TableRow key={idx} className="border-border hover:bg-muted/30 cursor-pointer">
                <TableCell className="font-semibold text-sm text-foreground">{peer.company_name}</TableCell>
                <TableCell className="text-right text-sm text-foreground">
                  ₹{peer.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right text-sm text-foreground">{peer.pe_ratio.toFixed(2)}</TableCell>
                <TableCell className="text-right text-sm text-foreground">{formatMarketCap(peer.market_cap)}</TableCell>
                <TableCell
                  className={`text-right text-sm font-medium ${
                    peer.return_52w >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {peer.return_52w >= 0 ? "+" : ""}
                  {peer.return_52w.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
