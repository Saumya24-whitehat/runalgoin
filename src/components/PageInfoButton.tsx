import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface PageInfoButtonProps {
  title: string;
  description: string;
  details?: { label: string; text: string; color?: string }[];
}

export const PageInfoButton = ({ title, description, details }: PageInfoButtonProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-amber-500 border-amber-500/50 hover:bg-amber-500/10 h-9">
          <Info className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
          {details && details.length > 0 && (
            <div className="space-y-2 text-xs">
              {details.map((d, i) => (
                <div key={i} className="flex items-start gap-2">
                  {d.color && <div className="w-3 h-3 rounded mt-0.5 shrink-0" style={{ backgroundColor: d.color }} />}
                  <div>
                    <span className="font-medium">{d.label}:</span>
                    <span className="text-muted-foreground"> {d.text}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
