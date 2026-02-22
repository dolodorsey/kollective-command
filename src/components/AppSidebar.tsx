import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Terminal, MessageSquare, Calendar, Send, Target, Inbox,
  Share2, CheckSquare, FileOutput, Activity, Settings, Mail, Instagram, Phone,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const MAIN_NAV = [
  { title: "HOME", url: "/", icon: LayoutDashboard },
  { title: "COMMANDS", url: "/commands", icon: Terminal },
  { title: "CHAT", url: "/chat", icon: MessageSquare },
];

const COMMS_NAV = [
  { title: "EMAIL INBOX", url: "/email", icon: Mail },
  { title: "INSTAGRAM DMS", url: "/ig", icon: Instagram },
  { title: "PHONE / SMS", url: "/phone", icon: Phone },
];

const OPS_NAV = [
  { title: "EVENTS", url: "/events", icon: Calendar },
  { title: "OUTREACH", url: "/outreach", icon: Send },
  { title: "LEADS", url: "/leads", icon: Target },
  { title: "SOCIAL", url: "/social", icon: Share2 },
  { title: "TASKS", url: "/tasks", icon: CheckSquare },
  { title: "OUTPUTS", url: "/outputs", icon: FileOutput },
  { title: "SYSTEM", url: "/system", icon: Activity },
  { title: "SETTINGS", url: "/settings", icon: Settings },
];

function NavSection({ items, label }: { items: typeof MAIN_NAV; label?: string }) {
  const location = useLocation();
  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel className="text-[9px] tracking-[0.2em] text-sidebar-foreground/30 px-4">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map(item => {
            const active = item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url);
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  className={active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary font-bold"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 border-l-2 border-transparent"
                  }
                >
                  <Link to={item.url}>
                    <item.icon className="h-4 w-4" />
                    <span className="text-[11px] tracking-wider">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
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
        <NavSection items={MAIN_NAV} />
        <NavSection items={COMMS_NAV} label="COMMUNICATIONS" />
        <NavSection items={OPS_NAV} label="OPERATIONS" />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!collapsed && (
          <div className="space-y-1">
            <p className="text-[9px] font-mono text-sidebar-foreground/25">48+ brands · 8 divisions</p>
            <p className="text-[9px] font-mono text-sidebar-foreground/25">17 GHL · 7 Gmail · 6 IG</p>
            {pendingCount > 0 && (
              <p className="text-[9px] font-mono text-status-warning">{pendingCount} pending approvals</p>
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
