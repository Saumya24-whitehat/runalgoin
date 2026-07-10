import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Plus, Pencil, Trash2, FileText } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  tags: string[];
  cover_image_url: string | null;
  published: boolean;
  published_at: string | null;
  updated_at: string;
}

const emptyPost = {
  id: "",
  title: "",
  slug: "",
  summary: "",
  content: "",
  tags: "",
  cover_image_url: "",
  published: false,
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

export function BlogManagement() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyPost);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, title, slug, summary, content, tags, cover_image_url, published, published_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    else setPosts((data as BlogPost[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const openNew = () => {
    setForm(emptyPost);
    setOpen(true);
  };

  const openEdit = (p: BlogPost) => {
    setForm({
      id: p.id,
      title: p.title,
      slug: p.slug,
      summary: p.summary || "",
      content: p.content || "",
      tags: (p.tags || []).join(", "),
      cover_image_url: p.cover_image_url || "",
      published: p.published,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    const slug = form.slug.trim() || slugify(form.title);
    if (!slug) return toast.error("Slug is required");
    if (!form.content.trim()) return toast.error("Content is required");

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      slug,
      summary: form.summary.trim() || null,
      content: form.content,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      cover_image_url: form.cover_image_url.trim() || null,
      published: form.published,
      published_at: form.published
        ? (form.id ? undefined : new Date().toISOString())
        : null,
    };

    let error;
    if (form.id) {
      const existing = posts.find((p) => p.id === form.id);
      const updates: Record<string, unknown> = { ...payload };
      if (form.published && !existing?.published_at) {
        updates.published_at = new Date().toISOString();
      } else if (form.published && existing?.published_at) {
        delete updates.published_at;
      }
      ({ error } = await supabase.from("blog_posts").update(updates).eq("id", form.id));
    } else {
      const { data: userData } = await supabase.auth.getUser();
      ({ error } = await supabase
        .from("blog_posts")
        .insert({ ...payload, author_id: userData.user?.id }));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Post updated" : "Post created");
    setOpen(false);
    fetchPosts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Post deleted");
    fetchPosts();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Blog Posts
          </CardTitle>
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4 mr-1" /> New Post
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No posts yet. Click "New Post" to write your first article.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">/blog/{p.slug}</TableCell>
                    <TableCell>
                      {p.published ? (
                        <Badge>Published</Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(p.updated_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Post" : "New Blog Post"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((f) => ({
                    ...f,
                    title,
                    slug: f.id || f.slug ? f.slug : slugify(title),
                  }));
                }}
                placeholder="Daily Nifty Analysis — 10 July 2026"
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                placeholder="daily-nifty-analysis-10-july-2026"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Will be reachable at /blog/{form.slug || "your-slug"}
              </p>
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="nifty, market-analysis, options"
              />
            </div>
            <div>
              <Label htmlFor="cover">Cover image URL (optional)</Label>
              <Input
                id="cover"
                value={form.cover_image_url}
                onChange={(e) => setForm((f) => ({ ...f, cover_image_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="Short 1-2 sentence teaser shown in listings and social previews."
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="content">Content (Markdown supported)</Label>
              <Textarea
                id="content"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="# Heading

Write your analysis here..."
                rows={16}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="published"
                checked={form.published}
                onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))}
              />
              <Label htmlFor="published">Published (visible to everyone)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {form.id ? "Save changes" : "Create post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
