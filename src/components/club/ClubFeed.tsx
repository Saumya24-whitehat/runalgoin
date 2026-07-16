import { format } from "date-fns";
import { useClubPosts } from "@/hooks/useClubPosts";
import { Loader2, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  categoryId: string | null;
}

export function ClubFeed({ categoryId }: Props) {
  const { posts, loading } = useClubPosts(categoryId);

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

  return (
    <div className="space-y-4">
      {posts.map((p) => {
        const initials = (p.author_name || "M").slice(0, 2).toUpperCase();
        return (
          <div key={p.id} className={`rounded-xl border p-4 shadow-sm ${p.is_admin ? "border-amber-500/60 bg-amber-500/5" : "border-border bg-card"}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm ${p.is_admin ? "bg-amber-500 text-white" : "bg-primary/20 text-primary"}`}>
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
