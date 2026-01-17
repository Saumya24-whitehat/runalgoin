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
  { id: "oi", label: "OI", enabled: true },
  { id: "coi", label: "COI", enabled: true },
  { id: "volume", label: "Volume", enabled: true },
  { id: "iv", label: "IV", enabled: true },
  { id: "ltp", label: "LTP", enabled: true },
  { id: "delta", label: "Delta", enabled: false },
  { id: "gamma", label: "Gamma", enabled: false },
  { id: "theta", label: "Theta", enabled: false },
  { id: "vega", label: "Vega", enabled: false },
];

const DEFAULT_PUT_COLUMNS: ColumnConfig[] = [
  { id: "ltp", label: "LTP", enabled: true },
  { id: "iv", label: "IV", enabled: true },
  { id: "volume", label: "Volume", enabled: true },
  { id: "oi", label: "OI", enabled: true },
  { id: "coi", label: "COI", enabled: true },
  { id: "delta", label: "Delta", enabled: false },
  { id: "gamma", label: "Gamma", enabled: false },
  { id: "theta", label: "Theta", enabled: false },
  { id: "vega", label: "Vega", enabled: false },
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

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS);
  };

  console.log(localSettings.callColumns);
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Option Builder Settings</DialogTitle>
          <DialogDescription>Customize the option chain display and behavior</DialogDescription>
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
                <div className="space-y-2">
                  {[
                    { id: "oi", label: "OI", enabled: true },
                    { id: "coi", label: "COI", enabled: true },
                    { id: "volume", label: "Volume", enabled: true },
                    { id: "iv", label: "IV", enabled: true },
                    { id: "ltp", label: "LTP", enabled: true },
                    { id: "delta", label: "Delta", enabled: false },
                    { id: "gamma", label: "Gamma", enabled: false },
                    { id: "theta", label: "Theta", enabled: false },
                    { id: "vega", label: "Vega", enabled: false },
                  ].map((col) => (
                    <div key={col.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`call-${col.id}`}
                        checked={col.enabled}
                        onCheckedChange={() => handleColumnToggle("call", col.id)}
                      />
                      <label htmlFor={`call-${col.id}`} className="text-sm cursor-pointer">
                        {col.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Put Columns */}
              <div className="space-y-3">
                <Label className="text-red-500 font-medium">Put Side</Label>
                <div className="space-y-2">
                  {[
                      { id: "oi", label: "OI`", enabled: true },
                      { id: "coi", label: "COI", enabled: true },
                      { id: "volume", label: "Volume", enabled: true },
                      { id: "iv", label: "IV", enabled: true },
                      { id: "ltp", label: "LTP", enabled: true },
                      { id: "delta", label: "Delta", enabled: false },
                      { id: "gamma", label: "Gamma", enabled: false },
                      { id: "theta", label: "Theta", enabled: false },
                      { id: "vega", label: "Vega", enabled: false },
                    ]`.map((col) => (
                    <div key={col.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`put-${col.id}`}
                        checked={col.enabled}
                        onCheckedChange={() => handleColumnToggle("put", col.id)}
                      />
                      <label htmlFor={`put-${col.id}`} className="text-sm cursor-pointer">
                        {col.label}
                      </label>
                    </div>
                  ))}
                </div>
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
