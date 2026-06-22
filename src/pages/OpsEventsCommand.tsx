import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { OPS_BRANDS, statusLabel, toKey } from "@/lib/opsTypes";

const tabs = ["calendar", "create", "ticketing", "flyers", "social_rollout", "marketing_rollout", "ambassadors", "street_team", "staffing", "vendors", "revenue", "recap"];

export default function OpsEventsCommand() {
  const qc = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const [tab, setTab] = useState(params.get("tab") || "calendar");
  const [draft, setDraft] = useState({ event_key: "", brand_key: "the-kollective", event_name: "", event_date: "", venue_name: "", city: "", ticketing_url: "", flyer_asset_url: "", ambassador_status: "not_started", street_team_status: "not_started", staffing_status: "not_started", status: "planning" });
  const { data: events = [] } = useQuery({ queryKey: ["ops-events"], queryFn: async () => (await supabase.from("khg_event_rollouts").select("*").order("event_date", { ascending: true }).limit(500)).data || [] });

  async function createEvent() {
    if (!draft.event_name) return toast.error("Event name is required");
    const event_key = draft.event_key || toKey(`${draft.brand_key}-${draft.event_name}-${draft.event_date || Date.now()}`);
    const { data, error } = await supabase.from("khg_event_rollouts").insert({ ...draft, event_key }).select("*").single();
    if (error) return toast.error(error.message);
    const work = ["flyer needed", "ticketing needed", "social rollout needed", "marketing rollout needed", "ambassadors needed", "street team needed", "staffing needed", "vendor confirmations", "recap needed"].map((title) => ({
      department_key: "events",
      queue_key: "event_rollout",
      brand_key: draft.brand_key,
      source_type: "event_rollout",
      source_id: data.id,
      title: `${draft.event_name}: ${title}`,
      priority: title.includes("ticketing") || title.includes("flyer") ? "high" : "normal",
      owner_label: "Events Ops",
      status: "open",
      due_at: draft.event_date || null,
    }));
    await supabase.from("khg_work_queues").insert(work);
    if (draft.flyer_asset_url) await supabase.from("khg_content_campaigns").insert({ campaign_key: `${event_key}-social`, brand_key: draft.brand_key, campaign_name: `${draft.event_name} social rollout`, campaign_type: "event", status: "active" });
    await supabase.from("khg_marketing_campaigns").insert({ campaign_key: `${event_key}-marketing`, brand_key: draft.brand_key, campaign_name: `${draft.event_name} marketing rollout`, campaign_goal: "Drive attendance", status: "active" });
    toast.success("Event rollout created");
    setDraft({ event_key: "", brand_key: "the-kollective", event_name: "", event_date: "", venue_name: "", city: "", ticketing_url: "", flyer_asset_url: "", ambassador_status: "not_started", street_team_status: "not_started", staffing_status: "not_started", status: "planning" });
    qc.invalidateQueries({ queryKey: ["ops-events"] });
  }

  return (
      <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground">Ops OS</p><h1 className="text-2xl font-bold">Events Command Center</h1><p className="text-sm text-muted-foreground">Event rollout management across ticketing, flyers, social, marketing, ambassadors, staffing, vendors, revenue, and recap.</p></div><Button onClick={() => setTab("create")}>Add Event</Button></div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4"><Metric label="Events" value={events.length} /><Metric label="Blocked" value={events.filter((e: any) => e.status === "blocked").length} /><Metric label="Active" value={events.filter((e: any) => e.status === "active").length} /><Metric label="Ready" value={events.filter((e: any) => e.status === "ready").length} /></div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap justify-start">{tabs.map((tab) => <TabsTrigger key={tab} value={tab}>{statusLabel(tab)}</TabsTrigger>)}</TabsList>
        <TabsContent value="calendar" className="mt-4 grid gap-3 lg:grid-cols-2">{events.map((event: any) => <EventCard key={event.id} event={event} />)}</TabsContent>
        <TabsContent value="create" className="mt-4"><Card><CardHeader><CardTitle className="text-lg">Create Event Rollout</CardTitle></CardHeader><CardContent className="space-y-3"><div className="grid gap-3 md:grid-cols-3"><Input placeholder="Event key" value={draft.event_key} onChange={(e) => setDraft({ ...draft, event_key: e.target.value })} /><Select value={draft.brand_key} onValueChange={(v) => setDraft({ ...draft, brand_key: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OPS_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select><Input type="date" value={draft.event_date} onChange={(e) => setDraft({ ...draft, event_date: e.target.value })} /></div><Input placeholder="Event name" value={draft.event_name} onChange={(e) => setDraft({ ...draft, event_name: e.target.value })} /><div className="grid gap-3 md:grid-cols-2"><Input placeholder="Venue" value={draft.venue_name} onChange={(e) => setDraft({ ...draft, venue_name: e.target.value })} /><Input placeholder="City" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></div><div className="grid gap-3 md:grid-cols-2"><Input placeholder="Ticketing URL" value={draft.ticketing_url} onChange={(e) => setDraft({ ...draft, ticketing_url: e.target.value })} /><Input placeholder="Flyer asset URL" value={draft.flyer_asset_url} onChange={(e) => setDraft({ ...draft, flyer_asset_url: e.target.value })} /></div><Button onClick={createEvent}>Create Event Rollout</Button></CardContent></Card></TabsContent>
        {tabs.filter((tab) => !["calendar", "create"].includes(tab)).map((tab) => <TabsContent key={tab} value={tab} className="mt-4 grid gap-3 lg:grid-cols-2">{events.map((event: any) => <EventCard key={event.id} event={event} lane={tab} />)}</TabsContent>)}
      </Tabs>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border bg-card p-3"><div className="text-xl font-black">{value}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div></div>;
}

function EventCard({ event, lane }: { event: any; lane?: string }) {
  return <Card><CardContent className="grid gap-3 p-4 md:grid-cols-[150px_1fr_170px]"><div className="rounded-md border bg-muted p-3 text-sm font-semibold">{event.event_date || "No date"}<p className="mt-1 text-xs font-normal text-muted-foreground">{event.city || "City TBD"}</p></div><div><div className="flex flex-wrap gap-2"><Badge variant="outline">{event.brand_key || "parent-command"}</Badge><Badge>{statusLabel(event.status)}</Badge>{lane && <Badge variant="secondary">{statusLabel(lane)}</Badge>}</div><h3 className="mt-2 font-semibold">{event.event_name}</h3><p className="text-sm text-muted-foreground">{event.venue_name || "Venue TBD"}</p><p className="mt-1 text-xs text-muted-foreground">{event.ticketing_url || "Ticketing needed"}</p></div><div className="space-y-1 text-xs text-muted-foreground"><p>Ambassadors: {event.ambassador_status}</p><p>Street team: {event.street_team_status}</p><p>Staffing: {event.staffing_status}</p></div></CardContent></Card>;
}
