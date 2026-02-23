import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Link2, Eye, EyeOff, Key, Shield, Save, Plus, Trash2, RefreshCw, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DIVISIONS } from "@/lib/constants";


const SheetsSyncTab = () => {
  const { data: syncStatus } = useQuery({
    queryKey: ["sheets-sync-status"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_core_config").select("config_value").eq("config_key", "sheets_sync_status").single();
      if (!data) return {};
      const val = data.config_value;
      return typeof val === "string" ? JSON.parse(val) : val;
    },
  });

  const { data: syncMap } = useQuery({
    queryKey: ["sheets-sync-map"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_core_config").select("config_value").eq("config_key", "sheets_sync_map_v2").single();
      if (!data) return null;
      const val = data.config_value;
      return typeof val === "string" ? JSON.parse(val) : val;
    },
  });

  const [triggeringSync, setTriggeringSync] = useState(false);

  const triggerSync = async () => {
    setTriggeringSync(true);
    try {
      await fetch("https://drdorsey.app.n8n.cloud/webhook/sheets-sync-bridge", { method: "GET" });
      toast.success("Sync triggered");
    } catch { toast.error("Could not trigger sync"); }
    setTriggeringSync(false);
  };

  const sheets = syncStatus ? Object.entries(syncStatus) : [];
  const mapSheets = syncMap?.sheets || [];
  const totalTabs = syncMap?.total_tabs || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">{mapSheets.length} Spreadsheets \u00b7 {totalTabs} Tabs Mapped</p>
          <p className="text-[10px] text-muted-foreground">Google Sheets \u2192 Supabase sync pipeline</p>
        </div>
        <Button size="sm" onClick={triggerSync} disabled={triggeringSync}>
          {triggeringSync ? "Syncing..." : "Trigger Full Sync"}
        </Button>
      </div>

      <div className="space-y-2">
        {mapSheets.map((sheet: any, i: number) => {
          const status = syncStatus?.[sheet.name?.toLowerCase().replace(/\s+/g, "_")] || {};
          const tabCount = sheet.tabs?.length || 0;
          const targetTables = [...new Set((sheet.tabs || []).map((t: any) => t.table))];
          return (
            <div key={i} className="rounded-lg border border-border/50 bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <a href={"https://docs.google.com/spreadsheets/d/" + sheet.sheet_id} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-bold text-blue-600 hover:underline">{sheet.name}</a>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{tabCount} tabs \u2192 {targetTables.join(", ")}</p>
                </div>
                <StatusBadge variant={status.status === "synced" ? "success" : status.status === "error" ? "error" : "warning"}>{status.status || "pending"}</StatusBadge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(sheet.tabs || []).slice(0, 8).map((tab: any, j: number) => (
                  <span key={j} className="inline-block rounded-md bg-muted/50 px-2 py-0.5 text-[9px] font-mono text-muted-foreground">{tab.tab} \u2192 {tab.table}</span>
                ))}
                {tabCount > 8 && <span className="text-[9px] text-muted-foreground">+{tabCount - 8} more</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Settings = () => {
  const queryClient = useQueryClient();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [editingSource, setEditingSource] = useState<string | null>(null);
  const [editSourceData, setEditSourceData] = useState<any>({});
  const [newKey, setNewKey] = useState({ name: "", value: "" });

  const { data: sources = [] } = useQuery({
    queryKey: ["data-sources"],
    queryFn: async () => {
      const { data } = await supabase.from("data_sources").select("*").order("category, source_name");
      return data || [];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["all-platform-accounts"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_accounts").select("id, platform, email, username, is_active, metadata").order("platform, email");
      return data || [];
    },
  });

  const { data: apiKeys = [] } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_core_config").select("*").like("config_key", "api_key_%").order("config_key");
      return data || [];
    },
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ["credentials-list"],
    queryFn: async () => {
      const { data } = await supabase.from("credentials").select("*").order("credential_type, credential_key");
      return data || [];
    },
  });

  const { data: liveCounts = {} } = useQuery({
    queryKey: ["live-counts"],
    queryFn: async () => {
      const tables = ["threads","messages","communications","mcp_outreach_scripts","mcp_daily_queues","mcp_touchpoints","social_outreach_targets","social_outreach_log","pr_contacts","pr_pitches","pr_outreach_activity","scheduled_messages","tasks","approval_queue","mcp_leads","contacts_master","brand_entities","mcp_offers","mcp_kpi_snapshots"];
      const counts: Record<string, number> = {};
      await Promise.all(tables.map(async (t) => { const { count } = await supabase.from(t).select("*", { count: "exact", head: true }); counts[t] = count || 0; }));
      return counts;
    },
  });

  const updateSource = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.from("data_sources").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Source updated"); setEditingSource(null); queryClient.invalidateQueries({ queryKey: ["data-sources"] }); },
  });

  const deleteSource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("data_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Source deleted"); queryClient.invalidateQueries({ queryKey: ["data-sources"] }); },
  });

  const verified = sources.filter((s: any) => s.is_verified).length;
  const empty = sources.filter((s: any) => !s.has_real_data).length;
  const byPlatform: Record<string, any[]> = {};
  accounts.forEach((a: any) => { if (!byPlatform[a.platform]) byPlatform[a.platform] = []; byPlatform[a.platform].push(a); });

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      <Tabs defaultValue="sources" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sources" className="gap-1.5"><Database className="h-3.5 w-3.5" />Source Links</TabsTrigger>
          <TabsTrigger value="accounts" className="gap-1.5"><Link2 className="h-3.5 w-3.5" />Accounts</TabsTrigger>
          <TabsTrigger value="apikeys" className="gap-1.5"><Key className="h-3.5 w-3.5" />API Keys</TabsTrigger>
          <TabsTrigger value="logins" className="gap-1.5"><Shield className="h-3.5 w-3.5" />Logins</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5"><Eye className="h-3.5 w-3.5" />Data Audit</TabsTrigger>
        </TabsList>

        {/* SOURCE LINKS — Editable */}
        <TabsContent value="sources" className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[{ label: "Sources", value: sources.length, color: "text-foreground" }, { label: "Verified", value: verified, color: "text-green-600" }, { label: "Empty", value: empty, color: "text-red-500" }].map((s, i) => (
              <div key={i} className="rounded-lg border border-border/50 bg-card p-3 text-center">
                <div className={cn("font-mono text-xl font-bold", s.color)}>{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/30">
                {["Source", "Type", "Category", "Table", "Live Count", "Real", "Verified", "Actions"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {sources.map((s: any) => {
                  const lc = (liveCounts as any)[s.table_name];
                  const isEditing = editingSource === s.id;
                  return (
                    <tr key={s.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 font-semibold text-foreground">{isEditing ? <input value={editSourceData.source_name || ""} onChange={e => setEditSourceData((p: any) => ({...p, source_name: e.target.value}))} className="rounded border border-border/50 px-2 py-0.5 text-xs w-full" /> : s.source_name}</td>
                      <td className="px-3 py-2"><StatusBadge variant="default">{s.source_type}</StatusBadge></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{s.category}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{s.table_name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{lc !== undefined ? lc.toLocaleString() : "?"}</td>
                      <td className="px-3 py-2">{s.has_real_data ? <span className="text-green-600 text-xs font-bold">YES</span> : <span className="text-red-500 text-xs font-bold">NO</span>}</td>
                      <td className="px-3 py-2">{s.is_verified ? <span className="text-green-600 text-xs font-bold">YES</span> : <span className="text-red-500 text-xs font-bold">NO</span>}</td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button size="sm" className="h-6 px-2 text-[10px]" onClick={() => updateSource.mutate({ id: s.id, updates: editSourceData })}>Save</Button>
                            <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setEditingSource(null)}>X</Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button onClick={() => { setEditingSource(s.id); setEditSourceData({ source_name: s.source_name, source_url: s.source_url, is_verified: s.is_verified, has_real_data: s.has_real_data }); }} className="text-blue-500 text-[10px] hover:underline">Edit</button>
                            <button onClick={() => { if (confirm("Delete?")) deleteSource.mutate(s.id); }} className="text-red-400 text-[10px] hover:underline">Del</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {empty > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-semibold text-red-600 mb-2">{empty} source(s) EMPTY — need spreadsheets or connections:</p>
              {sources.filter((s: any) => !s.has_real_data).map((s: any) => (
                <p key={s.id} className="text-xs text-foreground/70"><span className="font-semibold text-red-500">{s.source_name}</span> — {s.notes}</p>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ACCOUNTS */}
        <TabsContent value="accounts" className="space-y-4">
          {Object.entries(byPlatform).sort().map(([platform, accts]) => (
            <div key={platform} className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{platform} ({accts.length})</p>
              <div className="grid grid-cols-4 gap-2">
                {accts.map((a: any) => (
                  <div key={a.id} className="rounded-lg border border-border/50 bg-card p-3 border-l-2 border-l-blue-400">
                    <div className="text-xs font-semibold text-foreground truncate">{a.email || a.username}</div>
                    <StatusBadge variant={a.is_active ? "success" : "error"}>{a.is_active ? "ACTIVE" : "OFF"}</StatusBadge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* API KEYS */}
        <TabsContent value="apikeys" className="space-y-4">
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/30">
                {["Key Name", "Provider", "Value", ""].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {apiKeys.map((k: any) => {
                  const name = k.config_key.replace("api_key_", "");
                  const val = k.config_value;
                  const key = typeof val === "object" ? (val.key || JSON.stringify(val)) : String(val);
                  const provider = typeof val === "object" ? (val.provider || name) : name;
                  const visible = showKeys[k.config_key] || false;
                  return (
                    <tr key={k.config_key} className="border-b border-border/20">
                      <td className="px-3 py-2.5 font-semibold text-foreground">{name}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{provider}</td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">
                        {visible ? <span className="break-all">{key.slice(0, 60)}...</span> : "••••••••••••••••"}
                      </td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => setShowKeys(p => ({ ...p, [k.config_key]: !visible }))} className="text-blue-500 text-[10px] hover:underline">
                          {visible ? "Hide" : "Show"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border border-border/50 bg-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Add API Key</p>
            <div className="flex gap-2">
              <input value={newKey.name} onChange={e => setNewKey(p => ({...p, name: e.target.value}))} placeholder="Key name (e.g. clickup)" className="flex-1 rounded border border-border/50 bg-input px-3 py-1.5 text-xs outline-none focus:border-blue-300" />
              <input value={newKey.value} onChange={e => setNewKey(p => ({...p, value: e.target.value}))} placeholder="API key value" className="flex-[2] rounded border border-border/50 bg-input px-3 py-1.5 text-xs outline-none focus:border-blue-300 font-mono" />
              <Button size="sm" onClick={async () => {
                if (!newKey.name || !newKey.value) return;
                const { error } = await supabase.from("mcp_core_config").upsert({ config_key: `api_key_${newKey.name}`, config_value: { provider: newKey.name, key: newKey.value } });
                if (!error) { toast.success("Key saved"); setNewKey({ name: "", value: "" }); queryClient.invalidateQueries({ queryKey: ["api-keys"] }); }
              }}>Save</Button>
            </div>
          </div>
        </TabsContent>

        {/* LOGINS */}
        <TabsContent value="logins" className="space-y-4">
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/30">
                {["Type", "Key", "Active", ""].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {credentials.map((c: any) => {
                  const visible = showKeys[`cred_${c.id}`] || false;
                  return (
                    <tr key={c.id} className="border-b border-border/20">
                      <td className="px-3 py-2.5"><StatusBadge variant="default">{c.credential_type || "—"}</StatusBadge></td>
                      <td className="px-3 py-2.5 font-mono text-xs text-foreground">{c.credential_key || "—"}</td>
                      <td className="px-3 py-2.5"><StatusBadge variant={c.is_active ? "success" : "error"}>{c.is_active ? "YES" : "NO"}</StatusBadge></td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => setShowKeys(p => ({ ...p, [`cred_${c.id}`]: !visible }))} className="text-blue-500 text-[10px] hover:underline">
                          {visible ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {credentials.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-xs text-muted-foreground/40">No credentials stored</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* DATA AUDIT */}
        <TabsContent value="audit" className="space-y-4">
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/30">
                {["Table", "Count", "Status"].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {Object.entries(liveCounts).sort(([,a],[,b]) => (b as number) - (a as number)).map(([table, count]) => (
                  <tr key={table} className="border-b border-border/20">
                    <td className="px-4 py-2 font-mono text-xs text-foreground">{table}</td>
                    <td className="px-4 py-2 font-mono text-sm font-bold">{(count as number).toLocaleString()}</td>
                    <td className="px-4 py-2">{(count as number) > 0 ? <span className="text-green-600 text-xs font-bold">HAS DATA</span> : <span className="text-red-500 text-xs font-bold">EMPTY</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="sheets">
          <SheetsSyncTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
