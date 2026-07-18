import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const ALLOWED = ["/welcome", "/auth", "/"];

export function FirstLoginGuard() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [checkedFor, setCheckedFor] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    // Re-check on user change
    if (checkedFor === user.id && !ALLOWED.every((p) => location.pathname !== p)) {
      // already checked and on allowed page; skip
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("user_id", user.id)
        .maybeSingle();
      setCheckedFor(user.id);
      const pendingEmail = (user.email ?? "").toLowerCase().endsWith("@pending.optionworld.tech");
      if ((data?.must_change_password || pendingEmail) && !ALLOWED.includes(location.pathname)) {
        navigate("/welcome", { replace: true });
      }
    })();
  }, [user, loading, location.pathname, navigate, checkedFor]);

  return null;
}
