import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Instagram, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const IGInbox = () => {
  const [acctFilter, setAcctFilter] = useState("all");

  const { data: accounts = [] } = useQuery({
    queryKey: ["ig-accounts"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_accounts")
        .select("id, email, username, platform, metadata")
        .eq("platform", "instagram").order("email");
      return data || [];
    },
  });

  const { data: threads = [] } = useQuery({
    queryKey: ["ig-threads", acctFilter],
    queryFn: async () => {
      const { data } = await supabase.from("threads")
        .select("*, platform_accounts(email, username, platform)")
        .order("last_message_at", { ascending: false }).limit(60);
      let filtered = (data || []).filter((t: any) => {
        const pa = t.platform_accounts?.platform;
        const mc = t.metadata?.channel;
        return pa === "instagram" || mc === "instagram" || mc === "ig";
      });
      if (acctFilter !== "all") filtered = filtered.filter((t: any) => t.platform_account_id === acctFilter);
      return filtered;
    },
    refetchInterval: 30000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["ig-messages", threads[0]?.id],
    queryFn: async () => { return []; },
  });

  const { data: dmTargets = [] } = useQuery({
    queryKey: ["ig-dm-targets"],
    queryFn: async () => {
      const { data } = await supabase.from("social_outreach_targets")
        .select("*").eq("platform", "instagram").order("created_at", { ascending: false }).limit(30);
      return data || [];
    },
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Instagram DMs</h1>
        <span className="rounded-md bg-status-pink/10 px-2.5 py-1 text-xs font-bold text-status-pink">
          {accounts.length} accounts
        </span>
      </div>

      {/* Account filters */}
      <div className="flex gap-1 overflow-x-auto">
        <button onClick={() => setAcctFilter("all")}
          className={cn("shrink-0 rounded-md px-3 py-1 text-[10px] font-semibold transition-all",
            acctFilter === "all" ? "bg-status-pink/10 text-status-pink border border-status-pink/20" : "text-muted-foreground hover:bg-muted")}>
          ALL ({accounts.length})
        </button>
        {accounts.map((a: any) => (
          <button key={a.id} onClick={() => setAcctFilter(a.id)}
            className={cn("shrink-0 rounded-md px-3 py-1 text-[10px] font-semibold transition-all whitespace-nowrap",
              acctFilter === a.id ? "bg-status-pink/10 text-status-pink border border-status-pink/20" : "text-muted-foreground hover:bg-muted")}>
            @{a.username || (a.email || "").split("@")[0]}
          </button>
        ))}
      </div>

      {threads.length === 0 ? (
        <div className="rounded-lg border border-border/50 bg-card p-16 text-center">
          <Instagram className="mx-auto h-10 w-10 text-status-pink/20" />
          <p className="mt-4 text-sm text-muted-foreground/50">Instagram DMs will appear here once IG OAuth is connected in n8n</p>
          <p className="mt-1 text-[10px] text-muted-foreground/30">Connect via Social Inbox workflow to start polling</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 bg-card p-4">
          {threads.map((t: any) => (
            <div key={t.id} className="border-b border-border/20 px-3 py-3 last:border-0">
              <div className="text-xs font-semibold text-foreground">{t.subject}</div>
              <div className="flex gap-1.5 mt-1">
                <StatusBadge variant="default">{t.metadata?.brand_key || "—"}</StatusBadge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DM Targets preview */}
      {dmTargets.length > 0 && (
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">
            DM Outreach Targets ({dmTargets.length})
          </p>
          <div className="grid grid-cols-4 gap-2">
            {dmTargets.slice(0, 12).map((t: any, i: number) => (
              <div key={i} className="rounded-md border border-border/30 bg-secondary p-2">
                <div className="text-[11px] font-semibold text-status-pink">{t.handle}</div>
                <div className="text-[9px] text-muted-foreground">{t.city} · {t.brand_key}</div>
                <StatusBadge variant={t.status === "ready" ? "success" : t.status === "sent" ? "info" : "default"}>{t.status}</StatusBadge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IGInbox;
