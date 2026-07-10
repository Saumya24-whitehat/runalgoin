import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface Invoice {
  id: string;
  invoice_number: string;
  plan: string;
  amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  created_at: string;
}

const formatMoney = (paise: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(paise / 100);

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
      if (!data) setNotFound(true);
      else setInv(data as Invoice);
      setLoading(false);
    })();
  }, [id, user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (notFound || !inv) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2">
        <p>Invoice not found.</p>
        <Button onClick={() => navigate("/payments")}>Back to payments</Button>
      </div>
    );
  }

  const subtotal = inv.amount;
  const gstRate = 0.18;
  const base = Math.round(subtotal / (1 + gstRate));
  const gst = subtotal - base;

  return (
    <div className="min-h-screen bg-muted/30 py-8 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Button variant="ghost" size="sm" onClick={() => navigate("/payments")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print / Save PDF
          </Button>
        </div>

        <Card className="p-8 print:shadow-none print:border-0">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold">OptionWorld</h1>
              <p className="text-sm text-muted-foreground">optionworld.tech</p>
              <p className="text-sm text-muted-foreground">support@optionworld.tech</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-semibold">INVOICE</h2>
              <p className="text-sm font-mono mt-1">{inv.invoice_number}</p>
              <p className="text-xs text-muted-foreground">Issued {format(new Date(inv.created_at), "dd/MM/yyyy")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
            <div>
              <div className="text-muted-foreground mb-1">Billed to</div>
              <div className="font-medium">{inv.customer_name ?? user?.email}</div>
              <div>{inv.customer_email ?? user?.email}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Razorpay References</div>
              <div className="font-mono text-xs">Order: {inv.razorpay_order_id ?? "—"}</div>
              <div className="font-mono text-xs">Payment: {inv.razorpay_payment_id ?? "—"}</div>
            </div>
          </div>

          <table className="w-full text-sm mb-6">
            <thead className="border-y">
              <tr className="text-left">
                <th className="py-2">Description</th>
                <th className="py-2">Period</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3">
                  <div className="font-medium capitalize">OptionWorld Pro — {inv.plan}</div>
                  <div className="text-xs text-muted-foreground">Access to premium analytics and tools</div>
                </td>
                <td className="py-3 whitespace-nowrap">
                  {format(new Date(inv.period_start), "dd/MM/yyyy")} –<br />
                  {format(new Date(inv.period_end), "dd/MM/yyyy")}
                </td>
                <td className="py-3 text-right">{formatMoney(base, inv.currency)}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(base, inv.currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">GST (18%)</span><span>{formatMoney(gst, inv.currency)}</span></div>
              <div className="flex justify-between border-t pt-1 font-semibold"><span>Total Paid</span><span>{formatMoney(subtotal, inv.currency)}</span></div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-8 text-center">
            This is a computer-generated invoice. Payment processed via Razorpay.
          </p>
        </Card>
      </div>
    </div>
  );
}
