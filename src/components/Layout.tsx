import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CommandBar } from "@/components/CommandBar";
import { ArrowLeft, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/" || location.pathname === "";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <header className="flex h-12 min-w-0 shrink-0 items-center gap-3 border-b border-border/40 px-3 sm:gap-4 sm:px-6">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          {!isHome && (
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          )}
          <div className="h-4 w-px bg-border/50" />
          <span className="hidden shrink-0 text-xs font-medium tracking-wider text-muted-foreground md:inline">KOLLECTIVE COMMAND CENTER</span>
          <div className="hidden min-w-0 flex-1 sm:mx-4 sm:block sm:max-w-xl">
            <CommandBar />
          </div>
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <span className="rounded border border-border/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/40">⌘J</span>
            <span className="rounded border border-border/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/40">⌘/</span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="ml-2 flex items-center gap-1.5 rounded border border-border/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <LogOut className="h-3 w-3" />
              Sign out
            </button>
          </div>
        </header>
        <div className="min-w-0 flex-1 overflow-auto p-3 sm:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
