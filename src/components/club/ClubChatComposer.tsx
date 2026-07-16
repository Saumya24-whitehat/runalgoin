import { useRef, useState } from "react";
import { Send, Image as ImageIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Props {
  onSend: (body: string, imageUrl?: string | null) => Promise<void>;
}

export function ClubChatComposer({ onSend }: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const upload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const path = `${user.id}/chat/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("club-media").upload(path, file);
      if (error) throw error;
      const { data } = await supabase.storage.from("club-media").createSignedUrl(path, 60 * 60 * 24 * 30);
      setPendingImage(data?.signedUrl ?? null);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() && !pendingImage) return;
    setSending(true);
    await onSend(text, pendingImage);
    setText("");
    setPendingImage(null);
    setSending(false);
  };

  return (
    <form onSubmit={submit} className="border-t border-border bg-card p-3 space-y-2">
      {pendingImage && (
        <div className="relative inline-block">
          <img src={pendingImage} alt="attachment" className="max-h-24 rounded-md border" />
          <button
            type="button"
            onClick={() => setPendingImage(null)}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <ImageIcon className="w-4 h-4" />
        </Button>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="flex-1"
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={sending || uploading || (!text.trim() && !pendingImage)}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}
