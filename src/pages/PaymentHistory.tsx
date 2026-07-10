import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, FileText, Crown, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface PaymentRow {
  id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  refund_id: string | null;
  refund_amount: number | null;
  refunded_at: string | null;
  created_at: string;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  plan: string;
  amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  created_at: string;
}

const formatMoney = (paise: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(paise / 100);

const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "captured") return "default";
  if (status === "refunded") return "destructive";
  if (status === "failed") return "destructive";
  if (status === "created" || status === "authorized") return "secondary";
  return "outline";
};

export default function PaymentHistory() {
  const { user, loading: authLoading } = useAuth();
  const { subscription, isPro } = useSubscription();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: p }, { data: inv }] = await Promise.all([
      supabase.from("payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setPayments((p as PaymentRow[]) ?? []);
    setInvoices((inv as InvoiceRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
     
  }, [user]);

  const invoiceByOrder = new Map(invoices.map((i) => [i.razorpay_order_id, i]));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Payment History</h1>
            <p className="text-sm text-muted-foreground">Your Razorpay orders, payments, refunds, and invoices.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => navigate("/plans")}>
              <Crown className="h-4 w-4 mr-1" /> Manage Plan
            </Button>
          </div>
        </div>

        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Current Plan</CardTitle>
            <CardDescription>Based on your latest Razorpay purchase</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Badge variant={isPro ? "default" : "secondary"} className="text-sm">
              {subscription?.plan_type?.toUpperCase() ?? "FREE"}
            </Badge>
            <Badge variant="outline">{subscription?.status ?? "active"}</Badge>
            {subscription?.expires_at && (
              <span className="text-sm text-muted-foreground">
                Expires {format(new Date(subscription.expires_at), "dd/MM/yyyy HH:mm")}
              </span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : payments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No payments yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => {
                      const inv = invoiceByOrder.get(p.razorpay_order_id);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="whitespace-nowrap">{format(new Date(p.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell className="font-mono text-xs">{p.razorpay_order_id}</TableCell>
                          <TableCell className="font-mono text-xs">{p.razorpay_payment_id ?? "—"}</TableCell>
                          <TableCell className="capitalize">{p.plan}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {formatMoney(p.amount, p.currency)}
                            {p.refund_amount ? (
                              <div className="text-xs text-destructive">
                                Refunded {formatMoney(p.refund_amount, p.currency)}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="capitalize">{p.method ?? "—"}</TableCell>
                          <TableCell><Badge variant={statusVariant(p.status)}>{p.status}</Badge></TableCell>
                          <TableCell>
                            {inv ? (
                              <Button asChild variant="ghost" size="sm">
                                <Link to={`/invoices/${inv.id}`}>
                                  <Download className="h-3 w-3 mr-1" /> {inv.invoice_number}
                                </Link>
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
