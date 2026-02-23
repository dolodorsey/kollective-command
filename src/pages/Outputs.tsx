import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DIVISIONS } from "@/lib/constants";
import { Zap, Send, Image, FileText, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const AI_MODELS = [
  { key: "gemini", label: "Gemini", color: "bg-blue-100 text-blue-700" },
  { key: "chatgpt", label: "ChatGPT", color: "bg-green-100 text-green-700" },
  { key: "claude", label: "Claude", color: "bg-orange-100 text-orange-700" },
];

const PROMPT_TEMPLATES = [
  { label: "IG Carousel (10 slides)", prompt: "Create 10 Instagram carousel slides for {brand}. Topic: {topic}. Each slide should have a headline (max 8 words) and 1-2 lines of body copy. Format as numbered slides. Brand voice: bold, confident, premium." },
  { label: "Event Flyer Copy", prompt: "Write event flyer copy for {brand} event in {city}. Include: headline, tagline, 3 bullet highlights, call-to-action. Tone: exciting, exclusive, must-attend energy." },
  { label: "DM Outreach Script", prompt: "Write 3 Instagram DM outreach scripts for {brand} targeting {audience}. Each script should be under 150 chars, feel personal (not corporate), and include a clear ask. Vary the tone: casual, professional, playful." },
  { label: "Email Newsletter", prompt: "Write an email newsletter for {brand}. Subject line + preview text + body with 3 sections. Tone: warm but premium. Include CTA button text." },
  { label: "Caption Pack (7 days)", prompt: "Create 7 Instagram captions for {brand}, one for each day of the week. Each should be 2-3 sentences with relevant hashtags. Mix: motivational, behind-the-scenes, product highlight, engagement question, testimonial-style, educational, weekend vibes." },
  { label: "Press Release", prompt: "Write a press release for {brand} announcing {topic}. Include: headline, subhead, dateline, 3 paragraphs, quote from founder, boilerplate. AP style." },
];

const Outputs = () => {
  const queryClient = useQueryClient();
  const [model, setModel] = useState("gemini");
  const [prompt, setPrompt] = useState("");
  const [brandKey, setBrandKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: ledger = [] } = useQuery({
    queryKey: ["ledger-actions"],
    queryFn: async () => {
      const { data } = await supabase.from("ledger_actions").select("*").order("created_at", { ascending: false }).limit(30);
      return data || [];
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brand-list-outputs"],
    queryFn: async () => {
      const { data } = await supabase.from("brand_registry").select("brand_key, brand_name").eq("is_active", true).order("brand_name");
      return data || [];
    },
  });

  const executePrompt = async () => {
    if (!prompt.trim()) return toast.error("Enter a prompt");
    setLoading(true);
    setResult("");
    try {
      const webhookUrl = `https://drdorsey.app.n8n.cloud/webhook/ai-chat-${model}`;
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          brand_key: brandKey || "kollective",
          source: "mcp-outputs",
          model: model,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const output = data.reply || data.response || data.text || data.output || data.message || JSON.stringify(data, null, 2);
      setResult(output);
      toast.success("Output generated");
    } catch (err: any) {
      setResult("Error: " + (err.message || "Failed to reach AI endpoint"));
      toast.error("Generation failed");
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const applyTemplate = (t: typeof PROMPT_TEMPLATES[0]) => {
    let p = t.prompt;
    const bn = brands.find((b: any) => b.brand_key === brandKey);
    p = p.replace("{brand}", bn ? bn.brand_name : brandKey || "[brand]");
    p = p.replace("{city}", "Atlanta");
    p = p.replace("{topic}", "[your topic]");
    p = p.replace("{audience}", "[target audience]");
    setPrompt(p);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Outputs & Graphics Engine</h1>

      <Tabs defaultValue="generate" className="space-y-3">
        <TabsList>
          <TabsTrigger value="generate" className="gap-1"><Zap className="h-3.5 w-3.5" />Generate</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1"><FileText className="h-3.5 w-3.5" />Templates</TabsTrigger>
          <TabsTrigger value="history" className="gap-1"><Image className="h-3.5 w-3.5" />History ({ledger.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          {/* Controls */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">AI Model</label>
              <div className="flex gap-1">
                {AI_MODELS.map(m => (
                  <button key={m.key} onClick={() => setModel(m.key)}
                    className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
                      model === m.key ? m.color + " ring-1 ring-current" : "text-muted-foreground hover:bg-muted")}>{m.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Brand</label>
              <select value={brandKey} onChange={e => setBrandKey(e.target.value)}
                className="w-full rounded-md border border-border/50 bg-input px-3 py-1.5 text-xs outline-none focus:border-blue-300">
                <option value="">Global / No brand</option>
                {brands.map((b: any) => <option key={b.brand_key} value={b.brand_key}>{b.brand_name}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={executePrompt} disabled={loading || !prompt.trim()} className="w-full gap-1.5">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {loading ? "Generating..." : "Execute"}
              </Button>
            </div>
          </div>

          {/* Prompt input */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Prompt</label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
              placeholder="Enter your prompt here... or select a template below"
              className="w-full rounded-lg border border-border/50 bg-input px-4 py-3 text-sm text-foreground outline-none focus:border-blue-300 leading-relaxed resize-none" />
          </div>

          {/* Result */}
          {result && (
            <div className="rounded-lg border border-border/50 bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Output</span>
                <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] font-semibold text-blue-500 hover:underline">
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-96 overflow-auto">{result}</div>
            </div>
          )}

          {/* Quick templates */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Quick Templates</p>
            <div className="grid grid-cols-3 gap-2">
              {PROMPT_TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => applyTemplate(t)}
                  className="rounded-lg border border-border/50 bg-card p-3 text-left hover:border-blue-200 transition-all">
                  <p className="text-xs font-semibold text-foreground">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{t.prompt.slice(0, 60)}...</p>
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="space-y-3">
            {PROMPT_TEMPLATES.map((t, i) => (
              <div key={i} className="rounded-lg border border-border/50 bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{t.label}</p>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => { applyTemplate(t); const el = document.querySelector('[value="generate"]'); if (el instanceof HTMLElement) el.click(); }}>Use</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{t.prompt}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-1.5">
            {ledger.map((l: any) => (
              <div key={l.id} className="flex items-center gap-3 rounded-md border border-border/30 p-3">
                <Zap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">{l.action_type}</p>
                  <p className="text-[10px] text-muted-foreground">{l.platform} {l.outcome_type ? `\u00b7 ${l.outcome_type}` : ""}</p>
                </div>
                {l.revenue_amount && <span className="text-xs font-bold text-green-600">${l.revenue_amount}</span>}
                <span className="font-mono text-[9px] text-muted-foreground">{l.created_at ? format(new Date(l.created_at), "MMM d") : "\u2014"}</span>
              </div>
            ))}
            {ledger.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground/40">No output history</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Outputs;
