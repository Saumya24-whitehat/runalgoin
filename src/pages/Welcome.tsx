import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const Welcome = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, username, phone, must_change_password")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data?.must_change_password) {
        navigate("/dashboard");
        return;
      }
      setName(data.name ?? "");
      setUsername(data.username ?? "");
      setPhone(data.phone ?? "");
      setChecking(false);
    })();
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (!name.trim() || !phone.trim()) {
      toast({ title: "Fill required fields", description: "Name and phone are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error: pwErr } = await supabase.auth.updateUser({ password });
    if (pwErr) {
      setSaving(false);
      toast({ title: "Password update failed", description: pwErr.message, variant: "destructive" });
      return;
    }
    const { error: profErr } = await supabase
      .from("profiles")
      .update({
        name: name.trim(),
        username: username.trim() || null,
        phone: phone.trim(),
        must_change_password: false,
      })
      .eq("user_id", user!.id);
    setSaving(false);
    if (profErr) {
      toast({ title: "Profile save failed", description: profErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Welcome aboard!", description: "Your account is ready." });
    navigate("/dashboard");
  };

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete your account</CardTitle>
          <CardDescription>Set a new password and confirm your details to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full name *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="pw">New password *</Label>
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            <div>
              <Label htmlFor="cpw">Confirm password *</Label>
              <Input id="cpw" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save and continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Welcome;
