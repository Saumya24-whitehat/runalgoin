import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { renderMarkdown } from "@/lib/markdown";
import {
  ArrowLeft,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
  Eye,
  Save,
  Send,
  Loader2,
  X,
} from "lucide-react";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

interface FormState {
  title: string;
  slug: string;
  summary: string;
  content: string;
  tags: string[];
  cover_image_url: string;
  published: boolean;
  published_at: string | null;
}

const initialState: FormState = {
  title: "",
  slug: "",
  summary: "",
  content: "",
  tags: [],
  cover_image_url: "",
  published: false,
  published_at: null,
};

export default function BlogEditor() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [slugTouched, setSlugTouched] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) toast.error(error.message);
      else if (data) {
        setForm({
          title: data.title,
          slug: data.slug,
          summary: data.summary || "",
          content: data.content || "",
          tags: data.tags || [],
          cover_image_url: data.cover_image_url || "",
          published: data.published,
          published_at: data.published_at,
        });
        setSlugTouched(true);
      }
      setLoading(false);
    })();
  }, [id, isEdit]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const insert = (before: string, after = "", placeholder = "") => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = form.content.slice(start, end) || placeholder;
    const next =
      form.content.slice(0, start) + before + selected + after + form.content.slice(end);
    update("content", next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + before.length + selected.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const insertLine = (prefix: string, placeholder: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const before = form.content.slice(0, start);
    const lineStart = before.lastIndexOf("\n") + 1;
    const isEmptyLine = start === lineStart;
    const prepend = isEmptyLine ? "" : "\n";
    const text = `${prepend}${prefix}${placeholder}\n`;
    update("content", form.content.slice(0, start) + text + form.content.slice(start));
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + prepend.length + prefix.length + placeholder.length;
      el.setSelectionRange(cursor - placeholder.length, cursor);
    });
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/,$/, "");
    if (!t) return;
    if (!form.tags.includes(t)) update("tags", [...form.tags, t]);
    setTagInput("");
  };

  const save = async (publish?: boolean) => {
    if (!form.title.trim()) return toast.error("Title is required");
    const slug = form.slug.trim() || slugify(form.title);
    if (!slug) return toast.error("Slug is required");
    if (!form.content.trim()) return toast.error("Content cannot be empty");

    const shouldPublish = publish ?? form.published;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      slug,
      summary: form.summary.trim() || null,
      content: form.content,
      tags: form.tags,
      cover_image_url: form.cover_image_url.trim() || null,
      published: shouldPublish,
    };

    let error;
    let newId = id;
    if (isEdit) {
      const updates: Record<string, unknown> = { ...payload };
      if (shouldPublish && !form.published_at) {
        updates.published_at = new Date().toISOString();
      }
      if (!shouldPublish) updates.published_at = null;
      ({ error } = await supabase.from("blog_posts").update(updates).eq("id", id!));
    } else {
      const { data, error: err } = await supabase
        .from("blog_posts")
        .insert({
          ...payload,
          author_id: user?.id,
          published_at: shouldPublish ? new Date().toISOString() : null,
        })
        .select("id")
        .single();
      error = err;
      newId = data?.id;
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(shouldPublish ? "Post published" : "Draft saved");
    update("published", shouldPublish);
    if (!isEdit && newId) navigate(`/admin/blog/${newId}`, { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const toolbarBtn = (icon: React.ReactNode, label: string, onClick: () => void) => (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={onClick} className="h-8 w-8">
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Editor header */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Input
            value={form.title}
            onChange={(e) => {
              update("title", e.target.value);
              if (!slugTouched) update("slug", slugify(e.target.value));
            }}
            placeholder="Post title…"
            className="flex-1 min-w-[240px] border-none text-xl font-semibold shadow-none focus-visible:ring-0 px-2"
          />
          <Badge variant={form.published ? "default" : "secondary"}>
            {form.published ? "Published" : "Draft"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview((v) => !v)}
          >
            <Eye className="h-4 w-4 mr-1" />
            {showPreview ? "Hide preview" : "Preview"}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => save(false)} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save draft
          </Button>
          <Button size="sm" onClick={() => save(true)} disabled={saving}>
            <Send className="h-4 w-4 mr-1" />
            {form.published ? "Update" : "Publish"}
          </Button>
        </div>

        {/* Toolbar */}
        <div className="container mx-auto px-4 py-1 flex items-center gap-1 flex-wrap border-t">
          {toolbarBtn(<Heading1 className="h-4 w-4" />, "Heading 1", () => insertLine("# ", "Heading"))}
          {toolbarBtn(<Heading2 className="h-4 w-4" />, "Heading 2", () => insertLine("## ", "Heading"))}
          {toolbarBtn(<Heading3 className="h-4 w-4" />, "Heading 3", () => insertLine("### ", "Heading"))}
          <Separator orientation="vertical" className="h-6 mx-1" />
          {toolbarBtn(<Bold className="h-4 w-4" />, "Bold", () => insert("**", "**", "bold"))}
          {toolbarBtn(<Italic className="h-4 w-4" />, "Italic", () => insert("*", "*", "italic"))}
          {toolbarBtn(<Code className="h-4 w-4" />, "Inline code", () => insert("`", "`", "code"))}
          <Separator orientation="vertical" className="h-6 mx-1" />
          {toolbarBtn(<List className="h-4 w-4" />, "Bulleted list", () => insertLine("- ", "List item"))}
          {toolbarBtn(<Quote className="h-4 w-4" />, "Quote", () => insertLine("> ", "Quote"))}
          {toolbarBtn(<Minus className="h-4 w-4" />, "Divider", () => insertLine("", "\n---"))}
          <Separator orientation="vertical" className="h-6 mx-1" />
          {toolbarBtn(<LinkIcon className="h-4 w-4" />, "Link", () => insert("[", "](https://)", "text"))}
          {toolbarBtn(<ImageIcon className="h-4 w-4" />, "Image", () => insert("![alt](", ")", "https://"))}
        </div>
      </div>

      {/* Body: editor + preview + sidebar */}
      <div className="flex-1 container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className={`grid gap-4 ${showPreview ? "md:grid-cols-2" : "grid-cols-1"}`}>
          <div className="flex flex-col">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Content (Markdown + HTML)
            </Label>
            <Textarea
              ref={textareaRef}
              value={form.content}
              onChange={(e) => update("content", e.target.value)}
              placeholder={`# Start writing…

Use the toolbar above or Markdown shortcuts:

**bold**, *italic*, [link](https://), ![image](url)

- list item
- another item

> A quote

\`\`\`
code block
\`\`\``}
              className="min-h-[65vh] font-mono text-sm resize-y leading-relaxed"
            />
          </div>
          {showPreview && (
            <div className="flex flex-col">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Live preview
              </Label>
              <div className="min-h-[65vh] rounded-md border bg-card p-6 overflow-y-auto max-h-[80vh]">
                {form.cover_image_url && (
                  <img
                    src={form.cover_image_url}
                    alt=""
                    className="w-full rounded-lg mb-4"
                  />
                )}
                <h1 className="text-3xl font-bold mb-2">{form.title || "Untitled"}</h1>
                {form.summary && (
                  <p className="text-muted-foreground mb-6">{form.summary}</p>
                )}
                {form.content.trim() ? (
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(form.content) }} />
                ) : (
                  <p className="text-muted-foreground italic">Preview will appear here…</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          <div>
            <Label htmlFor="slug">URL slug</Label>
            <Input
              id="slug"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                update("slug", slugify(e.target.value));
              }}
              placeholder="post-url-slug"
            />
            <p className="text-xs text-muted-foreground mt-1 truncate">
              /blog/{form.slug || "your-slug"}
            </p>
          </div>

          <div>
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={form.summary}
              onChange={(e) => update("summary", e.target.value)}
              placeholder="Short teaser shown in listings and social previews."
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {form.summary.length} chars · aim for 120–160
            </p>
          </div>

          <div>
            <Label htmlFor="cover">Cover image URL</Label>
            <Input
              id="cover"
              value={form.cover_image_url}
              onChange={(e) => update("cover_image_url", e.target.value)}
              placeholder="https://…"
            />
            {form.cover_image_url && (
              <img
                src={form.cover_image_url}
                alt=""
                className="mt-2 w-full h-32 object-cover rounded-md border"
              />
            )}
          </div>

          <div>
            <Label htmlFor="tags">Tags</Label>
            <div className="flex flex-wrap gap-1 mb-2 min-h-[28px]">
              {form.tags.map((t) => (
                <Badge key={t} variant="secondary" className="pr-1">
                  {t}
                  <button
                    onClick={() => update("tags", form.tags.filter((x) => x !== t))}
                    className="ml-1 hover:text-destructive"
                    aria-label={`Remove ${t}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag();
                }
              }}
              onBlur={addTag}
              placeholder="Add tag, press Enter"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="published" className="cursor-pointer">Published</Label>
              <p className="text-xs text-muted-foreground">Visible to everyone at /blog</p>
            </div>
            <Switch
              id="published"
              checked={form.published}
              onCheckedChange={(v) => update("published", v)}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
