import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DIVISIONS, BRAND_EMAILS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Instagram, ChevronLeft, ChevronDown, ChevronRight, Send, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const IGInbox = () => {
  const navigate = useNavigate();
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [collapsedDivs, setCollapsedDivs] = useState<Record<string, boolean>>({});
  const [fetchingLive, setFetchingLive] = useState(false);
  const [liveDMs, setLiveDMs] = useState<any[]>([]);

  const { data: comms = [] } = useQuery({
    queryKey: ["ig-comms"],
    queryFn: async () => {
      const { data } = await supabase.from("communications").select("*").eq("channel", "instagram").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const { data: scripts = [] } = useQuery({
    queryKey: ["ig-scripts"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_outreach_scripts").select("*").in("channel", ["instagram", "dm"]).order("brand_key");
      return data || [];
    },
  });

  const { data: targets = [] } = useQuery({
    queryKey: ["ig-targets-inbox"],
    queryFn: async () => {
      const { data } = await supabase.from("social_outreach_targets").select("*").in("status", ["sent", "replied"]).order("sent_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const fetchLiveDMs = async () => {
    setFetchingLive(true);
    try {
      const res = await fetch("https://drdorsey.app.n8n.cloud/webhook/exec-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_type: "ig_fetch_dms", brand: selectedBrand, limit: 20, source: "mcp-ig-inbox" }),
      });
      if (res.ok) {
        const data = await res.json();
        const dms = data.dms || data.messages || (Array.isArray(data) ? data : []);
        setLiveDMs(dms);
        toast.success(`Fetched ${dms.length} DMs`);
      } else { toast.error("IG fetch failed"); }
    } catch { toast.error("Could not reach IG workflow"); }
    setFetchingLive(false);
  };

  const toggleDiv = (key: string) => setCollapsedDivs(prev => ({ ...prev, [key]: !prev[key] }));

  const igDivisions = DIVISIONS.map(d => ({
    ...d,
    accounts: Object.entries(BRAND_EMAILS)
      .filter(([, v]) => v.division === d.key && v.ig)
      .map(([name, v]) => ({ name, ig: v.ig })),
  })).filter(d => d.accounts.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
          <h1 className="text-2xl font-bold tracking-tight">Instagram DMs</h1>
        </div>
        <Button size="sm" onClick={fetchLiveDMs} disabled={fetchingLive}>
          {fetchingLive ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Fetch Live
        </Button>
      </div>

      <div className="flex gap-4 h-[calc(100vh-160px)]">
        {/* Left sidebar — IG accounts by division */}
        <div className="w-72 shrink-0 border rounded-lg bg-white overflow-y-auto">
          <div className={cn("px-3 py-2 text-xs font-bold cursor-pointer hover:bg-gray-50 border-b", selectedBrand === "all" && "bg-gray-100")} onClick={() => setSelectedBrand("all")}>
            ALL ACCOUNTS
          </div>
          {igDivisions.map(d => (
            <div key={d.key}>
              <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 border-b" onClick={() => toggleDiv(d.key)}>
                <span className="text-[10px] font-bold tracking-wider" style={{ color: d.color }}>{d.icon} {d.name}</span>
                {collapsedDivs[d.key] ? <ChevronRight className="h-3 w-3 text-gray-400" /> : <ChevronDown className="h-3 w-3 text-gray-400" />}
              </div>
              {!collapsedDivs[d.key] && d.accounts.map(a => (
                <div key={a.ig} className={cn("px-4 py-1.5 cursor-pointer hover:bg-gray-50 border-b border-gray-100", selectedBrand === a.ig && "bg-purple-50 border-l-2 border-l-purple-500")} onClick={() => setSelectedBrand(a.ig)}>
                  <div className="text-xs font-medium truncate">{a.name}</div>
                  <div className="text-[10px] text-purple-600 font-mono truncate">@{a.ig}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="conversations">
            <TabsList>
              <TabsTrigger value="conversations">Conversations ({comms.length})</TabsTrigger>
              <TabsTrigger value="sent">Sent DMs ({targets.length})</TabsTrigger>
              <TabsTrigger value="live">Live ({liveDMs.length})</TabsTrigger>
              <TabsTrigger value="scripts">Scripts ({scripts.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="conversations" className="mt-3">
              {comms.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">No IG conversations tracked yet.</p>
              ) : (
                <div className="space-y-1">
                  {comms.map((c: any) => (
                    <div key={c.id} className="p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex justify-between">
                        <span className="font-medium text-sm">{c.recipient_identifier || c.subject || "DM"}</span>
                        <Badge variant="secondary" className="text-[10px]">{c.direction || c.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">{c.body || c.message || ""}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sent" className="mt-3">
              <div className="space-y-1">
                {targets.map((t: any) => (
                  <div key={t.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-purple-600 text-xs">@{t.handle}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{t.brand_key}</Badge>
                        <Badge variant={t.status === "replied" ? "default" : "secondary"} className="text-[10px]">{t.status}</Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{t.city || ""} {t.sent_at ? `— sent ${format(new Date(t.sent_at), "MMM d")}` : ""}</div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="live" className="mt-3">
              {liveDMs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">Click "Fetch Live" to pull recent DMs.</p>
              ) : (
                <div className="space-y-1">
                  {liveDMs.map((d: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg">
                      <div className="font-medium text-sm">{d.from || d.sender || "Unknown"}</div>
                      <p className="text-xs text-muted-foreground">{d.text || d.message || d.body || ""}</p>
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

export default IGInbox;
