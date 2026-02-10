import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { sendCommand } from "@/lib/commands";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Target, Users, UserPlus, Search, Check, X, ArrowRight } from "lucide-react";
import { format } from "date-fns";

const PLATFORMS = ['Google', 'Instagram', 'TikTok', 'Facebook'];

const Leads = () => {
  const queryClient = useQueryClient();
  const [platform, setPlatform] = useState('Google');
  const [city, setCity] = useState('');
  const [niche, setNiche] = useState('');
  const [limit, setLimit] = useState(20);

  const { data: leads = [] } = useQuery({
    queryKey: ['crm-leads'],
    queryFn: async () => {
      const { data } = await supabase.from('crm_leads').select('*').order('created_at', { ascending: false }).limit(100);
      return data || [];
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-master'],
    queryFn: async () => {
      const { data } = await supabase.from('contacts_master').select('*').order('created_at', { ascending: false }).limit(100);
      return data || [];
    },
  });

  const totalLeads = leads.length;
  const newLeads = leads.filter((l: any) => l.status === 'new').length;
  const qualifiedLeads = leads.filter((l: any) => l.status === 'qualified').length;

  const runSourcing = () => {
    sendCommand('lead_sourcing.run', { platform, city, niche, limit });
  };

  const handleLead = async (action: string, leadId: string, extra?: Record<string, unknown>) => {
    await sendCommand(action, { lead_id: leadId, ...extra });
    queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
  };

  const statusVariant = (s: string) => {
    const map: Record<string, 'success' | 'warning' | 'info' | 'error' | 'default'> = {
      new: 'info', qualified: 'success', rejected: 'error', contacted: 'warning',
    };
    return map[s] || 'default';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Lead Sourcing</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Leads" value={totalLeads} icon={Target} />
        <StatCard label="New" value={newLeads} icon={UserPlus} />
        <StatCard label="Qualified" value={qualifiedLeads} icon={Check} />
        <StatCard label="Contacts" value={contacts.length} icon={Users} />
      </div>

      {/* Sourcing Panel */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead Sourcing Engine</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">Platform</label>
            <div className="flex gap-1">
              {PLATFORMS.map(p => (
                <Button key={p} size="sm" variant={platform === p ? 'default' : 'outline'} onClick={() => setPlatform(p)} className="text-xs">
                  {p}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">City</label>
            <Input placeholder="e.g. Atlanta" value={city} onChange={e => setCity(e.target.value)} className="w-36 bg-secondary" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">Niche</label>
            <Input placeholder="e.g. restaurants" value={niche} onChange={e => setNiche(e.target.value)} className="w-36 bg-secondary" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">Limit</label>
            <Input type="number" value={limit} onChange={e => setLimit(+e.target.value)} className="w-20 bg-secondary" />
          </div>
          <Button onClick={runSourcing}>
            <Search className="mr-2 h-4 w-4" /> RUN SOURCING
          </Button>
        </div>
      </div>

      {/* Lead Review Desk */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead Review Desk</h2>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Name</TableHead>
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground">Brand</TableHead>
                <TableHead className="text-muted-foreground">Source</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Score</TableHead>
                <TableHead className="text-right text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead: any) => (
                <TableRow key={lead.id} className="border-border/20 hover:bg-muted/30">
                  <TableCell className="text-sm font-medium text-foreground">{lead.name || lead.contact_name || '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{lead.email || '—'}</TableCell>
                  <TableCell className="text-sm text-foreground">{lead.brand || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{lead.source || '—'}</TableCell>
                  <TableCell><StatusBadge variant={statusVariant(lead.status)}>{lead.status || '—'}</StatusBadge></TableCell>
                  <TableCell className="font-mono text-xs text-primary">{lead.score ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-status-success hover:bg-status-success/10" onClick={() => handleLead('lead.approve', lead.id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-status-error hover:bg-status-error/10" onClick={() => handleLead('lead.reject', lead.id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-status-info hover:bg-status-info/10" onClick={() => handleLead('lead.route', lead.id, { pipeline: 'customer' })}>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {leads.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No leads found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Contacts */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contacts Master</h2>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Name</TableHead>
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground">Phone</TableHead>
                <TableHead className="text-muted-foreground">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.slice(0, 20).map((c: any, i: number) => (
                <TableRow key={c.id || i} className="border-border/20 hover:bg-muted/30">
                  <TableCell className="text-sm text-foreground">{c.name || c.contact_name || '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{c.email || '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{c.phone || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.source || '—'}</TableCell>
                </TableRow>
              ))}
              {contacts.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No contacts</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Leads;
