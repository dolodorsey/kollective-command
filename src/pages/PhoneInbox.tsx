import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Phone, MessageSquare } from "lucide-react";
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
    queryKey: ["phone-threads", acctFilter],
    queryFn: async () => {
      const { data } = await supabase.from("threads")
        .select("*, platform_accounts(email, username, platform)")
        .order("last_message_at", { ascending: false }).limit(60);
      let filtered = (data || []).filter((t: any) => {
        const pa = t.platform_accounts?.platform;
        const mc = t.metadata?.channel;
        return pa === "ghl" || mc === "sms" || mc === "phone" || mc === "call";
      });
      if (acctFilter !== "all") filtered = filtered.filter((t: any) => t.platform_account_id === acctFilter);
      return filtered;
    },
    refetchInterval: 30000,
  });

  const { data: scheduled = [] } = useQuery({
    queryKey: ["scheduled-sms"],
    queryFn: async () => {
      const { data } = await supabase.from("scheduled_messages")
        .select("*").order("scheduled_at", { ascending: true }).limit(20);
      return data || [];
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
            {a.username || (a.email || "").split("@")[0]}
          </button>
        ))}
      </div>

      {threads.length === 0 ? (
        <div className="rounded-lg border border-border/50 bg-card p-16 text-center">
          <Phone className="mx-auto h-10 w-10 text-status-success/20" />
          <p className="mt-4 text-sm text-muted-foreground/50">Phone/SMS threads will appear here once GHL webhooks are active</p>
          <p className="mt-1 text-[10px] text-muted-foreground/30">{accounts.length} GHL sub-accounts connected · Awaiting webhook activation</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 bg-card">
          {threads.map((t: any) => (
            <div key={t.id} className="border-b border-border/20 px-4 py-3 last:border-0">
              <div className="text-xs font-semibold text-foreground">{t.subject}</div>
              <div className="flex gap-1.5 mt-1">
                <StatusBadge variant="default">{t.metadata?.brand_key || "—"}</StatusBadge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scheduled Messages */}
      {scheduled.length > 0 && (
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">
            Scheduled Messages ({scheduled.length})
          </p>
          {scheduled.map((s: any, i: number) => (
            <div key={i} className="border-b border-border/20 px-2 py-2 last:border-0 flex justify-between items-center">
              <div>
                <div className="text-xs font-semibold text-foreground">{s.recipient || "—"}</div>
                <div className="text-[10px] text-muted-foreground truncate max-w-[300px]">{s.message || "—"}</div>
              </div>
              <StatusBadge variant={s.status === "sent" ? "success" : "warning"}>{s.status || "queued"}</StatusBadge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhoneInbox;
