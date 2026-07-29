import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MARKETING_CHANNELS, OPS_BRANDS, formatDateTime, statusLabel, toKey } from "@/lib/opsTypes";

const tabs = ["calendar", "create", "email", "sms", "evite", "eventbrite", "seo", "ads", "retargeting", "landing_page", "needs_copy", "needs_asset", "needs_approval", "scheduled", "sent_live", "failed", "reports"];

export default function OpsMarketing() {
  const qc = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const [tab, setTab] = useState(params.get("tab") || "calendar");
  const [draft, setDraft] = useState({
    brand_key: "the-kollective",
    campaign_name: "",
    campaign_goal: "",
    offer_name: "",
    funnel_stage: "awareness",
    channel: "email",
    title: "",
    copy_preview: "",
    asset_url: "",
    audience_key: "",
    scheduled_for: "",
    ghl_workflow_id: "",
    external_url: "",
    status: "needs_approval",
    owner_label: "Marketing Ops",
    approval_required: true,
  });

  const { data: campaigns = [] } = useQuery({ queryKey: ["ops-marketing-campaigns"], queryFn: async () => (await supabase.from("khg_marketing_campaigns").select("*").order("created_at", { ascending: false }).limit(300)).data || [] });
  const { data: items = [] } = useQuery({ queryKey: ["ops-marketing-items"], queryFn: async () => (await supabase.from("khg_marketing_calendar_items").select("*").order("scheduled_for", { ascending: true }).limit(500)).data || [] });

  const metrics = [
    ["Campaigns", campaigns.length],
    ["Needs Copy", items.filter((item: any) => item.status === "needs_copy").length],
    ["Needs Asset", items.filter((item: any) => item.status === "needs_asset").length],
    ["Needs Approval", items.filter((item: any) => item.status === "needs_approval").length],
    ["Scheduled", items.filter((item: any) => item.status === "scheduled").length],
    ["Sent / Live", items.filter((item: any) => ["sent", "live"].includes(item.status)).length],
    ["Failed", items.filter((item: any) => item.status === "failed").length],
  ];

  function validationMessage() {
    if (!draft.campaign_name || !draft.title) return "Campaign and title are required";
    if (draft.channel === "email" && !draft.copy_preview) return "Email requires subject/copy preview";
    if (draft.channel === "sms" && (!draft.copy_preview || draft.copy_preview.length > 320)) return "SMS requires short copy";
    if (["evite", "eventbrite"].includes(draft.channel) && !draft.external_url) return "Evite/Eventbrite requires an external URL";
    if (draft.channel === "ads" && (!draft.asset_url || !draft.copy_preview)) return "Ads require asset and copy";
    if (draft.channel === "seo" && !draft.external_url && !draft.title) return "SEO requires page/topic";
    if (draft.channel === "landing_page" && !draft.external_url) return "Landing page requires URL or slug";
    return "";
  }

  async function createMarketingItem() {
    const message = validationMessage();
    if (message) return toast.error(message);
    const campaign_key = toKey(`${draft.brand_key}-${draft.campaign_name}`);
    let campaign = campaigns.find((item: any) => item.campaign_key === campaign_key);
    if (!campaign) {
      const { data, error } = await supabase.from("khg_marketing_campaigns").insert({
        campaign_key,
        brand_key: draft.brand_key,
        campaign_name: draft.campaign_name,
        campaign_goal: draft.campaign_goal,
        offer_name: draft.offer_name,
        funnel_stage: draft.funnel_stage,
        status: "active",
        owner_label: draft.owner_label,
      }).select("*").single();
      if (error) return toast.error(error.message);
      campaign = data;
    }
    const nextStatus = draft.approval_required ? "needs_approval" : draft.status;
    const { data, error } = await supabase.from("khg_marketing_calendar_items").insert({
      campaign_id: campaign.id,
      brand_key: draft.brand_key,
      channel: draft.channel,
      title: draft.title,
      copy_preview: draft.copy_preview,
      asset_url: draft.asset_url,
      audience_key: draft.audience_key,
      scheduled_for: draft.scheduled_for || null,
      ghl_workflow_id: draft.ghl_workflow_id,
      external_url: draft.external_url,
      status: nextStatus,
      metadata: { owner_label: draft.owner_label, approval_required: draft.approval_required },
    }).select("*").single();
    if (error) return toast.error(error.message);
    if (draft.approval_required) {
      await supabase.from("khg_approval_requests").insert({
        department_key: "marketing",
        brand_key: draft.brand_key,
        source_type: "marketing",
        source_id: data.id,
        title: draft.title,
        preview_url: draft.asset_url || draft.external_url || null,
        preview_text: draft.copy_preview,
        requested_by: draft.owner_label,
      });
    }
    if (draft.asset_url) {
      await supabase.from("khg_content_assets").insert({
        brand_key: draft.brand_key,
        asset_type: "graphic",
        asset_url: draft.asset_url,
        status: "uploaded",
        metadata: { source_type: "marketing", source_id: data.id },
      });
    }
    toast.success("Marketing item created");
    setDraft({ ...draft, campaign_name: "", campaign_goal: "", offer_name: "", title: "", copy_preview: "", asset_url: "", audience_key: "", scheduled_for: "", ghl_workflow_id: "", external_url: "" });
    qc.invalidateQueries({ queryKey: ["ops-marketing-campaigns"] });
    qc.invalidateQueries({ queryKey: ["ops-marketing-items"] });
  }

  async function updateMarketingStatus(item: any, nextStatus: string) {
    const { error } = await supabase.from("khg_marketing_calendar_items").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success(`Marketing item marked ${statusLabel(nextStatus)}`);
    qc.invalidateQueries({ queryKey: ["ops-marketing-items"] });
  }

  async function requestMarketingApproval(item: any) {
    const { error } = await supabase.from("khg_approval_requests").insert({
      department_key: "marketing",
      brand_key: item.brand_key,
      source_type: "marketing",
      source_id: item.id,
      title: item.title,
      preview_url: item.asset_url || item.external_url || null,
      preview_text: item.copy_preview || "Review marketing item",
      requested_by: item.metadata?.owner_label || "Marketing Ops",
      status: "pending",
    });
    if (error) return toast.error(error.message);
    await updateMarketingStatus(item, "needs_approval");
    toast.success("Marketing approval request created");
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground">Ops OS</p><h1 className="text-2xl font-bold">Marketing Command Center</h1><p className="text-sm text-muted-foreground">Separate channel calendar for email, SMS, Evite/Eventbrite, SEO, ads, retargeting, and landing pages.</p></div>
        <Button onClick={() => setTab("create")}>Create Campaign</Button>
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-7">{metrics.map(([label, value]) => <div key={label} className="rounded-lg border bg-card p-3"><div className="text-xl font-black">{value}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div></div>)}</div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap justify-start">{tabs.map((value) => <TabsTrigger key={value} value={value}>{statusLabel(value === "sent_live" ? "sent / live" : value)}</TabsTrigger>)}</TabsList>
        <TabsContent value="calendar" className="mt-4 space-y-3">{items.map((item: any) => <MarketingCard key={item.id} item={item} updateMarketingStatus={updateMarketingStatus} requestMarketingApproval={requestMarketingApproval} />)}</TabsContent>
        <TabsContent value="create" className="mt-4"><CreateForm draft={draft} setDraft={setDraft} createMarketingItem={createMarketingItem} /></TabsContent>
        {MARKETING_CHANNELS.map((channel) => <TabsContent key={channel} value={channel} className="mt-4 grid gap-3 lg:grid-cols-2">{items.filter((item: any) => item.channel === channel).map((item: any) => <MarketingCard key={item.id} item={item} updateMarketingStatus={updateMarketingStatus} requestMarketingApproval={requestMarketingApproval} />)}</TabsContent>)}
        {["needs_copy", "needs_asset", "needs_approval", "scheduled", "failed"].map((state) => <TabsContent key={state} value={state} className="mt-4 grid gap-3 lg:grid-cols-2">{items.filter((item: any) => item.status === state).map((item: any) => <MarketingCard key={item.id} item={item} updateMarketingStatus={updateMarketingStatus} requestMarketingApproval={requestMarketingApproval} />)}</TabsContent>)}
        <TabsContent value="sent_live" className="mt-4 grid gap-3 lg:grid-cols-2">{items.filter((item: any) => ["sent", "live"].includes(item.status)).map((item: any) => <MarketingCard key={item.id} item={item} updateMarketingStatus={updateMarketingStatus} requestMarketingApproval={requestMarketingApproval} />)}</TabsContent>
        <TabsContent value="reports" className="mt-4 grid gap-3 lg:grid-cols-3">{campaigns.map((campaign: any) => <Card key={campaign.id}><CardContent className="p-4"><Badge variant="outline">{campaign.brand_key || "cross-brand"}</Badge><h3 className="mt-2 font-semibold">{campaign.campaign_name}</h3><p className="text-sm text-muted-foreground">{campaign.campaign_goal || "No goal set"}</p><Badge className="mt-3" variant="secondary">{campaign.status}</Badge></CardContent></Card>)}</TabsContent>
      </Tabs>
    </div>
  );
}

