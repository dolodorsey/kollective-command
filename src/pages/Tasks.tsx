import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { sendCommand } from "@/lib/commands";
import { WORKFLOWS } from "@/lib/constants";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Terminal, Clock, Play, Check, X } from "lucide-react";
import { format } from "date-fns";

const Tasks = () => {
  const queryClient = useQueryClient();

  const { data: approvals = [] } = useQuery({
    queryKey: ['approval-queue'],
    queryFn: async () => {
      const { data } = await supabase.from('approval_queue').select('*').order('created_at', { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: commands = [] } = useQuery({
    queryKey: ['command-log'],
    queryFn: async () => {
      const { data } = await supabase.from('command_log').select('*').order('created_at', { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: scheduledMsgs = [] } = useQuery({
    queryKey: ['scheduled-messages-tasks'],
    queryFn: async () => {
      const { data } = await supabase.from('scheduled_messages').select('*').order('send_at', { ascending: true }).limit(50);
      return data || [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'command_log' }, () => {
        queryClient.invalidateQueries({ queryKey: ['command-log'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_queue' }, () => {
        queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
        queryClient.invalidateQueries({ queryKey: ['pending-approvals-count'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const pendingApprovals = approvals.filter((a: any) => a.status === 'pending').length;
  const todayCommands = commands.filter((c: any) => {
    if (!c.created_at) return false;
    return new Date(c.created_at).toDateString() === new Date().toDateString();
  }).length;

  const runnableWorkflows = WORKFLOWS.filter(w => w.webhook);

  const riskVariant = (r: string): 'success' | 'warning' | 'error' | 'default' => {
    const m: Record<string, 'success' | 'warning' | 'error'> = { low: 'success', med: 'warning', high: 'error' };
    return m[r] || 'default';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Task Queue</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Pending Approvals" value={pendingApprovals} icon={ClipboardList} />
        <StatCard label="Commands Today" value={todayCommands} icon={Terminal} />
        <StatCard label="Scheduled Messages" value={scheduledMsgs.length} icon={Clock} />
      </div>

      {/* Workflow Controls */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workflow Controls</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {runnableWorkflows.map(w => (
            <div key={w.id} className="flex items-center justify-between rounded-md border border-border/30 bg-secondary/50 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{w.name}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">{w.webhook}</p>
              </div>
              <Button size="sm" variant="command" onClick={() => sendCommand('workflow.run_now', { workflow_id: w.id, name: w.name })}>
                <Play className="mr-1 h-3 w-3" /> RUN
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Approval Queue */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Approval Queue</h2>
        <div className="space-y-2">
          {approvals.length === 0 && <p className="text-sm text-muted-foreground">No items in queue</p>}
          {approvals.map((a: any, i: number) => (
            <div key={a.id || i} className="flex items-center gap-3 rounded-md border border-border/30 bg-secondary/30 p-3">
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{a.action_type || a.type || 'Approval'}</p>
                <p className="text-xs text-muted-foreground">{a.brand || a.tenant || '—'}</p>
              </div>
              <StatusBadge variant={a.status === 'pending' ? 'warning' : a.status === 'approved' ? 'success' : 'default'}>
                {a.status}
              </StatusBadge>
              {a.status === 'pending' && (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-status-success hover:bg-status-success/10"
                    onClick={() => sendCommand('draft.approve', { approval_id: a.id })}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-status-error hover:bg-status-error/10"
                    onClick={() => sendCommand('draft.reject', { approval_id: a.id, reason: 'Rejected from task queue' })}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Command History */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Command History</h2>
        <div className="max-h-64 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Command</TableHead>
                <TableHead className="text-muted-foreground">Risk</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commands.map((cmd: any, i: number) => (
                <TableRow key={cmd.id || i} className="border-border/20 hover:bg-muted/30">
                  <TableCell className="font-mono text-xs text-foreground">{cmd.command_type}</TableCell>
                  <TableCell><StatusBadge variant={riskVariant(cmd.risk_level)}>{cmd.risk_level}</StatusBadge></TableCell>
                  <TableCell><StatusBadge variant={cmd.status === 'completed' ? 'success' : cmd.status === 'failed' ? 'error' : 'warning'}>{cmd.status}</StatusBadge></TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">
                    {cmd.created_at ? format(new Date(cmd.created_at), 'MMM d HH:mm') : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {commands.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No commands</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Scheduled Messages */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scheduled Messages</h2>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Recipient</TableHead>
                <TableHead className="text-muted-foreground">Message</TableHead>
                <TableHead className="text-muted-foreground">Send At</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scheduledMsgs.map((msg: any, i: number) => (
                <TableRow key={msg.id || i} className="border-border/20 hover:bg-muted/30">
                  <TableCell className="text-sm text-foreground">{msg.recipient || msg.to || '—'}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{msg.message || msg.content || '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {msg.send_at ? format(new Date(msg.send_at), 'MMM d HH:mm') : '—'}
                  </TableCell>
                  <TableCell><StatusBadge variant={msg.status === 'sent' ? 'success' : msg.status === 'failed' ? 'error' : 'warning'}>{msg.status || 'queued'}</StatusBadge></TableCell>
                </TableRow>
              ))}
              {scheduledMsgs.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No scheduled messages</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Tasks;
