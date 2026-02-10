import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Send, Target, Inbox, Share2,
  CheckSquare, FileOutput, Activity,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { title: "HOME", url: "/", icon: LayoutDashboard },
  { title: "OUTREACH", url: "/outreach", icon: Send },
  { title: "LEADS", url: "/leads", icon: Target },
  { title: "INBOX", url: "/inbox", icon: Inbox },
  { title: "SOCIAL", url: "/social", icon: Share2 },
  { title: "TASKS", url: "/tasks", icon: CheckSquare },
  { title: "OUTPUTS", url: "/outputs", icon: FileOutput },
  { title: "SYSTEM", url: "/system", icon: Activity },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pending-approvals-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('approval_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      return count || 0;
    },
    refetchInterval: 30000,
  });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        {!isCollapsed ? (
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
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = item.url === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link to={item.url} className="relative">
                        <item.icon className="h-4 w-4" />
                        <span className="text-xs tracking-wider">{item.title}</span>
                        {item.title === "TASKS" && pendingCount > 0 && !isCollapsed && (
                          <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
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
      <SidebarFooter className="border-t border-sidebar-border px-4 py-4">
        {!isCollapsed && (
          <div>
            <p className="text-xs font-semibold tracking-wider text-sidebar-foreground">DR. DORSEY</p>
            <p className="mt-0.5 font-mono text-[10px] text-sidebar-foreground/40">MCP v2.0</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
