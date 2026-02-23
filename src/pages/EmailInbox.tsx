import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Mail, Send, RefreshCw, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const GMAIL_ACCOUNTS = [
  "dolodorsey@gmail.com", "drdorseyassistant@gmail.com", "foreverfutbolmuseum@gmail.com",
  "justhuglife.forever@gmail.com", "thecaspergroupworldwide@gmail.com",
  "thekollectivehospitality@gmail.com", "theumbrellagroupworldwide@gmail.com",
];

const EmailInbox = () => {
  const [accountFilter, setAccountFilter] = useState("all");
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [liveEmails, setLiveEmails] = useState<any[]>([]);
  const [fetchingLive, setFetchingLive] = useState(false);

  // DB threads
  const { data: threads = [] } = useQuery({
    queryKey: ["email-threads"],
    queryFn: async () => {
      const { data } = await supabase.from("threads").select("*").order("last_message_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  // DB messages for selected thread
  const { data: messages = [] } = useQuery({
    queryKey: ["thread-messages", selectedThread?.id],
    queryFn: async () => {
      if (!selectedThread) return [];
      const { data } = await supabase.from("messages").select("*").eq("thread_id", selectedThread.id).order("sent_at", { ascending: true });
      return data || [];
    },
    enabled: !!selectedThread,
  });

  // Communications (outbox)
  const { data: comms = [] } = useQuery({
    queryKey: ["email-comms"],
    queryFn: async () => {
      const { data } = await supabase.from("communications").select("*").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  // Scripts
  const { data: scripts = [] } = useQuery({
    queryKey: ["email-scripts"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_outreach_scripts").select("*").eq("channel", "email").order("brand_key");
      return data || [];
    },
  });

  // Fetch live emails from n8n Gmail workflow
  const fetchLiveEmails = async () => {
    setFetchingLive(true);
    try {
      const res = await fetch("https://drdorsey.app.n8n.cloud/webhook/exec-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_type: "gmail_fetch", account: accountFilter === "all" ? "dolodorsey@gmail.com" : accountFilter, limit: 20, source: "mcp-inbox" }),
      });
      if (res.ok) {
        const data = await res.json();
        const emails = data.emails || data.messages || data.results || (Array.isArray(data) ? data : []);
        setLiveEmails(emails);
        toast.success(`Fetched ${emails.length} live emails`);
      } else { toast.error("Gmail fetch failed: " + res.status); }
    } catch (e) { toast.error("Could not reach Gmail workflow"); }
    setFetchingLive(false);
  };

  const filteredComms = accountFilter === "all" ? comms : comms.filter((c: any) =>
    (c.sender_identifier || "").includes(accountFilter) || (c.recipient_identifier || "").includes(accountFilter)
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Email</h1>
        <Button size="sm" className="gap-1.5" onClick={fetchLiveEmails} disabled={fetchingLive}>
          {fetchingLive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {fetchingLive ? "Fetching..." : "Pull Live Emails"}
        </Button>
      </div>

      {/* Account filter */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        <button onClick={() => setAccountFilter("all")} className={cn("shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold", accountFilter === "all" ? "bg-red-100 text-red-700" : "text-muted-foreground hover:bg-muted")}>ALL</button>
        {GMAIL_ACCOUNTS.map(a => (
          <button key={a} onClick={() => setAccountFilter(a)} className={cn("shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap", accountFilter === a ? "bg-red-100 text-red-700" : "text-muted-foreground hover:bg-muted")}>{a.split("@")[0]}</button>
        ))}
      </div>

      <Tabs defaultValue="inbox" className="space-y-3">
        <TabsList>
          <TabsTrigger value="new" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-800">New</TabsTrigger>\n            <TabsTrigger value="inbox">Inbox ({threads.length})</TabsTrigger>
          <TabsTrigger value="live">Live ({liveEmails.length})</TabsTrigger>
          <TabsTrigger value="outbox">Outbox ({filteredComms.length})</TabsTrigger>
          <TabsTrigger value="scripts">Scripts ({scripts.length})</TabsTrigger>
        </TabsList>

        {/* INBOX — DB threads */}
        <TabsContent value="inbox">
          <div className="flex gap-4" style={{ minHeight: "50vh" }}>
            <div className={cn("space-y-1 overflow-auto", selectedThread ? "w-2/5" : "w-full")}>
              {threads.map((t: any) => (
                <button key={t.id} onClick={() => setSelectedThread(t)} className={cn("w-full rounded-lg border bg-card p-3 text-left hover:border-blue-200 transition-all", selectedThread?.id === t.id ? "border-blue-300 ring-1 ring-blue-100" : "border-border/50")}>
                  <p className="text-xs font-semibold text-foreground truncate">{t.subject || "No subject"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground truncate">{t.participants || ""}</span>
                    <span className="text-[9px] text-muted-foreground/40 ml-auto shrink-0">{t.last_message_at ? format(new Date(t.last_message_at), "MMM d") : ""}</span>
                  </div>
                </button>
              ))}
              {threads.length === 0 && <p className="py-12 text-center text-xs text-muted-foreground/40">No threads in database</p>}
            </div>
            {selectedThread && (
              <div className="flex-1 rounded-lg border border-border/50 bg-card p-4 overflow-auto">
                <h3 className="text-sm font-bold text-foreground mb-3">{selectedThread.subject || "Thread"}</h3>
                <div className="space-y-3">
                  {messages.map((m: any) => (
                    <div key={m.id} className={cn("rounded-lg p-3 max-w-[85%]", m.direction === "outbound" ? "ml-auto bg-blue-50 border border-blue-200" : "bg-muted/50 border border-border/30")}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-muted-foreground">{m.sender || ""}</span>
                        <span className="text-[9px] text-muted-foreground/40">{m.sent_at ? format(new Date(m.sent_at), "h:mm a") : ""}</span>
                      </div>
                      <p className="text-xs text-foreground whitespace-pre-wrap">{m.body || m.content || ""}</p>
                    </div>
                  ))}
                  {messages.length === 0 && <p className="text-xs text-muted-foreground/40 text-center py-4">No messages loaded</p>}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* LIVE — Real-time from n8n */}
        <TabsContent value="live">
          {liveEmails.length === 0 ? (
            <div className="rounded-lg border border-border/50 bg-card p-12 text-center">
              <Mail className="mx-auto h-8 w-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Click "Pull Live Emails" to fetch from Gmail</p>
              <p className="text-[10px] text-muted-foreground/40 mt-1">Uses n8n Gmail Inbox Fetch workflow</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {liveEmails.map((e: any, i: number) => (
                <div key={i} className="rounded-lg border border-border/50 bg-card p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground truncate max-w-[70%]">{e.subject || e.title || "No subject"}</p>
                    <span className="text-[9px] text-muted-foreground">{e.date || e.received_at || ""}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{e.from || e.sender || ""}</p>
                  {e.snippet && <p className="text-[10px] text-muted-foreground/60 mt-1 line-clamp-2">{e.snippet}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* OUTBOX */}
        <TabsContent value="outbox">
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/30">
                {["To", "Subject", "Channel", "Direction", "Time"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredComms.slice(0, 50).map((c: any) => (
                  <tr key={c.id} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-3 py-2 text-xs text-foreground truncate max-w-[200px]">{c.recipient_identifier || "\u2014"}</td>
                    <td className="px-3 py-2 text-xs text-foreground truncate max-w-[200px]">{c.subject || "\u2014"}</td>
                    <td className="px-3 py-2"><StatusBadge variant="default">{c.channel || "email"}</StatusBadge></td>
                    <td className="px-3 py-2"><StatusBadge variant={c.direction === "outbound" ? "info" : "default"}>{c.direction}</StatusBadge></td>
                    <td className="px-3 py-2 text-[9px] text-muted-foreground">{c.created_at ? format(new Date(c.created_at), "MMM d, h:mm a") : "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* SCRIPTS */}
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
      </Tabs>
    </div>
  );
};

export default EmailInbox;
