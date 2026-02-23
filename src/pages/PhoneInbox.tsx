import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, RefreshCw, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PhoneInbox = () => {
  const [liveSMS, setLiveSMS] = useState<any[]>([]);
  const [fetchingLive, setFetchingLive] = useState(false);

  const { data: ghlAccounts = [] } = useQuery({
    queryKey: ["ghl-accounts"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_accounts").select("*").eq("platform", "ghl").order("email");
      return data || [];
    },
  });

  const { data: scripts = [] } = useQuery({
    queryKey: ["sms-scripts"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_outreach_scripts").select("*").in("channel", ["sms", "phone", "call"]).order("brand_key");
      return data || [];
    },
  });

  const { data: touches = [] } = useQuery({
    queryKey: ["sms-touches"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_touchpoints").select("*").in("channel", ["sms", "phone", "call"]).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const fetchLiveSMS = async () => {
    setFetchingLive(true);
    try {
      const res = await fetch("https://drdorsey.app.n8n.cloud/webhook/exec-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_type: "ghl_fetch_sms", limit: 20, source: "mcp-phone-inbox" }),
      });
      if (res.ok) {
        const data = await res.json();
        const sms = data.messages || data.sms || (Array.isArray(data) ? data : []);
        setLiveSMS(sms);
        toast.success("Fetched " + sms.length + " messages");
      } else { toast.error("SMS fetch failed"); }
    } catch { toast.error("Could not reach GHL workflow"); }
    setFetchingLive(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Phone / SMS</h1>
        <Button size="sm" className="gap-1.5" onClick={fetchLiveSMS} disabled={fetchingLive}>
          {fetchingLive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {fetchingLive ? "Fetching..." : "Pull Live SMS"}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border/50 bg-card p-2.5 text-center">
          <div className="font-mono text-lg font-bold text-blue-600">{ghlAccounts.length}</div>
          <div className="text-[9px] text-muted-foreground">GHL Accounts</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-2.5 text-center">
          <div className="font-mono text-lg font-bold text-green-600">{scripts.length}</div>
          <div className="text-[9px] text-muted-foreground">SMS Scripts</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-2.5 text-center">
          <div className="font-mono text-lg font-bold text-purple-600">{touches.length}</div>
          <div className="text-[9px] text-muted-foreground">SMS Touches</div>
        </div>
      </div>

      <Tabs defaultValue="sms" className="space-y-3">
        <TabsList>
          <TabsTrigger value="sms">SMS Inbox ({liveSMS.length})</TabsTrigger>
          <TabsTrigger value="accounts">GHL Accounts ({ghlAccounts.length})</TabsTrigger>
          <TabsTrigger value="scripts">SMS Scripts ({scripts.length})</TabsTrigger>
          <TabsTrigger value="touches">Touch Log ({touches.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="sms">
          {liveSMS.length === 0 ? (
            <div className="rounded-lg border border-border/50 bg-card p-12 text-center">
              <Phone className="mx-auto h-8 w-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Click "Pull Live SMS" to fetch from GoHighLevel</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {liveSMS.map((s: any, i: number) => (
                <div key={i} className="rounded-lg border border-border/50 bg-card p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{s.from || s.phone || "Unknown"}</span>
                    <span className="text-[9px] text-muted-foreground">{s.timestamp || s.date || ""}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{s.text || s.body || s.message || ""}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accounts">
          <div className="grid grid-cols-4 gap-2">
            {ghlAccounts.map((a: any) => {
              const meta = a.metadata || {};
              return (
                <div key={a.id} className="rounded-lg border border-border/50 bg-card p-3 border-l-2 border-l-green-400">
                  <div className="text-xs font-semibold text-foreground truncate">{a.email}</div>
                  <StatusBadge variant={a.is_active ? "success" : "error"}>{a.is_active ? "ACTIVE" : "OFF"}</StatusBadge>
                  {meta.type && <p className="text-[9px] text-muted-foreground mt-1">Type: {meta.type}</p>}
                  {meta.brands && <p className="text-[9px] text-muted-foreground">Brands: {Array.isArray(meta.brands) ? meta.brands.join(", ") : meta.brands}</p>}
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="scripts">
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/30">
                {["Brand", "Channel", "Hook", "Body"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {scripts.map((s: any, i: number) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-3 py-2"><StatusBadge variant="default">{s.brand_key}</StatusBadge></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{s.channel}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-foreground">{s.hook || "\u2014"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[300px]"><div className="line-clamp-2">{s.body}</div></td>
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
            {touches.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground/40">No SMS touches</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PhoneInbox;
