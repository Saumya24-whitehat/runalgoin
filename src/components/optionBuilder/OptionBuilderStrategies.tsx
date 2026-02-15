import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, MoreHorizontal } from "lucide-react";
import strategySVGData from "@/data/StrategySVGData.json";
import CreateCustomStrategyModal, { CustomStrategyDefinition } from "./CreateCustomStrategyModal";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { toast } from "sonner";

interface StrategyData {
  svg: string;
  type: "bullish" | "bearish" | "neutral" | "others";
}

interface Strategy {
  id: string;
  name: string;
  category: "bullish" | "bearish" | "neutral" | "others";
  svgUrl: string;
}

const formatStrategyName = (id: string): string => {
  return id
    .replace(/-[A-Za-z0-9]{8}$/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const categoryIcons: Record<string, React.ElementType> = {
  bullish: TrendingUp,
  bearish: TrendingDown,
  neutral: Minus,
  others: MoreHorizontal,
};

const categoryColors: Record<string, string> = {
  bullish: "text-green-500",
  bearish: "text-red-500",
  neutral: "text-yellow-500",
  others: "text-blue-500",
};

interface OptionBuilderStrategiesProps {
  onSelectStrategy: (strategyId: string) => void;
  onCreateCustomStrategy?: (strategy: CustomStrategyDefinition) => void;
}

const OptionBuilderStrategies = ({ onSelectStrategy, onCreateCustomStrategy }: OptionBuilderStrategiesProps) => {
  const [filter, setFilter] = useState<"all" | "bullish" | "bearish" | "neutral" | "others">("bullish");
  const [showCustomModal, setShowCustomModal] = useState(false);

  const { value: customStrategies, setValue: setCustomStrategies } = useUserPreferences<CustomStrategyDefinition[]>({
    key: "custom_strategies",
    defaultValue: [],
  });

  const strategies: Strategy[] = useMemo(() => {
    const data = strategySVGData as Record<string, StrategyData>;
    return Object.entries(data).map(([id, info]) => ({
      id,
      name: formatStrategyName(id),
      category: info.type,
      svgUrl: `https://runalgo.xyz/strategyBuilderWAutoPlay/svg/${info.svg}`,
    }));
  }, []);

  const filteredStrategies = filter === "all" ? strategies : strategies.filter((s) => s.category === filter);
  const filteredCustom = filter === "all" ? customStrategies : customStrategies.filter((s) => s.category === filter);

  const handleCreateCustom = (strategy: CustomStrategyDefinition) => {
    const updated = [...customStrategies, strategy];
    setCustomStrategies(updated);
    onCreateCustomStrategy?.(strategy);
    toast.success(`Strategy "${strategy.name}" saved`);
  };

  const handleDeleteCustom = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const name = filteredCustom[index].name;
    // Find the actual index in the full array
    const actualIndex = customStrategies.indexOf(filteredCustom[index]);
    const updated = customStrategies.filter((_, i) => i !== actualIndex);
    setCustomStrategies(updated);
    toast.success(`Deleted "${name}"`);
  };

  const handleSelectCustom = (strategy: CustomStrategyDefinition) => {
    onCreateCustomStrategy?.(strategy);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Button variant={filter === "bullish" ? "default" : "outline"} size="sm" onClick={() => setFilter("bullish")}>
            Bullish
          </Button>
          <Button variant={filter === "bearish" ? "default" : "outline"} size="sm" onClick={() => setFilter("bearish")}>
            Bearish
          </Button>
          <Button variant={filter === "neutral" ? "default" : "outline"} size="sm" onClick={() => setFilter("neutral")}>
            Neutral
          </Button>
          <Button variant={filter === "others" ? "default" : "outline"} size="sm" onClick={() => setFilter("others")}>
            Others
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {/* Create Custom Strategy Card */}
          <Card
            className="cursor-pointer hover:border-primary transition-colors border-dashed"
            onClick={() => setShowCustomModal(true)}
          >
            <CardContent className="p-3 text-center flex flex-col items-center justify-center h-full min-h-[80px]">
              <Plus className="h-6 w-6 text-muted-foreground mb-1" />
              <div className="text-xs font-medium text-muted-foreground">Create Custom</div>
            </CardContent>
          </Card>

          {/* Saved Custom Strategies */}
          {filteredCustom.map((custom, index) => {
            const Icon = categoryIcons[custom.category] || MoreHorizontal;
            const color = categoryColors[custom.category] || "text-muted-foreground";
            return (
              <Card
                key={`custom-${index}`}
                className="cursor-pointer hover:border-primary transition-colors relative group"
                onClick={() => handleSelectCustom(custom)}
              >
                <CardContent className="p-3 text-center">
                  <div className="w-full h-12 mb-2 bg-muted/50 rounded flex flex-col items-center justify-center gap-0.5">
                    <Icon className={`h-5 w-5 ${color}`} />
                    <span className="text-[10px] text-muted-foreground">{custom.legs.length} legs · {custom.expiryType?.replace("_", " ") || "weekly"}</span>
                  </div>
                  <div className="text-xs font-medium truncate">{custom.name}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteCustom(index, e)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          {/* Built-in Strategies */}
          {filteredStrategies.map((strategy) => (
            <Card
              key={strategy.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => onSelectStrategy(strategy.id)}
            >
              <CardContent className="p-3 text-center">
                {strategy.svgUrl ? (
                  <img
                    src={strategy.svgUrl}
                    alt={strategy.name}
                    className="w-full h-12 mb-2 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-12 mb-2 bg-muted rounded flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">No preview</span>
                  </div>
                )}
                <div className="text-xs font-medium truncate">{strategy.name}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <CreateCustomStrategyModal
          open={showCustomModal}
          onOpenChange={setShowCustomModal}
          onCreateStrategy={handleCreateCustom}
        />
      </CardContent>
    </Card>
  );
};

export default OptionBuilderStrategies;
