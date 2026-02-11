import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Terminal, MessageSquare, Calendar, Send, Target, Inbox, Share2,
  CheckSquare, FileOutput, Activity, Settings,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const NAV = [
  { title: "HOME", url: "/", icon: LayoutDashboard },
  { title: "COMMANDS", url: "/commands", icon: Terminal },
  { title: "CHAT", url: "/chat", icon: MessageSquare },
  { title: "EVENTS", url: "/events", icon: Calendar },
  { title: "OUTREACH", url: "/outreach", icon: Send },
  { title: "LEADS", url: "/leads", icon: Target },
  { title: "INBOX", url: "/inbox", icon: Inbox },
  { title: "SOCIAL", url: "/social", icon: Share2 },
  { title: "TASKS", url: "/tasks", icon: CheckSquare },
  { title: "OUTPUTS", url: "/outputs", icon: FileOutput },
  { title: "SYSTEM", url: "/system", icon: Activity },
  { title: "SETTINGS", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["pending-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("approval_queue")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      return count || 0;
    },
    refetchInterval: 30000,
  });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        {!collapsed ? (
          <div>
            <h1 className="text-lg font-bold tracking-[0.2em] text-sidebar-primary">KOLLECTIVE</h1>
            <p className="mt-0.5 text-[10px] tracking-[0.3em] text-sidebar-foreground/50">COMMAND CENTER</p>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <span className="text-lg font-bold text-sidebar-primary">K</span>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(item => {
                const active = item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url);
                const badge = item.title === "TASKS" && pendingCount > 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span className="text-[11px] font-medium tracking-wider">{item.title}</span>
                        {badge && !collapsed && (
                          <span className="ml-auto rounded-full bg-sidebar-primary px-1.5 py-0.5 text-[9px] font-bold text-sidebar-primary-foreground">
                            {pendingCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-primary/10 text-xs font-bold text-sidebar-primary">D</div>
            <div>
              <p className="text-[11px] font-medium text-sidebar-foreground">Dr. Dorsey</p>
              <p className="text-[9px] text-sidebar-foreground/40">Operator</p>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
