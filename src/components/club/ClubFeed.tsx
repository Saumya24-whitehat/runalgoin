import { useState } from "react";
import { format } from "date-fns";
import { useClubPosts, type ClubPost } from "@/hooks/useClubPosts";
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2, TrendingUp, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

interface Props {
  categoryId: string | null;
}

export function ClubFeed({ categoryId }: Props) {
  const { posts, loading, update, remove } = useClubPosts(categoryId);
  const { isAdmin } = useSubscription();
  const [editing, setEditing] = useState<ClubPost | null>(null);
  const [editBody, setEditBody] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<ClubPost | null>(null);
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!posts.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
        No posts yet. Be the first to share an idea!
      </div>
    );
  }

  const openEdit = (p: ClubPost) => {
    setEditing(p);
    setEditBody(p.body);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const ok = await update(editing.id, { body: editBody.trim() });
    setSaving(false);
    if (ok) setEditing(null);
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    await remove(confirmDelete.id);
    setConfirmDelete(null);
  };

  return (
    <>
      <div className="space-y-4">
        {posts.map((p) => {
          const initials = (p.author_name || "M").slice(0, 2).toUpperCase();
          return (
            <div
              key={p.id}
              className={`rounded-xl border p-4 shadow-sm ${p.is_admin ? "border-amber-500/60 bg-amber-500/5" : "border-border bg-card"}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm ${p.is_admin ? "bg-amber-500 text-white" : "bg-primary/20 text-primary"}`}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    {p.author_name}
                    {p.is_admin && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] uppercase tracking-wide">
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.category_name} • {format(new Date(p.created_at), "dd MMM yyyy, hh:mm a")}
                  </div>
                </div>
                {p.idea_type && (
                  <Badge variant="secondary" className="text-[10px]">
                    {p.idea_type}
                  </Badge>
                )}
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => openEdit(p)}
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete(p)}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {p.symbol && (
                <div className="rounded-lg bg-muted/40 border border-border p-3 mb-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <MetaCell label="Symbol" value={p.symbol} />
                  {p.action && <MetaCell label="Action" value={p.action} />}
                  {p.exchange && <MetaCell label="Exchange" value={p.exchange} />}
                  {p.cmp != null && <MetaCell label="CMP" value={String(p.cmp)} />}
                  {p.entry_zone && <MetaCell label="Entry" value={p.entry_zone} />}
                  {p.stop_loss != null && <MetaCell label="SL" value={String(p.stop_loss)} />}
                  {p.target1 != null && <MetaCell label="Target" value={String(p.target1)} />}
                  {p.timeframe && <MetaCell label="Timeframe" value={p.timeframe} />}
                </div>
              )}

              <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                {p.body}
              </div>

              {p.rationale && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Rationale: </span>
                  {p.rationale}
                </div>
              )}

              {p.image_url && (
                <img
                  src={p.image_url}
                  alt=""
                  className="mt-3 rounded-lg max-h-96 w-full object-contain border"
                />
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit post</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={6}
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={saving || !editBody.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
