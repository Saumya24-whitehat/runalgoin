import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Download, Upload, CheckCircle2, XCircle } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

type CreatedUser = {
  name: string;
  email: string;
  tempPassword: string;
  emailSent: boolean;
  error?: string;
};

const SAMPLE_CSV = `name,username,email,plan,expires_at,password
John Doe,johndoe,john@example.com,pro,2027-01-31,MyPass@123
Jane Smith,janesmith,jane@example.com,free,,
Acme User,acme01,user@acme.com,enterprise,2026-12-31,
`;

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    // simple CSV split (no quoted-comma support — sufficient for these fields)
    const cells = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

function buildInvitation(origin: string, email: string, tempPassword: string, name: string) {
  const loginUrl = `${origin}/auth`;
  return `Hi ${name},

Your OptionWorld account is ready.

Login URL: ${loginUrl}
Email: ${email}
Temporary Password: ${tempPassword}

On first login you'll be asked to change your password and complete your profile.`;
}

export function AddUserDialog({ isOpen, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // Single-user form state
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState<"free" | "pro" | "enterprise">("pro");
  const [expiresAt, setExpiresAt] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [loading, setLoading] = useState(false);

  // CSV state
  const [csvRows, setCsvRows] = useState<Array<Record<string, string>>>([]);
  const [csvName, setCsvName] = useState<string>("");
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  // Results (shared for single + bulk)
  const [results, setResults] = useState<CreatedUser[] | null>(null);

  const reset = () => {
    setName(""); setUsername(""); setEmail(""); setPassword(""); setPlan("pro");
    setCsvRows([]); setCsvName(""); setBulkProgress(null);
    setResults(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const createOne = async (payload: {
    name: string; username: string; email: string; plan: "free" | "pro" | "enterprise"; expiresAt: string | null;
  }): Promise<CreatedUser> => {
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        name: payload.name,
        username: payload.username,
        email: payload.email,
        plan: payload.plan,
        expiresAt: payload.plan === "free" ? null : (payload.expiresAt ? new Date(payload.expiresAt).toISOString() : null),
      },
    });
    if (error || (data as any)?.error) {
      return { name: payload.name, email: payload.email, tempPassword: "", emailSent: false, error: error?.message || (data as any)?.error };
    }
    const r = data as { tempPassword: string; emailSent: boolean };
    return { name: payload.name, email: payload.email, tempPassword: r.tempPassword, emailSent: r.emailSent };
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast({ title: "Name and email required", variant: "destructive" });
      return;
    }
    setLoading(true);
    const r = await createOne({
      name: name.trim(),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      plan,
      expiresAt: plan === "free" ? null : expiresAt,
    });
    setLoading(false);
    setResults([r]);
    if (r.error) toast({ title: "Failed to create user", description: r.error, variant: "destructive" });
    else {
      toast({ title: "User created", description: r.emailSent ? "Welcome email sent." : "User created — email failed. Share invitation manually." });
      onCreated?.();
    }
  };

  const handleCsvFile = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) {
      toast({ title: "CSV empty or invalid", variant: "destructive" });
      return;
    }
    setCsvRows(rows);
    setCsvName(file.name);
  };

  const handleBulkSubmit = async () => {
    if (csvRows.length === 0) return;
    setLoading(true);
    setBulkProgress({ done: 0, total: csvRows.length });
    const out: CreatedUser[] = [];
    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      const p = (row.plan || "free").toLowerCase() as "free" | "pro" | "enterprise";
      const r = await createOne({
        name: row.name || "",
        username: row.username || "",
        email: (row.email || "").toLowerCase(),
        plan: ["free", "pro", "enterprise"].includes(p) ? p : "free",
        expiresAt: row.expires_at || row["expires_at"] || null,
      });
      out.push(r);
      setBulkProgress({ done: i + 1, total: csvRows.length });
    }
    setLoading(false);
    setResults(out);
    onCreated?.();
    const okCount = out.filter((r) => !r.error).length;
    toast({ title: `Bulk create finished`, description: `${okCount} of ${out.length} users created.` });
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "add-users-sample.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const copy = (text: string, label = "Copied") => {
    navigator.clipboard.writeText(text);
    toast({ title: label });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add User(s)</DialogTitle>
          <DialogDescription>Manually create paid or free users. Welcome email with login link and temporary password will be sent.</DialogDescription>
        </DialogHeader>

        {results ? (
          <div className="space-y-3 py-2">
            <div className="text-sm font-medium">{results.filter((r) => !r.error).length} of {results.length} created</div>
            <div className="space-y-3 max-h-[55vh] overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className="rounded border border-border p-3 bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {r.error ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    <span className="font-medium">{r.email}</span>
                    {!r.error && (
                      <span className="text-xs text-muted-foreground">
                        {r.emailSent ? "· email sent" : "· email failed"}
                      </span>
                    )}
                  </div>
                  {r.error ? (
                    <div className="text-xs text-destructive">{r.error}</div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground w-32">Temp password</div>
                        <code className="font-mono text-xs flex-1 break-all">{r.tempPassword}</code>
                        <Button size="sm" variant="outline" onClick={() => copy(r.tempPassword, "Password copied")}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground w-32">Invitation link</div>
                        <code className="font-mono text-xs flex-1 break-all">{origin}/auth</code>
                        <Button size="sm" variant="outline" onClick={() => copy(`${origin}/auth`, "Link copied")}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex justify-end">
                        <Button size="sm" variant="secondary" onClick={() => copy(buildInvitation(origin, r.email, r.tempPassword, r.name), "Invitation copied")}>
                          <Copy className="h-3 w-3 mr-1" /> Copy full invitation
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setResults(null); setCsvRows([]); setCsvName(""); }}>Add more</Button>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="single">Single user</TabsTrigger>
              <TabsTrigger value="bulk">Bulk CSV upload</TabsTrigger>
            </TabsList>

            <TabsContent value="single">
              <form onSubmit={handleSingleSubmit} className="space-y-3 pt-3">
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
                    <Input id="au-exp" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} disabled={plan === "free"} />
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
            </TabsContent>

            <TabsContent value="bulk">
              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between rounded border border-border p-3 bg-muted/30">
                  <div className="text-sm">
                    <div className="font-medium">CSV format</div>
                    <div className="text-xs text-muted-foreground">Columns: name, username, email, plan (free/pro/enterprise), expires_at (YYYY-MM-DD, blank for free)</div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={downloadSample}>
                    <Download className="h-3 w-3 mr-1" /> Sample CSV
                  </Button>
                </div>

                <div>
                  <Label htmlFor="au-csv" className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-md p-4 hover:bg-muted/50">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">{csvName || "Click to choose a CSV file"}</span>
                  </Label>
                  <Input
                    id="au-csv"
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleCsvFile(e.target.files[0])}
                  />
                </div>

                {csvRows.length > 0 && (
                  <div className="rounded border border-border overflow-hidden">
                    <div className="text-xs bg-muted/40 px-3 py-2 font-medium">{csvRows.length} users detected — preview:</div>
                    <div className="max-h-40 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/20">
                          <tr>
                            <th className="text-left px-2 py-1">Name</th>
                            <th className="text-left px-2 py-1">Email</th>
                            <th className="text-left px-2 py-1">Plan</th>
                            <th className="text-left px-2 py-1">Expires</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvRows.slice(0, 10).map((r, i) => (
                            <tr key={i} className="border-t border-border">
                              <td className="px-2 py-1">{r.name}</td>
                              <td className="px-2 py-1">{r.email}</td>
                              <td className="px-2 py-1">{r.plan || "free"}</td>
                              <td className="px-2 py-1">{r.expires_at || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvRows.length > 10 && <div className="text-[10px] text-muted-foreground px-2 py-1">…and {csvRows.length - 10} more</div>}
                    </div>
                  </div>
                )}

                {bulkProgress && (
                  <div className="text-xs text-muted-foreground">Processing {bulkProgress.done} / {bulkProgress.total}…</div>
                )}

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                  <Button type="button" disabled={loading || csvRows.length === 0} onClick={handleBulkSubmit}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Create {csvRows.length || ""} User{csvRows.length === 1 ? "" : "s"}
                  </Button>
                </DialogFooter>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
