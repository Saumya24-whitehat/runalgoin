import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GripVertical } from "lucide-react";

export interface ColumnConfig {
  id: string;
  label: string;
  enabled: boolean;
}

export interface OptionBuilderSettingsConfig {
  callColumns: ColumnConfig[];
  putColumns: ColumnConfig[];
  showGreeksInChain: boolean;
  autoRefreshInterval: number; // in seconds, 0 = disabled
  liveFeedEnabled: boolean;
}

const DEFAULT_CALL_COLUMNS: ColumnConfig[] = [
  { id: "vega", label: "Vega", enabled: true },
  { id: "gamma", label: "Gamma", enabled: true },
  { id: "theta", label: "Theta", enabled: true },
  { id: "delta", label: "Delta", enabled: true },
  { id: "iv", label: "IV", enabled: true },
  { id: "coi", label: "COI", enabled: true },
  { id: "oi", label: "OI", enabled: true },
  { id: "volume", label: "Volume", enabled: true },
  { id: "ltp_chg", label: "LTP Chg", enabled: true },
  { id: "ltp", label: "LTP", enabled: true },
];

const DEFAULT_PUT_COLUMNS: ColumnConfig[] = [
  { id: "ltp", label: "LTP", enabled: true },
  { id: "ltp_chg", label: "LTP Chg", enabled: true },
  { id: "volume", label: "Volume", enabled: true },
  { id: "oi", label: "OI", enabled: true },
  { id: "coi", label: "COI", enabled: true },
  { id: "iv", label: "IV", enabled: true },
  { id: "delta", label: "Delta", enabled: true },
  { id: "theta", label: "Theta", enabled: true },
  { id: "gamma", label: "Gamma", enabled: true },
  { id: "vega", label: "Vega", enabled: true },
];

export const DEFAULT_SETTINGS: OptionBuilderSettingsConfig = {
  callColumns: DEFAULT_CALL_COLUMNS,
  putColumns: DEFAULT_PUT_COLUMNS,
  showGreeksInChain: false,
  autoRefreshInterval: 0,
  liveFeedEnabled: true,
};

interface OptionBuilderSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: OptionBuilderSettingsConfig;
  onSave: (settings: OptionBuilderSettingsConfig) => void;
}

const OptionBuilderSettings = ({ isOpen, onClose, settings, onSave }: OptionBuilderSettingsProps) => {
  const [localSettings, setLocalSettings] = useState<OptionBuilderSettingsConfig>(settings);
  const [draggedItem, setDraggedItem] = useState<{ side: "call" | "put"; index: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  const handleColumnToggle = (side: "call" | "put", columnId: string) => {
    const key = side === "call" ? "callColumns" : "putColumns";
    setLocalSettings((prev) => ({
      ...prev,
      [key]: prev[key].map((col) => (col.id === columnId ? { ...col, enabled: !col.enabled } : col)),
    }));
  };

  const handleDragStart = (side: "call" | "put", index: number) => {
    setDraggedItem({ side, index });
  };

  const handleDragOver = (e: React.DragEvent, side: "call" | "put", index: number) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.side !== side) return;

    const key = side === "call" ? "callColumns" : "putColumns";
    if (draggedItem.index === index) return;

    setLocalSettings((prev) => {
      const columns = [...prev[key]];
      const [removed] = columns.splice(draggedItem.index, 1);
      columns.splice(index, 0, removed);
      setDraggedItem({ side, index });
      return { ...prev, [key]: columns };
    });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS);
  };

  const renderColumnList = (side: "call" | "put", columns: ColumnConfig[]) => (
    <div className="space-y-1">
      {columns.map((col, index) => (
        <div
          key={col.id}
          draggable
          onDragStart={() => handleDragStart(side, index)}
          onDragOver={(e) => handleDragOver(e, side, index)}
          onDragEnd={handleDragEnd}
          className={`flex items-center space-x-2 p-1.5 rounded-md border border-transparent hover:border-border hover:bg-muted/50 cursor-grab active:cursor-grabbing transition-colors ${
            draggedItem?.side === side && draggedItem?.index === index ? "opacity-50 bg-muted" : ""
          }`}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Checkbox
            id={`${side}-${col.id}`}
            checked={col.enabled}
            onCheckedChange={() => handleColumnToggle(side, col.id)}
          />
          <label htmlFor={`${side}-${col.id}`} className="text-sm cursor-pointer flex-1">
            {col.label}
          </label>
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Option Builder Settings</DialogTitle>
          <DialogDescription>Customize the option chain display and behavior. Drag to reorder columns.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="columns" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="columns">Columns</TabsTrigger>
            <TabsTrigger value="behavior">Behavior</TabsTrigger>
          </TabsList>

          <TabsContent value="columns" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Call Columns */}
              <div className="space-y-3">
                <Label className="text-emerald-500 font-medium">Call Side</Label>
                {renderColumnList("call", localSettings.callColumns)}
              </div>

              {/* Put Columns */}
              <div className="space-y-3">
                <Label className="text-red-500 font-medium">Put Side</Label>
                {renderColumnList("put", localSettings.putColumns)}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="behavior" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="liveFeed"
                  checked={localSettings.liveFeedEnabled}
                  onCheckedChange={(checked) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      liveFeedEnabled: checked === true,
                    }))
                  }
                />
                <label htmlFor="liveFeed" className="text-sm cursor-pointer">
                  Enable live WebSocket feed
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showGreeks"
                  checked={localSettings.showGreeksInChain}
                  onCheckedChange={(checked) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      showGreeksInChain: checked === true,
                    }))
                  }
                />
                <label htmlFor="showGreeks" className="text-sm cursor-pointer">
                  Show Greeks in option chain
                </label>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OptionBuilderSettings;
