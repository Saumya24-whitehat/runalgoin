import { ReactNode, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import "./ichart.css";

export function IchartShell({ title, children }: { title: string; children: ReactNode; back?: boolean }) {
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

  if (!allowed) return <div className="ichart p-6">Checking access…</div>;

  return (
    <div className="ichart">
      <nav className="ichart-menubar">
        <NavLink to="/admin" end>Admin</NavLink>
        <NavLink to="/admin/ichart" end>Home</NavLink>
        <NavLink to="/admin/ichart/option-chain">Option Chain</NavLink>
        <NavLink to="/admin/ichart/oi-stats">Option OI Stats</NavLink>
      </nav>
      <h1 className="ichart-title">{title}</h1>
      {children}
    </div>
  );
}
