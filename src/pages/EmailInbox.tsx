import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DIVISIONS, BRAND_EMAILS } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Send, RefreshCw, Loader2, FileText, ChevronLeft, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const EmailInbox = () => {
  const navigate = useNavigate();
  const [accountFilter, setAccountFilter] = useState("all");
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [liveEmails, setLiveEmails] = useState<any[]>([]);
  const [fetchingLive, setFetchingLive] = useState(false);
  const [collapsedDivs, setCollapsedDivs] = useState<Record<string, boolean>>({});

  const { data: threads = [] } = useQuery({
    queryKey: ["email-threads"],
    queryFn: async () => {
      const { data } = await supabase.from("threads").select("*").order("last_message_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["thread-messages", selectedThread?.id],
    queryFn: async () => {
      if (!selectedThread) return [];
      const { data } = await supabase.from("messages").select("*").eq("thread_id", selectedThread.id).order("sent_at", { ascending: true });
      return data || [];
    },
    enabled: !!selectedThread,
  });

  const { data: comms = [] } = useQuery({
    queryKey: ["email-comms"],
    queryFn: async () => {
      const { data } = await supabase.from("communications").select("*").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const { data: scripts = [] } = useQuery({
    queryKey: ["email-scripts"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_outreach_scripts").select("*").eq("channel", "email").order("brand_key");
      return data || [];
    },
  });

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
    } catch { toast.error("Could not reach Gmail workflow"); }
    setFetchingLive(false);
  };

  const toggleDiv = (key: string) => setCollapsedDivs(prev => ({ ...prev, [key]: !prev[key] }));

  // Group email accounts by division
  const emailDivisions = DIVISIONS.map(d => ({
    ...d,
    accounts: Object.entries(BRAND_EMAILS)
      .filter(([, v]) => v.division === d.key && v.email)
      .map(([name, v]) => ({ name, email: v.email })),
  })).filter(d => d.accounts.length > 0);

  const filteredThreads = accountFilter === "all" ? threads : threads.filter((t: any) =>
    (t.account || t.email || "").toLowerCase().includes(accountFilter.toLowerCase())
  );
  const filteredComms = accountFilter === "all" ? comms : comms.filter((c: any) =>
    (c.from_address || c.to_address || c.recipient_identifier || "").toLowerCase().includes(accountFilter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
          <h1 className="text-2xl font-bold tracking-tight">Email Inbox</h1>
        </div>
        <Button size="sm" onClick={fetchLiveEmails} disabled={fetchingLive}>
          {fetchingLive ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Fetch Live
        </Button>
      </div>

      <div className="flex gap-4 h-[calc(100vh-160px)]">
        {/* Left sidebar — brand accounts by division */}
        <div className="w-72 shrink-0 border rounded-lg bg-white overflow-y-auto">
          <div
            className={cn("px-3 py-2 text-xs font-bold cursor-pointer hover:bg-gray-50 border-b",
              accountFilter === "all" && "bg-gray-100"
            )}
            onClick={() => setAccountFilter("all")}
          >
            ALL ACCOUNTS
          </div>
          {emailDivisions.map(d => (
            <div key={d.key}>
              <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 border-b"
                onClick={() => toggleDiv(d.key)}
              >
                <span className="text-[10px] font-bold tracking-wider" style={{ color: d.color }}>{d.icon} {d.name}</span>
                {collapsedDivs[d.key] ? <ChevronRight className="h-3 w-3 text-gray-400" /> : <ChevronDown className="h-3 w-3 text-gray-400" />}
              </div>
              {!collapsedDivs[d.key] && d.accounts.map(a => (
                <div
                  key={a.email}
                  className={cn("px-4 py-1.5 cursor-pointer hover:bg-gray-50 border-b border-gray-100",
                    accountFilter === a.email && "bg-blue-50 border-l-2 border-l-blue-500"
                  )}
                  onClick={() => setAccountFilter(a.email)}
                >
                  <div className="text-xs font-medium truncate">{a.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">{a.email}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="inbox">
            <TabsList>
              <TabsTrigger value="inbox">Inbox ({filteredThreads.length})</TabsTrigger>
              <TabsTrigger value="outbox">Outbox ({filteredComms.length})</TabsTrigger>
              <TabsTrigger value="live">Live ({liveEmails.length})</TabsTrigger>
              <TabsTrigger value="scripts">Scripts ({scripts.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="inbox" className="mt-3">
              {filteredThreads.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">No threads yet. Click "Fetch Live" to pull emails.</p>
              ) : (
                <div className="space-y-1">
                  {filteredThreads.map((t: any) => (
                    <div key={t.id} onClick={() => setSelectedThread(t)}
                      className={cn("p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-all",
                        selectedThread?.id === t.id && "border-blue-300 bg-blue-50"
                      )}>
                      <div className="flex justify-between">
                        <span className="font-medium text-sm truncate">{t.subject || t.snippet || "No subject"}</span>
                        <span className="text-[10px] text-muted-foreground">{t.last_message_at ? format(new Date(t.last_message_at), "MMM d") : ""}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{t.from_name || t.from_address || t.participants || ""}</div>
                    </div>
                  ))}
                </div>
              )}
              {selectedThread && messages.length > 0 && (
                <div className="mt-4 border rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-sm mb-3">{selectedThread.subject || "Thread"}</h3>
                  {messages.map((m: any) => (
                    <div key={m.id} className="mb-3 p-3 bg-gray-50 rounded text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-xs">{m.from_address || "Unknown"}</span>
                        <span className="text-[10px] text-muted-foreground">{m.sent_at ? format(new Date(m.sent_at), "MMM d, h:mm a") : ""}</span>
                      </div>
                      <p className="text-xs whitespace-pre-wrap">{m.body || m.snippet || ""}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="outbox" className="mt-3">
              <div className="space-y-1">
                {filteredComms.map((c: any) => (
                  <div key={c.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between">
                      <span className="font-medium text-sm">{c.subject || "No subject"}</span>
                      <Badge variant="secondary" className="text-[10px]">{c.status || c.direction}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{c.recipient_identifier || c.to_address || ""}</div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="live" className="mt-3">
              {liveEmails.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">Click "Fetch Live" to pull recent emails from Gmail.</p>
              ) : (
                <div className="space-y-1">
                  {liveEmails.map((e: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg">
                      <div className="font-medium text-sm">{e.subject || "No subject"}</div>
                      <div className="text-xs text-muted-foreground">{e.from || e.sender || ""}</div>
                      {e.snippet && <p className="text-xs mt-1 text-muted-foreground truncate">{e.snippet}</p>}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="scripts" className="mt-3">
              <div className="space-y-2">
                {scripts.map((s: any) => (
                  <div key={s.id} className="p-3 bg-white border rounded-lg">
                    <Badge variant="outline" className="text-[10px] mb-1">{s.brand_key}</Badge>
                    <p className="text-sm whitespace-pre-wrap">{s.body}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default EmailInbox;
