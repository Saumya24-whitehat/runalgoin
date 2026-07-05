import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, Trash2, Copy } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onChanged?: () => void;
  user: { user_id: string; name: string; email: string } | null;
}

function genPassword(len = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let out = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export function ManageUserDialog({ isOpen, onClose, onChanged, user }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mustChange, setMustChange] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setNewPassword("");
      setMustChange(true);
      // Fetch username
      supabase.from("profiles").select("username").eq("user_id", user.user_id).maybeSingle()
        .then(({ data }) => setUsername((data as any)?.username || ""));
    }
  }, [isOpen, user]);

  if (!user) return null;

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-manage-user", { body: { userId: user.user_id, ...body } });
    if (error || (data as any)?.error) {
      throw new Error(error?.message || (data as any)?.error || "Request failed");
    }
    return data;
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await call({ action: "update_profile", name: name.trim(), username: username.trim(), email: email.trim().toLowerCase() });
      toast({ title: "Profile updated" });
      onChanged?.();
    } catch (e) {
      toast({ title: "Failed to update", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    const pw = newPassword.trim() || genPassword(12);
    setResetting(true);
    try {
      await call({ action: "update_password", password: pw, mustChange });
      setNewPassword(pw);
      toast({ title: "Password updated", description: "Copy the new password below and share with the user." });
    } catch (e) {
      toast({ title: "Failed to reset password", description: (e as Error).message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const deleteUser = async () => {
    setDeleting(true);
    try {
      await call({ action: "delete" });
      toast({ title: "User deleted" });
      setConfirmDelete(false);
      onChanged?.();
      onClose();
    } catch (e) {
      toast({ title: "Failed to delete user", description: (e as Error).message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast({ title: "Copied" }); };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage user</DialogTitle>
            <DialogDescription>Edit profile, reset password, or delete this account.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-3 rounded border border-border p-3">
              <div className="text-sm font-medium">Profile</div>
              <div>
                <Label>Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Username</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={saveProfile} disabled={saving}>
                  {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Save profile
                </Button>
              </div>
            </div>

            <div className="space-y-3 rounded border border-border p-3">
              <div className="text-sm font-medium flex items-center gap-2"><KeyRound className="h-4 w-4" /> Reset password</div>
              <div>
                <Label>New password</Label>
                <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Leave blank to auto-generate" />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={mustChange} onChange={(e) => setMustChange(e.target.checked)} />
                Require user to change password on next login
              </label>
              <div className="flex justify-end gap-2">
                {newPassword && (
                  <Button size="sm" variant="outline" onClick={() => copy(newPassword)}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                )}
                <Button size="sm" onClick={resetPassword} disabled={resetting}>
                  {resetting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Update password
                </Button>
              </div>
            </div>

            <div className="space-y-3 rounded border border-destructive/40 p-3">
              <div className="text-sm font-medium text-destructive flex items-center gap-2"><Trash2 className="h-4 w-4" /> Danger zone</div>
              <p className="text-xs text-muted-foreground">Permanently delete this user and their profile, roles, and subscription.</p>
              <div className="flex justify-end">
                <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>Delete user</Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {user.email}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. The user's account and all related data will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
