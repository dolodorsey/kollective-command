import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { COMMAND_LABELS, DIVISIONS, CITIES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { format } from "date-fns";
import { Check, X, RotateCcw, Zap, Lightbulb, Sliders, ChevronLeft } from "lucide-react";
import { retryCommand, killCommand, sendCommand } from "@/lib/commands";
import { toast } from "sonner";

const COMMAND_OPTIONS = [
  { id: 'brand.email_blast', label: 'Send Email Blast', desc: 'Sends templated email to brand contact list', fields: ['brand', 'city', 'count'] },
  { id: 'brand.ig_outreach', label: 'Send IG DMs', desc: 'Sends DM scripts to Instagram targets', fields: ['brand', 'city', 'count'] },
  { id: 'brand.scrape_leads', label: 'Find New Leads', desc: 'Scrapes IG/Google for new contacts', fields: ['brand', 'city', 'source', 'count'] },
  { id: 'scrape.&.enrich.leads', label: 'Scrape + Enrich', desc: 'Finds leads then fills in missing info', fields: ['brand', 'city', 'source', 'count'] },
  { id: 'social_outreach_sync', label: 'Sync Social Targets', desc: 'Pulls latest social targets from sheets', fields: ['brand'] },
  { id: 'pr.blast', label: 'Send PR Pitch', desc: 'Sends press release or pitch to media contacts', fields: ['brand', 'event', 'subject'] },
  { id: 'event.launch', label: 'Launch Event', desc: 'Activates event promotion across all channels', fields: ['brand', 'event', 'city'] },
  { id: 'content.generate', label: 'Generate Content', desc: 'Creates social media content pack', fields: ['brand', 'city', 'type'] },
  { id: 'social.comment', label: 'Post Comments', desc: 'Drops comments on target posts', fields: ['brand', 'count'] },
  { id: 'lead.score', label: 'Score Leads', desc: 'Runs scoring algorithm on lead database', fields: ['brand'] },
  { id: 'contact.source', label: 'Source Contacts', desc: 'Pulls contacts from source URL or directory', fields: ['brand', 'city', 'source', 'count'] },
  { id: 'schedule.messenger', label: 'Schedule Messages', desc: 'Queues messages for timed delivery', fields: ['brand', 'count'] },
  { id: 'sponsor_deck', label: 'Send Sponsor Deck', desc: 'Emails sponsorship deck to prospects', fields: ['brand', 'event', 'recipient'] },
  { id: 'book_dj', label: 'Book DJ / Host', desc: 'Sends booking inquiry to talent', fields: ['brand', 'event', 'city'] },
  { id: 'daily_brief', label: 'Daily Intel Brief', desc: 'Generates morning briefing with tasks, events, metrics', fields: [] },
  { id: 'clawbot', label: 'Clawbot Directory Crawl', desc: 'Crawl a directory or website for contact info', fields: ['url'] },
  { id: 'event.launch', label: 'Launch Event', desc: 'Triggers flyer generation, captions, and email copy for an event', fields: ['brand', 'event', 'city'] },
  { id: 'daily.queue', label: 'Build Daily Queue', desc: 'Runs the daily outreach queue builder', fields: [] },
  { id: 'kpi.digest', label: 'KPI Digest', desc: 'Generates nightly KPI summary across all brands', fields: [] },
  { id: 'touch.log', label: 'Log Touch', desc: 'Manually log a touchpoint for a brand contact', fields: ['brand', 'recipient'] },
  { id: 'mcp.dispatch', label: 'MCP Dispatch', desc: 'Route a task through the MCP dispatcher', fields: ['brand'] },
];

const Commands = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [tab, setTab] = useState("current");
  const [selectedCmd, setSelectedCmd] = useState<string | null>(null);
  const [cmdParams, setCmdParams] = useState<Record<string, string>>({});

  const { data: commands = [] } = useQuery({
    queryKey: ["commands"],
    queryFn: async () => {
      const { data } = await supabase.from("command_log").select("*").order("executed_at", { ascending: false }).limit(100);
      return data || [];
    },
    refetchInterval: 15000,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events-for-cmds"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("id, title, brand_key, city, event_date").order("event_date", { ascending: true }).limit(50);
      return data || [];
    },
  });

  // Generate suggestions based on data gaps
  const { data: suggestions = [] } = useQuery({
    queryKey: ["cmd-suggestions"],
    queryFn: async () => {
      const items: { cmd: string; label: string; reason: string; brand?: string; params?: Record<string, string> }[] = [];
      // Check for brands with no recent outreach
      const { data: plans } = await supabase.from("outreach_plans").select("brand_key, status").eq("status", "active").limit(50);
      const activeBrands = [...new Set((plans || []).map((p: any) => p.brand_key))];
      const { data: recentCmds } = await supabase.from("command_log").select("target_key").gte("executed_at", new Date(Date.now() - 7 * 86400000).toISOString());
      const recentTargets = new Set((recentCmds || []).map((c: any) => c.target_key).filter(Boolean));
      activeBrands.forEach(b => {
        if (!recentTargets.has(b)) {
          items.push({ cmd: 'brand.ig_outreach', label: `Send IG DMs for ${b}`, reason: 'No outreach activity in 7 days', brand: b, params: { brand: b } });
        }
      });
      // Suggest daily brief if none today
      const { count: briefCount } = await supabase.from("command_log").select("*", { count: "exact", head: true }).eq("command_type", "daily_brief").gte("executed_at", new Date().toISOString().split('T')[0]);
      if (!briefCount) items.push({ cmd: 'daily_brief', label: 'Run Daily Intel Brief', reason: 'No brief generated today', params: {} });
      // Suggest lead scoring
      items.push({ cmd: 'lead.score', label: 'Score All Leads', reason: 'Regular scoring keeps pipeline prioritized', params: { brand: 'all' } });
      return items.slice(0, 8);
    },
  });

  const statusColor = (s: string) => {
    if (s === 'success') return 'bg-green-100 text-green-800 border-green-200';
    if (s === 'failed' || s === 'killed') return 'bg-red-100 text-red-800 border-red-200';
    if (s === 'queued' || s === 'pending') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (s === 'running') return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const getLabel = (type: string) => COMMAND_LABELS[type]?.label || type.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const getDesc = (type: string) => COMMAND_LABELS[type]?.desc || '';

  const allBrands = DIVISIONS.flatMap(d => d.brands);
  const cmdDef = COMMAND_OPTIONS.find(c => c.id === selectedCmd);

  const runCustomCommand = () => {
    if (!selectedCmd) return;
    sendCommand(selectedCmd, { ...cmdParams, approval_required: true }, 'global', cmdParams.brand || undefined);
    toast.success(`Command queued: ${selectedCmd}`);
    setSelectedCmd(null);
    setCmdParams({});
    queryClient.invalidateQueries({ queryKey: ["commands"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Commands</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Every action the system has taken or can take.</p>
          </div>
        </div>
        <Badge variant="outline" className="text-base px-4 py-1">{commands.length} total</Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="current"><Zap className="h-3 w-3 mr-1" /> Current ({commands.length})</TabsTrigger>
          <TabsTrigger value="suggested"><Lightbulb className="h-3 w-3 mr-1" /> Suggested ({suggestions.length})</TabsTrigger>
          <TabsTrigger value="options"><Sliders className="h-3 w-3 mr-1" /> Command Options ({COMMAND_OPTIONS.length})</TabsTrigger>
        </TabsList>

        {/* TAB 1: Current Commands */}
        <TabsContent value="current" className="mt-4">
          <div className="space-y-2">
            {commands.map((cmd: any) => (
              <div key={cmd.id} onClick={() => setSelected(cmd)}
                className="flex items-center justify-between p-4 bg-white border rounded-lg hover:border-gray-300 cursor-pointer transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cmd.status === 'success' ? '#16a34a' : cmd.status === 'failed' ? '#dc2626' : '#f59e0b' }} />
                  <div>
                    <div className="font-semibold text-sm">{getLabel(cmd.command_type)}</div>
                    <div className="text-xs text-muted-foreground">{getDesc(cmd.command_type)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {cmd.scope && cmd.scope !== 'global' && <Badge variant="secondary" className="text-xs">{cmd.scope}</Badge>}
                  {cmd.target_key && <Badge variant="outline" className="text-xs">{cmd.target_key}</Badge>}
                  <Badge className={statusColor(cmd.status)}>{cmd.status}</Badge>
                  <span className="text-xs text-muted-foreground w-20 text-right">{cmd.executed_at ? format(new Date(cmd.executed_at), 'MMM d, h:mm a') : '—'}</span>
                </div>
              </div>
            ))}
            {commands.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No commands executed yet.</p>}
          </div>
        </TabsContent>

        {/* TAB 2: Suggested Commands */}
        <TabsContent value="suggested" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">System-generated suggestions based on activity gaps and schedule.</p>
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className="p-4 bg-white border rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.reason}</div>
                  {s.brand && <Badge variant="outline" className="text-[10px] mt-1">{s.brand}</Badge>}
                </div>
                <Button size="sm" onClick={() => {
                  sendCommand(s.cmd, { ...s.params, approval_required: true }, 'global', s.brand);
                  toast.success(`Queued: ${s.label}`);
                  queryClient.invalidateQueries({ queryKey: ["commands"] });
                }}>
                  <Zap className="h-3 w-3 mr-1" /> Run
                </Button>
              </div>
            ))}
            {suggestions.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No suggestions right now. System is up to date.</p>}
          </div>
        </TabsContent>

        {/* TAB 3: Command Options with Custom Params */}
        <TabsContent value="options" className="mt-4">
          {!selectedCmd ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {COMMAND_OPTIONS.map(c => (
                <button key={c.id} onClick={() => setSelectedCmd(c.id)}
                  className="flex flex-col items-start gap-1 p-4 bg-white border rounded-lg hover:border-gray-300 hover:shadow-sm transition-all text-left">
                  <div className="font-semibold text-sm">{c.label}</div>
                  <div className="text-[11px] text-muted-foreground leading-tight">{c.desc}</div>
                  {c.fields.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.fields.map(f => <Badge key={f} variant="secondary" className="text-[9px]">{f}</Badge>)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white border rounded-lg p-6 max-w-lg">
              <h3 className="font-semibold text-lg mb-1">{cmdDef?.label}</h3>
              <p className="text-sm text-muted-foreground mb-4">{cmdDef?.desc}</p>
              <div className="space-y-3">
                {cmdDef?.fields.includes('brand') && (
                  <Select value={cmdParams.brand || ''} onValueChange={v => setCmdParams({ ...cmdParams, brand: v })}>
                    <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brands</SelectItem>
                      {allBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {cmdDef?.fields.includes('city') && (
                  <Select value={cmdParams.city || ''} onValueChange={v => setCmdParams({ ...cmdParams, city: v })}>
                    <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>{CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                {cmdDef?.fields.includes('event') && (
                  <Select value={cmdParams.event || ''} onValueChange={v => setCmdParams({ ...cmdParams, event: v })}>
                    <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
                    <SelectContent>{events.map((e: any) => <SelectItem key={e.id} value={e.title}>{e.title} — {e.city}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                {cmdDef?.fields.includes('count') && (
                  <Input type="number" placeholder="Count (e.g. 50, 100, 200)" value={cmdParams.count || ''} onChange={e => setCmdParams({ ...cmdParams, count: e.target.value })} />
                )}
                {cmdDef?.fields.filter(f => !['brand', 'city', 'event', 'count'].includes(f)).map(f => (
                  <Input key={f} placeholder={f.replace(/_/g, ' ')} value={cmdParams[f] || ''} onChange={e => setCmdParams({ ...cmdParams, [f]: e.target.value })} />
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={runCustomCommand}><Zap className="h-4 w-4 mr-1" /> Run (Requires Approval)</Button>
                <Button variant="ghost" onClick={() => { setSelectedCmd(null); setCmdParams({}); }}>Cancel</Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg">{getLabel(selected.command_type)}</SheetTitle>
                <p className="text-sm text-muted-foreground">{getDesc(selected.command_type)}</p>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Status:</span> <Badge className={statusColor(selected.status)}>{selected.status}</Badge></div>
                  <div><span className="text-muted-foreground">Scope:</span> {selected.scope || 'global'}</div>
                  <div><span className="text-muted-foreground">Target:</span> {selected.target_key || '—'}</div>
                  <div><span className="text-muted-foreground">Time:</span> {selected.executed_at ? format(new Date(selected.executed_at), 'MMM d, h:mm a') : '—'}</div>
                </div>
                {selected.payload && (() => {
                  try {
                    const p = typeof selected.payload === 'string' ? JSON.parse(selected.payload) : selected.payload;
                    if (p.output) return <div><h3 className="font-semibold text-sm mb-2">Output</h3><div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap">{typeof p.output === 'string' ? p.output : JSON.stringify(p.output, null, 2)}</div></div>;
                    if (p.message) return <div><h3 className="font-semibold text-sm mb-2">Message Sent</h3><div className="bg-blue-50 rounded-lg p-4 text-sm">{p.message}</div></div>;
                    return <div><h3 className="font-semibold text-sm mb-2">Details</h3><div className="bg-gray-50 rounded-lg p-4 text-sm font-mono text-xs whitespace-pre-wrap">{JSON.stringify(p, null, 2)}</div></div>;
                  } catch { return <div><h3 className="font-semibold text-sm mb-2">Payload</h3><div className="bg-gray-50 rounded-lg p-4 text-xs">{String(selected.payload)}</div></div>; }
                })()}
                <div className="flex gap-2 pt-4">
                  <Button size="sm" variant="outline" onClick={() => { retryCommand(selected.id); setSelected(null); queryClient.invalidateQueries({ queryKey: ["commands"] }); }}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Retry
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => { killCommand(selected.id); setSelected(null); queryClient.invalidateQueries({ queryKey: ["commands"] }); }}>
                    <X className="h-3 w-3 mr-1" /> Kill
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Commands;
