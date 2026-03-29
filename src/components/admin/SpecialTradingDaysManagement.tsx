import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarPlus, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface SpecialTradingDay {
  id: string;
  date: string;
  type: string;
  description: string | null;
  trading_hours: string | null;
  created_at: string;
}

export function SpecialTradingDaysManagement() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newType, setNewType] = useState("trading_day");
  const [newDesc, setNewDesc] = useState("");
  const [newHours, setNewHours] = useState("");

  const { data: days = [], isLoading } = useQuery({
    queryKey: ["special-trading-days-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_trading_days" as any)
        .select("*")
        .order("date", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as SpecialTradingDay[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("special_trading_days" as any)
        .insert({
          date: newDate,
          type: newType,
          description: newDesc || null,
          trading_hours: newHours || null,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Special trading day added");
      queryClient.invalidateQueries({ queryKey: ["special-trading-days"] });
      queryClient.invalidateQueries({ queryKey: ["special-trading-days-admin"] });
      setOpen(false);
      setNewDate("");
      setNewDesc("");
      setNewHours("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("special_trading_days" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["special-trading-days"] });
      queryClient.invalidateQueries({ queryKey: ["special-trading-days-admin"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            Special Trading Days
          </span>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Special Trading Day</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trading_day">
                        Special Trading Day (e.g. Muhurat)
                      </SelectItem>
                      <SelectItem value="modified_hours">
                        Modified Trading Hours
                      </SelectItem>
                      <SelectItem value="extra_holiday">
                        Extra Holiday (not in NSE list)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    placeholder="e.g. Muhurat Trading, Budget Day"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>
                {newType === "modified_hours" && (
                  <div>
                    <Label>Trading Hours</Label>
                    <Input
                      placeholder="e.g. 6:15 PM - 7:15 PM"
                      value={newHours}
                      onChange={(e) => setNewHours(e.target.value)}
                    />
                  </div>
                )}
                <Button
                  onClick={() => addMutation.mutate()}
                  disabled={!newDate || addMutation.isPending}
                  className="w-full"
                >
                  {addMutation.isPending ? "Adding..." : "Add Special Day"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : days.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No special trading days configured
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">
                    {format(new Date(d.date + "T00:00:00"), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {d.type === "trading_day"
                        ? "Trading Day"
                        : d.type === "modified_hours"
                          ? "Modified Hours"
                          : "Extra Holiday"}
                    </Badge>
                  </TableCell>
                  <TableCell>{d.description || "-"}</TableCell>
                  <TableCell>{d.trading_hours || "-"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteMutation.mutate(d.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
