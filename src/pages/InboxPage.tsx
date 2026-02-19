import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DIVISIONS } from "@/lib/constants";
import { sendCommand } from "@/lib/commands";
import { StatusBadge } from "@/components/StatusBadge";
import { Inbox, Mail, MessageSquare, Send, RefreshCw, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ALL_BRANDS = DIVISIONS.flatMap(d => d.brands.map(b => ({ name: b, division: d.name, key: b.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") })));

function ComposeDialog() {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [brand, setBrand] = useState("");
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();
  const inputClass = "w-full rounded-md border border-border/50 bg-input px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary/40";
  const labelClass = "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1 block";

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      await supabase.from("outbox").insert({
        recipient: to.trim(), subject: subject.trim(), message: body.trim(),
        brand_key: brand || null, status: "queued", channel: "email",
      });
      await sendCommand("email.send", { to: to.trim(), subject: subject.trim(), body: body.trim(), brand_key: brand });
      toast.success(`Email queued to ${to.trim()}`);
      setTo(""); setSubject(""); setBody(""); setBrand("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["outbox"] });
    } catch { toast.error("Failed to queue email"); }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Compose</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Compose Email</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <div><label className={labelClass}>To *</label><input value={to} onChange={e => setTo(e.target.value)} placeholder="email@example.com" className={inputClass} /></div>
          <div><label className={labelClass}>Subject *</label><input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject line" className={inputClass} /></div>
          <div><label className={labelClass}>Brand</label>
            <select value={brand} onChange={e => setBrand(e.target.value)} className={inputClass}>
              <option value="">No brand (personal)</option>
              {ALL_BRANDS.map(b => <option key={b.key} value={b.key}>{b.name} ({b.division})</option>)}
            </select>
          </div>
          <div><label className={labelClass}>Body *</label><textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Message content..." className={inputClass} rows={6} /></div>
          <Button onClick={handleSend} disabled={!to.trim() || !subject.trim() || !body.trim() || sending} className="w-full">
            {sending ? "Sending..." : "Queue & Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const InboxPage = () => {
  const [tab, setTab] = useState<"outbox" | "messages">("outbox");

  const { data: outbox = [] } = useQuery({
    queryKey: ["outbox"],
    queryFn: async () => {
      const { data } = await supabase.from("outbox").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    refetchInterval: 15000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages-raw"],
    queryFn: async () => {
      const { data } = await supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    refetchInterval: 15000,
  });

  const { data: sendLog = [] } = useQuery({
    queryKey: ["send-log"],
    queryFn: async () => {
      const { data } = await supabase.from("send_log").select("*").order("created_at", { ascending: false }).limit(30);
      return data || [];
    },
  });

  const tabs = [
    { key: "outbox", label: "Outbox", count: outbox.length, icon: Send },
    { key: "messages", label: "Messages", count: messages.length, icon: MessageSquare },
  ] as const;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
        <div className="flex items-center gap-2">
          <ComposeDialog />
          <Button size="sm" variant="outline" className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" />Refresh</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Outbox</span>
            <Send className="h-4 w-4 text-primary/60" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-foreground">{outbox.length}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Messages</span>
            <MessageSquare className="h-4 w-4 text-primary/60" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-foreground">{messages.length}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sent Today</span>
            <Mail className="h-4 w-4 text-primary/60" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-foreground">{sendLog.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/50 pb-px">
        {tabs.map(t => {
          const TIcon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("flex items-center gap-2 rounded-t-md px-4 py-2 text-xs font-semibold transition-all",
                tab === t.key ? "border border-b-0 border-border/50 bg-card text-foreground" : "text-muted-foreground/50"
              )}>
              <TIcon className="h-3.5 w-3.5" />{t.label}
              <span className="text-[10px] text-muted-foreground">({t.count})</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="space-y-2">
        {tab === "outbox" && outbox.map((item: any) => (
          <div key={item.id} className="rounded-lg border border-border/50 bg-card p-4 transition-colors hover:border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.recipient || item.to || "—"}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.subject || item.message?.substring(0, 100) || "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge variant={item.status === "sent" ? "success" : item.status === "failed" ? "error" : "warning"}>
                  {item.status || "queued"}
                </StatusBadge>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {item.created_at ? format(new Date(item.created_at), "MMM d HH:mm") : "—"}
                </span>
              </div>
            </div>
          </div>
        ))}
        {tab === "messages" && messages.map((item: any) => (
          <div key={item.id} className="rounded-lg border border-border/50 bg-card p-4 transition-colors hover:border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.sender || item.from || "—"}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.content?.substring(0, 150) || item.body?.substring(0, 150) || "—"}</p>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                {item.created_at ? format(new Date(item.created_at), "MMM d HH:mm") : "—"}
              </span>
            </div>
          </div>
        ))}
        {((tab === "outbox" && outbox.length === 0) || (tab === "messages" && messages.length === 0)) && (
          <div className="rounded-lg border border-border/50 bg-card p-12 text-center">
            <Inbox className="mx-auto h-8 w-8 text-muted-foreground/20" />
            <p className="mt-3 text-sm text-muted-foreground/40">No {tab === "outbox" ? "outbound messages" : "messages"} yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxPage;
