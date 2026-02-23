import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Instagram, RefreshCw, Loader2, Send, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const IG_ACCOUNTS = ["dolodorsey", "letstalkaboutitatlanta", "hauseofstush", "thebodegaworldwide", "drdolodorsey", "thepinkypromiseatl"];

const IGInbox = () => {
  const queryClient = useQueryClient();
  const [accountFilter, setAccountFilter] = useState("all");
  const [liveDMs, setLiveDMs] = useState<any[]>([]);
  const [fetchingLive, setFetchingLive] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);

  const { data: targets = [] } = useQuery({
    queryKey: ["ig-targets"],
    queryFn: async () => {
      const { data } = await supabase.from("social_outreach_targets").select("*").order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
  });

  const { data: scripts = [] } = useQuery({
    queryKey: ["ig-dm-scripts"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_outreach_scripts").select("*").eq("channel", "dm").order("brand_key");
      return data || [];
    },
  });

  const { data: touches = [] } = useQuery({
    queryKey: ["ig-touches"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_touchpoints").select("*").in("channel", ["dm", "comment", "ig"]).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const fetchLiveDMs = async () => {
    setFetchingLive(true);
    try {
      const res = await fetch("https://drdorsey.app.n8n.cloud/webhook/exec-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_type: "ig_fetch_dms", account: accountFilter === "all" ? "dolodorsey" : accountFilter, limit: 20, source: "mcp-ig-inbox" }),
      });
      if (res.ok) {
        const data = await res.json();
        const dms = data.messages || data.dms || data.results || (Array.isArray(data) ? data : []);
        setLiveDMs(dms);
        toast.success("Fetched " + dms.length + " DMs");
      } else { toast.error("DM fetch failed"); }
    } catch { toast.error("Could not reach IG workflow"); }
    setFetchingLive(false);
  };

  const readyCount = targets.filter((t: any) => t.status === "ready").length;
  const sentCount = targets.filter((t: any) => t.status === "sent").length;
  const repliedCount = targets.filter((t: any) => t.status === "replied").length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Instagram</h1>
        <Button size="sm" className="gap-1.5" onClick={fetchLiveDMs} disabled={fetchingLive}>
          {fetchingLive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {fetchingLive ? "Fetching..." : "Pull Live DMs"}
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        <button onClick={() => setAccountFilter("all")} className={cn("shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold", accountFilter === "all" ? "bg-pink-100 text-pink-700" : "text-muted-foreground hover:bg-muted")}>ALL</button>
        {IG_ACCOUNTS.map(a => (
          <button key={a} onClick={() => setAccountFilter(a)} className={cn("shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold", accountFilter === a ? "bg-pink-100 text-pink-700" : "text-muted-foreground hover:bg-muted")}>@{a}</button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[{ label: "Ready", value: readyCount, color: "text-amber-600" }, { label: "Sent", value: sentCount, color: "text-blue-600" }, { label: "Replied", value: repliedCount, color: "text-green-600" }].map((s, i) => (
          <div key={i} className="rounded-lg border border-border/50 bg-card p-2 text-center">
            <div className={cn("font-mono text-lg font-bold", s.color)}>{s.value}</div>
            <div className="text-[9px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="dms" className="space-y-3">
        <TabsList>
          <TabsTrigger value="dms">DM Inbox ({liveDMs.length})</TabsTrigger>
          <TabsTrigger value="targets">Targets ({targets.length})</TabsTrigger>
          <TabsTrigger value="scripts">DM Scripts ({scripts.length})</TabsTrigger>
          <TabsTrigger value="touches">Touch Log ({touches.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="dms">
          {liveDMs.length === 0 ? (
            <div className="rounded-lg border border-border/50 bg-card p-12 text-center">
              <Instagram className="mx-auto h-8 w-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Click "Pull Live DMs" to fetch from Instagram</p>
              <p className="text-[10px] text-muted-foreground/40 mt-1">Uses n8n Social Inbox workflow</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {liveDMs.map((dm: any, i: number) => (
                <div key={i} className="rounded-lg border border-border/50 bg-card p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-pink-600">@{dm.from || dm.username || dm.sender || "unknown"}</span>
                    <span className="text-[9px] text-muted-foreground">{dm.timestamp || dm.date || ""}</span>
                  </div>
                  <p className="text-xs text-foreground mt-1">{dm.text || dm.message || dm.content || ""}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="targets">
          <div className="flex gap-4">
            <div className={cn("overflow-auto", selectedTarget ? "w-1/2" : "w-full")}>
              <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/30">
                    {["Handle", "Brand", "City", "Status"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {targets.slice(0, 60).map((t: any) => (
                      <tr key={t.id} className={cn("border-b border-border/20 hover:bg-muted/20 cursor-pointer", selectedTarget?.id === t.id ? "bg-pink-50" : "")} onClick={() => setSelectedTarget(t)}>
                        <td className="px-3 py-2 font-semibold text-pink-600 text-xs">{t.handle}</td>
                        <td className="px-3 py-2"><StatusBadge variant="default">{t.brand_key}</StatusBadge></td>
                        <td className="px-3 py-2 text-[10px] text-muted-foreground">{t.city || "\u2014"}</td>
                        <td className="px-3 py-2"><StatusBadge variant={t.status === "ready" ? "warning" : t.status === "replied" ? "success" : "info"}>{t.status}</StatusBadge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {selectedTarget && (
              <div className="flex-1 rounded-lg border border-pink-200 bg-card p-4">
                <h3 className="text-sm font-bold text-pink-600 mb-3">{selectedTarget.handle}</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-muted-foreground text-xs">Brand:</span> <span className="text-foreground">{selectedTarget.brand_key}</span></div>
                  <div><span className="text-muted-foreground text-xs">City:</span> <span className="text-foreground">{selectedTarget.city || "\u2014"}</span></div>
                  <div><span className="text-muted-foreground text-xs">Platform:</span> <span className="text-foreground">{selectedTarget.platform || "instagram"}</span></div>
                  <div><span className="text-muted-foreground text-xs">Status:</span> <StatusBadge variant={selectedTarget.status === "ready" ? "warning" : "success"}>{selectedTarget.status}</StatusBadge></div>
                  {selectedTarget.followers && <div><span className="text-muted-foreground text-xs">Followers:</span> <span className="text-foreground font-mono">{selectedTarget.followers}</span></div>}
                  {selectedTarget.engagement_rate && <div><span className="text-muted-foreground text-xs">Engagement:</span> <span className="text-foreground font-mono">{selectedTarget.engagement_rate}%</span></div>}
                  {selectedTarget.tags && (
                    <div className="flex flex-wrap gap-1">{(selectedTarget.tags || []).map((t: string, j: number) => <StatusBadge key={j} variant="default">{t}</StatusBadge>)}</div>
                  )}
                </div>
                <button onClick={() => setSelectedTarget(null)} className="mt-3 text-[10px] text-blue-500 hover:underline">Close</button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="scripts">
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/30">
                {["Brand", "Hook", "Body", "CTA"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {scripts.map((s: any, i: number) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-3 py-2"><StatusBadge variant="default">{s.brand_key}</StatusBadge></td>
                    <td className="px-3 py-2 text-xs font-semibold text-foreground">{s.hook || "\u2014"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[300px]"><div className="line-clamp-2">{s.body}</div></td>
                    <td className="px-3 py-2 text-xs text-blue-600">{s.cta || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="touches">
          <div className="space-y-1.5">
            {touches.map((t: any, i: number) => (
              <div key={i} className="flex items-center gap-3 rounded-md border border-border/30 p-2.5">
                <Send className="h-3 w-3 text-muted-foreground shrink-0" />
                <StatusBadge variant="default">{t.brand_key}</StatusBadge>
                <span className="text-xs text-muted-foreground">{t.channel}</span>
                <StatusBadge variant={t.outcome === "replied" ? "success" : t.outcome === "sent" ? "info" : "default"}>{t.outcome || "\u2014"}</StatusBadge>
                <span className="text-[10px] text-muted-foreground truncate flex-1">{t.message_preview || "\u2014"}</span>
              </div>
            ))}
            {touches.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground/40">No IG touches</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IGInbox;
