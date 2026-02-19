import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { sendCommand } from "@/lib/commands";
import { DIVISIONS } from "@/lib/constants";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Building2, Users, Target, Mail, Terminal,
  AlertTriangle, Radio, Calendar, ChevronRight,
  Zap, Shield, Snowflake, Clock,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const Home = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [tenants, leads, contacts, prTouches, commands, failures, webhooks] = await Promise.all([
        supabase.from('tenants').select('*', { count: 'exact', head: true }),
        supabase.from('crm_leads').select('*', { count: 'exact', head: true }),
        supabase.from('contacts_master').select('*', { count: 'exact', head: true }),
        supabase.from('pr_outreach_activity').select('*', { count: 'exact', head: true }),
        supabase.from('command_log').select('*', { count: 'exact', head: true }),
        supabase.from('failure_log').select('*', { count: 'exact', head: true }).eq('resolved', false),
        supabase.from('webhook_health').select('*', { count: 'exact', head: true }).eq('status', 'healthy'),
      ]);
      return {
        tenants: tenants.count ?? 0, leads: leads.count ?? 0, contacts: contacts.count ?? 0,
        prTouches: prTouches.count ?? 0, commands: commands.count ?? 0,
        failures: failures.count ?? 0, webhooks: webhooks.count ?? 0,
      };
    },
    refetchInterval: 30000,
  });

  const { data: systemModeData } = useQuery({
    queryKey: ['system-mode'],
    queryFn: async () => {
      const { data } = await supabase.from('system_mode').select('*').limit(1).maybeSingle();
      return data;
    },
    refetchInterval: 30000,
  });
  const systemMode = systemModeData?.mode || 'normal';

  const { data: signalFeed = [] } = useQuery({
    queryKey: ['signal-feed'],
    queryFn: async () => {
      const [cmds, ledger] = await Promise.all([
        supabase.from('command_log').select('command_type, scope, target_key, executed_at').order('executed_at', { ascending: false }).limit(10),
        supabase.from('ledger_actions').select('action_type, tenant_id, created_at').order('created_at', { ascending: false }).limit(10),
      ]);
      return [
        ...(cmds.data || []).map((c: any) => ({ type: 'command', label: c.command_type, status: c.scope, time: c.executed_at })),
        ...(ledger.data || []).map((l: any) => ({ type: 'ledger', label: l.action_type, status: l.tenant_id, time: l.created_at })),
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 20);
    },
    refetchInterval: 30000,
  });

  const { data: pendingApprovals = 0 } = useQuery({
    queryKey: ['pending-count'],
    queryFn: async () => {
      const { count } = await supabase.from('approval_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      return count || 0;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('home-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'command_log' }, () => {
        queryClient.invalidateQueries({ queryKey: ['signal-feed'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'failure_log' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: nextEvents = [] } = useQuery({
    queryKey: ['next-events'],
    queryFn: async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, city, date')
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(5);
      return (data || []).map((e: any) => ({ name: e.title, city: e.city, date: e.date }));
    },
  });

  const modeConfig: Record<string, { icon: React.ElementType; label: string; variant: 'success' | 'warning' | 'error'; affected: number }> = {
    normal: { icon: Shield, label: 'Normal', variant: 'success', affected: 0 },
    cautious: { icon: Clock, label: 'Cautious', variant: 'warning', affected: 12 },
    frozen: { icon: Snowflake, label: 'Frozen', variant: 'error', affected: 32 },
  };

  const needsYouCount = (stats?.failures ?? 0) + pendingApprovals;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Command Center</h1>

      {/* KPI Stats — All Clickable */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Commands" value={stats?.commands ?? '—'} icon={Terminal} onClick={() => navigate('/commands')} />
        <StatCard label="Contacts" value={stats?.contacts ? stats.contacts.toLocaleString() : '—'} icon={Users} onClick={() => navigate('/leads')} />
        <StatCard label="Open Failures" value={stats?.failures ?? '—'} icon={AlertTriangle} onClick={() => navigate('/system')} alert={(stats?.failures ?? 0) > 0} />
        <StatCard label="Healthy Webhooks" value={`${stats?.webhooks ?? '—'}/26`} icon={Radio} onClick={() => navigate('/system')} />
        <StatCard label="PR Touches" value={stats?.prTouches ?? '—'} icon={Mail} onClick={() => navigate('/outreach')} />
        <StatCard label="DB Tenants" value={stats?.tenants ?? '—'} icon={Building2} />
        <StatCard label="Leads" value={stats?.leads ?? '—'} icon={Target} onClick={() => navigate('/leads')} />
        <StatCard label="Total Brands" value={47} icon={Building2} />
      </div>

      {/* System Mode — Functional Toggle */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            System Mode — Global Execution Lock
          </span>
          <StatusBadge variant={modeConfig[systemMode]?.variant || 'success'}>{systemMode}</StatusBadge>
        </div>
        <div className="flex items-center gap-2">
          {(['normal', 'cautious', 'frozen'] as const).map(mode => {
            const cfg = modeConfig[mode];
            const ModeIcon = cfg.icon;
            const active = systemMode === mode;
            return (
              <Button
                key={mode}
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => sendCommand('system.set_mode', { mode }, mode === 'frozen' ? 'high' : 'low')}
                className={cn(active ? '' : 'border-border/50')}
              >
                <ModeIcon className={cn("mr-1.5 h-3.5 w-3.5", !active && `text-status-${cfg.variant}`)} />
                <span className="capitalize">{mode}</span>
              </Button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-6 text-[11px] text-muted-foreground/50">
          <span>Last change: <span className="text-muted-foreground">Feb 10, 22:00</span></span>
          <span>By: <span className="text-muted-foreground">dr.dorsey</span></span>
          <span>Affected: <span className="text-muted-foreground">{modeConfig[systemMode]?.affected ?? 0} workflows</span></span>
        </div>
      </div>

      {/* What Needs You + Next Events */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={cn(
          "relative rounded-lg border bg-card p-5 transition-all",
          needsYouCount > 0 ? "border-primary/30 shadow-gold-glow" : "border-border/50"
        )}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What Needs You</h2>
            {needsYouCount > 0 && <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />}
          </div>
          <div className="space-y-3">
            {(stats?.failures ?? 0) > 0 && (
              <button onClick={() => navigate('/system')} className="flex w-full items-center gap-3 rounded-md border border-status-error/20 bg-status-error/5 p-3 text-left transition-colors hover:bg-status-error/10">
                <AlertTriangle className="h-4 w-4 text-status-error" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{stats?.failures} Unresolved Failures</p>
                  <p className="text-xs text-muted-foreground">Requires investigation</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <button onClick={() => navigate('/tasks')} className="flex w-full items-center gap-3 rounded-md border border-primary/20 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{pendingApprovals} Pending Approvals</p>
                <p className="text-xs text-muted-foreground">Review queued items</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-card p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next Up</h2>
          <div className="space-y-2">
            {nextEvents.map((event, i) => (
              <div key={i} className="flex items-center gap-3 rounded-md border border-border/30 bg-secondary/50 p-3">
                <Calendar className="h-4 w-4 text-primary/70" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{event.name}</p>
                  <p className="text-xs text-muted-foreground">{event.city}</p>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {format(new Date(event.date), 'MMM d')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Divisions — Clickable */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Divisions</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {DIVISIONS.map(div => (
            <div key={div.key} className="group cursor-pointer rounded-lg border border-border/50 bg-card p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-gold-glow"
              style={{ borderLeftColor: div.color, borderLeftWidth: 3 }}
              onClick={() => navigate(`/division/${div.key}`)}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{div.icon}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{div.name}</p>
                  <p className="text-[10px] text-muted-foreground">{div.sub}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{div.brands.length} brands</p>
            </div>
          ))}
        </div>
      </div>

      {/* Signal Feed */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Signal Feed</h2>
        <div className="max-h-64 space-y-1 overflow-auto">
          {signalFeed.length === 0 && <p className="text-sm text-muted-foreground">No recent signals</p>}
          {signalFeed.map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-3 rounded px-3 py-2 transition-colors hover:bg-muted/50">
              <div className={cn("h-1.5 w-1.5 rounded-full", item.type === 'command' ? "bg-primary" : "bg-status-info")} />
              <span className="flex-1 truncate font-mono text-xs text-foreground">{item.label}</span>
              <StatusBadge variant={item.type === 'command' ? 'warning' : 'info'} className="text-[8px]">{item.type}</StatusBadge>
              <span className="font-mono text-[10px] text-muted-foreground">
                {item.time ? format(new Date(item.time), 'HH:mm:ss') : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
