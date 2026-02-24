import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DIVISIONS, CITIES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Wand2, Copy, Send, BookOpen, Clock, Star, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { sendCommand } from "@/lib/commands";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  { id: 'ig_pack', label: 'Generate IG Pack', desc: '5-7 posts + stories for a brand/event', icon: '📸' },
  { id: 'schedule_posts', label: 'Schedule Posts for City', desc: 'Queue content across platforms for a city drop', icon: '📅' },
  { id: 'scrape_enrich', label: 'Scrape & Enrich Leads', desc: 'Find and fill in contact details', icon: '🔍' },
  { id: 'daily_brief', label: 'Daily Intel Brief', desc: 'Morning briefing with tasks, events, metrics', icon: '📊' },
  { id: 'clawbot', label: 'Clawbot Directory Crawl', desc: 'Crawl a directory or website for contacts', icon: '🤖' },
  { id: 'pr_blast', label: 'PR Blast to Media', desc: 'Send press release/pitch to media list', icon: '📰' },
  { id: 'sponsor_deck', label: 'Send Sponsor Deck', desc: 'Email sponsorship package to prospects', icon: '💼' },
  { id: 'book_dj', label: 'Book DJ / Host', desc: 'Send booking inquiry to talent', icon: '🎧' },
  { id: 'event_recap', label: 'Post Event Recap', desc: 'Generate recap content from event data', icon: '🎉' },
  { id: 'comment_drop', label: 'Comment Drop Campaign', desc: 'Drop comments on target posts', icon: '💬' },
];

const PROMPTS = [
  { id: 'ig_story', label: 'IG Story — Event Announcement', prompt: 'Write an Instagram Story sequence (3-5 slides) announcing {{event}} for {{brand}} in {{city}}. Include: teaser slide, details slide, CTA slide. Tone: {{brand_voice}}. Keep each slide under 20 words.' },
  { id: 'ig_feed', label: 'IG Feed Post — Brand Awareness', prompt: 'Write an Instagram feed post for {{brand}}. Purpose: brand awareness / audience engagement. Include a caption (150-200 words), 5-10 relevant hashtags, and a CTA. Tone: {{brand_voice}}.' },
  { id: 'pr_pitch', label: 'PR Pitch Email — Event Coverage', prompt: 'Write a PR pitch email for {{event}} by {{brand}} in {{city}}. Target: local entertainment/culture journalist. Include: subject line, 3-paragraph body (hook, details, ask), press contact info placeholder.' },
  { id: 'dm_influencer', label: 'DM Outreach — Influencer Collab', prompt: 'Write an Instagram DM to an influencer inviting them to collaborate with {{brand}} for {{event}} in {{city}}. Tone: casual, premium, not desperate. Under 60 words. Include CTA to send email + phone + city.' },
  { id: 'dm_sponsor', label: 'DM Outreach — Sponsor Cold Outreach', prompt: 'Write an Instagram DM to a brand/company pitching a sponsorship opportunity with {{brand}} for {{event}}. Tone: confident, exclusive, not salesy. Under 80 words. Reference category slot + pre-release positioning.' },
  { id: 'email_sponsor', label: 'Email — Sponsor Category Pitch', prompt: 'Write a cold email pitching a category sponsorship slot for {{event}} by {{brand}} in {{city}}. Include: subject line (4 options), body with scarcity + credibility, binary close (two time options). Tone: corporate-premium.' },
  { id: 'event_desc', label: 'Event Description — Ticketing Platform', prompt: 'Write an event description for {{event}} by {{brand}} in {{city}} on {{date}}. Format for Eventbrite/ticketing platform. Include: 1-line hook, 3-paragraph description, bullet list of highlights, dress code/vibe, ticket tiers placeholder.' },
  { id: 'comment_scripts', label: 'Comment Scripts — Organic Engagement', prompt: 'Write 10 Instagram comment scripts for {{brand}} to drop on target posts in {{city}}. Mix: hype comments (3), question-based (3), compliment-based (2), CTA-driven (2). Each under 15 words. No emojis unless brand voice requires.' },
  { id: 'sms_push', label: 'SMS — Ticket Push / VIP Access', prompt: 'Write 3 SMS messages for {{brand}} promoting {{event}} in {{city}}. Each under 160 characters. Include: urgency-based, exclusivity-based, and last-chance. Include ticket link placeholder.' },
  { id: 'grant_narrative', label: 'Grant Application Narrative', prompt: 'Write a grant application narrative for {{brand}} ({{division}}). Cover: mission, community impact, program description, target demographics, measurable outcomes. Tone: professional, impact-focused. 500-800 words.' },
  { id: 'vendor_outreach', label: 'Vendor Outreach — Pitch to Participate', prompt: 'Write an outreach email/DM to a vendor/artist inviting them to participate in {{event}} by {{brand}} in {{city}}. Include: what they get (exposure, foot traffic, content), what we need, CTA to send contact info.' },
  { id: 'dj_booking', label: 'DJ/Host Booking Inquiry', prompt: 'Write a booking inquiry DM/email for a DJ or host for {{event}} by {{brand}} in {{city}} on {{date}}. Include: event details, expected crowd, compensation structure placeholder, CTA for availability.' },
  { id: 'post_recap', label: 'Post-Event Recap Caption', prompt: 'Write a post-event Instagram caption for {{event}} by {{brand}} in {{city}}. Tone: grateful, energetic, forward-looking. Include: highlight moments, thank-yous, tease next event, CTA. 150-250 words.' },
  { id: 'retarget_dm', label: 'Retargeting DM — Previous Attendee', prompt: 'Write an Instagram DM to someone who attended a previous {{brand}} event, inviting them to {{event}} in {{city}}. Reference their past attendance. Tone: familiar, exclusive. Under 60 words.' },
  { id: 'weekly_calendar', label: 'Weekly Content Calendar', prompt: 'Create a 7-day content calendar for {{brand}} across Instagram (feed + stories) and any secondary platform. Include: daily post type, caption summary, hashtag themes, story ideas. Focus on {{city}} market.' },
];

