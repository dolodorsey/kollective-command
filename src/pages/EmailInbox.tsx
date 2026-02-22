import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Mail, Send, Plus, RefreshCw, Eye } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const EmailInbox = () => {
  const [selected, setSelected] = useState<any>(null);
  const [acctFilter, setAcctFilter] = useState("all");
  const [view, setView] = useState<"inbox" | "outbox" | "scripts">("inbox");
  const [composing, setComposing] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ["gmail-accounts"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_accounts")
        .select("id, email, username, platform, metadata")
        .eq("platform", "gmail").order("email");
      return data || [];
    },
  });

  const { data: threads = [] } = useQuery({
    queryKey: ["email-threads", acctFilter],
    queryFn: async () => {
      const { data } = await supabase.from("threads")
        .select("*, platform_accounts(email, username, platform)")
        .order("last_message_at", { ascending: false }).limit(60);
      let filtered = (data || []).filter((t: any) => {
        const pa = t.platform_accounts?.platform;
        const mc = t.metadata?.channel;
        return pa === "gmail" || mc === "email" || (!pa && !mc);
      });
      if (acctFilter !== "all") filtered = filtered.filter((t: any) => t.platform_account_id === acctFilter);
      return filtered;
    },
    refetchInterval: 30000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["email-messages", selected?.id],
    queryFn: async () => {
      if (!selected) return [];
      const { data } = await supabase.from("messages")
        .select("*").eq("thread_id", selected.id).order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!selected,
  });

  const { data: outbound = [] } = useQuery({
    queryKey: ["email-outbound"],
    queryFn: async () => {
      const { data } = await supabase.from("communications")
        .select("*").eq("channel", "email").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: scripts = [] } = useQuery({
    queryKey: ["email-scripts"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_outreach_scripts")
        .select("*").eq("channel", "email").order("brand_key").limit(50);
      return data || [];
    },
  });

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Email Inbox</h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(["inbox", "outbox", "scripts"] as const).map(v => (
              <button key={v} onClick={() => { setView(v); setSelected(null); }}
                className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition-all uppercase tracking-wider",
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                {v} ({v === "inbox" ? threads.length : v === "outbox" ? outbound.length : scripts.length})
              </button>
            ))}
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setComposing(!composing)}>
            <Plus className="h-3.5 w-3.5" />Compose
          </Button>
        </div>
      </div>

      {/* Account filters */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        <button onClick={() => setAcctFilter("all")}
          className={cn("shrink-0 rounded-md px-3 py-1 text-[10px] font-semibold transition-all",
            acctFilter === "all" ? "bg-status-error/10 text-status-error border border-status-error/20" : "text-muted-foreground hover:bg-muted")}>
          ALL ({accounts.length})
        </button>
        {accounts.map((a: any) => (
          <button key={a.id} onClick={() => setAcctFilter(a.id)}
            className={cn("shrink-0 rounded-md px-3 py-1 text-[10px] font-semibold transition-all whitespace-nowrap",
              acctFilter === a.id ? "bg-status-error/10 text-status-error border border-status-error/20" : "text-muted-foreground hover:bg-muted")}>
            {(a.email || "").split("@")[0]}
          </button>
        ))}
      </div>

      {/* Compose */}
      {composing && (
        <div className="rounded-lg border border-primary/20 bg-card p-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="To..." className="rounded-md border border-border/50 bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40" />
            <input placeholder="Subject..." className="rounded-md border border-border/50 bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40" />
          </div>
          <textarea rows={4} placeholder="Write your email..." className="w-full rounded-md border border-border/50 bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40 resize-y" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setComposing(false)}>Cancel</Button>
            <Button size="sm" className="gap-1.5"><Send className="h-3 w-3" />Send</Button>
          </div>
        </div>
      )}

      {/* Scripts view */}
      {view === "scripts" ? (
        <div className="flex-1 overflow-auto rounded-lg border border-border/50 bg-card">
          <table className="w-full text-sm">
            <thead><tr className="bg-background">
              {["Brand", "Hook", "Body", "CTA"].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {scripts.map((s: any, i: number) => (
                <tr key={i} className="border-b border-border/20 hover:bg-secondary/50">
                  <td className="px-3 py-2"><StatusBadge variant="default">{s.brand_key}</StatusBadge></td>
                  <td className="px-3 py-2 text-xs text-foreground font-semibold">{s.hook || "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-[300px]"><div className="line-clamp-2">{s.body}</div></td>
                  <td className="px-3 py-2 text-xs text-primary">{s.cta || "—"}</td>
                </tr>
              ))}
              {scripts.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-xs text-muted-foreground/40">No email scripts found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Split pane: inbox or outbox */
        <div className="flex flex-1 overflow-hidden rounded-lg border border-border/50 bg-card">
          <div className="flex w-[38%] flex-col border-r border-border/50">
            <div className="border-b border-border/50 px-4 py-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {view === "inbox" ? `${threads.length} threads` : `${outbound.length} messages`}
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              {view === "inbox" ? (
                threads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Mail className="h-8 w-8 text-muted-foreground/20" />
                    <p className="mt-3 text-xs text-muted-foreground/40">No email threads</p>
                  </div>
                ) : threads.map((t: any) => (
                  <button key={t.id} onClick={() => setSelected(t)}
                    className={cn("w-full border-b border-border/20 px-4 py-3 text-left transition-all",
                      selected?.id === t.id ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-secondary border-l-2 border-l-transparent")}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground truncate max-w-[75%]">{t.subject}</span>
                      <span className="text-[9px] text-muted-foreground/40 shrink-0 ml-2">
                        {t.last_message_at ? format(new Date(t.last_message_at), "h:mm a") : ""}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <StatusBadge variant="default">{t.metadata?.brand_key || "general"}</StatusBadge>
                      {t.metadata?.priority === "vip" && <StatusBadge variant="warning">VIP</StatusBadge>}
                      {t.metadata?.priority === "high" && <StatusBadge variant="info">HIGH</StatusBadge>}
                    </div>
                  </button>
                ))
              ) : (
                outbound.map((o: any, i: number) => (
                  <button key={i} onClick={() => setSelected(o)}
                    className={cn("w-full border-b border-border/20 px-4 py-3 text-left transition-all hover:bg-secondary",
                      selected?.id === o.id ? "bg-primary/5 border-l-2 border-l-primary" : "border-l-2 border-l-transparent")}>
                    <div className="text-xs font-semibold text-foreground">{o.recipient_identifier || o.recipient || "—"}</div>
                    <div className="text-[10px] text-muted-foreground/50 mt-0.5 truncate">{o.subject || "—"}</div>
                    <div className="flex gap-1.5 mt-1">
                      <StatusBadge variant={o.direction === "outbound" ? "info" : "success"}>{o.direction}</StatusBadge>
                      {o.created_at && <span className="text-[9px] text-muted-foreground/30">{format(new Date(o.created_at), "MMM d, h:mm a")}</span>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Detail */}
          <div className="flex flex-1 flex-col">
            {selected ? (
              <>
                <div className="border-b border-border/50 bg-background px-5 py-3.5">
                  <h3 className="text-sm font-bold text-foreground">{selected.subject || "Message"}</h3>
                  <p className="mt-1 text-[10px] text-muted-foreground/50">
                    {view === "inbox"
                      ? `${selected.metadata?.brand_key || ""} · ${selected.platform_accounts?.email || "—"}`
                      : `To: ${selected.recipient_identifier || selected.recipient || "—"} · From: ${selected.sender_identifier || selected.sender || "—"}`}
                  </p>
                </div>
                <div className="flex-1 overflow-auto p-5 space-y-3">
                  {view === "inbox" ? (
                    messages.length === 0 ? (
                      <p className="text-xs text-muted-foreground/40 text-center py-8">Loading messages...</p>
                    ) : messages.map((m: any, i: number) => (
                      <div key={i} className={cn("flex flex-col", m.direction === "outbound" ? "items-end" : "items-start")}>
                        <div className={cn("max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed",
                          m.direction === "outbound"
                            ? "rounded-br-sm border border-primary/20 bg-primary/10"
                            : "rounded-bl-sm border border-border/50 bg-secondary")}>
                          <div className="flex items-center justify-between mb-1.5 gap-4">
                            <span className={cn("text-[10px] font-semibold", m.direction === "outbound" ? "text-primary" : "text-foreground")}>
                              {m.sender?.split("<")[0]?.trim() || "Unknown"}
                            </span>
                            <span className="text-[8px] text-muted-foreground/30">
                              {m.created_at ? format(new Date(m.created_at), "MMM d, h:mm a") : ""}
                            </span>
                          </div>
                          <div className="whitespace-pre-wrap text-foreground/90">{m.body}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-lg bg-secondary p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Full Message</p>
                        <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                          {selected.body || selected.message_text || "No message body"}
                        </div>
                      </div>
                      {selected.metadata && (
                        <div className="rounded-lg bg-secondary p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Metadata</p>
                          <pre className="text-[10px] text-muted-foreground font-mono">{JSON.stringify(selected.metadata, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {view === "inbox" && (
                  <div className="border-t border-border/50 p-3.5 flex gap-2">
                    <input placeholder="Reply..." className="flex-1 rounded-md border border-border/50 bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40" />
                    <Button size="sm">Send</Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2">
                <Mail className="h-8 w-8 text-muted-foreground/15" />
                <p className="text-xs text-muted-foreground/30">Select a {view === "inbox" ? "thread" : "message"} to view</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailInbox;
