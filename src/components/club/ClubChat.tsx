import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { useClubChat } from "@/hooks/useClubChat";
import { useAuth } from "@/contexts/AuthContext";
import { ClubChatComposer } from "./ClubChatComposer";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface Props {
  categoryId: string | null;
  categoryName?: string;
}

export function ClubChat({ categoryId, categoryName }: Props) {
  const { user } = useAuth();
  const { messages, loading, send } = useClubChat(categoryId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!categoryId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a room to start chatting
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border px-4 py-3 bg-card">
        <h3 className="font-semibold text-sm">#{categoryName}</h3>
        <p className="text-xs text-muted-foreground">Live chat • members only</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No messages yet — say hi 👋
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.user_id === user?.id;
            const isAdminMsg = !!m.is_admin;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                    isAdminMsg
                      ? "bg-amber-500/15 border-2 border-amber-500/60 text-foreground rounded-bl-sm"
                      : mine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border border-border rounded-bl-sm",
                  )}
                >
                  {(!mine || isAdminMsg) && (
                    <div className="text-[11px] font-semibold mb-0.5 flex items-center gap-1">
                      {isAdminMsg && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] uppercase tracking-wide">
                          Admin
                        </span>
                      )}
                      <span className={isAdminMsg ? "text-amber-700 dark:text-amber-400" : "text-primary"}>
                        {m.author_name}
                      </span>
                    </div>
                  )}
                  {m.image_url && (
                    <img src={m.image_url} alt="" className="rounded-md mb-1 max-h-64" />
                  )}
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div
                    className={cn(
                      "text-[10px] mt-1 text-right",
                      mine && !isAdminMsg ? "text-primary-foreground/70" : "text-muted-foreground",
                    )}
                  >
                    {format(new Date(m.created_at), "HH:mm")}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <ClubChatComposer onSend={send} />
    </div>
  );
}
