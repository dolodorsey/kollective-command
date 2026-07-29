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
import { OPS_BRANDS, formatDateTime, statusLabel } from "@/lib/opsTypes";

const tabs = ["requests", "briefs", "in_production", "needs_review", "approved_assets", "prompt_packs", "source_files", "ai_generation_logs", "usage_history"];
const requestTypes = ["graphic", "caption", "video", "source_content", "full_post", "email", "ad", "seo", "other"];

export default function OpsContentStudio() {
  const qc = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const [tab, setTab] = useState(params.get("tab") || "requests");
  const [draft, setDraft] = useState({ brand_key: "the-kollective", content_item_id: "", request_type: "graphic", request_prompt: "", target_dimensions: "1080x1350", source_files: "", requested_tool: "ai", due_at: "", status: "queued" });
  const { data: requests = [] } = useQuery({ queryKey: ["ops-content-requests"], queryFn: async () => (await supabase.from("khg_content_generation_requests").select("*").order("created_at", { ascending: false }).limit(500)).data || [] });
  const { data: assets = [] } = useQuery({ queryKey: ["ops-content-assets"], queryFn: async () => (await supabase.from("khg_content_assets").select("*").order("created_at", { ascending: false }).limit(500)).data || [] });

  async function createRequest() {
    if (!draft.brand_key || !draft.request_prompt) return toast.error("Brand and prompt are required");
    const { error } = await supabase.from("khg_content_generation_requests").insert({
      brand_key: draft.brand_key,
      content_item_id: draft.content_item_id || null,
      request_type: draft.request_type,
      request_prompt: draft.request_prompt,
      target_dimensions: draft.target_dimensions,
      source_files: draft.source_files ? draft.source_files.split(",").map((x) => x.trim()) : [],
      requested_tool: draft.requested_tool,
      due_at: draft.due_at || null,
      status: draft.status,
    });
    if (error) return toast.error(error.message);
    toast.success("Creative request created");
    setDraft({ ...draft, content_item_id: "", request_prompt: "", source_files: "", due_at: "" });
    qc.invalidateQueries({ queryKey: ["ops-content-requests"] });
  }

  async function sendToApproval(asset: any) {
    const { error } = await supabase.from("khg_approval_requests").insert({ department_key: "content_studio", brand_key: asset.brand_key, source_type: "graphic", source_id: asset.id, title: asset.file_name || "Creative asset review", preview_url: asset.thumbnail_url || asset.asset_url, preview_text: asset.generation_prompt || "Review asset", requested_by: "Creative Ops" });
    if (error) return toast.error(error.message);
    await supabase.from("khg_content_assets").update({ status: "needs_review" }).eq("id", asset.id);
    toast.success("Sent to approval");
  }

  async function attachAsset(request: any) {
    const assetUrl = window.prompt("Paste the asset URL to attach");
    if (!assetUrl) return;
    const { error } = await supabase.from("khg_content_assets").insert({
      content_item_id: request.content_item_id || null,
      brand_key: request.brand_key,
      asset_type: request.request_type === "video" ? "video" : "graphic",
      asset_url: assetUrl,
      thumbnail_url: assetUrl,
      generation_prompt: request.request_prompt,
      generation_tool: request.requested_tool,
      status: "needs_review",
      metadata: { generation_request_id: request.id },
    });
    if (error) return toast.error(error.message);
    await supabase.from("khg_content_generation_requests").update({ status: "generated", updated_at: new Date().toISOString() }).eq("id", request.id);
    toast.success("Asset attached");
    qc.invalidateQueries({ queryKey: ["ops-content-assets"] });
    qc.invalidateQueries({ queryKey: ["ops-content-requests"] });
  }

  async function pushRequestToSocial(request: any) {
    const { error } = await supabase.from("khg_content_items").insert({
      brand_key: request.brand_key,
      platform: "instagram",
      content_type: request.request_type === "video" ? "reel" : "post",
      title: request.request_prompt.slice(0, 90),
      brief: request.request_prompt,
      status: request.request_type === "caption" ? "needs_graphic" : "needs_caption",
      priority: "normal",
      owner_label: "Social Ops",
      metadata: { generation_request_id: request.id },
    });
    if (error) return toast.error(error.message);
    toast.success("Pushed to Social command");
  }

  async function pushRequestToMarketing(request: any) {
    const campaignKey = `content-studio-${request.brand_key}`.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const { data: campaign } = await supabase.from("khg_marketing_campaigns").upsert({
      campaign_key: campaignKey,
      brand_key: request.brand_key,
      campaign_name: "Content Studio Pushes",
      campaign_goal: "Turn creative requests into market-ready assets",
      status: "active",
      owner_label: "Marketing Ops",
    }, { onConflict: "campaign_key" }).select("*").single();
    const { error } = await supabase.from("khg_marketing_calendar_items").insert({
      campaign_id: campaign?.id || null,
      brand_key: request.brand_key,
      channel: request.request_type === "email" ? "email" : request.request_type === "ad" ? "ads" : "engagement",
      title: request.request_prompt.slice(0, 90),
      copy_preview: request.request_prompt,
      status: "needs_approval",
      metadata: { generation_request_id: request.id },
    });
    if (error) return toast.error(error.message);
    toast.success("Pushed to Marketing command");
  }

  async function archiveRequest(request: any) {
    const { error } = await supabase.from("khg_content_generation_requests").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", request.id);
    if (error) return toast.error(error.message);
    toast.success("Creative request archived");
    qc.invalidateQueries({ queryKey: ["ops-content-requests"] });
  }

  async function pushAssetToSocial(asset: any) {
    const { error } = await supabase.from("khg_content_items").insert({
      brand_key: asset.brand_key,
      platform: "instagram",
      content_type: asset.asset_type === "video" ? "reel" : "post",
      title: asset.file_name || "Approved creative asset",
      brief: asset.generation_prompt || asset.asset_url,
      status: "needs_caption",
      priority: "normal",
      owner_label: "Social Ops",
      metadata: { asset_id: asset.id },
    });
    if (error) return toast.error(error.message);
    toast.success("Asset pushed to Social");
  }

  async function pushAssetToMarketing(asset: any) {
    const { error } = await supabase.from("khg_marketing_calendar_items").insert({
      brand_key: asset.brand_key,
      channel: "ads",
      title: asset.file_name || "Approved creative asset",
      copy_preview: asset.generation_prompt || "Creative asset ready for marketing copy",
      asset_url: asset.asset_url,
      status: "needs_copy",
      metadata: { asset_id: asset.id },
    });
    if (error) return toast.error(error.message);
    toast.success("Asset pushed to Marketing");
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground">Ops OS</p><h1 className="text-2xl font-bold">Content Studio</h1><p className="text-sm text-muted-foreground">Creative requests, briefs, assets, prompt packs, source files, generation logs, review, and usage history.</p></div><Button onClick={() => setTab("requests")}>Create Request</Button></div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4"><Metric label="Requests" value={requests.length} /><Metric label="In Production" value={requests.filter((r: any) => r.status === "in_progress").length} /><Metric label="Needs Review" value={assets.filter((a: any) => a.status === "needs_review").length} /><Metric label="Approved Assets" value={assets.filter((a: any) => a.status === "approved").length} /></div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap justify-start">{tabs.map((tab) => <TabsTrigger key={tab} value={tab}>{statusLabel(tab)}</TabsTrigger>)}</TabsList>
        <TabsContent value="requests" className="mt-4 grid gap-4 xl:grid-cols-[420px_1fr]">
          <Card><CardHeader><CardTitle className="text-lg">New Creative Request</CardTitle></CardHeader><CardContent className="space-y-3"><div className="grid gap-3 md:grid-cols-2"><Select value={draft.brand_key} onValueChange={(v) => setDraft({ ...draft, brand_key: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OPS_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select><Select value={draft.request_type} onValueChange={(v) => setDraft({ ...draft, request_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{requestTypes.map((b) => <SelectItem key={b} value={b}>{statusLabel(b)}</SelectItem>)}</SelectContent></Select></div><Input placeholder="Linked content item ID" value={draft.content_item_id} onChange={(e) => setDraft({ ...draft, content_item_id: e.target.value })} /><Textarea placeholder="Request prompt" value={draft.request_prompt} onChange={(e) => setDraft({ ...draft, request_prompt: e.target.value })} /><div className="grid gap-3 md:grid-cols-3"><Input placeholder="Dimensions" value={draft.target_dimensions} onChange={(e) => setDraft({ ...draft, target_dimensions: e.target.value })} /><Input placeholder="Tool" value={draft.requested_tool} onChange={(e) => setDraft({ ...draft, requested_tool: e.target.value })} /><Input type="datetime-local" value={draft.due_at} onChange={(e) => setDraft({ ...draft, due_at: e.target.value })} /></div><Input placeholder="Source files, comma separated" value={draft.source_files} onChange={(e) => setDraft({ ...draft, source_files: e.target.value })} /><Button onClick={createRequest}>Create Request</Button></CardContent></Card>
          <div className="space-y-3">{requests.map((request: any) => <RequestCard key={request.id} request={request} attachAsset={attachAsset} pushRequestToSocial={pushRequestToSocial} pushRequestToMarketing={pushRequestToMarketing} archiveRequest={archiveRequest} />)}</div>
        </TabsContent>
        <TabsContent value="in_production" className="mt-4 grid gap-3 lg:grid-cols-2">{requests.filter((r: any) => ["queued", "in_progress", "generated"].includes(r.status)).map((request: any) => <RequestCard key={request.id} request={request} attachAsset={attachAsset} pushRequestToSocial={pushRequestToSocial} pushRequestToMarketing={pushRequestToMarketing} archiveRequest={archiveRequest} />)}</TabsContent>
        <TabsContent value="needs_review" className="mt-4 grid gap-3 lg:grid-cols-3">{assets.filter((asset: any) => asset.status === "needs_review").map((asset: any) => <AssetCard key={asset.id} asset={asset} sendToApproval={sendToApproval} pushAssetToSocial={pushAssetToSocial} pushAssetToMarketing={pushAssetToMarketing} />)}</TabsContent>
        <TabsContent value="approved_assets" className="mt-4 grid gap-3 lg:grid-cols-3">{assets.filter((asset: any) => asset.status === "approved").map((asset: any) => <AssetCard key={asset.id} asset={asset} sendToApproval={sendToApproval} pushAssetToSocial={pushAssetToSocial} pushAssetToMarketing={pushAssetToMarketing} />)}</TabsContent>
        {["briefs", "prompt_packs", "source_files", "ai_generation_logs", "usage_history"].map((tab) => <TabsContent key={tab} value={tab} className="mt-4 grid gap-3 lg:grid-cols-3">{requests.map((request: any) => <RequestCard key={request.id} request={request} attachAsset={attachAsset} pushRequestToSocial={pushRequestToSocial} pushRequestToMarketing={pushRequestToMarketing} archiveRequest={archiveRequest} />)}</TabsContent>)}
      </Tabs>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border bg-card p-3"><div className="text-xl font-black">{value}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div></div>;
}

function RequestCard({ request, attachAsset, pushRequestToSocial, pushRequestToMarketing, archiveRequest }: any) {
  return <Card><CardContent className="p-4"><div className="flex flex-wrap gap-2"><Badge variant="outline">{request.brand_key}</Badge><Badge>{statusLabel(request.request_type)}</Badge><Badge variant="secondary">{statusLabel(request.status)}</Badge></div><h3 className="mt-2 font-semibold">{request.request_prompt}</h3><p className="mt-1 text-xs text-muted-foreground">Due {formatDateTime(request.due_at)} · {request.target_dimensions || "open size"} · {request.requested_tool}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => attachAsset(request)}>Attach Asset</Button><Button size="sm" variant="outline" onClick={() => pushRequestToSocial(request)}>Push to Social</Button><Button size="sm" variant="outline" onClick={() => pushRequestToMarketing(request)}>Push to Marketing</Button><Button size="sm" variant="ghost" onClick={() => archiveRequest(request)}>Archive</Button></div></CardContent></Card>;
}

function AssetCard({ asset, sendToApproval, pushAssetToSocial, pushAssetToMarketing }: any) {
  return <Card><CardContent className="space-y-3 p-4"><div className="flex min-h-36 items-center justify-center rounded-md border bg-muted">{asset.thumbnail_url || asset.asset_url ? <img src={asset.thumbnail_url || asset.asset_url} alt="" className="h-full max-h-44 w-full rounded-md object-cover" /> : <span className="text-xs text-muted-foreground">No preview</span>}</div><Badge variant="outline">{asset.brand_key}</Badge><h3 className="font-semibold">{asset.file_name || asset.asset_type}</h3><p className="text-sm text-muted-foreground">{asset.generation_prompt || asset.asset_url}</p><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => sendToApproval(asset)}>Send to Approval</Button><Button size="sm" variant="outline" onClick={() => pushAssetToSocial(asset)}>Push to Social</Button><Button size="sm" variant="outline" onClick={() => pushAssetToMarketing(asset)}>Push to Marketing</Button></div></CardContent></Card>;
}
