import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function useRazorpayCheckout() {
  const { user } = useAuth();
  const { refetch } = useSubscription();
  const [loading, setLoading] = useState(false);

  const startCheckout = async (plan: "monthly" | "yearly" | "club") => {
    if (!user) {
      toast({ title: "Please sign in first", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const ok = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!ok) throw new Error("Failed to load Razorpay checkout");

      const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
        body: { plan },
      });
      if (error || !data?.orderId) throw new Error(error?.message || "Order creation failed");

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "OptionWorld",
        description: plan === "monthly" ? "Pro Monthly (₹150)" : "Pro Yearly (₹1,500)",
        prefill: {
          email: user.email ?? "",
        },
        theme: { color: "#3B82F6" },
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyErr } = await supabase.functions.invoke(
              "verify-razorpay-payment",
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  plan,
                },
              },
            );
            if (verifyErr || !verifyData?.success) {
              throw new Error(verifyErr?.message || "Verification failed");
            }
            toast({
              title: "Payment successful 🎉",
              description: "Pro plan activated. Enjoy!",
            });
            await refetch();
          } catch (e: any) {
            toast({
              title: "Payment verification failed",
              description: e.message ?? "Contact support with your payment ID.",
              variant: "destructive",
            });
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });
      rzp.on("payment.failed", (resp: any) => {
        toast({
          title: "Payment failed",
          description: resp.error?.description ?? "Please try again.",
          variant: "destructive",
        });
      });
      rzp.open();
    } catch (e: any) {
      toast({ title: "Checkout error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return { startCheckout, loading };
}
