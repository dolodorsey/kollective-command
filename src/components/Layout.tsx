import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CommandBar } from "@/components/CommandBar";

export function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border/40 px-6">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          <div className="h-4 w-px bg-border/50" />
          <span className="shrink-0 text-xs font-medium tracking-wider text-muted-foreground">KOLLECTIVE COMMAND CENTER</span>
          <div className="mx-4 flex-1 max-w-xl">
            <CommandBar />
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-border/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/40">⌘J</span>
            <span className="rounded border border-border/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/40">⌘/</span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
