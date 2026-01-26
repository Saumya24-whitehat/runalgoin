import { useState } from "react";
import { ChevronRight, ChevronDown, Search, Lightbulb } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { scanCategories, ScanExample } from "@/services/stockScreenerApi";
import { cn } from "@/lib/utils";

interface ScanCategoryListProps {
  onSelectScan: (scan: ScanExample) => void;
}

export function ScanCategoryList({ onSelectScan }: ScanCategoryListProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const filteredCategories = scanCategories
    .map((category) => ({
      ...category,
      scans: category.scans.filter(
        (scan) =>
          scan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          scan.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          scan.condition.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.scans.length > 0);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search scans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredCategories.map((category) => (
            <div key={category.name} className="mb-1">
              <button
                onClick={() => toggleCategory(category.name)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors",
                  "hover:bg-accent/50",
                  expandedCategories.includes(category.name) && "bg-accent/30"
                )}
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{category.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {category.scans.length} scans
                  </span>
                  {expandedCategories.includes(category.name) ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {expandedCategories.includes(category.name) && (
                <div className="ml-3 mt-1 space-y-1">
                  {category.scans.map((scan, index) => (
                    <button
                      key={index}
                      onClick={() => onSelectScan(scan)}
                      className={cn(
                        "w-full p-3 rounded-lg text-left transition-colors",
                        "border border-border/50 hover:border-primary/30 hover:bg-accent/30"
                      )}
                    >
                      <div className="font-medium text-sm">{scan.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {scan.description}
                      </div>
                      <code className="text-[10px] text-primary/80 mt-1 block font-mono">
                        {scan.condition.length > 40
                          ? scan.condition.substring(0, 40) + "..."
                          : scan.condition}
                      </code>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No scans found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
