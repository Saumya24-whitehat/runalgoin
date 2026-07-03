import { Info } from "lucide-react";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface InfoSection {
  heading: string;
  body: ReactNode;
}

export interface InfoLegendItem {
  label: string;
  text: string;
  color?: string;
}

interface PageInfoModalProps {
  title: string;
  subtitle?: string;
  overview: ReactNode;
  formula?: { label?: string; expression: string; note?: string };
  legend?: InfoLegendItem[];
  sections?: InfoSection[];
  howToUse?: ReactNode;
  tips?: string[];
  triggerLabel?: string;
}

export const PageInfoModal = ({
  title,
  subtitle,
  overview,
  formula,
  legend,
  sections,
  howToUse,
  tips,
  triggerLabel,
}: PageInfoModalProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-amber-500 border-amber-500/50 hover:bg-amber-500/10 h-9 gap-1.5"
        >
          <Info className="h-3.5 w-3.5" />
          {triggerLabel && <span className="text-xs">{triggerLabel}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-amber-500/5 to-transparent">
          <DialogTitle className="text-xl font-heading flex items-center gap-2">
            <Info className="h-5 w-5 text-amber-500" />
            {title}
          </DialogTitle>
          {subtitle && (
            <DialogDescription className="text-sm text-muted-foreground pt-1">
              {subtitle}
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] px-6 py-5">
          <div className="space-y-6">
            {/* Overview */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">
                Overview
              </h3>
              <div className="text-sm text-muted-foreground leading-relaxed">{overview}</div>
            </section>

            {/* Formula */}
            {formula && (
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">
                  {formula.label || "Formula"}
                </h3>
                <div className="rounded-md border border-border bg-muted/40 p-3 font-mono text-sm text-foreground">
                  {formula.expression}
                </div>
                {formula.note && (
                  <p className="text-xs text-muted-foreground mt-2">{formula.note}</p>
                )}
              </section>
            )}

            {/* Legend / interpretation */}
            {legend && legend.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                  Interpretation
                </h3>
                <div className="grid gap-2">
                  {legend.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-md border border-border/60 bg-card/50 p-3"
                    >
                      {item.color && (
                        <div
                          className="w-3 h-3 rounded-sm mt-1 shrink-0 ring-1 ring-border/50"
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                      <div className="text-sm">
                        <span className="font-semibold text-foreground">{item.label}</span>
                        <span className="text-muted-foreground"> — {item.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Custom sections */}
            {sections?.map((s, i) => (
              <section key={i}>
                <h3 className="text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">
                  {s.heading}
                </h3>
                <div className="text-sm text-muted-foreground leading-relaxed">{s.body}</div>
              </section>
            ))}

            {/* How to use */}
            {howToUse && (
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">
                  How to Use
                </h3>
                <div className="text-sm text-muted-foreground leading-relaxed">{howToUse}</div>
              </section>
            )}

            {/* Tips */}
            {tips && tips.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">
                  Pro Tips
                </h3>
                <ul className="space-y-1.5">
                  {tips.map((tip, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="text-amber-500 shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
