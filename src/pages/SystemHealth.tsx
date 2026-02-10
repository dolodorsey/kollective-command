import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { WORKFLOWS, WORKFLOW_CATEGORIES } from "@/lib/constants";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, Radio, AlertTriangle, Workflow } from "lucide-react";
import { format } from "date-fns";

const SystemHealth = () => {
  const queryClient = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState('all');
  const [resolvedFilter, setResolvedFilter] = useState('all');

  const { data: webhookHealth = [] } = useQuery({
    queryKey: ['webhook-health'],
    queryFn: async () => {
      const { data } = await supabase.from('webhook_health').select('*');
      return data || [];
    },
  });

  const { data: failures = [] } = useQuery({
    queryKey: ['failure-log'],
    queryFn: async () => {
      const { data } = await supabase.from('failure_log').select('*').order('occurred_at', { ascending: false }).limit(100);
      return data || [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('system-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'failure_log' }, () => {
        queryClient.invalidateQueries({ queryKey: ['failure-log'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const healthyCount = webhookHealth.filter((w: any) => w.status === 'healthy').length;
  const openFailures = failures.filter((f: any) => !f.resolved).length;

  const filteredFailures = failures.filter((f: any) => {
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    if (resolvedFilter === 'open' && f.resolved) return false;
    if (resolvedFilter === 'resolved' && !f.resolved) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">System Health</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Total Workflows" value={WORKFLOWS.length} icon={Workflow} />
        <StatCard label="Healthy Webhooks" value={healthyCount} icon={Radio} />
        <StatCard label="Open Failures" value={openFailures} icon={AlertTriangle} />
      </div>

      {/* Workflow Status */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workflow Status</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {WORKFLOWS.map(w => {
            const cat = WORKFLOW_CATEGORIES[w.cat];
            return (
              <div key={w.id} className="flex items-center gap-3 rounded-md border border-border/30 bg-secondary/30 p-3">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{w.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{w.id}</p>
                </div>
                <StatusBadge variant={w.cat === 'system' ? 'error' : w.cat === 'content' ? 'warning' : w.cat === 'social' ? 'pink' : w.cat === 'outreach' ? 'info' : w.cat === 'sales' ? 'success' : w.cat === 'events' ? 'cyan' : w.cat === 'intel' ? 'purple' : 'default'}>
                  {cat?.label || w.cat}
                </StatusBadge>
              </div>
            );
          })}
        </div>
      </div>

      {/* Webhook Health */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Webhook Health</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {webhookHealth.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No webhook data</p>}
          {webhookHealth.map((wh: any, i: number) => (
            <div key={wh.id || i} className="rounded-lg border border-border/30 bg-secondary/30 p-4">
              <div className="flex items-center justify-between">
                <p className="truncate text-sm font-medium text-foreground">{wh.workflow_name || wh.name || 'Webhook'}</p>
                <StatusBadge variant={wh.status === 'healthy' ? 'success' : wh.status === 'degraded' ? 'warning' : 'error'}>
                  {wh.status}
                </StatusBadge>
              </div>
              <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{wh.endpoint || wh.url || '—'}</p>
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span>Checks: {wh.total_checks ?? 0}</span>
                <span>Failures: {wh.total_failures ?? 0}</span>
                <span>{wh.response_time_ms ?? wh.response_time ?? '—'}ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Failure Log */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Failure Log</h2>
          <div className="flex gap-2">
            <div className="flex gap-1">
              {['all', 'low', 'medium', 'high', 'critical'].map(s => (
                <Button key={s} size="sm" variant={severityFilter === s ? 'default' : 'ghost'} onClick={() => setSeverityFilter(s)} className="h-7 text-[10px] capitalize">
                  {s}
                </Button>
              ))}
            </div>
            <div className="flex gap-1">
              {['all', 'open', 'resolved'].map(r => (
                <Button key={r} size="sm" variant={resolvedFilter === r ? 'default' : 'ghost'} onClick={() => setResolvedFilter(r)} className="h-7 text-[10px] capitalize">
                  {r}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="max-h-96 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Workflow</TableHead>
                <TableHead className="text-muted-foreground">Severity</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Error</TableHead>
                <TableHead className="text-muted-foreground">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFailures.map((f: any, i: number) => (
                <TableRow key={f.id || i} className="border-border/20 hover:bg-muted/30">
                  <TableCell className="text-sm text-foreground">{f.workflow_name || f.workflow || '—'}</TableCell>
                  <TableCell>
                    <StatusBadge variant={f.severity === 'critical' ? 'error' : f.severity === 'high' ? 'warning' : 'default'}>
                      {f.severity || '—'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={f.resolved ? 'success' : 'error'}>
                      {f.resolved ? 'Resolved' : 'Open'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{f.error_message || f.error || '—'}</TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">
                    {(f.occurred_at || f.created_at) ? format(new Date(f.occurred_at || f.created_at), 'MMM d HH:mm') : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {filteredFailures.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No failures match filters</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
