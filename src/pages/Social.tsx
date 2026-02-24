import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DIVISIONS, BRAND_EMAILS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, LayoutDashboard, Users2, CalendarClock, MessageCircle, MessageSquareText, Send, Plus, Trash2, Edit2, Instagram, Globe, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const Social = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("dashboard");
  const [brandFilter, setBrandFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [newScript, setNewScript] = useState({ brand_key: '', channel: 'instagram', script_type: 'dm', body: '' });
  const [editingScript, setEditingScript] = useState<any>(null);

  const { data: targets = [] } = useQuery({
    queryKey: ["social-targets"],
    queryFn: async () => {
      const { data } = await supabase.from("social_outreach_targets").select("*").order("created_at", { ascending: false }).limit(500);
      return data || [];
    },
  });

  const { data: dmScripts = [] } = useQuery({
    queryKey: ["dm-scripts"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_outreach_scripts").select("*").neq("script_type", "comment").order("brand_key");
      return data || [];
    },
  });

  const { data: commentScripts = [] } = useQuery({
    queryKey: ["comment-scripts"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_outreach_scripts").select("*").eq("script_type", "comment").order("brand_key");
      return data || [];
    },
  });

  const { data: outbox = [] } = useQuery({
    queryKey: ["social-outbox"],
    queryFn: async () => {
      const { data } = await supabase.from("outbox").select("*").in("channel", ["instagram", "tiktok", "facebook"]).order("scheduled_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: touchpoints = [] } = useQuery({
    queryKey: ["social-touchpoints"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_touchpoints").select("*").in("channel", ["instagram", "dm", "comment", "social"]).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const allBrands = DIVISIONS.flatMap(d => d.brands);
  const uniqueBrands = [...new Set(targets.map((t: any) => t.brand_key).filter(Boolean))];
  const uniqueCities = [...new Set(targets.map((t: any) => t.city).filter(Boolean))];

  const filteredTargets = targets.filter((t: any) => {
    if (brandFilter !== "all" && t.brand_key !== brandFilter) return false;
    if (cityFilter !== "all" && t.city !== cityFilter) return false;
    return true;
  });

  // Social accounts from BRAND_EMAILS
  const socialAccounts = DIVISIONS.map(d => ({
    ...d,
    accounts: Object.entries(BRAND_EMAILS)
      .filter(([, v]) => v.division === d.key && v.ig)
      .map(([name, v]) => ({ name, ig: v.ig, email: v.email })),
  })).filter(d => d.accounts.length > 0);

  const totalAccounts = socialAccounts.reduce((a, d) => a + d.accounts.length, 0);

  // Stats
  const readyCount = targets.filter((t: any) => t.status === 'ready').length;
  const sentCount = targets.filter((t: any) => t.status === 'sent').length;
  const repliedCount = targets.filter((t: any) => t.status === 'replied').length;

  const addScript = async () => {
    if (!newScript.brand_key || !newScript.body) { toast.error("Fill brand and body"); return; }
    const { error } = await supabase.from("mcp_outreach_scripts").insert({ ...newScript });
    if (error) { toast.error("Failed to add"); return; }
    toast.success("Script added");
    setNewScript({ brand_key: '', channel: 'instagram', script_type: 'dm', body: '' });
    queryClient.invalidateQueries({ queryKey: ["dm-scripts"] });
    queryClient.invalidateQueries({ queryKey: ["comment-scripts"] });
  };

  const deleteScript = async (id: number) => {
    await supabase.from("mcp_outreach_scripts").delete().eq("id", id);
    toast.success("Deleted");
    queryClient.invalidateQueries({ queryKey: ["dm-scripts"] });
    queryClient.invalidateQueries({ queryKey: ["comment-scripts"] });
  };

  const updateScript = async () => {
    if (!editingScript) return;
    await supabase.from("mcp_outreach_scripts").update({ body: editingScript.body }).eq("id", editingScript.id);
    toast.success("Updated");
    setEditingScript(null);
    queryClient.invalidateQueries({ queryKey: ["dm-scripts"] });
    queryClient.invalidateQueries({ queryKey: ["comment-scripts"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold tracking-tight">Social Control</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dashboard"><LayoutDashboard className="h-3 w-3 mr-1" /> Dashboard</TabsTrigger>
          <TabsTrigger value="accounts"><Users2 className="h-3 w-3 mr-1" /> Accounts ({totalAccounts})</TabsTrigger>
          <TabsTrigger value="queue"><CalendarClock className="h-3 w-3 mr-1" /> Queue ({outbox.length})</TabsTrigger>
          <TabsTrigger value="outreach"><MessageCircle className="h-3 w-3 mr-1" /> DM Outreach ({targets.length})</TabsTrigger>
          <TabsTrigger value="comments"><MessageSquareText className="h-3 w-3 mr-1" /> Comments ({commentScripts.length})</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-white border rounded-lg text-center">
              <div className="text-2xl font-bold">{totalAccounts}</div>
              <div className="text-xs text-muted-foreground">Social Accounts</div>
            </div>
            <div className="p-4 bg-white border rounded-lg text-center">
              <div className="text-2xl font-bold text-amber-600">{readyCount}</div>
              <div className="text-xs text-muted-foreground">Ready to Send</div>
            </div>
            <div className="p-4 bg-white border rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{sentCount}</div>
              <div className="text-xs text-muted-foreground">DMs Sent</div>
            </div>
            <div className="p-4 bg-white border rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{repliedCount}</div>
              <div className="text-xs text-muted-foreground">Replied</div>
            </div>
          </div>

          <h3 className="font-semibold text-sm mb-3">Recent Activity</h3>
          {touchpoints.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">No recent social activity tracked.</p>
          ) : (
            <div className="space-y-1">
              {touchpoints.slice(0, 15).map((t: any) => (
                <div key={t.id} className="p-3 bg-white border rounded-lg flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium">{t.channel}</span>
                    <span className="text-xs text-muted-foreground ml-2">{t.outcome || t.brand_key}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{t.created_at ? format(new Date(t.created_at), 'MMM d, h:mm a') : ''}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ACCOUNTS */}
        <TabsContent value="accounts" className="mt-4">
          <div className="space-y-6">
            {socialAccounts.map(d => (
              <div key={d.key}>
                <h3 className="font-semibold text-sm mb-2" style={{ color: d.color }}>{d.icon} {d.name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {d.accounts.map(a => (
                    <div key={a.ig} className="p-3 bg-white border rounded-lg hover:shadow-sm transition-all">
                      <div className="flex items-center gap-2 mb-1">
                        <Instagram className="h-4 w-4 text-purple-500" />
                        <span className="font-medium text-sm truncate">{a.name}</span>
                      </div>
                      <div className="text-xs text-purple-600 font-mono">@{a.ig}</div>
                      <div className="flex items-center gap-1 mt-2">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-[10px] text-muted-foreground">Connected</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* CONTENT QUEUE */}
        <TabsContent value="queue" className="mt-4">
          {outbox.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No queued posts. Content generated in Outputs will appear here when scheduled.</p>
          ) : (
            <div className="space-y-2">
              {outbox.map((o: any) => (
                <div key={o.id} className="p-3 bg-white border rounded-lg">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{o.brand_key || 'unknown'}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{o.channel}</Badge>
                    </div>
                    <Badge className={o.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>{o.status || 'queued'}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{o.body || o.content || ''}</p>
                  {o.scheduled_at && <span className="text-[10px] text-muted-foreground">Scheduled: {format(new Date(o.scheduled_at), 'MMM d, h:mm a')}</span>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* DM OUTREACH */}
        <TabsContent value="outreach" className="mt-4">
          <div className="flex gap-3 mb-4">
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Brand" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {uniqueBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="City" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {uniqueCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="px-3 py-1">{filteredTargets.length} targets</Badge>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="text-left p-2 font-medium">Handle</th>
                <th className="text-left p-2 font-medium">Brand</th>
                <th className="text-left p-2 font-medium">City</th>
                <th className="text-left p-2 font-medium">Tags</th>
                <th className="text-left p-2 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {filteredTargets.slice(0, 100).map((t: any) => (
                  <tr key={t.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-mono text-purple-600 text-xs">@{t.handle}</td>
                    <td className="p-2"><Badge variant="outline" className="text-[10px]">{t.brand_key}</Badge></td>
                    <td className="p-2 text-xs">{t.city || '—'}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {(t.tags || []).slice(0, 3).map((tag: string, i: number) => <Badge key={i} variant="secondary" className="text-[9px]">{tag}</Badge>)}
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge className={t.status === 'sent' ? 'bg-blue-100 text-blue-800' : t.status === 'replied' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>{t.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* DM Scripts */}
          <h3 className="font-semibold text-sm mt-6 mb-3">DM Scripts ({dmScripts.length})</h3>
          <div className="space-y-2">
            {dmScripts.map((s: any) => (
              <div key={s.id} className="p-3 bg-white border rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">{s.brand_key}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{s.channel}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { navigator.clipboard.writeText(s.body); toast.success("Copied"); }}><Copy className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditingScript(s)}><Edit2 className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => deleteScript(s.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
                {editingScript?.id === s.id ? (
                  <div className="space-y-2">
                    <Textarea value={editingScript.body} onChange={e => setEditingScript({ ...editingScript, body: e.target.value })} rows={3} />
                    <div className="flex gap-2"><Button size="sm" onClick={updateScript}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditingScript(null)}>Cancel</Button></div>
                  </div>
                ) : (
                  <p className="text-xs whitespace-pre-wrap">{s.body}</p>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* COMMENTS */}
        <TabsContent value="comments" className="mt-4">
          {/* Add new */}
          <div className="p-4 bg-gray-50 border rounded-lg mb-4 space-y-2">
            <h3 className="font-semibold text-sm">Add Script</h3>
            <div className="flex gap-2">
              <Select value={newScript.brand_key} onValueChange={v => setNewScript({ ...newScript, brand_key: v })}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Brand" /></SelectTrigger>
                <SelectContent>{allBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={newScript.script_type} onValueChange={v => setNewScript({ ...newScript, script_type: v })}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comment">Comment</SelectItem>
                  <SelectItem value="dm">DM</SelectItem>
                  <SelectItem value="reply">Reply</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea placeholder="Script body..." value={newScript.body} onChange={e => setNewScript({ ...newScript, body: e.target.value })} rows={3} />
            <Button size="sm" onClick={addScript}><Plus className="h-3 w-3 mr-1" /> Add</Button>
          </div>

          <div className="space-y-2">
            {commentScripts.map((s: any) => (
              <div key={s.id} className="p-3 bg-white border rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[10px]">{s.brand_key}</Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { navigator.clipboard.writeText(s.body); toast.success("Copied"); }}><Copy className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => deleteScript(s.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
                <p className="text-xs whitespace-pre-wrap">{s.body}</p>
              </div>
            ))}
            {commentScripts.length === 0 && <p className="text-center py-6 text-muted-foreground text-sm">No comment scripts yet. Add one above.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Social;
