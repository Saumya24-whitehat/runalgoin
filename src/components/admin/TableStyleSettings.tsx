// TableStyleSettings.tsx

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, RotateCcw, Save, Eye, Loader2 } from "lucide-react";
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
  callItmBg: "220 15% 94% 0.3",
  putItmBg: "220 15% 94% 0.3",
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
  callItmBg: "0 62% 30% 0.3",
  putItmBg: "142 70% 25% 0.3",
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

const STYLE_FIELDS = [
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
  { key: "highlight1Call", label: "Highlight #1 Call", description: "Primary call highlight" },
  { key: "highlight1Put", label: "Highlight #1 Put", description: "Primary put highlight" },
  { key: "highlight2", label: "Highlight #2", description: "Amber highlight" },
  { key: "highlight3", label: "Highlight #3", description: "Pink highlight" },
  { key: "highlight4", label: "Highlight #4", description: "Gray highlight" },
  { key: "strikeColBg", label: "Strike Column Background", description: "Background for strike price column" },
  { key: "totalsRowBg", label: "Totals Row Background", description: "Background for totals row" },
];

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

  const toHex = (c: number) => ("0" + Math.round(c * 255).toString(16)).slice(-2);

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex: string, alpha?: string): string {
  hex = hex.replace("#", "");

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);

  return alpha ? `${hDeg} ${sPct}% ${lPct}% / ${alpha}` : `${hDeg} ${sPct}% ${lPct}%`;
}

export function TableStyleSettings({ isOpen, onClose }) {
  const { toast } = useToast();
  const [lightConfig, setLightConfig] = useState(DEFAULT_LIGHT_CONFIG);
  const [darkConfig, setDarkConfig] = useState(DEFAULT_DARK_CONFIG);
  const [activeTab, setActiveTab] = useState("dark");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load styles from JSON instead of Supabase
  useEffect(() => {
    if (!isOpen) return;

    const loadStyles = async () => {
      setLoading(true);

      try {
        const response = await fetch("https://runalgo.xyz/data/tableStyles.json?ts=" + Date.now());
        const data = await response.json();

        if (data.light_config) setLightConfig(data.light_config);
        if (data.dark_config) setDarkConfig(data.dark_config);
      } catch (err) {
        console.error("Failed to load JSON:", err);
      }

      setLoading(false);
    };

    loadStyles();
  }, [isOpen]);

  const applyStyles = (config: TableStyleConfig) => {
    const root = document.documentElement;
    Object.entries(config).forEach(([key, value]) => {
      root.style.setProperty(`--oc-${key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}`, value);
    });
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const response = await fetch("https://runalgo.xyz/data/updateTableStyles.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          light_config: lightConfig,
          dark_config: darkConfig,
        }),
      });

      const res = await response.json();

      if (!res.success) throw new Error(res.message);

      toast({ title: "Success", description: "Styles saved." });

      const isDark = document.documentElement.classList.contains("dark");
      applyStyles(isDark ? darkConfig : lightConfig);

      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save styles", variant: "destructive" });
    }

    setSaving(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Option Chain Table Style Settings
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="dark">Dark Mode</TabsTrigger>
                <TabsTrigger value="light">Light Mode</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {STYLE_FIELDS.map((field) => {
                    const value = currentConfig[field.key];
                    const hexValue = hslToHex(value);
                    const alpha = value.includes("/") ? value.split("/")[1].trim() : undefined;

                    return (
                      <div key={field.key} className="p-3 bg-muted/30 border rounded">
                        <div className="flex justify-between">
                          <Label>{field.label}</Label>
                          <div className="w-8 h-8 rounded border" style={{ background: `hsl(${value})` }}></div>
                        </div>

                        <p className="text-xs opacity-70 mb-2">{field.description}</p>

                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={hexValue}
                            onChange={(e) => {
                              const newHsl = hexToHsl(e.target.value, alpha);
                              setCurrentConfig((prev) => ({ ...prev, [field.key]: newHsl }));
                            }}
                            className="w-12 h-8"
                          />

                          <Input
                            type="text"
                            value={value}
                            onChange={(e) => setCurrentConfig((prev) => ({ ...prev, [field.key]: e.target.value }))}
                            className="flex-1 text-xs font-mono"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between mt-4 pt-4 border-t">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-1" /> Reset Defaults
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePreview}>
                  <Eye className="h-4 w-4 mr-1" /> Preview
                </Button>

                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Save
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
