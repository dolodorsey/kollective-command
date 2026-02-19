import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DIVISIONS } from "@/lib/constants";
import { sendCommand } from "@/lib/commands";
import { StatusBadge } from "@/components/StatusBadge";
import { FileOutput, Image, FileText, Download, ExternalLink, Plus, Zap, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "sonner";

const ALL_BRANDS = DIVISIONS.flatMap(d => d.brands.map(b => ({ name: b, division: d.name, key: b.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") })));

const CONTENT_TYPES = [
  { value: "social_graphic", label: "Social Graphic (IG Post)" },
  { value: "story_graphic", label: "IG Story Graphic" },
  { value: "flyer", label: "Event Flyer" },
  { value: "email_template", label: "Email Template" },
  { value: "pr_pitch", label: "PR Pitch" },
  { value: "caption", label: "Social Caption" },
  { value: "menu", label: "Menu Design" },
  { value: "deck_slide", label: "Pitch Deck Slide" },
];

function GenerateDialog() {
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [contentType, setContentType] = useState("social_graphic");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();
  const inputClass = "w-full rounded-md border border-border/50 bg-input px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary/40";
  const labelClass = "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1 block";

  const handleGenerate = async () => {
    if (!brand || !prompt.trim()) return;
    setGenerating(true);
    try {
      await sendCommand("content.generate", { brand_key: brand, content_type: contentType, prompt: prompt.trim() });
      await supabase.from("approval_queue").insert({
        item_type: contentType, brand_key: brand, title: `Generate: ${contentType.replace(/_/g, " ")}`,
        content_preview: prompt.trim().substring(0, 200), full_payload: JSON.stringify({ brand, contentType, prompt: prompt.trim() }),
        source_workflow: "manual_generate", score: 80, status: "pending",
      });
      toast.success(`Content generation queued for ${brand}`);
      setPrompt(""); setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
    } catch { toast.error("Failed to queue generation"); }
    setGenerating(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Zap className="h-3.5 w-3.5" />Generate Content</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Generate Content</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <div><label className={labelClass}>Brand *</label>
            <select value={brand} onChange={e => setBrand(e.target.value)} className={inputClass}>
              <option value="">Select brand...</option>
              {ALL_BRANDS.map(b => <option key={b.key} value={b.key}>{b.name} ({b.division})</option>)}
            </select>
          </div>
          <div><label className={labelClass}>Content Type</label>
            <select value={contentType} onChange={e => setContentType(e.target.value)} className={inputClass}>
              {CONTENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div><label className={labelClass}>Prompt / Description *</label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe what you want generated..." className={inputClass} rows={4} />
          </div>
          <Button onClick={handleGenerate} disabled={!brand || !prompt.trim() || generating} className="w-full">
            {generating ? "Generating..." : "Generate & Queue for Approval"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const Outputs = () => {
  const { data: deliverables = [] } = useQuery({
    queryKey: ["deliverables"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_final_deliverables").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data } = await supabase.from("content_assets").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const allItems = [
    ...deliverables.map((d: any) => ({ ...d, _type: "deliverable" })),
    ...assets.map((a: any) => ({ ...a, _type: "asset" })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Outputs</h1>
        <GenerateDialog />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Deliverables</span>
            <FileOutput className="h-4 w-4 text-primary/60" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-foreground">{deliverables.length}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Content Assets</span>
            <Image className="h-4 w-4 text-primary/60" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-foreground">{assets.length}</div>
        </div>
      </div>

      <div className="space-y-2">
        {allItems.length === 0 && (
          <div className="rounded-lg border border-border/50 bg-card p-12 text-center">
            <FileOutput className="mx-auto h-8 w-8 text-muted-foreground/20" />
            <p className="mt-3 text-sm text-muted-foreground/40">No outputs yet. Run commands to generate deliverables.</p>
          </div>
        )}
        {allItems.map((item: any) => (
          <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-4 transition-colors hover:border-primary/20">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {item._type === "asset" ? <Image className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-primary" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{item.title || item.file_name || item.asset_type || "Untitled"}</p>
              <p className="text-xs text-muted-foreground">{item.description?.substring(0, 100) || item.brand_key || "—"}</p>
            </div>
            <StatusBadge variant={item._type === "deliverable" ? "info" : "default"}>{item._type}</StatusBadge>
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
              {item.created_at ? format(new Date(item.created_at), "MMM d") : "—"}
            </span>
            {item.file_url && (
              <a href={item.file_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" /></a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Outputs;
