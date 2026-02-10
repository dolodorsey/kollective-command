import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { sendCommand } from "@/lib/commands";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { CommandConfirmDialog } from "@/components/CommandConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, FileText, Send, MessageSquare, Gauge } from "lucide-react";
import { format } from "date-fns";

const PIPELINES = [
  { key: 'customer', label: 'Customer', stages: ['Prospect', 'Contacted', 'Qualified', 'Proposal', 'Won'] },
  { key: 'pr', label: 'PR', stages: ['Identified', 'Pitched', 'Follow-up', 'Coverage', 'Published'] },
  { key: 'business', label: 'Business', stages: ['Lead', 'Meeting', 'Negotiation', 'Contract', 'Active'] },
  { key: 'followup', label: 'Follow-up', stages: ['Pending', 'Scheduled', 'Sent', 'Replied', 'Closed'] },
  { key: 'influencer', label: 'Influencer', stages: ['Discovered', 'Reached', 'Negotiating', 'Active', 'Completed'] },
];

const Outreach = () => {
  const [confirm, setConfirm] = useState({ open: false, title: '', description: '', action: () => {} });
  const [throttle, setThrottle] = useState({ perDay: 50, perHour: 10 });

  const { data: prContactsCount = 0 } = useQuery({
    queryKey: ['pr-contacts-count'],
    queryFn: async () => {
      const { count } = await supabase.from('pr_contacts').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: pitchesCount = 0 } = useQuery({
    queryKey: ['pitches-count'],
    queryFn: async () => {
      const { count } = await supabase.from('pr_pitches').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: prActivity = [] } = useQuery({
    queryKey: ['pr-activity'],
    queryFn: async () => {
      const { data } = await supabase.from('pr_outreach_activity').select('*').order('created_at', { ascending: false }).limit(50);
      return data || [];
    },
  });

  const sentCount = prActivity.filter((a: any) => a.step === 'sent' || a.status === 'sent').length;
  const repliedCount = prActivity.filter((a: any) => a.step === 'replied' || a.status === 'replied').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Outreach Command</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="PR Contacts" value={prContactsCount} icon={Users} />
        <StatCard label="Active Pitches" value={pitchesCount} icon={FileText} />
        <StatCard label="Outreach Sent" value={sentCount} icon={Send} />
        <StatCard label="Replied" value={repliedCount} icon={MessageSquare} />
      </div>

      {/* Pipelines */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {PIPELINES.map(pipe => (
          <div key={pipe.key} className="rounded-lg border border-border/50 bg-card p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">{pipe.label}</h3>
            <div className="space-y-2">
              {pipe.stages.map((stage, i) => (
                <div key={stage} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{stage}</span>
                  <div className="h-1.5 w-16 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.max(10, 100 - i * 20)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="destructive"
          onClick={() => setConfirm({
            open: true,
            title: 'Launch PR Blast',
            description: 'This will send outreach to all active PR contacts. This is a high-risk action.',
            action: () => sendCommand('outreach.launch', { type: 'pr', scope: 'global' }, 'high'),
          })}
        >
          <Send className="mr-2 h-4 w-4" /> Launch PR Blast
        </Button>
        <Button variant="command" onClick={() => sendCommand('workflow.run_now', { workflow_id: 'yGGm5IVIqFGprFBn', name: 'Scheduled Messenger' })}>
          Run Follow-ups
        </Button>
      </div>

      {/* Throttle Controls */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Gauge className="h-4 w-4" /> Throttle Controls
        </h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Targets / Day</label>
            <Input type="number" value={throttle.perDay} onChange={e => setThrottle(p => ({ ...p, perDay: +e.target.value }))} className="w-24 bg-secondary" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Targets / Hour</label>
            <Input type="number" value={throttle.perHour} onChange={e => setThrottle(p => ({ ...p, perHour: +e.target.value }))} className="w-24 bg-secondary" />
          </div>
          <Button variant="command" size="sm" onClick={() => sendCommand('throttle.set', { scope: 'global', targets_per_day: throttle.perDay, targets_per_hour: throttle.perHour })}>
            Set Throttle
          </Button>
        </div>
      </div>

      {/* PR Activity */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">PR Activity</h2>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Brand</TableHead>
                <TableHead className="text-muted-foreground">Channel</TableHead>
                <TableHead className="text-muted-foreground">Step</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prActivity.map((item: any, i: number) => (
                <TableRow key={i} className="border-border/20 hover:bg-muted/30">
                  <TableCell className="text-sm text-foreground">{item.brand || item.tenant || '—'}</TableCell>
                  <TableCell><StatusBadge variant="info">{item.channel || 'email'}</StatusBadge></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.step || '—'}</TableCell>
                  <TableCell>
                    <StatusBadge variant={item.status === 'sent' ? 'success' : item.status === 'failed' ? 'error' : 'default'}>
                      {item.status || '—'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.created_at ? format(new Date(item.created_at), 'MMM d, HH:mm') : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {prActivity.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No activity</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CommandConfirmDialog
        open={confirm.open}
        onOpenChange={(open) => setConfirm(p => ({ ...p, open }))}
        title={confirm.title}
        description={confirm.description}
        onConfirm={() => { confirm.action(); setConfirm(p => ({ ...p, open: false })); }}
      />
    </div>
  );
};

export default Outreach;
