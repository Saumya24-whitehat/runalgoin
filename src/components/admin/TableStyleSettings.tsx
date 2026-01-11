import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, RotateCcw, Save, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface TableStyleConfig {
  callItmBg: string;
  putItmBg: string;
  atmBg: string;
  atmText: string;
  callHeaderBg: string;
  putHeaderBg: string;
  positive: string;
  negative: string;
  maxOiCall: string;
  maxOiPut: string;
  highlight1Call: string;
  highlight1Put: string;
  highlight2: string;
  highlight3: string;
  highlight4: string;
  strikeColBg: string;
  totalsRowBg: string;
}

const DEFAULT_LIGHT_CONFIG: TableStyleConfig = {
  callItmBg: "220 15% 94% / 0.3",
  putItmBg: "220 15% 94% / 0.3",
  atmBg: "45 93% 47% / 0.2",
  atmText: "45 93% 55%",
  callHeaderBg: "0 72% 51% / 0.1",
  putHeaderBg: "142 76% 36% / 0.1",
  positive: "142 76% 36%",
  negative: "0 72% 51%",
  maxOiCall: "190 80% 45% / 0.2",
  maxOiPut: "142 70% 40% / 0.2",
  highlight1Call: "0 65% 45%",
  highlight1Put: "142 70% 35%",
  highlight2: "38 92% 50%",
  highlight3: "330 81% 60%",
  highlight4: "220 10% 50%",
  strikeColBg: "220 15% 95%",
  totalsRowBg: "220 15% 90%",
};

const DEFAULT_DARK_CONFIG: TableStyleConfig = {
  callItmBg: "0 62% 30% / 0.3",
  putItmBg: "142 70% 25% / 0.3",
  atmBg: "45 93% 50% / 0.2",
  atmText: "45 93% 60%",
  callHeaderBg: "0 62% 50% / 0.1",
  putHeaderBg: "142 70% 45% / 0.1",
  positive: "142 70% 45%",
  negative: "0 62% 50%",
  maxOiCall: "190 80% 50% / 0.2",
  maxOiPut: "142 70% 45% / 0.2",
  highlight1Call: "0 65% 45%",
  highlight1Put: "142 70% 35%",
  highlight2: "38 92% 50%",
  highlight3: "330 81% 60%",
  highlight4: "220 10% 50%",
  strikeColBg: "220 25% 12%",
  totalsRowBg: "220 20% 15%",
};

interface TableStyleSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

function hslToHex(hsl: string): string {
  const parts = hsl.split(/[\s/]+/).filter(Boolean);
  if (parts.length < 3) return "#888888";

  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex: string, alpha?: string): string {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);

  if (alpha) {
    return `${hDeg} ${sPct}% ${lPct}% / ${alpha}`;
  }
  return `${hDeg} ${sPct}% ${lPct}%`;
}

const STYLE_FIELDS: { key: keyof TableStyleConfig; label: string; description: string; hasAlpha?: boolean }[] = [
  {
    key: "callItmBg",
    label: "Call ITM Background",
    description: "Background for in-the-money call options",
    hasAlpha: true,
  },
  {
    key: "putItmBg",
    label: "Put ITM Background",
    description: "Background for in-the-money put options",
    hasAlpha: true,
  },
  { key: "atmBg", label: "ATM Row Background", description: "Background for at-the-money strike", hasAlpha: true },
  { key: "atmText", label: "ATM Text Color", description: "Text color for ATM strike" },
  {
    key: "callHeaderBg",
    label: "Call Header Background",
    description: "Header background for call side",
    hasAlpha: true,
  },
  { key: "putHeaderBg", label: "Put Header Background", description: "Header background for put side", hasAlpha: true },
  { key: "positive", label: "Positive Value Color", description: "Color for positive changes" },
  { key: "negative", label: "Negative Value Color", description: "Color for negative changes" },
  {
    key: "maxOiCall",
    label: "Max OI Call Highlight",
    description: "Highlight for max OI on call side",
    hasAlpha: true,
  },
  { key: "maxOiPut", label: "Max OI Put Highlight", description: "Highlight for max OI on put side", hasAlpha: true },
  { key: "highlight1Call", label: "Highlight #1 Call", description: "Primary highlight color for calls (resistance)" },
  { key: "highlight1Put", label: "Highlight #1 Put", description: "Primary highlight color for puts (support)" },
  { key: "highlight2", label: "Highlight #2", description: "Secondary highlight (amber)" },
  { key: "highlight3", label: "Highlight #3", description: "Tertiary highlight (pink)" },
  { key: "highlight4", label: "Highlight #4", description: "Quaternary highlight (gray)" },
  { key: "strikeColBg", label: "Strike Column Background", description: "Background for strike price column" },
  { key: "totalsRowBg", label: "Totals Row Background", description: "Background for totals/summary row" },
];

