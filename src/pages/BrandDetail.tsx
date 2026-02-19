import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { sendCommand } from "@/lib/commands";
import { DIVISIONS } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { NewTaskDialog } from "@/components/NewTaskDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Calendar, Users, Target, Send, Mail, Instagram,
  CheckSquare, MessageSquare, Zap, Building2, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BrandDetail = () => {
  const { brandKey } = useParams<{ brandKey: string }>();
  const navigate = useNavigate();

  const brandInfo = (() => {
    for (const div of DIVISIONS) {
      const idx = div.brands.findIndex(
        b => b.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") === brandKey
      );
      if (idx >= 0) return { brand: div.brands[idx], division: div };
    }
    return null;
  })();

  const { data: entity } = useQuery({
    queryKey: ["brand-entity", brandKey],
    queryFn: async () => {
      const { data } = await supabase
        .from("brand_entities").select("*")
        .or(`entity_id.eq.${brandKey},entity_name.ilike.%${brandKey?.replace(/-/g, " ")}%`)
        .limit(1).maybeSingle();
      return data;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["brand-tasks", brandKey],
    queryFn: async () => {
      const { data } = await supabase.from("approval_queue").select("*")
        .ilike("brand_key", `%${brandKey?.replace(/-/g, "%")}%`)
        .order("created_at", { ascending: false }).limit(30);
      return data || [];
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["brand-contacts", brandKey],
    queryFn: async () => {
      const { data } = await supabase.from("contacts_master").select("*")
        .or(`brand.ilike.%${brandKey?.replace(/-/g, "%")}%,brand_key.ilike.%${brandKey}%`)
        .order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["brand-events", brandKey],
    queryFn: async () => {
      if (!brandInfo) return [];
      const { data } = await supabase.from("events").select("*")
        .or(`brand.eq.${brandInfo.division.key},title.ilike.%${brandInfo.brand}%,series.ilike.%${brandKey}%`)
        .order("date", { ascending: true }).limit(20);
      return data || [];
    },
  });

  const { data: prActivity = [] } = useQuery({
    queryKey: ["brand-pr", brandKey],
    queryFn: async () => {
      const { data } = await supabase.from("pr_outreach_activity").select("*")
        .order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const { data: commands = [] } = useQuery({
    queryKey: ["brand-commands", brandKey],
    queryFn: async () => {
      const { data } = await supabase.from("command_log").select("*")
        .or(`target_key.ilike.%${brandKey}%,scope.ilike.%${brandKey}%`)
        .order("executed_at", { ascending: false }).limit(10);
      return data || [];
    },
  });

  const handleQuickAction = async (action: string) => {
    await sendCommand(`brand.${action}`, { brand_key: brandKey, brand_name: brandInfo?.brand });
    toast.success(`${action} triggered for ${brandInfo?.brand || brandKey}`);
  };

  if (!brandInfo) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" />Back
        </Button>
        <div className="rounded-lg border border-border/50 bg-card p-12 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground/20" />
          <p className="mt-3 text-sm text-muted-foreground">Brand not found: {brandKey}</p>
        </div>
      </div>
    );
  }

  const pendingTasks = tasks.filter((t: any) => t.status === "pending");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-1.5 shrink-0">
          <ArrowLeft className="h-3.5 w-3.5" />Back
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{brandInfo.division.icon}</span>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{brandInfo.brand}</h1>
              <button onClick={() => navigate(`/division/${brandInfo.division.key}`)} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                {brandInfo.division.name} — {brandInfo.division.sub}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0" style={{ borderLeft: `3px solid ${brandInfo.division.color}`, paddingLeft: 12 }}>
          <StatusBadge variant="success">Active</StatusBadge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Launch PR", action: "launch_pr", icon: Send },
          { label: "Send DMs", action: "send_dms", icon: MessageSquare },
          { label: "Generate Content", action: "generate_content", icon: Zap },
          { label: "Email Blast", action: "email_blast", icon: Mail },
          { label: "IG Outreach", action: "ig_outreach", icon: Instagram },
          { label: "Scrape Leads", action: "scrape_leads", icon: Target },
        ].map(a => (
          <Button key={a.action} variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleQuickAction(a.action)}>
            <a.icon className="h-3 w-3" />{a.label}
          </Button>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks {pendingTasks.length > 0 && `(${pendingTasks.length})`}</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="events">Events ({events.length})</TabsTrigger>
          <TabsTrigger value="outreach">Outreach</TabsTrigger>
          <TabsTrigger value="commands">Commands</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {entity?.system_prompt && (
            <div className="rounded-lg border border-border/50 bg-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Brand Voice</p>
              <p className="text-sm text-foreground leading-relaxed">{entity.system_prompt}</p>
              {entity.tone_profile && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(entity.tone_profile as Record<string, string>).map(([k, v]) => (
                    <span key={k} className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{k}: {v}</span>
                  ))}
                </div>
              )}
            </div>
          )}
          {entity && (
            <div className="rounded-lg border border-border/50 bg-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Brand Profile</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {entity.entity_name && <div><span className="text-muted-foreground text-xs">Name:</span> <span className="text-foreground">{entity.entity_name}</span></div>}
                {entity.entity_type && <div><span className="text-muted-foreground text-xs">Type:</span> <span className="text-foreground">{entity.entity_type}</span></div>}
                {entity.division && <div><span className="text-muted-foreground text-xs">Division:</span> <span className="text-foreground">{entity.division}</span></div>}
                {entity.status && <div><span className="text-muted-foreground text-xs">Status:</span> <StatusBadge variant={entity.status === "active" ? "success" : "warning"}>{entity.status}</StatusBadge></div>}
              </div>
            </div>
          )}
          {!entity && (
            <div className="rounded-lg border border-border/50 bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground/40">No brand entity record found in database</p>
            </div>
          )}
          {/* Sibling brands */}
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {brandInfo.division.icon} Other {brandInfo.division.name} Brands
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {brandInfo.division.brands.filter(b => b !== brandInfo.brand).map(b => {
                const s = b.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
                return (
                  <button key={b} onClick={() => navigate(`/brand/${s}`)}
                    className="rounded-md border border-border/30 px-2.5 py-1 text-xs text-foreground/80 hover:border-primary/30 hover:text-primary transition-colors">
                    {b}
                  </button>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* TASKS TAB */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tasks & Approvals</h2>
            <NewTaskDialog defaultBrand={brandKey} triggerLabel="+ New Task" />
          </div>
          <div className="space-y-2">
            {tasks.map((t: any) => (
              <div key={t.id} className={cn(
                "flex items-center gap-3 rounded-md border p-3 transition-colors hover:border-primary/20",
                t.status === "pending" ? "border-l-2 border-l-status-warning border-border/50" : "border-border/30"
              )}>
                <div className={cn("h-2 w-2 rounded-full shrink-0",
                  t.status === "pending" ? "bg-status-warning" : t.status === "approved" ? "bg-status-success" : "bg-muted-foreground"
                )} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground">{t.item_type?.replace(/_/g, " ")}</p>
                </div>
                <StatusBadge variant={t.status === "pending" ? "warning" : t.status === "approved" ? "success" : "error"}>
                  {t.status}
                </StatusBadge>
              </div>
            ))}
            {tasks.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground/40">No tasks — create one above</p>}
          </div>
        </TabsContent>

        {/* CONTACTS TAB */}
        <TabsContent value="contacts" className="space-y-2">
          {contacts.map((c: any) => (
            <div key={c.id} className="flex items-center gap-3 rounded-md border border-border/30 p-3">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{c.full_name || c.name || c.email || "—"}</p>
                <p className="text-[10px] text-muted-foreground">{c.title || c.role || ""} {c.company ? `@ ${c.company}` : ""}</p>
              </div>
              {c.city && <span className="text-[9px] text-muted-foreground">{c.city}</span>}
            </div>
          ))}
          {contacts.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground/40">No contacts linked to this brand</p>}
        </TabsContent>

        {/* EVENTS TAB */}
        <TabsContent value="events" className="space-y-2">
          {events.map((e: any) => (
            <div key={e.id} className="flex items-center gap-3 rounded-md border border-border/30 bg-secondary/30 p-3">
              <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary">
                <span className="text-[9px] font-semibold uppercase text-muted-foreground">{format(new Date(e.date), "MMM")}</span>
                <span className="text-sm font-bold text-foreground">{format(new Date(e.date), "d")}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.city}</p>
              </div>
            </div>
          ))}
          {events.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground/40">No events for this brand</p>}
        </TabsContent>

        {/* OUTREACH TAB */}
        <TabsContent value="outreach" className="space-y-2">
          {prActivity.map((p: any) => (
            <div key={p.id} className="flex items-center gap-3 rounded-md border border-border/30 p-3">
              <Send className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{p.subject || p.action_type || "—"}</p>
                <p className="text-[10px] text-muted-foreground">{p.recipient || p.outlet || "—"}</p>
              </div>
              <span className="font-mono text-[9px] text-muted-foreground">
                {p.created_at ? format(new Date(p.created_at), "MMM d") : "—"}
              </span>
            </div>
          ))}
          {prActivity.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground/40">No outreach activity</p>}
        </TabsContent>

        {/* COMMANDS TAB */}
        <TabsContent value="commands" className="space-y-1.5">
          {commands.map((c: any) => (
            <div key={c.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span className="flex-1 truncate font-mono text-xs text-foreground">{c.command_type}</span>
              <span className="font-mono text-[9px] text-muted-foreground">
                {c.executed_at ? format(new Date(c.executed_at), "HH:mm") : "—"}
              </span>
            </div>
          ))}
          {commands.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground/40">No commands yet</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BrandDetail;