function CreateForm({ draft, setDraft, createMarketingItem }: any) {
  return (
    <Card><CardHeader><CardTitle className="text-lg">Create Marketing Calendar Item</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="grid gap-3 md:grid-cols-4">
        <Select value={draft.brand_key} onValueChange={(v) => setDraft({ ...draft, brand_key: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OPS_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select>
        <Select value={draft.channel} onValueChange={(v) => setDraft({ ...draft, channel: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MARKETING_CHANNELS.map((b) => <SelectItem key={b} value={b}>{statusLabel(b)}</SelectItem>)}</SelectContent></Select>
        <Select value={draft.funnel_stage} onValueChange={(v) => setDraft({ ...draft, funnel_stage: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["awareness", "engagement", "lead", "conversion", "retention", "reactivation"].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select>
        <Input type="datetime-local" value={draft.scheduled_for} onChange={(e) => setDraft({ ...draft, scheduled_for: e.target.value })} />
      </div>
      <div className="grid gap-3 md:grid-cols-3"><Input placeholder="Campaign name" value={draft.campaign_name} onChange={(e) => setDraft({ ...draft, campaign_name: e.target.value })} /><Input placeholder="Campaign goal" value={draft.campaign_goal} onChange={(e) => setDraft({ ...draft, campaign_goal: e.target.value })} /><Input placeholder="Offer name" value={draft.offer_name} onChange={(e) => setDraft({ ...draft, offer_name: e.target.value })} /></div>
      <Input placeholder="Item title / subject / page topic" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      <Textarea placeholder="Copy preview" value={draft.copy_preview} onChange={(e) => setDraft({ ...draft, copy_preview: e.target.value })} />
      <div className="grid gap-3 md:grid-cols-4"><Input placeholder="Asset URL" value={draft.asset_url} onChange={(e) => setDraft({ ...draft, asset_url: e.target.value })} /><Input placeholder="Audience key" value={draft.audience_key} onChange={(e) => setDraft({ ...draft, audience_key: e.target.value })} /><Input placeholder="GHL workflow ID" value={draft.ghl_workflow_id} onChange={(e) => setDraft({ ...draft, ghl_workflow_id: e.target.value })} /><Input placeholder="External URL" value={draft.external_url} onChange={(e) => setDraft({ ...draft, external_url: e.target.value })} /></div>
      <Button onClick={createMarketingItem}>Create Marketing Item</Button>
    </CardContent></Card>
  );
}

function MarketingCard({ item, updateMarketingStatus, requestMarketingApproval }: { item: any; updateMarketingStatus: (item: any, status: string) => void; requestMarketingApproval: (item: any) => void }) {
  return <Card><CardContent className="grid gap-3 p-4 md:grid-cols-[150px_1fr_210px]"><div className="text-sm font-semibold">{formatDateTime(item.scheduled_for)}</div><div className="min-w-0"><div className="flex flex-wrap gap-2"><Badge variant="outline">{item.brand_key || "cross-brand"}</Badge><Badge>{statusLabel(item.channel)}</Badge></div><h3 className="mt-2 font-semibold">{item.title}</h3><p className="text-sm text-muted-foreground">{item.copy_preview || "Needs copy"}</p><p className="mt-1 text-xs text-muted-foreground">{item.external_url || item.asset_url || "No linked asset or page"}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => requestMarketingApproval(item)}>Request Approval</Button><Button size="sm" variant="outline" onClick={() => updateMarketingStatus(item, "needs_copy")}>Needs Copy</Button><Button size="sm" variant="outline" onClick={() => updateMarketingStatus(item, "needs_asset")}>Needs Asset</Button></div></div><div className="flex flex-col items-start gap-2 md:items-end"><Badge variant="secondary">{statusLabel(item.status)}</Badge><span className="text-xs text-muted-foreground">{item.audience_key || "No audience"}</span><div className="flex flex-wrap justify-start gap-2 md:justify-end"><Button size="sm" variant="outline" onClick={() => updateMarketingStatus(item, "scheduled")}>Schedule</Button><Button size="sm" onClick={() => updateMarketingStatus(item, item.channel === "landing_page" || item.channel === "seo" ? "live" : "sent")}>{item.channel === "landing_page" || item.channel === "seo" ? "Live" : "Sent"}</Button><Button size="sm" variant="destructive" onClick={() => updateMarketingStatus(item, "failed")}>Failed</Button></div></div></CardContent></Card>;
}
