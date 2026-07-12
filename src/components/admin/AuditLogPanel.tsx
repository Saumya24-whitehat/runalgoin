import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";

interface AuditRow {
  id: string;
  user_id: string;
  user_email: string | null;
  action: string;
  old_plan: string | null;
  new_plan: string | null;
  old_status: string | null;
  new_status: string | null;
  expires_at: string | null;
  reason: string | null;
  actor: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
}

const actionColor = (a: string): "default" | "secondary" | "destructive" | "outline" => {
  if (a === "upgrade" || a === "renewal") return "default";
  if (a === "expiry" || a === "refund" || a === "downgrade") return "destructive";
  if (a === "payment_failed") return "destructive";
  return "secondary";
};

export function AuditLogPanel() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("subscription_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setRows((data as AuditRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = filter
    ? rows.filter((r) => {
        const q = filter.toLowerCase();
        return (
          r.user_email?.toLowerCase().includes(q) ||
          r.user_id.toLowerCase().includes(q) ||
          r.action.toLowerCase().includes(q) ||
          r.razorpay_order_id?.toLowerCase().includes(q) ||
          r.razorpay_payment_id?.toLowerCase().includes(q)
        );
      })
    : rows;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base">Subscription Audit Log ({filtered.length})</CardTitle>
            <CardDescription>Every upgrade, downgrade, refund, and expiry with Razorpay IDs. Newest first, last 500 records.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative mb-3 max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by email, user id, action, or Razorpay id" value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-8" />
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No events.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Razorpay Order</TableHead>
                  <TableHead>Razorpay Payment</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">{format(new Date(r.created_at), "dd/MM/yyyy HH:mm:ss")}</TableCell>
                    <TableCell>
                      <div className="text-sm">{r.user_email ?? "—"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.user_id.slice(0, 8)}…</div>
                    </TableCell>
                    <TableCell><Badge variant={actionColor(r.action)}>{r.action}</Badge></TableCell>
                    <TableCell className="text-xs">{r.old_plan ?? "—"} → <b>{r.new_plan ?? "—"}</b></TableCell>
                    <TableCell className="text-xs">{r.old_status ?? "—"} → <b>{r.new_status ?? "—"}</b></TableCell>
                    <TableCell className="text-xs">{r.actor ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.razorpay_order_id ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.razorpay_payment_id ?? "—"}</TableCell>
                    <TableCell className="text-xs max-w-xs truncate" title={r.reason ?? ""}>{r.reason ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
