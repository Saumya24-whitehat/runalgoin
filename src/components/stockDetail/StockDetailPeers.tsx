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
        // Fetch peer data from the consolidated endpoint - for now using mock data based on sector
        // In production, this would call a dedicated peers API
        const sectorPeers: { [key: string]: PeerStock[] } = {
          'Consumer Non-Durables': [
            { symbol: 'HUL', company_name: 'Hindustan Unilever', price: 2456.40, pe_ratio: 23.45, market_cap: 1920000000000, return_52w: 18.5 },
            { symbol: 'NESTLEIND', company_name: 'Nestle India', price: 2234.50, pe_ratio: 8.92, market_cap: 240000000000, return_52w: -12.3 },
            { symbol: 'BRITANNIA', company_name: 'Britannia Industries', price: 5345.60, pe_ratio: 6.78, market_cap: 180000000000, return_52w: 5.2 },
            { symbol: 'DABUR', company_name: 'Dabur India', price: 589.45, pe_ratio: 9.34, market_cap: 120000000000, return_52w: -8.7 },
          ],
          'default': [
            { symbol: 'RELIANCE', company_name: 'Reliance Industries', price: 2456.40, pe_ratio: 23.45, market_cap: 1920000000000, return_52w: 18.5 },
            { symbol: 'TCS', company_name: 'Tata Consultancy Services', price: 3834.50, pe_ratio: 28.92, market_cap: 1400000000000, return_52w: 12.3 },
            { symbol: 'INFY', company_name: 'Infosys', price: 1545.60, pe_ratio: 26.78, market_cap: 640000000000, return_52w: 15.2 },
            { symbol: 'HDFCBANK', company_name: 'HDFC Bank', price: 1689.45, pe_ratio: 19.34, market_cap: 1280000000000, return_52w: 8.7 },
          ]
        };

        const peerData = sectorPeers[sector] || sectorPeers['default'];
        setPeers(peerData.filter(p => p.symbol !== symbol));
      } catch (error) {
        console.error('Error fetching peers:', error);
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
    return `₹${value.toLocaleString('en-IN')}`;
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
                  ₹{peer.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right text-sm text-foreground">{peer.pe_ratio.toFixed(2)}</TableCell>
                <TableCell className="text-right text-sm text-foreground">{formatMarketCap(peer.market_cap)}</TableCell>
                <TableCell className={`text-right text-sm font-medium ${
                  peer.return_52w >= 0 ? 'text-emerald-500' : 'text-red-500'
                }`}>
                  {peer.return_52w >= 0 ? '+' : ''}{peer.return_52w.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
