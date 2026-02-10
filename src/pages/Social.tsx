import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { sendCommand } from "@/lib/commands";
import { EVENTS_2026 } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { CommandConfirmDialog } from "@/components/CommandConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Users, Calendar as CalendarIcon, List, PenTool, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { format } from "date-fns";

const QUEUE_STAGES = ['Draft', 'Review', 'Approved', 'Scheduled', 'Posted'];

const Social = () => {
  const [confirm, setConfirm] = useState({ open: false, title: '', description: '', action: () => {} });
  const [calMonth, setCalMonth] = useState(new Date(2026, 3, 1));
  const [draft, setDraft] = useState({ brand: '', platform: 'Instagram', caption: '', scheduleTime: '' });

  const { data: targets = [] } = useQuery({
    queryKey: ['social-targets'],
    queryFn: async () => {
      const { data } = await supabase.from('social_outreach_targets').select('*').limit(50);
      return data || [];
    },
  });

  const { data: scheduled = [] } = useQuery({
    queryKey: ['scheduled-messages'],
    queryFn: async () => {
      const { data } = await supabase.from('scheduled_messages').select('*').order('send_at', { ascending: true }).limit(50);
      return data || [];
    },
  });

  // Calendar helpers
  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthEvents = EVENTS_2026.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const calDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calDays.push(i);

  const saveDraft = () => {
    sendCommand('post.schedule', {
      brand: draft.brand,
      platform: draft.platform,
      content: draft.caption,
      scheduled_time: draft.scheduleTime,
    });
    setDraft({ brand: '', platform: 'Instagram', caption: '', scheduleTime: '' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Social Scheduler</h1>

      <Tabs defaultValue="accounts">
        <TabsList className="bg-secondary">
          <TabsTrigger value="accounts" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Users className="mr-1.5 h-3.5 w-3.5" /> Accounts
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="queue" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <List className="mr-1.5 h-3.5 w-3.5" /> Queue
          </TabsTrigger>
          <TabsTrigger value="composer" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <PenTool className="mr-1.5 h-3.5 w-3.5" /> Composer
          </TabsTrigger>
        </TabsList>

        {/* Accounts */}
        <TabsContent value="accounts" className="mt-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {targets.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No social accounts loaded</p>}
            {targets.map((t: any, i: number) => (
              <div key={t.id || i} className="rounded-lg border border-border/50 bg-card p-4 transition-all hover:border-primary/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    {(t.handle || t.name || '?')[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.handle || t.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{t.platform || 'Social'}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t.followers || 0} followers</span>
                  <StatusBadge variant={t.status === 'active' ? 'success' : 'default'}>{t.status || 'unknown'}</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Calendar */}
        <TabsContent value="calendar" className="mt-4">
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setCalMonth(new Date(year, month - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold text-foreground">{format(calMonth, 'MMMM yyyy')}</span>
              <Button variant="ghost" size="sm" onClick={() => setCalMonth(new Date(year, month + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="p-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{d}</div>
              ))}
              {calDays.map((day, i) => {
                const dayEvents = day ? monthEvents.filter(e => new Date(e.date).getDate() === day) : [];
                return (
                  <div key={i} className={cn("h-20 rounded border p-1.5", day ? "border-border/30 bg-secondary/30" : "border-transparent")}>
                    {day && (
                      <>
                        <span className="text-xs text-muted-foreground">{day}</span>
                        {dayEvents.map((e, j) => (
                          <div key={j} className="mt-0.5 truncate rounded bg-primary/10 px-1 text-[9px] text-primary">{e.name}</div>
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Queue */}
        <TabsContent value="queue" className="mt-4">
          <div className="flex gap-3 overflow-x-auto pb-4">
            {QUEUE_STAGES.map(stage => (
              <div key={stage} className="min-w-[220px] flex-shrink-0 rounded-lg border border-border/50 bg-card p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{stage}</h3>
                <div className="space-y-2">
                  {scheduled
                    .filter((s: any) => (s.status || 'Draft').toLowerCase() === stage.toLowerCase())
                    .map((s: any, i: number) => (
                      <div key={s.id || i} className="rounded border border-border/30 bg-secondary/50 p-3">
                        <p className="truncate text-xs text-foreground">{s.message || s.content || 'No content'}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {s.send_at ? format(new Date(s.send_at), 'MMM d HH:mm') : '—'}
                          </span>
                          <div className="flex gap-1">
                            {stage === 'Draft' && (
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-status-success" onClick={() => sendCommand('draft.approve', { approval_id: s.id })}>
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            {stage === 'Approved' && (
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-status-warning" onClick={() =>
                                setConfirm({ open: true, title: 'Publish Now', description: 'Publish this post immediately?', action: () => sendCommand('post.publish_now', { post_id: s.id }, 'high') })
                              }>
                                <PenTool className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Composer */}
        <TabsContent value="composer" className="mt-4">
          <div className="mx-auto max-w-lg rounded-lg border border-border/50 bg-card p-6">
            <h2 className="mb-4 text-sm font-semibold text-foreground">New Post Draft</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">Brand</label>
                <Input placeholder="Brand name" value={draft.brand} onChange={e => setDraft(d => ({ ...d, brand: e.target.value }))} className="bg-secondary" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">Platform</label>
                <div className="flex gap-2">
                  {['Instagram', 'Facebook', 'Twitter'].map(p => (
                    <Button key={p} size="sm" variant={draft.platform === p ? 'default' : 'outline'} onClick={() => setDraft(d => ({ ...d, platform: p }))}>
                      {p}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">Caption</label>
                <Textarea value={draft.caption} onChange={e => setDraft(d => ({ ...d, caption: e.target.value }))} className="min-h-[100px] bg-secondary" placeholder="Write your caption..." />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">Schedule</label>
                <Input type="datetime-local" value={draft.scheduleTime} onChange={e => setDraft(d => ({ ...d, scheduleTime: e.target.value }))} className="bg-secondary" />
              </div>
              <Button onClick={saveDraft} className="w-full">Save Draft</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <CommandConfirmDialog
        open={confirm.open}
        onOpenChange={o => setConfirm(p => ({ ...p, open: o }))}
        title={confirm.title}
        description={confirm.description}
        onConfirm={() => { confirm.action(); setConfirm(p => ({ ...p, open: false })); }}
      />
    </div>
  );
};

export default Social;
