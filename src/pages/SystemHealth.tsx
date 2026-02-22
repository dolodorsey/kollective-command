import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { sendCommand } from "@/lib/commands";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, Radio, Shield, Clock, Snowflake, RefreshCw, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SystemHealth = () => {
  const queryClient = useQueryClient();

  const { data: failures = [] } = useQuery({
    queryKey: ["failures"],
    queryFn: async () => {
      const { data } = await supabase.from("failure_log").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    refetchInterval: 15000,
  });

  const { data: webhooks = [] } = useQuery({
    queryKey: ["webhook-health"],
    queryFn: async () => {
      const { data } = await supabase.from("webhook_health").select("*").order("last_checked_at", { ascending: false });
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: systemMode } = useQuery({
    queryKey: ["system-mode"],
    queryFn: async () => {
      const { data } = await supabase.from("system_mode").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const { data: connectionHealth = [] } = useQuery({
    queryKey: ["connection-health"],
    queryFn: async () => {
      const { data } = await supabase.from("connection_health").select("*").order("last_checked_at", { ascending: false });
      return data || [];
    },
  });

  const healthyWebhooks = webhooks.filter((w: any) => w.status === "healthy").length;
  const unresolvedFailures = failures.filter((f: any) => !f.resolved).length;

  const handleModeChange = async (mode: string) => {
    await supabase.from("system_mode").update({ mode, set_by: "dr.dorsey", set_at: new Date().toISOString(), reason: `Manual switch to ${mode}` }).eq("id", 1);
    queryClient.invalidateQueries({ queryKey: ["system-mode"] });
    toast.success(`System mode: ${mode}`);
  };

  const handleResolve = async (id: string) => {
    await supabase.from("failure_log").update({ resolved: true, resolved_at: new Date().toISOString() }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["failures"] });
    toast.success("Failure resolved");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">System Health</h1>

      {/* System Mode */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System Mode</span>
          <StatusBadge variant={systemMode?.mode === "normal" ? "success" : systemMode?.mode === "cautious" ? "warning" : "error"}>
            {systemMode?.mode || "unknown"}
          </StatusBadge>
        </div>
        <div className="flex gap-2">
          {[
            { mode: "normal", icon: Shield, label: "Normal", variant: "success" as const },
            { mode: "cautious", icon: Clock, label: "Cautious", variant: "warning" as const },
            { mode: "frozen", icon: Snowflake, label: "Frozen", variant: "error" as const },
          ].map(m => (
            <Button key={m.mode} size="sm"
              variant={systemMode?.mode === m.mode ? "default" : "outline"}
              onClick={() => handleModeChange(m.mode)}>
              <m.icon className="mr-1.5 h-3.5 w-3.5" />{m.label}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground/50">
          Last change: {systemMode?.set_at ? format(new Date(systemMode.set_at), "MMM d HH:mm") : "—"} · By: {systemMode?.set_by || "—"}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className={cn("rounded-lg border bg-card p-4", unresolvedFailures > 0 ? "border-status-error/30" : "border-border/50")}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Unresolved Failures</span>
            <AlertTriangle className={cn("h-4 w-4", unresolvedFailures > 0 ? "text-status-error" : "text-muted-foreground/30")} />
          </div>
          <div className={cn("mt-2 font-mono text-2xl font-bold", unresolvedFailures > 0 ? "text-status-error" : "text-foreground")}>{unresolvedFailures}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Healthy Webhooks</span>
            <Radio className="h-4 w-4 text-primary/60" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-foreground">{healthyWebhooks}/{webhooks.length}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Connections</span>
            <Activity className="h-4 w-4 text-primary/60" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-foreground">{connectionHealth.length}</div>
        </div>
      </div>

      {/* Failure Log */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Failure Log</h2>
        <div className="max-h-64 space-y-2 overflow-auto">
          {failures.length === 0 && <p className="text-sm text-muted-foreground/40">No failures recorded</p>}
          {failures.map((f: any) => (
            <div key={f.id} className={cn("flex items-center gap-3 rounded-md border p-3",
              f.resolved ? "border-border/20 bg-secondary/20" : "border-status-error/20 bg-status-error/5"
            )}>
              <div className={cn("h-2 w-2 rounded-full", f.resolved ? "bg-status-success" : "bg-status-error animate-pulse")} />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{f.error_type || f.workflow_name || "Error"}</p>
                <p className="truncate text-xs text-muted-foreground">{f.error_message?.substring(0, 100) || "—"}</p>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {f.occurred_at ? format(new Date(f.occurred_at), "MMM d HH:mm") : "—"}
              </span>
              {!f.resolved && (
                <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => handleResolve(f.id)}>
                  <CheckCircle className="mr-1 h-3 w-3" />Resolve
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Webhook Health */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Webhook Health</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {webhooks.map((w: any) => (
            <div key={w.id} className="flex items-center gap-2 rounded-md border border-border/30 bg-secondary/30 p-2.5">
              <div className={cn("h-2 w-2 rounded-full",
                w.status === "healthy" ? "bg-status-success" : w.status === "degraded" ? "bg-status-warning" : "bg-status-error"
              )} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{w.workflow_name || w.endpoint || "—"}</p>
                <p className="text-[9px] text-muted-foreground">{w.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
