import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DIVISIONS } from "@/lib/constants";
import { Send } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const OUTREACH_TYPES = ["pr", "sponsor", "grant", "customer", "influencer"];

const Outreach = () => {
  const [typeFilter, setTypeFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [selectedPitch, setSelectedPitch] = useState<any>(null);

  const { data: pitches = [] } = useQuery({
    queryKey: ["pr-pitches"],
    queryFn: async () => {
      const { data } = await supabase.from("pr_pitches").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["pr-contacts"],
    queryFn: async () => {
      const { data } = await supabase.from("pr_contacts").select("*").order("score", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const { data: activity = [] } = useQuery({
    queryKey: ["outreach-activity"],
    queryFn: async () => {
      const { data } = await supabase.from("pr_outreach_activity").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const filteredContacts = brandFilter === "all" ? contacts : contacts.filter((c: any) =>
    (c.brand_key || "").includes(brandFilter) || (c.tags || []).some((t: string) => t.includes(brandFilter))
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Outreach</h1>
        <span className="text-xs text-muted-foreground">{pitches.length} pitches \u00b7 {contacts.length} contacts \u00b7 {activity.length} activities</span>
      </div>

      <div className="flex gap-1 flex-wrap">
        <button onClick={() => setTypeFilter("all")} className={cn("rounded-md px-3 py-1 text-[10px] font-semibold", typeFilter === "all" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}>ALL</button>
        {OUTREACH_TYPES.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} className={cn("rounded-md px-3 py-1 text-[10px] font-semibold uppercase", typeFilter === t ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}>{t}</button>
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        <button onClick={() => setBrandFilter("all")} className={cn("shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold", brandFilter === "all" ? "bg-blue-100 text-blue-700" : "text-muted-foreground hover:bg-muted")}>ALL BRANDS</button>
        {DIVISIONS.map(d => (
          <button key={d.key} onClick={() => setBrandFilter(d.key)} className={cn("shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap", brandFilter === d.key ? "bg-blue-100 text-blue-700" : "text-muted-foreground hover:bg-muted")}>{d.name}</button>
        ))}
      </div>

      <Tabs defaultValue="pitches" className="space-y-3">
        <TabsList>
          <TabsTrigger value="pitches">Pitches ({pitches.length})</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({filteredContacts.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity ({activity.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pitches">
          <div className="flex gap-4">
            <div className={cn("space-y-1.5", selectedPitch ? "w-1/2" : "w-full")}>
              {pitches.map((p: any) => (
                <button key={p.id} onClick={() => setSelectedPitch(p)} className={cn("w-full rounded-lg border bg-card p-3 text-left transition-all hover:border-blue-200", selectedPitch?.id === p.id ? "border-blue-300 ring-1 ring-blue-100" : "border-border/50")}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground truncate">{p.pitch_title || p.pitch_angle || "Untitled"}</span>
                    <StatusBadge variant={p.status === "sent" ? "info" : p.status === "approved" ? "success" : "warning"}>{p.status || "draft"}</StatusBadge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">{(p.pitch_text || "").slice(0, 80) || "\u2014"}</p>
                </button>
              ))}
            </div>
            {selectedPitch && (
              <div className="flex-1 rounded-lg border border-border/50 bg-card p-4 overflow-auto">
                <h3 className="text-sm font-bold text-foreground mb-2">{selectedPitch.pitch_title || selectedPitch.pitch_angle}</h3>
                <StatusBadge variant="default">{selectedPitch.status || "draft"}</StatusBadge>
                <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{selectedPitch.pitch_text || "No content"}</div>
                <button onClick={() => setSelectedPitch(null)} className="mt-3 text-[10px] text-blue-500 hover:underline">Close</button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="contacts">
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/30">
                {["Name", "Outlet", "Email", "Score", "Tags"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredContacts.slice(0, 50).map((c: any) => (
                  <tr key={c.id} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-3 py-2 font-semibold text-foreground">{c.reporter_name || c.contact_name || "\u2014"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{c.outlet_name || c.company || "\u2014"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{c.email || "\u2014"}</td>
                    <td className="px-3 py-2 font-mono text-xs font-bold">{c.score || "\u2014"}</td>
                    <td className="px-3 py-2">{(c.tags || []).slice(0, 3).map((t: string, i: number) => <StatusBadge key={i} variant="default">{t}</StatusBadge>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <div className="space-y-1.5">
            {activity.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 rounded-md border border-border/30 p-3">
                <Send className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">{a.subject || a.action_type || "\u2014"}</p>
                  <p className="text-[10px] text-muted-foreground">{a.recipient || a.outlet || "\u2014"}</p>
                </div>
                <span className="font-mono text-[9px] text-muted-foreground">{a.created_at ? format(new Date(a.created_at), "MMM d") : "\u2014"}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Outreach;
