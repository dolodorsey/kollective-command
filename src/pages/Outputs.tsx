import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DIVISIONS, CITIES } from "@/lib/constants";
import { sendCommand } from "@/lib/commands";
import { Zap, Image, Calendar, Search, FileText, Megaphone, Send, Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";

const TEMPLATES = [
  { id: 'ig_pack', name: 'Generate IG Pack', icon: Image, desc: 'Create a set of IG stories + feed posts for an event or brand', fields: ['brand', 'city', 'event', 'tone'] },
  { id: 'schedule_posts', name: 'Schedule Posts for City', icon: Calendar, desc: 'Queue posts across all brand accounts for a target city', fields: ['brand', 'city', 'date_range'] },
  { id: 'scrape_enrich', name: 'Scrape & Enrich Leads', icon: Search, desc: 'Find and enrich contacts from IG/Google for a brand', fields: ['brand', 'city', 'source'] },
  { id: 'daily_brief', name: 'Daily Intel Brief', icon: FileText, desc: 'Generate a morning briefing with tasks, events, and metrics', fields: [] },
  { id: 'clawbot', name: 'Clawbot Directory Crawl', icon: Search, desc: 'Crawl a directory or website for contact info', fields: ['url'] },
  { id: 'pr_blast', name: 'PR Blast to Media', icon: Megaphone, desc: 'Send press release to PR contacts for a brand/event', fields: ['brand', 'event', 'subject'] },
  { id: 'sponsor_deck', name: 'Send Sponsor Deck', icon: Send, desc: 'Email sponsorship deck to potential sponsors', fields: ['brand', 'event', 'recipient'] },
  { id: 'book_dj', name: 'Book DJ / Host', icon: Sparkles, desc: 'Send booking inquiry to DJ or host from roster', fields: ['name', 'event', 'city', 'date'] },
  { id: 'event_recap', name: 'Post Event Recap', icon: Image, desc: 'Generate and post recap content after an event', fields: ['brand', 'event', 'city'] },
  { id: 'comment_drop', name: 'Comment Drop Campaign', icon: Send, desc: 'Drop comments on targeted posts across accounts', fields: ['brand', 'target_handles'] },
];

const PROMPTS = [
  { label: 'IG Story Announcement', prompt: 'Create an IG story for {brand} announcing {event} in {city} on {date}. Make it hype, visual-first, with a clear CTA to get tickets.' },
  { label: 'PR Pitch Email', prompt: 'Write a press pitch for {brand} about {event}. Include what makes it unique, target demographic, and why the outlet should cover it. Keep it under 200 words.' },
  { label: 'DM Outreach Script', prompt: 'Write a DM for {brand} reaching out to {name} about collaborating on {event} in {city}. Keep it casual, human, and direct. No corporate speak.' },
  { label: 'Event Description', prompt: 'Write an Eventbrite description for {event} by {brand} in {city}. Include vibe, what to expect, dress code suggestion, and ticket tiers.' },
  { label: 'Sponsor Pitch', prompt: 'Draft a sponsorship pitch email for {brand}. The event is {event} in {city}. Highlight audience demographics, activation opportunities, and past event metrics.' },
  { label: 'Comment Script', prompt: 'Write 10 natural-sounding IG comments for {brand} to drop on posts in {city}. Mix compliments, questions, and hype. No generic "nice!" comments.' },
];

const Outputs = () => {
  const [tab, setTab] = useState("generate");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const { data: history = [] } = useQuery({
    queryKey: ["output-history"],
    queryFn: async () => {
      const { data } = await supabase.from("command_log")
        .select("*")
        .in("command_type", ["content.generate", "ig_pack", "pr_blast", "schedule_posts", "scrape_enrich", "daily_brief", "clawbot", "sponsor_deck", "book_dj", "event_recap", "comment_drop"])
        .order("executed_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const runTemplate = () => {
    if (!selectedTemplate) return;
    sendCommand(selectedTemplate, { ...formData, approval_required: true });
    setSelectedTemplate(null);
    setFormData({});
  };

  const allBrands = DIVISIONS.flatMap(d => d.brands);
  const tmpl = TEMPLATES.find(t => t.id === selectedTemplate);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Outputs & Content Engine</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="templates">Prompt Templates ({PROMPTS.length})</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-4">
          {!selectedTemplate ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
                  className="flex flex-col items-center gap-2 p-5 bg-white border rounded-lg hover:border-gray-300 hover:shadow-sm transition-all text-center">
                  <t.icon className="h-7 w-7 text-gray-600" />
                  <div className="font-semibold text-xs">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{t.desc}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white border rounded-lg p-6 max-w-lg">
              <h3 className="font-semibold text-lg mb-1">{tmpl?.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{tmpl?.desc}</p>
              <div className="space-y-3">
                {tmpl?.fields.includes('brand') && (
                  <Select value={formData.brand || ''} onValueChange={v => setFormData({...formData, brand: v})}>
                    <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                    <SelectContent>{allBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                {tmpl?.fields.includes('city') && (
                  <Select value={formData.city || ''} onValueChange={v => setFormData({...formData, city: v})}>
                    <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>{CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                {tmpl?.fields.filter(f => !['brand','city'].includes(f)).map(f => (
                  <Input key={f} placeholder={f.replace(/_/g, ' ')} value={formData[f] || ''} onChange={e => setFormData({...formData, [f]: e.target.value})} />
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={runTemplate}><Zap className="h-4 w-4 mr-1" /> Run (Requires Approval)</Button>
                <Button variant="ghost" onClick={() => { setSelectedTemplate(null); setFormData({}); }}>Cancel</Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">Copy these prompts and customize with your brand/event details.</p>
          <div className="space-y-3">
            {PROMPTS.map((p, i) => (
              <div key={i} className="p-4 bg-white border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{p.label}</span>
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(p.prompt); toast.success('Copied!'); }}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground font-mono">{p.prompt}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="space-y-2">
            {history.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div>
                  <div className="font-medium text-sm">{h.command_type}</div>
                  <div className="text-xs text-muted-foreground">{h.payload?.brand || ''} {h.payload?.city || ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={h.status === 'success' ? 'default' : 'secondary'} className="text-xs">{h.status}</Badge>
                  <span className="text-xs text-muted-foreground">{h.executed_at ? new Date(h.executed_at).toLocaleDateString() : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Outputs;
