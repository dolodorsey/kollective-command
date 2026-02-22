import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Instagram, Send, Users, MessageSquare, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const IGInbox = () => {
  const [acctFilter, setAcctFilter] = useState("all");
  const [selectedTarget, setSelectedTarget] = useState<any>(null);

  const { data: accounts = [] } = useQuery({
    queryKey: ["ig-accounts"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_accounts")
        .select("id, email, username, platform, metadata")
        .eq("platform", "instagram").order("username");
      return data || [];
    },
  });

  const { data: threads = [] } = useQuery({
    queryKey: ["ig-threads"],
    queryFn: async () => {
      const { data } = await supabase.from("threads")
        .select("*, platform_accounts(email, username, platform)")
        .order("last_message_at", { ascending: false }).limit(60);
      return (data || []).filter((t: any) => {
        const pa = t.platform_accounts?.platform;
        const mc = (t.metadata || ({} as any)).channel;
        return pa === "instagram" || mc === "instagram" || mc === "ig";
      });
    },
    refetchInterval: 30000,
  });

  const { data: targets = [] } = useQuery({
    queryKey: ["ig-targets", acctFilter],
    queryFn: async () => {
      const { data } = await supabase.from("social_outreach_targets")
        .select("*").eq("platform", "instagram")
        .order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const { data: dmScripts = [] } = useQuery({
    queryKey: ["dm-scripts"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_outreach_scripts")
        .select("*").eq("channel", "dm").order("brand_key").limit(60);
      return data || [];
    },
  });

  const { data: touchpoints = [] } = useQuery({
    queryKey: ["ig-touches"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_touchpoints")
        .select("*").in("channel", ["dm", "comment", "ig"])
        .order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const statusCounts = {
    ready: targets.filter((t: any) => t.status === "ready").length,
    sent: targets.filter((t: any) => t.status === "sent").length,
    replied: targets.filter((t: any) => t.status === "replied").length,
    total: targets.length,
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Instagram DMs</h1>
        <span className="rounded-md bg-status-pink/10 px-2.5 py-1 text-xs font-bold text-status-pink">
          {accounts.length} accounts · {targets.length} targets
        </span>
      </div>

      {/* Account filters */}
      <div className="flex gap-1 overflow-x-auto">
        <button onClick={() => setAcctFilter("all")}
          className={cn("shrink-0 rounded-md px-3 py-1 text-[10px] font-semibold transition-all",
            acctFilter === "all" ? "bg-status-pink/10 text-status-pink border border-status-pink/20" : "text-muted-foreground hover:bg-muted")}>
          ALL
        </button>
        {accounts.map((a: any) => (
          <button key={a.id} onClick={() => setAcctFilter(a.id)}
            className={cn("shrink-0 rounded-md px-3 py-1 text-[10px] font-semibold transition-all whitespace-nowrap",
              acctFilter === a.id ? "bg-status-pink/10 text-status-pink border border-status-pink/20" : "text-muted-foreground hover:bg-muted")}>
            @{a.username || (a.email || "").split("@")[0]}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Ready to Send", value: statusCounts.ready, color: "text-status-warning" },
          { label: "Sent", value: statusCounts.sent, color: "text-status-info" },
          { label: "Replied", value: statusCounts.replied, color: "text-status-success" },
          { label: "DM Touches", value: touchpoints.length, color: "text-status-pink" },
        ].map((s, i) => (
          <div key={i} className="rounded-lg border border-border/50 bg-card p-2.5 text-center">
            <div className={cn("font-mono text-lg font-bold", s.color)}>{s.value}</div>
            <div className="text-[9px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="inbox" className="space-y-3">
        <TabsList>
          <TabsTrigger value="inbox">DM Inbox ({threads.length})</TabsTrigger>
          <TabsTrigger value="targets">Targets ({targets.length})</TabsTrigger>
          <TabsTrigger value="scripts">Scripts ({dmScripts.length})</TabsTrigger>
          <TabsTrigger value="touches">Touch Log ({touchpoints.length})</TabsTrigger>
        </TabsList>

        {/* DM Inbox */}
        <TabsContent value="inbox">
          {threads.length === 0 ? (
            <div className="rounded-lg border border-border/50 bg-card p-16 text-center">
              <Instagram className="mx-auto h-10 w-10 text-status-pink/20" />
              <p className="mt-4 text-sm text-muted-foreground/50">No IG DM threads yet</p>
              <p className="mt-1 text-[10px] text-muted-foreground/30">Connect IG OAuth in n8n to start polling DMs</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
              {threads.map((t: any) => (
                <div key={t.id} className="border-b border-border/20 px-4 py-3 hover:bg-secondary/50 last:border-0">
                  <div className="text-xs font-semibold text-foreground">{t.subject}</div>
                  <div className="flex gap-1.5 mt-1">
                    <StatusBadge variant="default">{(t.metadata || ({} as any)).brand_key || "—"}</StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Targets */}
        <TabsContent value="targets">
          <div className="flex gap-4">
            <div className={cn("rounded-lg border border-border/50 bg-card overflow-hidden", selectedTarget ? "flex-1" : "w-full")}>
              <table className="w-full text-sm">
                <thead><tr className="bg-background">
                  {["Handle", "Brand", "City", "Tags", "Status"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {targets.slice(0, 50).map((t: any) => (
                    <tr key={t.id} onClick={() => setSelectedTarget(t)}
                      className={cn("border-b border-border/20 hover:bg-secondary/50 cursor-pointer transition-colors",
                        selectedTarget?.id === t.id && "bg-primary/5")}>
                      <td className="px-3 py-2 font-semibold text-status-pink">{t.handle}</td>
                      <td className="px-3 py-2"><StatusBadge variant="default">{t.brand_key}</StatusBadge></td>
                      <td className="px-3 py-2 text-muted-foreground">{t.city || "—"}</td>
                      <td className="px-3 py-2">{(t.tags || []).slice(0, 2).map((tag: string, j: number) => <StatusBadge key={j} variant="default">{tag}</StatusBadge>)}</td>
                      <td className="px-3 py-2"><StatusBadge variant={t.status === "ready" ? "warning" : t.status === "sent" ? "info" : t.status === "replied" ? "success" : "default"}>{t.status || "—"}</StatusBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedTarget && (
              <div className="w-[320px] rounded-lg border border-border/50 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-status-pink font-bold">@{selectedTarget.handle}</span>
                  <button onClick={() => setSelectedTarget(null)} className="text-muted-foreground hover:text-foreground text-xs">×</button>
                </div>
                <div className="space-y-1 text-xs">
                  <div><span className="text-muted-foreground">Brand:</span> <span className="text-foreground">{selectedTarget.brand_key}</span></div>
                  <div><span className="text-muted-foreground">City:</span> <span className="text-foreground">{selectedTarget.city || "—"}</span></div>
                  <div><span className="text-muted-foreground">Followers:</span> <span className="text-foreground">{selectedTarget.followers || "—"}</span></div>
                  <div><span className="text-muted-foreground">Engagement:</span> <span className="text-foreground">{selectedTarget.engagement_rate || "—"}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> <StatusBadge variant={selectedTarget.status === "ready" ? "warning" : "default"}>{selectedTarget.status}</StatusBadge></div>
                  <div><span className="text-muted-foreground">Tags:</span> {(selectedTarget.tags || []).map((t: string, i: number) => <StatusBadge key={i} variant="default">{t}</StatusBadge>)}</div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Scripts */}
        <TabsContent value="scripts">
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-background">
                {["Brand", "Hook", "DM Body", "CTA"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {dmScripts.map((s: any, i: number) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-secondary/50">
                    <td className="px-3 py-2"><StatusBadge variant="default">{s.brand_key}</StatusBadge></td>
                    <td className="px-3 py-2 text-xs font-semibold text-foreground">{s.hook || "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[350px]"><div className="line-clamp-2">{s.body}</div></td>
                    <td className="px-3 py-2 text-xs text-primary">{s.cta || "—"}</td>
                  </tr>
                ))}
                {dmScripts.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-xs text-muted-foreground/40">No DM scripts loaded</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Touch Log */}
        <TabsContent value="touches">
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-background">
                {["Brand", "Channel", "Outcome", "Preview", "Time"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {touchpoints.map((t: any, i: number) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-secondary/50">
                    <td className="px-3 py-2"><StatusBadge variant="default">{t.brand_key}</StatusBadge></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{t.channel}</td>
                    <td className="px-3 py-2"><StatusBadge variant={t.outcome === "replied" ? "success" : t.outcome === "sent" ? "info" : t.outcome === "dnc" ? "error" : "default"}>{t.outcome || "—"}</StatusBadge></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[250px] truncate">{t.message_preview || "—"}</td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground/40">{t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
                {touchpoints.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-xs text-muted-foreground/40">No DM touches recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IGInbox;
