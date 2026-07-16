import { useRef, useState } from "react";
import { Plus, Loader2, Image as ImageIcon, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useClubCategories } from "@/hooks/useClubCategories";
import { useClubPosts } from "@/hooks/useClubPosts";

interface Props {
  defaultCategoryId?: string | null;
}

export function ClubPostComposer({ defaultCategoryId }: Props) {
  const { user } = useAuth();
  const { categories } = useClubCategories();
  const { create } = useClubPosts(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [form, setForm] = useState({
    category_id: defaultCategoryId ?? "",
    body: "",
    idea_type: "",
    action: "",
    exchange: "",
    symbol: "",
    cmp: "",
    entry_zone: "",
    stop_loss: "",
    target1: "",
    timeframe: "",
    rationale: "",
  });

  const upload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const path = `${user.id}/posts/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("club-media").upload(path, file);
      if (error) throw error;
      const { data } = await supabase.storage.from("club-media").createSignedUrl(path, 60 * 60 * 24 * 365);
      setImage(data?.signedUrl ?? null);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!form.category_id) {
      toast({ title: "Pick a category", variant: "destructive" });
      return;
    }
    if (!form.body.trim()) {
      toast({ title: "Write something first", variant: "destructive" });
      return;
    }
    setSaving(true);
    const ok = await create({
      category_id: form.category_id,
      body: form.body.trim(),
      image_url: image,
      idea_type: form.idea_type || null,
      action: form.action || null,
      exchange: form.exchange || null,
      symbol: form.symbol || null,
      cmp: form.cmp ? Number(form.cmp) : null,
      entry_zone: form.entry_zone || null,
      stop_loss: form.stop_loss ? Number(form.stop_loss) : null,
      target1: form.target1 ? Number(form.target1) : null,
      timeframe: form.timeframe || null,
      rationale: form.rationale || null,
    });
    setSaving(false);
    if (ok) {
      setOpen(false);
      setForm({ ...form, body: "", symbol: "", cmp: "", entry_zone: "", stop_loss: "", target1: "", rationale: "" });
      setImage(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Post
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share a post with the Club</DialogTitle>
          <DialogDescription>
            Share an idea, insight, or question. Fill only the fields you need — the stock idea
            block is optional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type (optional)</Label>
              <Select value={form.idea_type} onValueChange={(v) => setForm({ ...form, idea_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Discussion / LTI / MTI / STT" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Discussion">Discussion</SelectItem>
                  <SelectItem value="MTI">MTI — Momentum</SelectItem>
                  <SelectItem value="STT">STT — Short-term</SelectItem>
                  <SelectItem value="LTI">LTI — Long-term</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Message</Label>
            <Textarea
              rows={4}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Write your idea, question, or update…"
            />
          </div>

          <details className="rounded-lg border border-border p-3">
            <summary className="text-sm font-semibold cursor-pointer">Stock idea details (optional)</summary>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
              <Field label="Symbol" value={form.symbol} onChange={(v) => setForm({ ...form, symbol: v })} />
              <Field label="Action" value={form.action} onChange={(v) => setForm({ ...form, action: v })} placeholder="BUY / SELL" />
              <Field label="Exchange" value={form.exchange} onChange={(v) => setForm({ ...form, exchange: v })} placeholder="NSE / MCX" />
              <Field label="CMP" value={form.cmp} onChange={(v) => setForm({ ...form, cmp: v })} type="number" />
              <Field label="Entry Zone" value={form.entry_zone} onChange={(v) => setForm({ ...form, entry_zone: v })} placeholder="e.g. 415-420" />
              <Field label="Stop Loss" value={form.stop_loss} onChange={(v) => setForm({ ...form, stop_loss: v })} type="number" />
              <Field label="Target 1" value={form.target1} onChange={(v) => setForm({ ...form, target1: v })} type="number" />
              <Field label="Timeframe" value={form.timeframe} onChange={(v) => setForm({ ...form, timeframe: v })} placeholder="e.g. 3 months" />
            </div>
            <div className="mt-2">
              <Label>Rationale</Label>
              <Textarea
                rows={2}
                value={form.rationale}
                onChange={(e) => setForm({ ...form, rationale: e.target.value })}
                placeholder="Why this idea?"
              />
            </div>
          </details>

          <div>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            {image ? (
              <div className="relative inline-block">
                <img src={image} alt="" className="max-h-40 rounded-md border" />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <ImageIcon className="w-4 h-4 mr-1" />
                {uploading ? "Uploading…" : "Attach image"}
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} />
    </div>
  );
}
