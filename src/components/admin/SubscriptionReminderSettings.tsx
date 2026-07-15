import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, Send, Bell } from "lucide-react";
import { toast } from "sonner";

interface Settings {
  notify_days: number[];
  enabled: boolean;
}

export function SubscriptionReminderSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [settings, setSettings] = useState<Settings>({ notify_days: [], enabled: true });
  const [newDay, setNewDay] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("subscription_reminder_settings")
      .select("notify_days, enabled")
      .eq("id", 1)
      .maybeSingle();
    if (error) toast.error("Failed to load settings");
    else if (data) setSettings({
      notify_days: [...(data.notify_days || [])].sort((a, b) => b - a),
      enabled: !!data.enabled,
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sortedDays = useMemo(
    () => [...settings.notify_days].sort((a, b) => b - a),
    [settings.notify_days]
  );

  const persist = async (next: Settings) => {
    setSaving(true);
    const { error } = await supabase
      .from("subscription_reminder_settings")
      .update({
        notify_days: next.notify_days,
        enabled: next.enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      toast.error("Save failed: " + error.message);
      return false;
    }
    toast.success("Settings saved");
    return true;
  };

  const addDay = async () => {
    const n = Number(newDay);
    if (!Number.isInteger(n) || n < 1 || n > 90) {
      toast.error("Enter a whole number between 1 and 90");
      return;
    }
    if (settings.notify_days.includes(n)) {
      toast.error(`${n} days is already in the list`);
      return;
    }
    const next = {
      ...settings,
      notify_days: [...settings.notify_days, n].sort((a, b) => b - a),
    };
    setSettings(next);
    setNewDay("");
    await persist(next);
  };

  const removeDay = async (d: number) => {
    const next = { ...settings, notify_days: settings.notify_days.filter((x) => x !== d) };
    setSettings(next);
    await persist(next);
  };

  const toggleEnabled = async (v: boolean) => {
    const next = { ...settings, enabled: v };
    setSettings(next);
    await persist(next);
  };

  const runNow = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("notify-expiring-subscriptions", {
      body: {},
    });
    setRunning(false);
    if (error) toast.error("Run failed: " + error.message);
    else toast.success(`Queued ${data?.totalQueued ?? 0} email(s), skipped ${data?.totalSkipped ?? 0}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bell className="h-5 w-5" /> Subscription Expiry Reminders
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Users on paid plans get an email when their subscription is X days away from expiring.
          A daily job runs automatically each morning.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enable reminders</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <Label htmlFor="reminders-enabled" className="text-sm">
            When off, no reminder emails are sent.
          </Label>
          <Switch
            id="reminders-enabled"
            checked={settings.enabled}
            onCheckedChange={toggleEnabled}
            disabled={saving}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification days</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Add the number of days before expiry when a reminder should be sent. Each user gets at
            most one reminder per day threshold.
          </p>

          <div className="flex flex-wrap gap-2 min-h-[40px]">
            {sortedDays.length === 0 && (
              <span className="text-xs text-muted-foreground italic">
                No reminder days configured. Add one below.
              </span>
            )}
            {sortedDays.map((d) => (
              <Badge
                key={d}
                variant="secondary"
                className="pl-3 pr-1 py-1.5 text-sm gap-2"
              >
                {d} {d === 1 ? "day" : "days"} before
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 hover:bg-destructive/20"
                  onClick={() => removeDay(d)}
                  disabled={saving}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>

          <div className="flex items-end gap-2 pt-2">
            <div className="flex-1 max-w-[180px]">
              <Label htmlFor="new-day" className="text-xs">
                Days before expiry
              </Label>
              <Input
                id="new-day"
                type="number"
                min={1}
                max={90}
                placeholder="e.g. 5"
                value={newDay}
                onChange={(e) => setNewDay(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addDay()}
              />
            </div>
            <Button onClick={addDay} disabled={saving || !newDay} className="gap-1">
              <Plus className="h-4 w-4" /> Add day
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run now</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Trigger the reminder job immediately (useful for testing). Already-sent reminders will
            be skipped.
          </p>
          <Button onClick={runNow} disabled={running || !settings.enabled} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
