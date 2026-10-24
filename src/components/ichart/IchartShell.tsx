import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function IchartShell({ title, children, back = true }: { title: string; children: ReactNode; back?: boolean }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth"); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      if (!data) navigate("/dashboard");
      setAllowed(Boolean(data));
    });
  }, [user, loading, navigate]);

  if (!allowed) return <PageLayout showFooter={false}><div className="p-6 text-muted-foreground">Checking access…</div></PageLayout>;

  return (
    <PageLayout showFooter={false}>
      <section className="mx-auto w-full max-w-[1600px] py-3">
        <div className="flex items-center gap-3 border-b px-3 pb-2">
          {back && <Link to="/admin/ichart" className="text-muted-foreground hover:text-foreground" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link>}
          <div>
            <p className="font-mono text-[10px] uppercase text-primary">Admin · iChart</p>
            <h1 className="text-base font-semibold">{title}</h1>
          </div>
        </div>
        {children}
      </section>
    </PageLayout>
  );
}
