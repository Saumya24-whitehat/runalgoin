import { Badge } from "@/components/ui/badge";
import { Direction } from "@/utils/nitinBhaiyaEngine";

export function SignalBadge({ direction }: { direction: Direction }) {
  return <Badge variant={direction === "neutral" ? "secondary" : direction === "bullish" ? "default" : "destructive"} className={direction === "bullish" ? "bg-success text-success-foreground" : ""}>{direction.toUpperCase()}</Badge>;
}
