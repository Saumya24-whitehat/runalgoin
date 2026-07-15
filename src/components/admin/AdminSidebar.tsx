import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  FileText,
  LifeBuoy,
  CalendarDays,
  TrendingUp,
  Video,
  ScrollText,
  Bell,
} from "lucide-react";

export type AdminSection =
  | "overview"
  | "blog"
  | "support"
  | "trading-days"
  | "momentum"
  | "videos"
  | "audit"
  | "reminders";

const items: { id: AdminSection; title: string; icon: any }[] = [
  { id: "overview", title: "Overview & Users", icon: LayoutDashboard },
  { id: "blog", title: "Blog", icon: FileText },
  { id: "support", title: "Support Tickets", icon: LifeBuoy },
  { id: "trading-days", title: "Trading Days", icon: CalendarDays },
  { id: "momentum", title: "Momentum Reports", icon: TrendingUp },
  { id: "videos", title: "Videos", icon: Video },
  { id: "reminders", title: "Email Reminders", icon: Bell },
  { id: "audit", title: "Audit Log", icon: ScrollText },
];

export function AdminSidebar({
  active,
  onSelect,
}: {
  active: AdminSection;
  onSelect: (s: AdminSection) => void;
}) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="!top-16 !h-[calc(100svh-4rem)]">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={active === item.id}
                    onClick={() => onSelect(item.id)}
                    className="cursor-pointer"
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
