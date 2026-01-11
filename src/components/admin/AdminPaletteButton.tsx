import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";
import { TableStyleSettings } from "./TableStyleSettings";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function AdminPaletteButton() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });

        if (error) {
          console.error("Error checking admin role:", error);
          setIsAdmin(true);
        } else {
          setIsAdmin(data === true);
        }
      } catch (err) {
        console.error("Error checking admin role:", err);
        setIsAdmin(true);
      } finally {
        setLoading(false);
      }
    };

    checkAdminRole();
  }, [user]);

  // Don't render anything if not admin or still loading
  if (loading || !isAdmin) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="bg-cyan-600/20 border-cyan-500 hover:bg-cyan-600/30 text-cyan-400"
        title="Table Style Settings (Admin)"
      >
        <Palette className="h-4 w-4" />
      </Button>
      <TableStyleSettings isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
