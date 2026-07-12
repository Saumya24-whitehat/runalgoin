import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Upload, Trash2, FileText, Eye } from "lucide-react";

interface MomentumReport {
  id: string;
  title: string;
  week_of: string;
  content: string;
  created_at: string;
}

export function MomentumReportManagement() {
  const [reports, setReports] = useState<MomentumReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [weekOf, setWeekOf] = useState(format(new Date(), "yyyy-MM-dd"));
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewReport, setPreviewReport] = useState<MomentumReport | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("momentum_reports")
      .select("id, title, week_of, content, created_at")
      .order("week_of", { ascending: false });
    if (error) {
      toast.error("Failed to load reports");
    } else {
      setReports(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setTitle("");
    setWeekOf(format(new Date(), "yyyy-MM-dd"));
    setFile(null);
  };

  const handleUpload = async () => {
    if (!title.trim() || !weekOf || !file) {
      toast.error("Title, week and HTML file are required");
      return;
    }
    if (!/\.html?$/i.test(file.name)) {
      toast.error("Please upload an .html file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5MB)");
      return;
    }
    setSaving(true);
    try {
      const content = await file.text();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("momentum_reports").insert({
        title: title.trim(),
        week_of: weekOf,
        content,
        uploaded_by: user?.id,
      });
      if (error) throw error;
      toast.success("Report uploaded");
      setUploadOpen(false);
      resetForm();
      load();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this report?")) return;
    const { error } = await supabase.from("momentum_reports").delete().eq("id", id);
    if (error) {
      toast.error("Delete failed");
    } else {
      toast.success("Report deleted");
      load();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Momentum Reports
          </span>
          <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Upload Weekly Report
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Week Of</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>{format(new Date(r.week_of), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewReport(r)}
                        className="gap-1"
                      >
                        <Eye className="h-3 w-3" /> Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(r.id)}
                        className="gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {reports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No reports uploaded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={uploadOpen} onOpenChange={(o) => { setUploadOpen(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Weekly Momentum Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Momentum Report — Week of 12 Jul 2026"
                maxLength={200}
              />
            </div>
            <div>
              <Label>Week Of</Label>
              <Input type="date" value={weekOf} onChange={(e) => setWeekOf(e.target.value)} />
            </div>
            <div>
              <Label>HTML File</Label>
              <Input
                type="file"
                accept=".html,.htm,text/html"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground mt-1">Max 5MB. Full HTML document.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewReport} onOpenChange={(o) => !o && setPreviewReport(null)}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewReport?.title}</DialogTitle>
          </DialogHeader>
          {previewReport && (
            <iframe
              srcDoc={previewReport.content}
              title={previewReport.title}
              className="w-full flex-1 border rounded"
              sandbox="allow-same-origin allow-scripts"
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
