import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { sendCommand } from "@/lib/commands";
import { DIVISIONS, COMMAND_LABELS } from "@/lib/constants";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Building2, Users, Target, Mail, Terminal,
  AlertTriangle, Radio, Calendar, ChevronRight,
  Zap, Shield, Snowflake, Clock, CheckSquare, Send, Search} from "lucide-react";
import { format, subHours } from "date-fns";
import { cn } from "@/lib/utils";

const Home = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [tenants, leads, contacts, prTouches, commands, failures, webhooks, tasks, approvals] = await Promise.all([
        supabase.from("tenants").select("*", { count: "exact", head: true }),
        supabase.from("crm_leads").select("*", { count: "exact", head: true }),
        supabase.from("contacts_master").select("*", { count: "exact", head: true }),
        supabase.from("pr_outreach_activity").select("*", { count: "exact", head: true }),
        supabase.from("command_log").select("*", { count: "exact", head: true }),
        supabase.from("failure_log").select("*", { count: "exact", head: true }).eq("resolved", false),
        supabase.from("webhook_health").select("*", { count: "exact", head: true }).eq("status", "healthy"),
        supabase.from("tasks").select("*", { count: "exact", head: true }).neq("status", "done"),
        supabase.from("command_log").select("*", { count: "exact", head: true }).eq("command_type", "pending_approval").eq("status", "pending"),
      ]);
      return {
        tenants: tenants.count || 0, leads: leads.count || 0, contacts: contacts.count || 0,
        prTouches: prTouches.count || 0, commands: commands.count || 0,
        failures: failures.count || 0, webhooks: webhooks.count || 0,
        tasks: tasks.count || 0, approvals: approvals.count || 0,
      };
    },
    refetchInterval: 30000,
  });

  const { data: systemModeData } = useQuery({
    queryKey: ["system-mode"],
    queryFn: async () => {
      const { data } = await supabase.from("system_mode").select("*").limit(1).maybeSingle();
      return data;
    },
  });
  const systemMode = (systemModeData && systemModeData.mode) ? systemModeData.mode : "normal";

  const { data: signalFeed = [] } = useQuery({
    queryKey: ["signal-feed"],
    queryFn: async () => {
      const cutoff = subHours(new Date(), 24).toISOString();
      const [cmds, comms, touches, ledger, fails] = await Promise.all([
        supabase.from("command_log").select("id, command_type, scope, target_key, status, executed_at, payload").gte("executed_at", cutoff).order("executed_at", { ascending: false }).limit(12),
        supabase.from("communications").select("id, channel, direction, recipient_identifier, subject, created_at").gte("created_at", cutoff).order("created_at", { ascending: false }).limit(8),
        supabase.from("mcp_touchpoints").select("id, brand_key, channel, outcome, created_at").gte("created_at", cutoff).order("created_at", { ascending: false }).limit(8),
        supabase.from("ledger_actions").select("id, action_type, platform, actor, revenue, created_at").gte("created_at", cutoff).order("created_at", { ascending: false }).limit(8),
        supabase.from("failure_log").select("id, workflow_name, error_message, severity, resolved, occurred_at").gte("occurred_at", cutoff).order("occurred_at", { ascending: false }).limit(5),
      ]);
      const items: any[] = [
        ...(cmds.data || []).map((c: any) => ({ type: "cmd", label: c.command_type, detail: c.target_key || (c.payload && c.payload.brand_key) || c.scope, time: c.executed_at, color: "bg-amber-100 text-amber-700" })),
        ...(comms.data || []).map((c: any) => ({ type: "email", label: `${c.direction}: ${c.subject || c.recipient_identifier || "msg"}`, detail: c.channel, time: c.created_at, color: "bg-red-100 text-red-700" })),
        ...(touches.data || []).map((t: any) => ({ type: "touch", label: `${t.channel} → ${t.outcome || "?"}`, detail: t.brand_key, time: t.created_at, color: "bg-pink-100 text-pink-700" })),
        ...(ledger.data || []).map((l: any) => ({ type: "ledger", label: l.action_type, detail: l.revenue ? `$${l.revenue}` : l.platform, time: l.created_at, color: "bg-green-100 text-green-700" })),
        ...(fails.data || []).map((f: any) => ({ type: "fail", label: f.workflow_name || "error", detail: (f.error_message || "").slice(0, 50), time: f.occurred_at, color: "bg-red-200 text-red-800" })),
      ];
      return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 30);
    },
    refetchInterval: 15000,
  });

  const { data: unresolvedFailures = [] } = useQuery({
    queryKey: ["unresolved-failures"],
    queryFn: async () => {
      const { data } = await supabase.from("failure_log").select("*").eq("resolved", false).order("occurred_at", { ascending: false }).limit(10);
      return data || [];
    },
  });

  const { data: pendingApprovalsList = [] } = useQuery({
    queryKey: ["pending-approvals-list"],
    queryFn: async () => {
      const { data } = await supabase.from("command_log").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
  });

  const { data: nextEvents = [] } = useQuery({
    queryKey: ["next-events"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("id, title, city, date, series").gte("date", new Date().toISOString()).order("date", { ascending: true }).limit(6);
      return data || [];
    },
  });

  const { data: pendingCount } = useQuery({
    queryKey: ["pending-count"],
    queryFn: async () => {
      const { count } = await supabase.from("approval_queue").select("*", { count: "exact", head: true }).eq("status", "pending");
      return count || 0;
    },
    refetchInterval: 15000,
  });

  const { data: leadCount } = useQuery({
    queryKey: ["lead-count"],
    queryFn: async () => {
      const { count } = await supabase.from("mcp_leads").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: eventCount } = useQuery({
    queryKey: ["event-count"],
    queryFn: async () => {
      const { count } = await supabase.from("events").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  useEffect(() => {
    const ch = supabase.channel("home-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "command_log" }, () => { queryClient.invalidateQueries({ queryKey: ["signal-feed"] }); queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }); })
      .on("postgres_changes", { event: "*", schema: "public", table: "failure_log" }, () => { queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }); queryClient.invalidateQueries({ queryKey: ["unresolved-failures"] }); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  const totalBrands = DIVISIONS.reduce((s, d) => s + d.brands.length, 0);
  const modeConfig: Record<string, { icon: React.ElementType; variant: "success" | "warning" | "error"; affected: number }> = {
    normal: { icon: Shield, variant: "success", affected: 0 },
    cautious: { icon: Clock, variant: "warning", affected: 12 },
    frozen: { icon: Snowflake, variant: "error", affected: 32 },
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Command Center</h1>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Commands" value={(stats && stats.commands) || "—"} icon={Terminal} onClick={() => navigate("/commands")} />
        <StatCard label="Contacts" value={stats && stats.contacts ? stats.contacts.toLocaleString() : "—"} icon={Users} onClick={() => navigate("/leads")} />
        <StatCard label="Total Brands" value={totalBrands} icon={Building2} onClick={() => { const el = document.getElementById("div-section"); if (el) el.scrollIntoView({ behavior: "smooth" }); }} />
        <StatCard label="Open Tasks" value={(stats && stats.tasks) || "—"} icon={CheckSquare} onClick={() => navigate("/tasks")} />
        <StatCard label="Healthy Hooks" value={`${(stats && stats.webhooks) || "—"}/26`} icon={Radio} onClick={() => navigate("/system")} />
            <StatCard label="Leads" value={leadCount ? leadCount.toLocaleString() : "—"} icon={Search} onClick={() => navigate("/leads")} />
            <StatCard label="Events" value={eventCount || "—"} icon={Calendar} onClick={() => navigate("/events")} />
            <StatCard label="Pending" value={pendingCount || "—"} icon={Shield} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
      </div>

      {/* Needs Attention */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className={cn("rounded-lg border bg-card p-4", unresolvedFailures.length > 0 ? "border-red-200" : "border-border/50")}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Unresolved Failures</span>
            <span className={cn("font-mono text-lg font-bold", unresolvedFailures.length > 0 ? "text-red-500" : "text-muted-foreground")}>{unresolvedFailures.length}</span>
          </div>
          {unresolvedFailures.length > 0 ? (
            <div className="space-y-1.5 max-h-36 overflow-auto">
              {unresolvedFailures.map((f: any) => (
                <div key={f.id} className="flex items-start gap-2 rounded-md bg-red-50 p-2 cursor-pointer" onClick={() => navigate("/system")}>
                  <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{f.workflow_name || "Unknown"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{f.error_message || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground/40 text-center py-4">All clear</p>}
          <button onClick={() => navigate("/system")} className="mt-2 text-[10px] font-semibold text-blue-500 hover:underline">View System →</button>
        </div>

        <div className={cn("rounded-lg border bg-card p-4", pendingApprovalsList.length > 0 ? "border-amber-200" : "border-border/50")}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pending Approvals</span>
            <span className={cn("font-mono text-lg font-bold", pendingApprovalsList.length > 0 ? "text-amber-500" : "text-muted-foreground")}>{pendingApprovalsList.length}</span>
          </div>
          {pendingApprovalsList.length > 0 ? (
            <div className="space-y-1.5 max-h-36 overflow-auto">
              {pendingApprovalsList.map((a: any) => (
                <div key={a.id} className="flex items-center gap-2 rounded-md bg-amber-50 p-2 cursor-pointer" onClick={() => navigate("/tasks")}>
                  <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                  <div className="min-w-0"><p className="text-xs font-semibold text-foreground truncate">{a.title}</p><p className="text-[10px] text-muted-foreground">{a.brand_key}</p></div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground/40 text-center py-4">Nothing pending</p>}
          <button onClick={() => navigate("/tasks")} className="mt-2 text-[10px] font-semibold text-blue-500 hover:underline">View Tasks →</button>
        </div>

        <div className="rounded-lg border border-border/50 bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Next Events</span>
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="space-y-1.5 max-h-36 overflow-auto">
            {nextEvents.map((e: any) => (
              <div key={e.id} className="flex items-center gap-2 rounded-md bg-muted/50 p-2 cursor-pointer" onClick={() => navigate("/events")}>
                <div className="flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded bg-card border border-border/30">
                  <span className="text-[8px] font-bold uppercase text-muted-foreground">{format(new Date(e.date), "MMM")}</span>
                  <span className="text-xs font-bold text-foreground leading-none">{format(new Date(e.date), "d")}</span>
                </div>
                <div className="min-w-0"><p className="text-xs font-semibold text-foreground truncate">{e.title}</p><p className="text-[10px] text-muted-foreground">{e.city}</p></div>
              </div>
            ))}
          </div>
          <button onClick={() => navigate("/events")} className="mt-2 text-[10px] font-semibold text-blue-500 hover:underline">Full Calendar →</button>
        </div>
      </div>

      {/* Divisions — Every brand clickable */}
      <div id="div-section">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Divisions & Brands</h2>
        <div className="space-y-3">
          {DIVISIONS.map(div => (
            <div key={div.key} className="rounded-lg border border-border/50 bg-card p-4">
              <button onClick={() => navigate(`/division/${div.key}`)} className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity w-full text-left">
                <span className="text-lg">{div.icon}</span>
                <span className="text-sm font-bold text-foreground">{div.name}</span>
                <span className="text-[10px] text-muted-foreground">— {div.sub}</span>
                <span className="text-[10px] font-mono text-muted-foreground/40 ml-auto">{div.brands.length}</span>
              </button>
              <div className="flex flex-wrap gap-1.5">
                {div.brands.map(b => {
                  const slug = b.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
                  return (
                    <button key={b} onClick={() => navigate(`/brand/${slug}`)} className="rounded-md border border-border/40 bg-muted/30 px-2.5 py-1 text-xs text-foreground hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all">{b}</button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Signal Feed — Detailed */}
      <div className="rounded-lg border border-border/50 bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Signal Feed (24h)</h2>
          <span className="text-[9px] text-muted-foreground/40">{signalFeed.length} events</span>
        </div>
        <div className="max-h-72 space-y-0.5 overflow-auto">
          {signalFeed.length === 0 && <p className="text-sm text-muted-foreground/40 py-4 text-center">No signals in last 24 hours</p>}
          {signalFeed.map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-2 rounded px-2.5 py-1.5 hover:bg-muted/50 transition-colors">
              <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase", item.color)}>{item.type}</span>
              <span className="flex-1 truncate text-xs text-foreground">{item.label}</span>
              {item.detail && <span className="shrink-0 text-[10px] text-muted-foreground truncate max-w-[120px]">{item.detail}</span>}
              <span className="shrink-0 font-mono text-[9px] text-muted-foreground/50">{item.time ? format(new Date(item.time), "h:mm a") : "—"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* System Mode — Bottom */}
      <div className="rounded-lg border border-border/50 bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">System Mode</span>
          <StatusBadge variant={(modeConfig[systemMode] && modeConfig[systemMode].variant) || "success"}>{systemMode}</StatusBadge>
        </div>
        <div className="flex items-center gap-2">
          {(["normal", "cautious", "frozen"] as const).map(mode => {
            const cfg = modeConfig[mode]; const ModeIcon = cfg.icon; const active = systemMode === mode;
            return (<Button key={mode} variant={active ? "default" : "outline"} size="sm" onClick={() => sendCommand("system.set_mode", { mode }, mode === "frozen" ? "high" : "low")} className={cn(active ? "" : "border-border/50")}><ModeIcon className="mr-1.5 h-3.5 w-3.5" /><span className="capitalize">{mode}</span></Button>);
          })}
        </div>
        <div className="mt-2 flex gap-6 text-[10px] text-muted-foreground/50">
          <span>DB Tenants: <span className="text-muted-foreground font-semibold">{(stats && stats.tenants) || 0}</span></span>
          <span>PR Touches: <span className="text-muted-foreground font-semibold">{(stats && stats.prTouches) || 0}</span></span>
        </div>
      </div>
    </div>
  );
};

export default Home;
