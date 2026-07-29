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
import { OPS_BRANDS, REVENUE_LANES, formatDateTime, statusLabel } from "@/lib/opsTypes";

export default function OpsRevenue() {
  const qc = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const [tab, setTab] = useState(params.get("tab") || "today");
  const [draft, setDraft] = useState({ brand_key: "khg", revenue_lane: "HELP 911 BOH", opportunity_name: "", contact_name: "", contact_method: "", offer_name: "", estimated_value: "0", next_action: "", blocker_reason: "", owner_label: "Revenue Ops", due_at: "", status: "open" });
  const { data: opportunities = [] } = useQuery({ queryKey: ["ops-revenue"], queryFn: async () => (await supabase.from("khg_revenue_opportunities").select("*").order("due_at", { ascending: true }).limit(500)).data || [] });
  const value = opportunities.reduce((sum: number, item: any) => sum + Number(item.estimated_value || 0), 0);

  async function createOpportunity() {
    if (!draft.opportunity_name || !draft.revenue_lane) return toast.error("Opportunity and lane are required");
    const { error } = await supabase.from("khg_revenue_opportunities").insert({ ...draft, estimated_value: Number(draft.estimated_value || 0), due_at: draft.due_at || null });
    if (error) return toast.error(error.message);
    toast.success("Money move created");
    setDraft({ ...draft, opportunity_name: "", contact_name: "", contact_method: "", offer_name: "", estimated_value: "0", next_action: "", blocker_reason: "", due_at: "", status: "open" });
    qc.invalidateQueries({ queryKey: ["ops-revenue"] });
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground">Ops OS</p><h1 className="text-2xl font-bold">Revenue Command Center</h1><p className="text-sm text-muted-foreground">Who has money, what to send, blockers, owner, due date, next action, estimated value, and status.</p></div><Button onClick={() => setTab("create")}>Add Money Move</Button></div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4"><Metric label="Open Moves" value={opportunities.filter((o: any) => ["open", "in_progress"].includes(o.status)).length} /><Metric label="Blocked" value={opportunities.filter((o: any) => o.status === "blocked").length} /><Metric label="Won" value={opportunities.filter((o: any) => o.status === "won").length} /><Metric label="Pipeline Value" value={`$${value.toLocaleString()}`} /></div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap justify-start"><TabsTrigger value="today">Today's Money Moves</TabsTrigger>{REVENUE_LANES.map((lane) => <TabsTrigger key={lane} value={lane}>{lane}</TabsTrigger>)}<TabsTrigger value="blocked">Blocked</TabsTrigger><TabsTrigger value="won">Won</TabsTrigger><TabsTrigger value="lost">Lost</TabsTrigger><TabsTrigger value="create">Create</TabsTrigger></TabsList>
        <TabsContent value="today" className="mt-4 grid gap-3 lg:grid-cols-2">{opportunities.filter((o: any) => !o.due_at || o.due_at.slice(0, 10) <= new Date().toISOString().slice(0, 10)).map((item: any) => <RevenueCard key={item.id} item={item} />)}</TabsContent>
        {REVENUE_LANES.map((lane) => <TabsContent key={lane} value={lane} className="mt-4 grid gap-3 lg:grid-cols-2">{opportunities.filter((o: any) => o.revenue_lane === lane).map((item: any) => <RevenueCard key={item.id} item={item} />)}</TabsContent>)}
        {["blocked", "won", "lost"].map((status) => <TabsContent key={status} value={status} className="mt-4 grid gap-3 lg:grid-cols-2">{opportunities.filter((o: any) => o.status === status).map((item: any) => <RevenueCard key={item.id} item={item} />)}</TabsContent>)}
        <TabsContent value="create" className="mt-4"><Card><CardHeader><CardTitle className="text-lg">Add Revenue Opportunity</CardTitle></CardHeader><CardContent className="space-y-3"><div className="grid gap-3 md:grid-cols-4"><Select value={draft.brand_key} onValueChange={(v) => setDraft({ ...draft, brand_key: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OPS_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select><Select value={draft.revenue_lane} onValueChange={(v) => setDraft({ ...draft, revenue_lane: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{REVENUE_LANES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select><Input type="number" placeholder="Estimated value" value={draft.estimated_value} onChange={(e) => setDraft({ ...draft, estimated_value: e.target.value })} /><Input type="datetime-local" value={draft.due_at} onChange={(e) => setDraft({ ...draft, due_at: e.target.value })} /></div><Input placeholder="Opportunity name" value={draft.opportunity_name} onChange={(e) => setDraft({ ...draft, opportunity_name: e.target.value })} /><div className="grid gap-3 md:grid-cols-3"><Input placeholder="Contact name" value={draft.contact_name} onChange={(e) => setDraft({ ...draft, contact_name: e.target.value })} /><Input placeholder="Contact method" value={draft.contact_method} onChange={(e) => setDraft({ ...draft, contact_method: e.target.value })} /><Input placeholder="Offer name" value={draft.offer_name} onChange={(e) => setDraft({ ...draft, offer_name: e.target.value })} /></div><Textarea placeholder="Next action" value={draft.next_action} onChange={(e) => setDraft({ ...draft, next_action: e.target.value })} /><Textarea placeholder="Blocker reason" value={draft.blocker_reason} onChange={(e) => setDraft({ ...draft, blocker_reason: e.target.value })} /><Button onClick={createOpportunity}>Create Money Move</Button></CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-lg border bg-card p-3"><div className="text-xl font-black">{value}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div></div>;
}

function RevenueCard({ item }: { item: any }) {
  return <Card><CardContent className="p-4"><div className="flex flex-wrap gap-2"><Badge variant="outline">{item.brand_key || "parent-command"}</Badge><Badge>{item.revenue_lane}</Badge><Badge variant="secondary">{statusLabel(item.status)}</Badge></div><h3 className="mt-2 font-semibold">{item.opportunity_name}</h3><p className="text-sm text-muted-foreground">{item.contact_name || "No contact"} · {item.contact_method || "No method"} · {item.offer_name || "No offer"}</p><div className="mt-3 grid gap-2 text-xs md:grid-cols-3"><span>Value: ${Number(item.estimated_value || 0).toLocaleString()}</span><span>Owner: {item.owner_label || "Revenue Ops"}</span><span>Due: {formatDateTime(item.due_at)}</span></div><div className="mt-3 rounded-md border bg-muted/40 p-3 text-sm"><p className="font-medium">Next: {item.next_action || "Define next action"}</p>{item.blocker_reason && <p className="mt-1 text-muted-foreground">Blocker: {item.blocker_reason}</p>}</div></CardContent></Card>;
}
