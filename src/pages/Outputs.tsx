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
import { Zap, Image, Calendar, Search, FileText, Megaphone, Send, Sparkles, Copy, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  { label: 'IG Story — Event Announcement', prompt: 'You are a social media strategist for {brand}. Create an Instagram Story announcement for {event} happening in {city} on {date}. Requirements: 1) Opening hook that stops the scroll (first 3 seconds matter). 2) Event name with bold visual treatment. 3) Key details: date, city, vibe description. 4) Clear CTA: "Get tickets" with swipe-up or link prompt. 5) Urgency element: limited capacity, early-bird, or exclusive access. Tone: match the brand voice — premium but not corporate, exciting but not desperate. Output: Story text overlay + caption + 3 hashtag options.' },
  { label: 'IG Feed Post — Brand Awareness', prompt: 'You are the brand voice for {brand}. Write an Instagram feed post that builds brand awareness without selling tickets. The goal is to make people feel the vibe and want to follow. Include: 1) A scroll-stopping first line (no "Hey guys" energy). 2) A short narrative or statement that captures the brand essence. 3) A subtle CTA (follow, save, share — not "buy tickets"). 4) 15-20 hashtags organized by reach tier (5 broad, 10 niche, 5 local to {city}). Tone: confident, culture-forward, intentional. Output: Full caption + hashtag block.' },
  { label: 'PR Pitch Email — Event Coverage', prompt: 'Write a press pitch email from {brand} to a journalist at {outlet} about {event} in {city}. Structure: 1) Subject line options (3 variations — curiosity, news-angle, exclusive). 2) Opening: Why this matters to their readers (not why it matters to us). 3) The story: What makes this event different from everything else happening that weekend. 4) The ask: Press credentials, interview access, exclusive preview. 5) Closing: Binary time offer for a quick call. Keep it under 200 words. No PR fluff. No "we are excited to announce." Sound like a human who respects their time.' },
  { label: 'DM Outreach — Influencer Collab', prompt: 'Write an Instagram DM from {brand} to {name} ({handle}) about collaborating on {event} in {city}. Rules: 1) Reference something specific from their recent content (proves you actually follow them). 2) One sentence on what {brand} is. 3) What they get: content opportunity, exclusive access, audience crossover. 4) The ask: 10-minute call or voice note exchange. 5) Keep it under 80 words. No "Dear" or "Hi there." No paragraphs. It should feel like a text from someone in the culture, not a brand bot. Output: Primary DM + follow-up DM (if no reply in 48hrs).' },
  { label: 'DM Outreach — Sponsor Cold Outreach', prompt: 'Write an Instagram DM from {brand} to the brand partnerships account of {company}. Use this framework: 1) Identify yourself and the brand (one line). 2) State the opportunity: category placement in a multi-city touring {type} experience. 3) Scarcity: "finalizing partner placement now — pre-release." 4) Ask: 10-minute call. Include: "Quick 10-min call?" as the close. Do NOT: promise numbers, negotiate in DMs, sound desperate, or use "partnership opportunity" language. Sound like a placement, not a pitch. Output: Primary DM + "if they ask for details" follow-up.' },
  { label: 'Email — Sponsor Category Pitch', prompt: 'Write a cold email from {brand} to {name}, {title} at {company}, pitching a category sponsorship slot for {event}. Structure: 1) Subject line options (3 — rotate-ready, no clickbait). 2) Opening: "Global attention / cultural attention will be concentrated here" — make them feel they are about to miss something. 3) What they get: museum integration / on-site presence / content yield / category protection / multi-city visibility. 4) What we need: cash, product, or hybrid. 5) Close: Binary time offer. Keep it under 150 words. Reference the playbook tone: calm, confident, slightly exclusive. Output: Full email with subject line options.' },
  { label: 'Event Description — Ticketing Platform', prompt: 'Write a full event description for {event} by {brand} in {city} on {date}. This goes on Eventbrite/Partiful/website. Structure: 1) Opening hook (2 sentences max — set the vibe). 2) What to expect (bullet points or short paragraphs — music, food, dress, energy). 3) Dress code suggestion (if applicable). 4) Ticket tiers and what each includes. 5) Important info: doors, age requirement, parking, contact. 6) Social proof or past event reference (if applicable). Tone: Match the brand. For premium events: sophisticated but not stuffy. For culture events: authentic but not try-hard. Output: Full description + meta description (under 160 chars for SEO).' },
  { label: 'Comment Scripts — Organic Engagement', prompt: 'Write 15 authentic Instagram comments for {brand} to drop on posts in {city}. Rules: 1) NO generic comments ("nice!" "fire!" "love this!"). 2) Each comment must reference something that could actually be in the post (food, fashion, venue, event, art). 3) Mix: 5 compliment-based, 5 question-based, 5 hype-based. 4) Include 2-3 that subtly mention {brand} without being promotional. 5) All comments should sound like they come from a real person who is part of the culture. Output: 15 numbered comments, each under 150 characters.' },
  { label: 'SMS — Ticket Push / VIP Access', prompt: 'Write 5 SMS message variants for {brand} pushing tickets to {event} in {city} on {date}. Rules: 1) Each message MUST be under 160 characters. 2) Include a shortened ticket link placeholder: [LINK]. 3) Mix of urgency types: limited capacity, early-bird ending, VIP access, exclusive list. 4) NO "Dear" or formal language. These should feel like a text from someone you know. 5) Include the recipient name placeholder: {{Name}}. Output: 5 SMS variants, each under 160 chars with [LINK] placeholder.' },
  { label: 'Grant Application Narrative', prompt: 'Write a grant application narrative for {brand} applying to {grant_name}. The project is {event} in {city}. Structure: 1) Project summary (100 words — what it is, who it serves, why it matters). 2) Need statement: Why this cultural experience is needed in the community. 3) Target audience and projected reach. 4) Cultural impact: How this contributes to arts/culture/community development. 5) Sustainability: How this will continue beyond the grant period. 6) Budget alignment: How grant funds will be specifically used. Tone: Professional but passionate. Show cultural competency without being performative. Output: Full narrative (500-800 words) + 100-word project summary.' },
  { label: 'Vendor Outreach — Pitch to Participate', prompt: 'Write a DM or email from {brand} to a {vendor_type} vendor inviting them to participate in {event} in {city}. Structure: 1) What the event is (one sentence — premium, curated, design-forward). 2) Why they were selected (their work stands out, fits the curation). 3) What participation looks like (booth setup, sampling, branded moment). 4) What they get (exposure, content, foot traffic, brand association). 5) Next step: Quick call or application link. Tone: Selective, not desperate. This is a curated showcase, not a vendor fair. Output: Primary outreach + "if interested" follow-up with logistics.' },
  { label: 'DJ/Host Booking Inquiry', prompt: 'Write a booking inquiry DM from {brand} to {name} for {event} in {city} on {date}. Include: 1) Who you are (one line). 2) The event and what makes it different. 3) What you need: set time, genre fit, vibe alignment. 4) Compensation structure hint (without quoting exact numbers in DM). 5) Ask for availability + rate. Keep it professional but not corporate. This person is talent, not a vendor — treat them accordingly. Output: Primary DM + confirmation follow-up template.' },
  { label: 'Post-Event Recap Caption', prompt: 'Write a post-event recap Instagram caption for {brand} after {event} in {city}. Rules: 1) Opening line captures the energy of the night (not "what an amazing night"). 2) Highlight 2-3 specific moments (DJ set, crowd energy, a visual moment, a sponsor activation). 3) Thank the community, not just "thanks for coming." 4) Tease what is next without giving away details. 5) CTA: Tag yourself, share your photos, follow for next event. Tone: Reflective but forward-looking. Grateful but not sappy. Output: Full caption + story caption variant + 15 hashtags.' },
  { label: 'Retargeting DM — Previous Attendee', prompt: 'Write a retargeting Instagram DM from {brand} to someone who attended {previous_event} but has not engaged with the upcoming {event}. Structure: 1) Reference their attendance (make them feel remembered). 2) One line on what is coming next. 3) Exclusive early access or VIP offer. 4) Ask: "You in?" Keep it under 60 words. Should feel personal, not automated. Output: Primary DM + "no reply" follow-up (even shorter).' },
  { label: 'Weekly Content Calendar', prompt: 'Create a 7-day Instagram content calendar for {brand} promoting {event} in {city} on {date}. For each day provide: 1) Content type (Story, Feed, Reel, Carousel). 2) Visual concept (what the graphic/video should show). 3) Caption (full text). 4) Posting time recommendation. 5) Cross-platform note (what to adjust for Twitter/TikTok). The calendar should build momentum from awareness → interest → urgency → last call. Output: Full 7-day calendar in table format.' },
];

const Outputs = () => {
  const navigate = useNavigate();
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
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={() => navigate("/")} className="h-8 w-8 p-0"><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold tracking-tight">Outputs & Content Engine</h1>
      </div>

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
