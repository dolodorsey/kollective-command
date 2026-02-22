import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Users, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const PhoneInbox = () => {
  const [acctFilter, setAcctFilter] = useState("all");

  const { data: accounts = [] } = useQuery({
    queryKey: ["ghl-accounts"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_accounts")
        .select("id, email, username, platform, metadata")
        .eq("platform", "ghl").order("username");
      return data || [];
    },
  });

  const { data: threads = [] } = useQuery({
    queryKey: ["phone-threads"],
    queryFn: async () => {
      const { data } = await supabase.from("threads")
        .select("*, platform_accounts(email, username, platform)")
        .order("last_message_at", { ascending: false }).limit(60);
      return (data || []).filter((t: any) => {
        const pa = t.platform_accounts?.platform;
        const mc = (t.metadata || ({} as any)).channel;
        return pa === "ghl" || mc === "sms" || mc === "phone" || mc === "call";
      });
    },
    refetchInterval: 30000,
  });

  const { data: smsScripts = [] } = useQuery({
    queryKey: ["sms-scripts"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_outreach_scripts")
        .select("*").in("channel", ["sms", "phone", "call"]).order("brand_key").limit(50);
      return data || [];
    },
  });

  const { data: smsTouches = [] } = useQuery({
    queryKey: ["sms-touches"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_touchpoints")
        .select("*").in("channel", ["sms", "phone", "call"])
        .order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: contactsWithPhone = 0 } = useQuery({
    queryKey: ["contacts-with-phone"],
    queryFn: async () => {
      const { count } = await supabase.from("contacts_master")
        .select("*", { count: "exact", head: true }).neq("phone", "");
      return count || 0;
    },
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Phone / SMS</h1>
        <span className="rounded-md bg-status-success/10 px-2.5 py-1 text-xs font-bold text-status-success">
          {accounts.length} GHL accounts
        </span>
      </div>

      {/* Account filters */}
      <div className="flex gap-1 overflow-x-auto">
        <button onClick={() => setAcctFilter("all")}
          className={cn("shrink-0 rounded-md px-3 py-1 text-[10px] font-semibold transition-all",
            acctFilter === "all" ? "bg-status-success/10 text-status-success border border-status-success/20" : "text-muted-foreground hover:bg-muted")}>
          ALL ({accounts.length})
        </button>
        {accounts.map((a: any) => (
          <button key={a.id} onClick={() => setAcctFilter(a.id)}
            className={cn("shrink-0 rounded-md px-3 py-1 text-[10px] font-semibold transition-all whitespace-nowrap",
              acctFilter === a.id ? "bg-status-success/10 text-status-success border border-status-success/20" : "text-muted-foreground hover:bg-muted")}>
            {(a.metadata || ({} as any)).name || a.username || (a.email || "").split("@")[0]}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "GHL Accounts", value: accounts.length, color: "text-status-success" },
          { label: "Contacts w/ Phone", value: contactsWithPhone, color: "text-status-info" },
          { label: "SMS Touches", value: smsTouches.length, color: "text-status-warning" },
          { label: "SMS Scripts", value: smsScripts.length, color: "text-status-purple" },
        ].map((s, i) => (
          <div key={i} className="rounded-lg border border-border/50 bg-card p-2.5 text-center">
            <div className={cn("font-mono text-lg font-bold", s.color)}>{s.value}</div>
            <div className="text-[9px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="inbox" className="space-y-3">
        <TabsList>
          <TabsTrigger value="inbox">SMS Inbox ({threads.length})</TabsTrigger>
          <TabsTrigger value="accounts">GHL Accounts ({accounts.length})</TabsTrigger>
          <TabsTrigger value="scripts">SMS Scripts ({smsScripts.length})</TabsTrigger>
          <TabsTrigger value="touches">Touch Log ({smsTouches.length})</TabsTrigger>
        </TabsList>

        {/* SMS Inbox */}
        <TabsContent value="inbox">
          {threads.length === 0 ? (
            <div className="rounded-lg border border-border/50 bg-card p-16 text-center">
              <Phone className="mx-auto h-10 w-10 text-status-success/20" />
              <p className="mt-4 text-sm text-muted-foreground/50">No SMS/phone threads yet</p>
              <p className="mt-1 text-[10px] text-muted-foreground/30">{accounts.length} GHL sub-accounts connected — waiting for webhook activation</p>
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

        {/* GHL Accounts */}
        <TabsContent value="accounts">
          <div className="grid grid-cols-3 gap-3">
            {accounts.map((a: any) => {
              const meta = a.metadata || ({} as any);
              return (
                <div key={a.id} className="rounded-lg border border-border/50 bg-card p-3 border-l-2 border-l-status-success">
                  <div className="text-xs font-bold text-foreground">{meta.name || a.email}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{a.email}</div>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    <StatusBadge variant={a.is_active ? "success" : "error"}>{a.is_active ? "ACTIVE" : "OFF"}</StatusBadge>
                    {meta.type && <StatusBadge variant="default">{meta.type}</StatusBadge>}
                    {(meta.channels || []).map((ch: string, i: number) => (
                      <StatusBadge key={i} variant="default">{ch}</StatusBadge>
                    ))}
                  </div>
                  {meta.brands && <div className="text-[9px] text-muted-foreground/40 mt-1">{(meta.brands || []).join(", ")}</div>}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* SMS Scripts */}
        <TabsContent value="scripts">
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-background">
                {["Brand", "Channel", "Hook", "Body", "CTA"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {smsScripts.map((s: any, i: number) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-secondary/50">
                    <td className="px-3 py-2"><StatusBadge variant="default">{s.brand_key}</StatusBadge></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{s.channel}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-foreground">{s.hook || "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[300px]"><div className="line-clamp-2">{s.body}</div></td>
                    <td className="px-3 py-2 text-xs text-primary">{s.cta || "—"}</td>
                  </tr>
                ))}
                {smsScripts.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-xs text-muted-foreground/40">No SMS scripts loaded — add via spreadsheet or n8n</td></tr>
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
                {smsTouches.map((t: any, i: number) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-secondary/50">
                    <td className="px-3 py-2"><StatusBadge variant="default">{t.brand_key}</StatusBadge></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{t.channel}</td>
                    <td className="px-3 py-2"><StatusBadge variant={t.outcome === "replied" ? "success" : t.outcome === "sent" ? "info" : "default"}>{t.outcome || "—"}</StatusBadge></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[250px] truncate">{t.message_preview || "—"}</td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground/40">{t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
                {smsTouches.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-xs text-muted-foreground/40">No SMS touches recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PhoneInbox;