export function TableStyleSettings({ isOpen, onClose }: TableStyleSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lightConfig, setLightConfig] = useState<TableStyleConfig>(DEFAULT_LIGHT_CONFIG);
  const [darkConfig, setDarkConfig] = useState<TableStyleConfig>(DEFAULT_DARK_CONFIG);
  const [activeTab, setActiveTab] = useState<"dark" | "light">("dark");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load styles from database
  useEffect(() => {
    const loadStyles = async () => {
      try {
        const data = {
          light_config: {
            atmBg: "45 93% 47% / 0.2",
            atmText: "45 93% 55%",
            maxOiPut: "142 70% 40% / 0.2",
            negative: "0 72% 51%",
            positive: "142 76% 36%",

            callItmBg: "220 15% 94% / 0.3",
            putItmBg: "220 15% 94% / 0.3",
            maxOiCall: "190 80% 45% / 0.2",
            highlight2: "38 92% 50%",
            highlight3: "330 81% 60%",
            highlight4: "220 10% 50%",
            putHeaderBg: "142 76% 36% / 0.1",
            strikeColBg: "220 15% 95%",
            totalsRowBg: "220 15% 90%",
            callHeaderBg: "0 72% 51% / 0.1",
            highlight1Put: "142 70% 35%",
            highlight1Call: "0 65% 45%",
          },
          dark_config: {
            atmBg: "45 93% 50% / 0.2",
            atmText: "45 93% 60%",
            maxOiPut: "142 70% 45% / 0.2",
            negative: "0 62% 50%",
            positive: "142 70% 45%",
            callItmBg: "0 62% 30% / 0.3",
            putItmBg: "142 70% 25% / 0.3",
            maxOiCall: "190 80% 50% / 0.2",
            highlight2: "38 92% 50%",
            highlight3: "330 81% 60%",
            highlight4: "220 10% 50%",
            putHeaderBg: "142 70% 45% / 0.1",
            strikeColBg: "220 25% 12%",
            totalsRowBg: "220 20% 15%",
            callHeaderBg: "0 62% 50% / 0.1",
            highlight1Put: "142 70% 35%",
            highlight1Call: "0 65% 45%",
          },
        };

        if (data) {
          if (data.light_config) setLightConfig(data.light_config as unknown as TableStyleConfig);
          if (data.dark_config) setDarkConfig(data.dark_config as unknown as TableStyleConfig);
        }
      } catch (err) {
        console.error("Error loading styles:", err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadStyles();
    }
  }, [isOpen]);

  const applyStyles = (config: TableStyleConfig) => {
    const root = document.documentElement;

    const setCSSVar = (name: string, value: string) => {
      root.style.setProperty(`--oc-${name}`, value);
    };

    setCSSVar("call-itm-bg", config.callItmBg);
    setCSSVar("put-itm-bg", config.putItmBg);
    setCSSVar("atm-bg", config.atmBg);
    setCSSVar("atm-text", config.atmText);
    setCSSVar("call-header-bg", config.callHeaderBg);
    setCSSVar("put-header-bg", config.putHeaderBg);
    setCSSVar("positive", config.positive);
    setCSSVar("negative", config.negative);
    setCSSVar("max-oi-call", config.maxOiCall);
    setCSSVar("max-oi-put", config.maxOiPut);
    setCSSVar("highlight-1-call", config.highlight1Call);
    setCSSVar("highlight-1-put", config.highlight1Put);
    setCSSVar("highlight-2", config.highlight2);
    setCSSVar("highlight-3", config.highlight3);
    setCSSVar("highlight-4", config.highlight4);
    setCSSVar("strike-col-bg", config.strikeColBg);
    setCSSVar("totals-row-bg", config.totalsRowBg);
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save styles",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from("table_styles")
        .select("id")
        .eq("style_key", "global")
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from("table_styles")
          .update({
            light_config: JSON.parse(JSON.stringify(lightConfig)),
            dark_config: JSON.parse(JSON.stringify(darkConfig)),
            updated_by: user.id,
          })
          .eq("style_key", "global");

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase.from("table_styles").insert([
          {
            style_key: "global",
            light_config: JSON.parse(JSON.stringify(lightConfig)),
            dark_config: JSON.parse(JSON.stringify(darkConfig)),
            updated_by: user.id,
          },
        ]);

        if (error) throw error;
      }

      // Apply current theme's styles
      const isDark = document.documentElement.classList.contains("dark");
      applyStyles(isDark ? darkConfig : lightConfig);

      toast({
        title: "Success",
        description: "Table styles saved successfully",
      });

      onClose();
    } catch (err) {
      console.error("Error saving styles:", err);
      toast({
        title: "Error",
        description: "Failed to save table styles",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLightConfig(DEFAULT_LIGHT_CONFIG);
    setDarkConfig(DEFAULT_DARK_CONFIG);
  };

  const handlePreview = () => {
    const isDark = document.documentElement.classList.contains("dark");
    applyStyles(isDark ? darkConfig : lightConfig);
  };

  const currentConfig = activeTab === "dark" ? darkConfig : lightConfig;
  const setCurrentConfig = activeTab === "dark" ? setDarkConfig : setLightConfig;

  const updateField = (key: keyof TableStyleConfig, value: string) => {
    setCurrentConfig((prev) => ({ ...prev, [key]: value }));
  };

  const getAlphaFromHsl = (hsl: string): string => {
    const parts = hsl.split("/");
    if (parts.length > 1) {
      return parts[1].trim();
    }
    return "";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Palette className="h-5 w-5" />
            Option Chain Table Style Settings (Admin)
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "dark" | "light")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="dark">Dark Mode</TabsTrigger>
                <TabsTrigger value="light">Light Mode</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="max-h-[60vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {STYLE_FIELDS.map((field) => {
                    const value = currentConfig[field.key];
                    const hexValue = hslToHex(value);
                    const alpha = getAlphaFromHsl(value);

                    return (
                      <div key={field.key} className="p-3 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-medium">{field.label}</Label>
                          <div
                            className="w-8 h-8 rounded border border-border shadow-sm"
                            style={{ backgroundColor: `hsl(${value})` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{field.description}</p>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="color"
                            value={hexValue}
                            onChange={(e) => {
                              const newHsl = hexToHsl(e.target.value, field.hasAlpha ? alpha || "0.3" : undefined);
                              updateField(field.key, newHsl);
                            }}
                            className="w-12 h-8 p-0.5 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={value}
                            onChange={(e) => updateField(field.key, e.target.value)}
                            className="flex-1 text-xs font-mono bg-background"
                            placeholder="H S% L% / A"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between mt-4 pt-4 border-t border-border">
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset to Defaults
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePreview} className="gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2 bg-primary hover:bg-primary/90">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Hook to load and apply saved styles on app initialization (for all users)
export function useTableStyles() {
  useEffect(() => {
    const loadAndApplyStyles = async () => {
      try {
        const data = {
          light_config: {
            atmBg: "45 93% 47% / 0.2",
            atmText: "45 93% 55%",
            maxOiPut: "142 70% 40% / 0.2",
            negative: "0 72% 51%",
            positive: "142 76% 36%",

            callItmBg: "220 15% 94% / 0.3",
            putItmBg: "220 15% 94% / 0.3",
            maxOiCall: "190 80% 45% / 0.2",
            highlight2: "38 92% 50%",
            highlight3: "330 81% 60%",
            highlight4: "220 10% 50%",
            putHeaderBg: "142 76% 36% / 0.1",
            strikeColBg: "220 15% 95%",
            totalsRowBg: "220 15% 90%",
            callHeaderBg: "0 72% 51% / 0.1",
            highlight1Put: "142 70% 35%",
            highlight1Call: "0 65% 45%",
          },
          dark_config: {
            atmBg: "45 93% 50% / 0.2",
            atmText: "45 93% 60%",
            maxOiPut: "142 70% 45% / 0.2",
            negative: "0 62% 50%",
            positive: "142 70% 45%",
            callItmBg: "0 62% 30% / 0.3",
            putItmBg: "142 70% 25% / 0.3",
            maxOiCall: "190 80% 50% / 0.2",
            highlight2: "38 92% 50%",
            highlight3: "330 81% 60%",
            highlight4: "220 10% 50%",
            putHeaderBg: "142 70% 45% / 0.1",
            strikeColBg: "220 25% 12%",
            totalsRowBg: "220 20% 15%",
            callHeaderBg: "0 62% 50% / 0.1",
            highlight1Put: "142 70% 35%",
            highlight1Call: "0 65% 45%",
          },
        };

        if (data) {
          const isDark = document.documentElement.classList.contains("dark");
          const config = isDark ? data.dark_config : data.light_config;

          if (config) {
            const root = document.documentElement;
            const styleConfig = config as unknown as TableStyleConfig;

            Object.entries({
              "call-itm-bg": styleConfig.callItmBg,
              "put-itm-bg": styleConfig.putItmBg,
              "atm-bg": styleConfig.atmBg,
              "atm-text": styleConfig.atmText,
              "call-header-bg": styleConfig.callHeaderBg,
              "put-header-bg": styleConfig.putHeaderBg,
              positive: styleConfig.positive,
              negative: styleConfig.negative,
              "max-oi-call": styleConfig.maxOiCall,
              "max-oi-put": styleConfig.maxOiPut,
              "highlight-1-call": styleConfig.highlight1Call,
              "highlight-1-put": styleConfig.highlight1Put,
              "highlight-2": styleConfig.highlight2,
              "highlight-3": styleConfig.highlight3,
              "highlight-4": styleConfig.highlight4,
              "strike-col-bg": styleConfig.strikeColBg,
              "totals-row-bg": styleConfig.totalsRowBg,
            }).forEach(([key, value]) => {
              if (value) root.style.setProperty(`--oc-${key}`, value as string);
            });
          }
        }
      } catch (err) {
        console.error("Failed to apply saved table styles:", err);
      }
    };

    loadAndApplyStyles();

    // Also listen for theme changes to reapply correct styles
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          loadAndApplyStyles();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);
}

export default TableStyleSettings;
