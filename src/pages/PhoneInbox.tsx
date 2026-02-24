import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DIVISIONS, BRAND_EMAILS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, ChevronLeft, ChevronDown, ChevronRight, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const PhoneInbox = () => {
  const navigate = useNavigate();
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [collapsedDivs, setCollapsedDivs] = useState<Record<string, boolean>>({});

  const { data: comms = [] } = useQuery({
    queryKey: ["phone-comms"],
    queryFn: async () => {
      const { data } = await supabase.from("communications").select("*").in("channel", ["sms", "phone", "text"]).order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const { data: scripts = [] } = useQuery({
    queryKey: ["sms-scripts"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_outreach_scripts").select("*").in("channel", ["sms", "text", "phone"]).order("brand_key");
      return data || [];
    },
  });

  const { data: scheduled = [] } = useQuery({
    queryKey: ["scheduled-msgs"],
    queryFn: async () => {
      const { data } = await supabase.from("outbox").select("*").in("channel", ["sms", "text"]).order("scheduled_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const toggleDiv = (key: string) => setCollapsedDivs(prev => ({ ...prev, [key]: !prev[key] }));

  // Group brands by division (using email as proxy for having phone)
  const phoneDivisions = DIVISIONS.map(d => ({
    ...d,
    accounts: Object.entries(BRAND_EMAILS)
      .filter(([, v]) => v.division === d.key && v.email)
      .map(([name]) => ({ name })),
  })).filter(d => d.accounts.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
          <h1 className="text-2xl font-bold tracking-tight">Phone / SMS</h1>
        </div>
        <Badge variant="outline" className="text-base px-4 py-1">{comms.length} messages</Badge>
      </div>

      <div className="flex gap-4 h-[calc(100vh-160px)]">
        {/* Left sidebar — brands by division */}
        <div className="w-72 shrink-0 border rounded-lg bg-white overflow-y-auto">
          <div className={cn("px-3 py-2 text-xs font-bold cursor-pointer hover:bg-gray-50 border-b", selectedBrand === "all" && "bg-gray-100")} onClick={() => setSelectedBrand("all")}>
            ALL BRANDS
          </div>
          {phoneDivisions.map(d => (
            <div key={d.key}>
              <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 border-b" onClick={() => toggleDiv(d.key)}>
                <span className="text-[10px] font-bold tracking-wider" style={{ color: d.color }}>{d.icon} {d.name}</span>
                {collapsedDivs[d.key] ? <ChevronRight className="h-3 w-3 text-gray-400" /> : <ChevronDown className="h-3 w-3 text-gray-400" />}
              </div>
              {!collapsedDivs[d.key] && d.accounts.map(a => (
                <div key={a.name} className={cn("px-4 py-1.5 cursor-pointer hover:bg-gray-50 border-b border-gray-100", selectedBrand === a.name && "bg-green-50 border-l-2 border-l-green-500")} onClick={() => setSelectedBrand(a.name)}>
                  <div className="text-xs font-medium truncate">{a.name}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="messages">
            <TabsList>
              <TabsTrigger value="messages">Messages ({comms.length})</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled ({scheduled.length})</TabsTrigger>
              <TabsTrigger value="scripts">Scripts ({scripts.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="messages" className="mt-3">
              {comms.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">No SMS/phone messages tracked yet.</p>
              ) : (
                <div className="space-y-1">
                  {comms.map((c: any) => (
                    <div key={c.id} className="p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex justify-between">
                        <span className="font-medium text-sm">{c.recipient_identifier || c.to_address || "Unknown"}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">{c.direction || "out"}</Badge>
                          <span className="text-[10px] text-muted-foreground">{c.created_at ? format(new Date(c.created_at), "MMM d") : ""}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">{c.body || c.subject || ""}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="scheduled" className="mt-3">
              {scheduled.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">No scheduled messages.</p>
              ) : (
                <div className="space-y-1">
                  {scheduled.map((s: any) => (
                    <div key={s.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between">
                        <span className="font-medium text-sm">{s.recipient || "Unknown"}</span>
                        <Badge variant="outline" className="text-[10px]">{s.status || "queued"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{s.body || ""}</p>
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

export default PhoneInbox;
