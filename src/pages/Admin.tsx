import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Users,
  Crown,
  Shield,
  TrendingUp,
  Search,
  Loader2,
  Calendar,
  UserCheck,
  UserPlus,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { UserSubscriptionManager } from "@/components/admin/UserSubscriptionManager";
import { VideoManagement } from "@/components/admin/VideoManagement";
import { BlogManagement } from "@/components/admin/BlogManagement";
import { SupportTicketManagement } from "@/components/admin/SupportTicketManagement";
import { SpecialTradingDaysManagement } from "@/components/admin/SpecialTradingDaysManagement";
import { MomentumReportManagement } from "@/components/admin/MomentumReportManagement";
import { AuditLogPanel } from "@/components/admin/AuditLogPanel";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import { ManageUserDialog } from "@/components/admin/ManageUserDialog";
import { AdminSidebar, type AdminSection } from "@/components/admin/AdminSidebar";

interface UserWithSubscription {
  user_id: string;
  email: string;
  name: string;
  plan_type: string;
  status: string;
  expires_at: string | null;
  created_at: string;
}

interface AdminStats {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  expiringSoon: number;
  newThisMonth: number;
}

const VALID_SECTIONS: AdminSection[] = [
  "overview",
  "blog",
  "support",
  "trading-days",
  "momentum",
  "videos",
  "audit",
];

const SECTION_TITLES: Record<AdminSection, string> = {
  overview: "Overview & Users",
  blog: "Blog",
  support: "Support Tickets",
  "trading-days": "Special Trading Days",
  momentum: "Momentum Reports",
  videos: "Videos",
  audit: "Subscription Audit Log",
};

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionParam = searchParams.get("section") as AdminSection | null;
  const section: AdminSection =
    sectionParam && VALID_SECTIONS.includes(sectionParam) ? sectionParam : "overview";

  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [showSubscriptionManager, setShowSubscriptionManager] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [manageUser, setManageUser] = useState<UserWithSubscription | null>(null);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    proUsers: 0,
    freeUsers: 0,
    expiringSoon: 0,
    newThisMonth: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) checkAdminAndFetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const checkAdminAndFetchData = async () => {
    if (!user) return;
    try {
      const { data: adminCheck, error: adminError } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (adminError || !adminCheck) {
        setIsAdmin(false);
        setLoading(false);
        toast.error("Access denied. Admin privileges required.");
        navigate("/dashboard");
        return;
      }
      setIsAdmin(true);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, name, created_at");
      if (profilesError) throw profilesError;

      const { data: subscriptions, error: subsError } = await supabase
        .from("subscriptions")
        .select("*");
      if (subsError) throw subsError;

      const usersWithSubs: UserWithSubscription[] = (profiles || []).map((profile) => {
        const sub = subscriptions?.find((s) => s.user_id === profile.user_id);
        return {
          user_id: profile.user_id,
          email: profile.email,
          name: profile.name,
          plan_type: sub?.plan_type || "free",
          status: sub?.status || "active",
          expires_at: sub?.expires_at || null,
          created_at: profile.created_at,
        };
      });
      setUsers(usersWithSubs);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const proUsers = usersWithSubs.filter(
        (u) => u.plan_type === "pro" || u.plan_type === "enterprise"
      ).length;
      const freeUsers = usersWithSubs.filter((u) => u.plan_type === "free").length;
      const expiringSoon = usersWithSubs.filter((u) => {
        if (!u.expires_at) return false;
        const expiry = new Date(u.expires_at);
        return expiry > now && expiry <= weekFromNow;
      }).length;
      const newThisMonth = usersWithSubs.filter(
        (u) => new Date(u.created_at) >= monthStart
      ).length;

      setStats({
        totalUsers: usersWithSubs.length,
        proUsers,
        freeUsers,
        expiringSoon,
        newThisMonth,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch admin data");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        const matchesSearch =
          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPlan = filterPlan === "all" || u.plan_type === filterPlan;
        return matchesSearch && matchesPlan;
      }),
    [users, searchQuery, filterPlan]
  );

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "pro":
        return (
          <Badge className="bg-primary/20 text-primary border-primary/30">
            <Crown className="h-3 w-3 mr-1" />
            Pro
          </Badge>
        );
      case "enterprise":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
            <Shield className="h-3 w-3 mr-1" />
            Enterprise
          </Badge>
        );
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  const getExpiryStatus = (expiresAt: string | null, planType: string) => {
    if (planType === "free" || !expiresAt)
      return { text: "-", className: "text-muted-foreground" };
    const expiry = new Date(expiresAt);
    const now = new Date();
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) return { text: "Expired", className: "text-destructive" };
    if (daysLeft <= 7) return { text: `${daysLeft}d left`, className: "text-warning" };
    return { text: format(expiry, "MMM d, yyyy"), className: "text-muted-foreground" };
  };

  const setSection = (s: AdminSection) => {
    const next = new URLSearchParams(searchParams);
    if (s === "overview") next.delete("section");
    else next.set("section", s);
    setSearchParams(next, { replace: true });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
          <Shield className="h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
          <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Overview & Users</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage users and subscriptions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddUser(true)} variant="outline" size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
          <Button onClick={() => setShowSubscriptionManager(true)} size="sm" className="gap-2">
            <Users className="h-4 w-4" />
            Manage Subscriptions
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              Pro Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{stats.proUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Free Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.freeUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-warning" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-warning">{stats.expiringSoon}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              New This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">{stats.newThisMonth}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span>All Users</span>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={filterPlan} onValueChange={setFilterPlan}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => {
                  const expiryStatus = getExpiryStatus(u.expires_at, u.plan_type);
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{u.name}</p>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getPlanBadge(u.plan_type)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={u.status === "active" ? "default" : "destructive"}
                          className={
                            u.status === "active"
                              ? "bg-success/20 text-success border-success/30"
                              : ""
                          }
                        >
                          {u.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={expiryStatus.className}>{expiryStatus.text}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(u.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManageUser(u)}
                          className="gap-1"
                        >
                          <Settings className="h-3 w-3" /> Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );

  const renderSection = () => {
    switch (section) {
      case "overview":
        return renderOverview();
      case "blog":
        return <BlogManagement />;
      case "support":
        return <SupportTicketManagement />;
      case "trading-days":
        return <SpecialTradingDaysManagement />;
      case "momentum":
        return <MomentumReportManagement />;
      case "videos":
        return <VideoManagement />;
      case "audit":
        return <AuditLogPanel />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <SidebarProvider>
        <div className="flex flex-1 w-full">
          <AdminSidebar active={section} onSelect={setSection} />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-12 flex items-center border-b px-3 gap-2 sticky top-0 bg-background z-10">
              <SidebarTrigger />
              <h1 className="text-sm font-semibold text-foreground">
                Admin · {SECTION_TITLES[section]}
              </h1>
            </header>
            <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{renderSection()}</main>
          </div>
        </div>
      </SidebarProvider>

      <UserSubscriptionManager
        isOpen={showSubscriptionManager}
        onClose={() => {
          setShowSubscriptionManager(false);
          checkAdminAndFetchData();
        }}
      />
      <AddUserDialog
        isOpen={showAddUser}
        onClose={() => setShowAddUser(false)}
        onCreated={() => checkAdminAndFetchData()}
      />
      <ManageUserDialog
        isOpen={!!manageUser}
        onClose={() => setManageUser(null)}
        onChanged={() => checkAdminAndFetchData()}
        user={
          manageUser
            ? { user_id: manageUser.user_id, name: manageUser.name, email: manageUser.email }
            : null
        }
      />
    </div>
  );
};

export default Admin;
