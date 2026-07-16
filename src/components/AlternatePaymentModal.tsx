import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useSelfDeclaredPayment } from "@/hooks/useSelfDeclaredPayment";

const UPI_ID = "9276251260@cnrb";
const PAYEE_NAME = "OptionWorld";
const PAYPAL_ME = "https://paypal.me/saumya2427";

type Method = "upi" | "paypal";
type Plan = "monthly" | "yearly" | "club";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  method: Method;
  plan: Plan;
}

const PLAN_LABEL: Record<Plan, string> = {
  monthly: "Pro Monthly",
  yearly: "Pro Yearly",
  club: "OptionWorld Club",
};

export function AlternatePaymentModal({ open, onOpenChange, method, plan }: Props) {
  const [txnId, setTxnId] = useState("");
  const { submit, loading } = useSelfDeclaredPayment();

  const amountInr = plan === "monthly" ? 150 : plan === "yearly" ? 1500 : 3500;
  const amountUsd = plan === "monthly" ? 2 : plan === "yearly" ? 18 : 42;

  const upiLink = useMemo(
    () =>
      `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(
        PAYEE_NAME,
      )}&am=${amountInr}&cu=INR&tn=${encodeURIComponent(`OW ${PLAN_LABEL[plan]}`)}`,
    [amountInr, plan],
  );

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handleActivate = async () => {
    if (txnId.trim().length < 4) {
      toast({ title: "Enter a valid transaction ID", variant: "destructive" });
      return;
    }
    const ok = await submit({ method, plan, transactionId: txnId.trim() });
    if (ok) {
      setTxnId("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {method === "upi" ? "Pay via UPI" : "Pay via PayPal"} — {PLAN_LABEL[plan]}
          </DialogTitle>
          <DialogDescription>
            {method === "upi"
              ? `Scan the QR or pay ₹${amountInr} to the UPI ID below, then enter your UTR / transaction ID to activate ${PLAN_LABEL[plan]} instantly.`
              : `Send $${amountUsd} (~₹${amountInr}) via PayPal, then paste the PayPal transaction ID to activate ${PLAN_LABEL[plan]} instantly.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {method === "upi" ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-4">
              <div className="rounded-md bg-white p-3">
                <QRCodeSVG value={upiLink} size={180} />
              </div>
              <div className="w-full space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">UPI ID</span>
                  <div className="flex items-center gap-2">
                    <code className="font-mono">{UPI_ID}</code>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(UPI_ID, "UPI ID")}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold">₹{amountInr.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Payee</span>
                  <span>{PAYEE_NAME}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">
                  ${amountUsd} <span className="text-muted-foreground">(~₹{amountInr})</span>
                </span>
              </div>
              <Button asChild variant="outline" className="w-full">
                <a href={PAYPAL_ME} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open PayPal to pay
                </a>
              </Button>
              <p className="text-xs text-muted-foreground">
                After completing payment on PayPal, copy the transaction ID from the confirmation and paste it below.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="txn">{method === "upi" ? "UPI Transaction ID (UTR)" : "PayPal Transaction ID"}</Label>
            <Input
              id="txn"
              value={txnId}
              onChange={(e) => setTxnId(e.target.value)}
              placeholder={method === "upi" ? "e.g. 401234567890" : "e.g. 5AB12345CD678901E"}
              maxLength={100}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleActivate} disabled={loading || txnId.trim().length < 4}>
            {loading ? "Activating..." : "I've paid — Activate Pro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
