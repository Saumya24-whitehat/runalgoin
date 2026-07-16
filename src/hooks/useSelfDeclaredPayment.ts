import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";

export function useSelfDeclaredPayment() {
  const { user } = useAuth();
  const { refetch } = useSubscription();
  const [loading, setLoading] = useState(false);

  const submit = async (params: {
    method: "paypal" | "upi";
    plan: "monthly" | "yearly" | "club";
    transactionId: string;
  }) => {
    if (!user) {
      toast({ title: "Please sign in first", variant: "destructive" });
      return false;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("self-declared-payment", {
        body: {
          method: params.method,
          plan: params.plan,
          transaction_id: params.transactionId,
        },
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Activation failed");
      }
      toast({
        title: "Pro activated 🎉",
        description: "Thanks! We'll verify your payment shortly.",
      });
      await refetch();
      return true;
    } catch (e: any) {
      toast({
        title: "Activation error",
        description: e.message ?? "Please try again",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading };
}