const Outputs = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("generate");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [brand, setBrand] = useState("");
  const [city, setCity] = useState("");
  const [event, setEvent] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [generatedOutput, setGeneratedOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [favoritePrompts, setFavoritePrompts] = useState<Set<string>>(new Set());

  const { data: events = [] } = useQuery({
    queryKey: ["events-outputs"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("id, title, brand, city, date").order("date").limit(50);
      return data || [];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["output-history"],
    queryFn: async () => {
      const { data } = await supabase.from("command_log").select("*")
        .in("command_type", ["content.generate", "ig_pack", "pr_blast", "schedule_posts", "scrape_enrich", "daily_brief", "clawbot", "sponsor_deck", "book_dj", "event_recap", "comment_drop"])
        .order("executed_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: playbooks = [] } = useQuery({
    queryKey: ["brand-playbooks"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_outreach_scripts").select("*").order("brand_key").limit(200);
      return data || [];
    },
  });

  const selectedPromptDef = PROMPTS.find(p => p.id === selectedPrompt);
  const allBrands = DIVISIONS.flatMap(d => d.brands);
  const filteredEvents = brand ? events.filter((e: any) => (e.brand || '').toLowerCase().includes(brand.toLowerCase().replace(/[^a-z]/g, ''))) : events;

  const handleGenerate = async () => {
    if (!selectedPrompt && !selectedTemplate) { toast.error("Select a template or prompt first"); return; }
    setGenerating(true);
    try {
      let prompt = selectedPromptDef?.prompt || `Generate ${selectedTemplate} content`;
      prompt = prompt.replace(/\{\{brand\}\}/g, brand || 'the brand')
        .replace(/\{\{city\}\}/g, city || 'the city')
        .replace(/\{\{event\}\}/g, event || 'the event')
        .replace(/\{\{date\}\}/g, '')
        .replace(/\{\{brand_voice\}\}/g, 'confident, premium, culturally aware')
        .replace(/\{\{division\}\}/g, DIVISIONS.find(d => d.brands.some(b => b === brand))?.name || '');
      if (customInput) prompt += `\n\nAdditional context: ${customInput}`;

      const res = await fetch("https://drdorsey.app.n8n.cloud/webhook/ai-chat-claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, system: `You are a content creator for ${brand || 'Kollective Hospitality Group'}. Generate professional, on-brand content.` }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedOutput(data.response || data.text || data.content || JSON.stringify(data));
        toast.success("Content generated");
      } else {
        setGeneratedOutput(`[Generation failed — status ${res.status}. Edit this field manually or retry.]`);
        toast.error("Generation failed — you can edit manually");
      }
    } catch {
      setGeneratedOutput("[Could not reach AI endpoint. Edit this field manually.]");
      toast.error("Could not reach AI — edit manually");
    }
    setGenerating(false);
  };

  const handleCopy = () => { navigator.clipboard.writeText(generatedOutput); toast.success("Copied to clipboard"); };
  const handleSave = async () => {
    await sendCommand("content.generate", { brand, city, event, template: selectedTemplate, prompt: selectedPrompt, output: generatedOutput }, "brand", brand);
    toast.success("Saved to command log");
    queryClient.invalidateQueries({ queryKey: ["output-history"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold tracking-tight">Outputs & Content Engine</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="generate"><Wand2 className="h-3 w-3 mr-1" /> Generate</TabsTrigger>
          <TabsTrigger value="prompts"><BookOpen className="h-3 w-3 mr-1" /> Prompt Library ({PROMPTS.length})</TabsTrigger>
          <TabsTrigger value="playbooks">Playbooks ({playbooks.length})</TabsTrigger>
          <TabsTrigger value="history"><Clock className="h-3 w-3 mr-1" /> History ({history.length})</TabsTrigger>
        </TabsList>

        {/* GENERATE TAB */}
        <TabsContent value="generate" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Config */}
            <div className="space-y-4">
              {/* Step 1: Template */}
              <div>
                <label className="text-xs font-bold tracking-wider text-muted-foreground mb-2 block">1. OUTPUT TYPE</label>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
                      className={cn("text-left p-3 border rounded-lg transition-all hover:shadow-sm", selectedTemplate === t.id ? "border-blue-500 bg-blue-50" : "hover:border-gray-300")}>
                      <span className="text-lg mr-1">{t.icon}</span>
                      <span className="font-medium text-xs">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Step 2: Prompt */}
              <div>
                <label className="text-xs font-bold tracking-wider text-muted-foreground mb-2 block">2. PROMPT TEMPLATE</label>
                <Select value={selectedPrompt || ''} onValueChange={setSelectedPrompt}>
                  <SelectTrigger><SelectValue placeholder="Select a prompt..." /></SelectTrigger>
                  <SelectContent>
                    {PROMPTS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {selectedPromptDef && <p className="text-xs text-muted-foreground mt-1 bg-gray-50 rounded p-2">{selectedPromptDef.prompt.slice(0, 150)}...</p>}
              </div>
              {/* Step 3: Entity */}
              <div>
                <label className="text-xs font-bold tracking-wider text-muted-foreground mb-2 block">3. ENTITY</label>
                <div className="space-y-2">
                  <Select value={brand} onValueChange={setBrand}>
                    <SelectTrigger><SelectValue placeholder="Brand" /></SelectTrigger>
                    <SelectContent>
                      {DIVISIONS.map(d => (
                        <div key={d.key}>
                          <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground">{d.icon} {d.name}</div>
                          {d.brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={event} onValueChange={setEvent}>
                    <SelectTrigger><SelectValue placeholder="Event (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {filteredEvents.map((e: any) => <SelectItem key={e.id} value={e.title}>{e.title} — {e.city}{e.date ? ` (${format(new Date(e.date), 'MMM d')})` : ''}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
                    <SelectContent>{CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {/* Custom input */}
              <div>
                <label className="text-xs font-bold tracking-wider text-muted-foreground mb-2 block">4. ADDITIONAL CONTEXT (optional)</label>
                <Textarea placeholder="Any extra details, angle, or instructions..." value={customInput} onChange={e => setCustomInput(e.target.value)} rows={3} />
              </div>
              <Button onClick={handleGenerate} disabled={generating} className="w-full">
                {generating ? "Generating..." : <><Wand2 className="h-4 w-4 mr-1" /> Generate</>}
              </Button>
            </div>

            {/* Right: Output */}
            <div className="space-y-3">
              <label className="text-xs font-bold tracking-wider text-muted-foreground block">5. OUTPUT (editable)</label>
              <Textarea value={generatedOutput} onChange={e => setGeneratedOutput(e.target.value)} rows={20} placeholder="Generated content will appear here. You can also type/paste directly." className="font-mono text-sm" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy} disabled={!generatedOutput}><Copy className="h-3 w-3 mr-1" /> Copy</Button>
                <Button size="sm" onClick={handleSave} disabled={!generatedOutput}><Check className="h-3 w-3 mr-1" /> Save to Log</Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* PROMPT LIBRARY TAB */}
        <TabsContent value="prompts" className="mt-4">
          <div className="space-y-3">
            {PROMPTS.map(p => (
              <div key={p.id} className="p-4 bg-white border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-sm">{p.label}</div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setFavoritePrompts(prev => { const s = new Set(prev); s.has(p.id) ? s.delete(p.id) : s.add(p.id); return s; }); }}>
                      <Star className={cn("h-3 w-3", favoritePrompts.has(p.id) ? "fill-yellow-400 text-yellow-400" : "")} />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(p.prompt); toast.success("Prompt copied"); }}>
                      <Copy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                    <Button size="sm" onClick={() => { setSelectedPrompt(p.id); setTab("generate"); }}>Use</Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{p.prompt}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* PLAYBOOKS TAB */}
        <TabsContent value="playbooks" className="mt-4">
          {playbooks.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No playbook scripts loaded yet.</p>
          ) : (
            <div className="space-y-3">
              {playbooks.map((s: any) => (
                <div key={s.id} className="p-4 bg-white border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px]">{s.brand_key}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{s.channel}</Badge>
                    {s.script_type && <Badge variant="secondary" className="text-[10px]">{s.script_type}</Badge>}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{s.body}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="mt-4">
          {history.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No content generation history yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h: any) => (
                <div key={h.id} className="p-3 bg-white border rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{h.command_type?.replace(/[._]/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      {h.target_key && <Badge variant="outline" className="text-[10px]">{h.target_key}</Badge>}
                      <Badge className={h.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>{h.status}</Badge>
                      <span className="text-[10px] text-muted-foreground">{h.executed_at ? format(new Date(h.executed_at), 'MMM d, h:mm a') : ''}</span>
                    </div>
                  </div>
                  {h.payload && (() => {
                    try {
                      const p = typeof h.payload === 'string' ? JSON.parse(h.payload) : h.payload;
                      if (p.output) return <p className="text-xs text-muted-foreground mt-1 truncate">{String(p.output).slice(0, 150)}...</p>;
                    } catch {}
                    return null;
                  })()}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Outputs;
