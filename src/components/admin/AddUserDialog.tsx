import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function AddUserDialog({ isOpen, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"free" | "pro" | "enterprise">("pro");
  const [expiresAt, setExpiresAt] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ email: string; tempPassword: string; emailSent: boolean } | null>(null);

  const reset = () => {
    setName(""); setUsername(""); setEmail(""); setPlan("pro"); setResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast({ title: "Name and email required", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        name: name.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        plan,
        expiresAt: plan === "free" ? null : new Date(expiresAt).toISOString(),
      },
    });
    setLoading(false);
    if (error || (data as any)?.error) {
      toast({ title: "Failed to create user", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    const r = data as { tempPassword: string; emailSent: boolean };
    setResult({ email: email.trim(), tempPassword: r.tempPassword, emailSent: r.emailSent });
    toast({ title: "User created", description: r.emailSent ? "Welcome email sent." : "User created — email delivery failed. Share password manually." });
    onCreated?.();
  };

  const copyPw = () => {
    if (result) {
      navigator.clipboard.writeText(result.tempPassword);
      toast({ title: "Copied" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>Manually create a paid or free user. Welcome email with login link and temporary password will be sent.</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 py-2">
            <div className="text-sm">User <b>{result.email}</b> created.</div>
            <div className="rounded border border-border p-3 bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">Temporary password</div>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm flex-1 break-all">{result.tempPassword}</code>
                <Button size="sm" variant="outline" onClick={copyPw}><Copy className="h-3 w-3" /></Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {result.emailSent ? "Welcome email sent successfully." : "⚠ Email not sent — share these credentials with the user manually."}
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="au-name">Full name *</Label>
              <Input id="au-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="au-username">Username</Label>
              <Input id="au-username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="au-email">Email *</Label>
              <Input id="au-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Plan *</Label>
                <Select value={plan} onValueChange={(v) => setPlan(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free (unpaid)</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="au-exp">Expires on</Label>
                <Input
                  id="au-exp"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  disabled={plan === "free"}
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create & Send Email
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
