import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { formatDateTime, OPS_BRANDS, SOCIAL_TABS, statusLabel } from "@/lib/opsTypes";

const platforms = ["instagram", "tiktok", "facebook", "youtube", "threads", "x", "linkedin"];
const contentTypes = ["post", "reel", "story", "short", "carousel", "flyer", "other"];
const statuses = ["needs_graphic", "needs_caption", "needs_approval", "approved", "scheduled", "posted", "failed", "needs_recycle"];

export default function OpsSocial() {
  const qc = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const [tab, setTab] = useState(params.get("tab") || "calendar");
  const [brand, setBrand] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [status, setStatus] = useState("all");
  const [draft, setDraft] = useState({
    brand_key: "the-kollective",
    platform: "instagram",
    content_type: "post",
    title: "",
    brief: "",
    caption_preview: "",
    cta: "",
    target_url: "",
    scheduled_for: "",
    asset_url: "",
    thumbnail_url: "",
    source_plan_url: "",
    generation_prompt: "",
    status: "idea",
    priority: "normal",
    owner_label: "Social Ops",
  });

  const { data: items = [] } = useQuery({
    queryKey: ["ops-social-items"],
    queryFn: async () => {
      const { data } = await supabase.from("khg_content_items").select("*").order("created_at", { ascending: false }).limit(500);
      return data || [];
    },
  });
  const { data: assets = [] } = useQuery({
    queryKey: ["ops-social-assets"],
    queryFn: async () => {
      const { data } = await supabase.from("khg_content_assets").select("*").order("created_at", { ascending: false }).limit(500);
      return data || [];
    },
  });
  const { data: captions = [] } = useQuery({
    queryKey: ["ops-social-captions"],
    queryFn: async () => {
      const { data } = await supabase.from("khg_content_captions").select("*").order("created_at", { ascending: false }).limit(500);
      return data || [];
    },
  });
  const { data: slots = [] } = useQuery({
    queryKey: ["ops-social-slots"],
    queryFn: async () => {
      const { data } = await supabase.from("khg_content_calendar_slots").select("*").order("scheduled_for", { ascending: true }).limit(500);
      return data || [];
    },
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ["ops-social-accounts"],
    queryFn: async () => {
      const { data } = await supabase.from("khg_social_accounts").select("*").order("brand_key").limit(500);
      return data || [];
    },
  });
  const { data: performance = [] } = useQuery({
    queryKey: ["ops-social-performance"],
    queryFn: async () => {
      const { data } = await supabase.from("khg_content_performance").select("*").order("measured_at", { ascending: false }).limit(300);
      return data || [];
    },
  });

  const enriched = useMemo(() => items.map((item: any) => ({
    ...item,
    asset: assets.find((asset: any) => asset.content_item_id === item.id),
    caption: captions.find((caption: any) => caption.content_item_id === item.id),
    slot: slots.find((slot: any) => slot.content_item_id === item.id),
  })), [items, assets, captions, slots]);

  const filtered = enriched.filter((item: any) => {
    if (brand !== "all" && item.brand_key !== brand) return false;
    if (platform !== "all" && item.platform !== platform) return false;
    if (status !== "all" && item.status !== status) return false;
    return true;
  });

  const metrics = [
    ["Scheduled Today", slots.filter((slot: any) => slot.scheduled_for?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length],
    ["Needs Graphic", items.filter((item: any) => item.status === "needs_graphic").length],
    ["Needs Caption", items.filter((item: any) => item.status === "needs_caption").length],
    ["Needs Approval", items.filter((item: any) => item.status === "needs_approval").length],
    ["Approved", items.filter((item: any) => item.status === "approved").length],
    ["Scheduled", items.filter((item: any) => item.status === "scheduled").length],
    ["Posted", items.filter((item: any) => item.status === "posted").length],
    ["Failed", items.filter((item: any) => item.status === "failed").length],
    ["Recycle Queue", items.filter((item: any) => item.status === "needs_recycle").length],
  ];

  const computedStatus = () => {
    if (!draft.asset_url) return "needs_graphic";
    if (!draft.caption_preview) return "needs_caption";
    if (draft.asset_url && draft.caption_preview) return draft.scheduled_for ? "scheduled" : "needs_approval";
    return draft.status;
  };

  async function createPost() {
    if (!draft.brand_key || !draft.title) return toast.error("Brand and title are required");
    const nextStatus = computedStatus();
    const { data, error } = await supabase.from("khg_content_items").insert({
      brand_key: draft.brand_key,
      platform: draft.platform,
      content_type: draft.content_type,
      title: draft.title,
      brief: draft.brief,
      cta: draft.cta,
      target_url: draft.target_url,
      source_plan_url: draft.source_plan_url,
      status: nextStatus,
      priority: draft.priority,
      owner_label: draft.owner_label,
      metadata: { generation_prompt: draft.generation_prompt },
    }).select("*").single();
    if (error) return toast.error(error.message);
    if (draft.asset_url) {
      await supabase.from("khg_content_assets").insert({
        content_item_id: data.id,
        brand_key: draft.brand_key,
        asset_url: draft.asset_url,
        thumbnail_url: draft.thumbnail_url || draft.asset_url,
        generation_prompt: draft.generation_prompt,
        status: "uploaded",
      });
    }
    if (draft.caption_preview) {
      await supabase.from("khg_content_captions").insert({
        content_item_id: data.id,
        caption_text: draft.caption_preview,
        cta: draft.cta,
        status: "draft",
      });
    }
    if (draft.scheduled_for) {
      await supabase.from("khg_content_calendar_slots").insert({
        content_item_id: data.id,
        brand_key: draft.brand_key,
        platform: draft.platform,
        scheduled_for: draft.scheduled_for,
        slot_status: nextStatus === "scheduled" ? "scheduled" : nextStatus,
      });
    }
    if (nextStatus === "needs_approval" || nextStatus === "scheduled") {
      await supabase.from("khg_approval_requests").insert({
        department_key: "social",
        brand_key: draft.brand_key,
        source_type: "content",
        source_id: data.id,
        title: draft.title,
        preview_url: draft.thumbnail_url || draft.asset_url || null,
        preview_text: draft.caption_preview || draft.brief,
        requested_by: draft.owner_label,
        status: "pending",
      });
    }
    toast.success("Social post programmed");
    setDraft({ ...draft, title: "", brief: "", caption_preview: "", cta: "", target_url: "", scheduled_for: "", asset_url: "", thumbnail_url: "", source_plan_url: "", generation_prompt: "" });
    ["ops-social-items", "ops-social-assets", "ops-social-captions", "ops-social-slots"].forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
  }

  async function updateSocialStatus(item: any, nextStatus: string) {
    const { error } = await supabase.from("khg_content_items").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", item.id);
    if (error) return toast.error(error.message);
    if (item.slot) {
      const slotStatus = nextStatus === "needs_recycle" ? "posted" : nextStatus;
      await supabase.from("khg_content_calendar_slots").update({ slot_status: slotStatus, updated_at: new Date().toISOString() }).eq("id", item.slot.id);
    }
    if (nextStatus === "posted") {
      await supabase.from("khg_content_publish_attempts").insert({ content_item_id: item.id, calendar_slot_id: item.slot?.id || null, platform: item.platform, status: "manual_posted" });
    }
    if (nextStatus === "failed") {
      await supabase.from("khg_content_publish_attempts").insert({ content_item_id: item.id, calendar_slot_id: item.slot?.id || null, platform: item.platform, status: "failed", error_message: "Marked failed from Ops OS" });
    }
    toast.success(`Social item marked ${statusLabel(nextStatus)}`);
    ["ops-social-items", "ops-social-slots", "ops-social-performance"].forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
  }

  async function requestSocialApproval(item: any) {
    const { error } = await supabase.from("khg_approval_requests").insert({
      department_key: "social",
      brand_key: item.brand_key,
      source_type: "content",
      source_id: item.id,
      title: item.title,
      preview_url: item.asset?.thumbnail_url || item.asset?.asset_url || null,
      preview_text: item.caption?.caption_text || item.brief || "Review social item",
      requested_by: item.owner_label || "Social Ops",
      status: "pending",
    });
    if (error) return toast.error(error.message);
    await updateSocialStatus(item, "needs_approval");
    toast.success("Approval request created");
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <Header title="Social Media Command Center" description="Full social programming lifecycle by brand, platform, asset, caption, approval, schedule, publish status, and performance." action={<Button onClick={() => setTab("upload")}>Program Post</Button>} />
      <MetricGrid metrics={metrics} />
      <Filters brand={brand} setBrand={setBrand} platform={platform} setPlatform={setPlatform} status={status} setStatus={setStatus} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          {SOCIAL_TABS.map((value) => <TabsTrigger key={value} value={value}>{statusLabel(value)}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="calendar" className="mt-4 space-y-3">
          {filtered.filter((item: any) => item.slot).map((item: any) => <SocialCard key={item.id} item={item} updateSocialStatus={updateSocialStatus} requestSocialApproval={requestSocialApproval} />)}
        </TabsContent>
        <TabsContent value="brand-lanes" className="mt-4 grid gap-3 lg:grid-cols-3">
          {OPS_BRANDS.map((lane) => <Lane key={lane} title={lane} items={filtered.filter((item: any) => item.brand_key === lane)} updateSocialStatus={updateSocialStatus} requestSocialApproval={requestSocialApproval} />)}
        </TabsContent>
        <TabsContent value="upload" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Upload / Program Social Content</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-4">
                <Select value={draft.brand_key} onValueChange={(v) => setDraft({ ...draft, brand_key: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OPS_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select>
                <Select value={draft.platform} onValueChange={(v) => setDraft({ ...draft, platform: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{platforms.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                <Select value={draft.content_type} onValueChange={(v) => setDraft({ ...draft, content_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{contentTypes.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                <Input type="datetime-local" value={draft.scheduled_for} onChange={(e) => setDraft({ ...draft, scheduled_for: e.target.value })} />
              </div>
              <Input placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              <Textarea placeholder="Brief / programming direction" value={draft.brief} onChange={(e) => setDraft({ ...draft, brief: e.target.value })} />
              <Textarea placeholder="Caption preview" value={draft.caption_preview} onChange={(e) => setDraft({ ...draft, caption_preview: e.target.value })} />
              <div className="grid gap-3 md:grid-cols-3">
                <Input placeholder="CTA" value={draft.cta} onChange={(e) => setDraft({ ...draft, cta: e.target.value })} />
                <Input placeholder="Target URL" value={draft.target_url} onChange={(e) => setDraft({ ...draft, target_url: e.target.value })} />
                <Input placeholder="Owner" value={draft.owner_label} onChange={(e) => setDraft({ ...draft, owner_label: e.target.value })} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Input placeholder="Asset URL" value={draft.asset_url} onChange={(e) => setDraft({ ...draft, asset_url: e.target.value })} />
                <Input placeholder="Thumbnail URL" value={draft.thumbnail_url} onChange={(e) => setDraft({ ...draft, thumbnail_url: e.target.value })} />
                <Input placeholder="Source plan URL" value={draft.source_plan_url} onChange={(e) => setDraft({ ...draft, source_plan_url: e.target.value })} />
              </div>
              <Textarea placeholder="Generation prompt" value={draft.generation_prompt} onChange={(e) => setDraft({ ...draft, generation_prompt: e.target.value })} />
              <div className="flex items-center gap-2"><Badge variant="secondary">Computed status: {statusLabel(computedStatus())}</Badge><Button onClick={createPost}>Create Social Item</Button></div>
            </CardContent>
          </Card>
        </TabsContent>
        {statuses.map((state) => (
          <TabsContent key={state} value={state === "needs_recycle" ? "recycle" : state.replace("_", "-")} className="mt-4 grid gap-3 lg:grid-cols-2">
            {filtered.filter((item: any) => item.status === state).map((item: any) => <SocialCard key={item.id} item={item} updateSocialStatus={updateSocialStatus} requestSocialApproval={requestSocialApproval} />)}
          </TabsContent>
        ))}
        <TabsContent value="accounts" className="mt-4 grid gap-3 lg:grid-cols-3">
          {accounts.map((account: any) => <Card key={account.id}><CardContent className="p-4"><Badge variant="outline">{account.brand_key}</Badge><h3 className="mt-2 font-semibold">{account.account_label}</h3><p className="text-sm text-muted-foreground">{account.platform} · {account.handle || "manual"}</p><Badge className="mt-3" variant="secondary">{account.connection_status}</Badge></CardContent></Card>)}
        </TabsContent>
        <TabsContent value="performance" className="mt-4 grid gap-3 lg:grid-cols-3">
          {performance.map((row: any) => <Card key={row.id}><CardContent className="p-4"><Badge>{row.platform}</Badge><h3 className="mt-2 font-semibold">{row.impressions || 0} impressions</h3><p className="text-sm text-muted-foreground">{row.leads || 0} leads · ${row.revenue || 0} revenue</p></CardContent></Card>)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Header({ title, description, action }: { title: string; description: string; action: React.ReactNode }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground">Ops OS</p><h1 className="text-2xl font-bold">{title}</h1><p className="text-sm text-muted-foreground">{description}</p></div>{action}</div>;
}

function MetricGrid({ metrics }: { metrics: [string, number][] }) {
  return <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-9">{metrics.map(([label, value]) => <div key={label} className="rounded-lg border bg-card p-3"><div className="text-xl font-black">{value}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div></div>)}</div>;
}

function Filters({ brand, setBrand, platform, setPlatform, status, setStatus }: any) {
  return <div className="grid gap-2 rounded-lg border bg-card p-3 md:grid-cols-4"><Select value={brand} onValueChange={setBrand}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All brands</SelectItem>{OPS_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select><Select value={platform} onValueChange={setPlatform}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All platforms</SelectItem>{platforms.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{statuses.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}</SelectContent></Select><Input placeholder="Date range" /></div>;
}

function Lane({ title, items, updateSocialStatus, requestSocialApproval }: { title: string; items: any[]; updateSocialStatus: (item: any, status: string) => void; requestSocialApproval: (item: any) => void }) {
  return <Card><CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader><CardContent className="space-y-2">{items.slice(0, 8).map((item) => <SocialCard key={item.id} item={item} compact updateSocialStatus={updateSocialStatus} requestSocialApproval={requestSocialApproval} />)}{items.length === 0 && <p className="text-sm text-muted-foreground">No programmed content.</p>}</CardContent></Card>;
}

function SocialCard({ item, compact = false, updateSocialStatus, requestSocialApproval }: { item: any; compact?: boolean; updateSocialStatus: (item: any, status: string) => void; requestSocialApproval: (item: any) => void }) {
  return (
    <Card>
      <CardContent className="grid gap-3 p-4 md:grid-cols-[160px_1fr]">
        <div className="flex min-h-32 items-center justify-center rounded-md border bg-muted text-center text-xs text-muted-foreground">
          {item.asset?.thumbnail_url || item.asset?.asset_url ? <img src={item.asset.thumbnail_url || item.asset.asset_url} alt="" className="h-full max-h-40 w-full rounded-md object-cover" /> : "Needs Graphic"}
        </div>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2"><Badge variant="outline">{item.brand_key}</Badge><Badge>{item.platform}</Badge><Badge variant="secondary">{statusLabel(item.status)}</Badge></div>
          <h3 className="font-semibold">{item.title}</h3>
          {!compact && <p className="text-sm text-muted-foreground">{item.brief || "No brief yet."}</p>}
          <div className="rounded-md border bg-background p-2 text-sm">{item.caption?.caption_text || "Needs Caption"}</div>
          <div className="grid gap-2 text-xs md:grid-cols-3">
            <span>CTA: {item.cta || "none"}</span>
            <span>Scheduled: {formatDateTime(item.slot?.scheduled_for)}</span>
            <span>Owner: {item.owner_label || "Social Ops"}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => requestSocialApproval(item)}>Send to Approval</Button>
            <Button size="sm" variant="outline" onClick={() => updateSocialStatus(item, "scheduled")}>Schedule</Button>
            <Button size="sm" onClick={() => updateSocialStatus(item, "posted")}>Mark Posted</Button>
            <Button size="sm" variant="outline" onClick={() => updateSocialStatus(item, "needs_recycle")}>Recycle</Button>
            <Button size="sm" variant="destructive" onClick={() => updateSocialStatus(item, "failed")}>Failed</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
