import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarOff, CalendarCheck } from "lucide-react";
import { fetchNseHolidays } from "@/services/holidayApi";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const Holidays = () => {
  const [year, setYear] = useState(currentYear);

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ["nse-holidays", year],
    queryFn: () => fetchNseHolidays(year),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const upcoming = holidays.filter((h) => h.date >= todayStr);
  const past = holidays.filter((h) => h.date < todayStr);

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarOff className="h-6 w-6 text-destructive" />
              NSE Market Holidays
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Stock exchange trading holidays for the year
            </p>
          </div>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{holidays.length}</p>
              <p className="text-xs text-muted-foreground">Total Holidays</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-primary">{upcoming.length}</p>
              <p className="text-xs text-muted-foreground">Upcoming</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{past.length}</p>
              <p className="text-xs text-muted-foreground">Past</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-success">
                {upcoming.length > 0 ? upcoming[0].displayDate.split(",")[0] : "-"}
              </p>
              <p className="text-xs text-muted-foreground">Next Holiday</p>
            </CardContent>
          </Card>
        </div>

        {/* Next upcoming holiday highlight */}
        {upcoming.length > 0 && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="py-4 flex items-center gap-4">
              <CalendarCheck className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Next Market Holiday</p>
                <p className="text-lg font-bold text-foreground">{upcoming[0].name}</p>
                <p className="text-sm text-primary">{upcoming[0].displayDate}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Holiday Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {year} Holiday Calendar ({holidays.length} holidays)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : holidays.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No holiday data available for {year}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Holiday</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((h, i) => {
                    const isPast = h.date < todayStr;
                    const isToday = h.date === todayStr;
                    return (
                      <TableRow
                        key={h.date}
                        className={isToday ? "bg-primary/10" : isPast ? "opacity-50" : ""}
                      >
                        <TableCell className="font-mono text-muted-foreground">
                          {i + 1}
                        </TableCell>
                        <TableCell className="font-medium">{h.displayDate}</TableCell>
                        <TableCell>{h.name}</TableCell>
                        <TableCell className="text-right">
                          {isToday ? (
                            <Badge className="bg-primary/20 text-primary border-primary/30">
                              Today
                            </Badge>
                          ) : isPast ? (
                            <Badge variant="secondary">Past</Badge>
                          ) : (
                            <Badge className="bg-success/20 text-success border-success/30">
                              Upcoming
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default Holidays;
