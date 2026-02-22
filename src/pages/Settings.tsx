import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database, Link2, AlertTriangle, CheckCircle, RefreshCw,
  ExternalLink, Plus, Settings as SettingsIcon, Shield, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DIVISIONS } from "@/lib/constants";

const Settings = () => {
  const queryClient = useQueryClient();

  // Data Sources audit
  const { data: sources = [] } = useQuery({
    queryKey: ["data-sources"],
    queryFn: async () => {
      const { data } = await supabase.from("data_sources")
        .select("*").order("category, source_name");
      return data || [];
    },
  });

  // Platform accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ["all-platform-accounts"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_accounts")
        .select("id, platform, email, username, is_active, metadata")
        .order("platform, email");
      return data || [];
    },
  });

  // Live table counts for verification
  const { data: liveCounts = {} } = useQuery({
    queryKey: ["live-counts"],
    queryFn: async () => {
      const tables = [
        "threads", "messages", "communications", "mcp_outreach_scripts",
        "mcp_daily_queues", "mcp_touchpoints", "social_outreach_targets",
        "social_outreach_log", "pr_contacts", "pr_pitches", "pr_outreach_activity",
        "scheduled_messages", "tasks", "approval_queue", "mcp_leads",
        "contacts_master", "brand_entities", "mcp_offers", "mcp_kpi_snapshots",
      ];
      const counts: Record<string, number> = {};
      await Promise.all(tables.map(async (t) => {
        const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
        counts[t] = count || 0;
      }));
      return counts;
    },
  });

  const totalBrands = DIVISIONS.reduce((s, d) => s + d.brands.length, 0);
  const verified = sources.filter((s: any) => s.is_verified).length;
  const empty = sources.filter((s: any) => !s.has_real_data).length;
  const byPlatform: Record<string, any[]> = {};
  accounts.forEach((a: any) => {
    if (!byPlatform[a.platform]) byPlatform[a.platform] = [];
    byPlatform[a.platform].push(a);
  });

  const catColors: Record<string, string> = {
    communication: "text-status-error",
    script: "text-status-purple",
    leads: "text-status-success",
    contacts: "text-status-info",
    social: "text-status-pink",
    pr: "text-status-warning",
    tasks: "text-status-cyan",
    offers: "text-primary",
    events: "text-status-purple",
    system: "text-muted-foreground",
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      <Tabs defaultValue="sources" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sources" className="gap-1.5">
            <Database className="h-3.5 w-3.5" />Source Links
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-1.5">
            <Link2 className="h-3.5 w-3.5" />Accounts
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" />Data Audit
          </TabsTrigger>
        </TabsList>

        {/* ─── SOURCE LINKS TAB ─── */}
        <TabsContent value="sources" className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Sources", value: sources.length, color: "text-foreground" },
              { label: "Verified", value: verified, color: "text-status-success" },
              { label: "Empty / Missing", value: empty, color: "text-status-error" },
              { label: "Total Brands", value: totalBrands, color: "text-primary" },
            ].map((s, i) => (
              <div key={i} className="rounded-lg border border-border/50 bg-card p-3 text-center">
                <div className={cn("font-mono text-xl font-bold", s.color)}>{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Source list */}
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background">
                  {["Source", "Type", "Category", "Table", "Records", "Real Data", "Verified", "Notes"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sources.map((s: any) => {
                  const liveCount = liveCounts[s.table_name];
                  const mismatch = liveCount !== undefined && liveCount !== s.record_count;
                  return (
                    <tr key={s.id} className="border-b border-border/20 hover:bg-secondary/50 transition-colors">
                      <td className="px-3 py-2 font-semibold text-foreground">{s.source_name}</td>
                      <td className="px-3 py-2"><StatusBadge variant="default">{s.source_type}</StatusBadge></td>
                      <td className="px-3 py-2"><span className={cn("text-xs font-semibold", catColors[s.category])}>{s.category}</span></td>
                      <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{s.table_name}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        <span className={mismatch ? "text-status-warning" : "text-foreground"}>
                          {liveCount !== undefined ? liveCount.toLocaleString() : s.record_count.toLocaleString()}
                        </span>
                        {mismatch && <span className="text-[9px] text-status-warning ml-1">(was {s.record_count})</span>}
                      </td>
                      <td className="px-3 py-2">
                        {s.has_real_data
                          ? <CheckCircle className="h-3.5 w-3.5 text-status-success" />
                          : <AlertTriangle className="h-3.5 w-3.5 text-status-error" />}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge variant={s.is_verified ? "success" : "error"}>
                          {s.is_verified ? "YES" : "NO"}
                        </StatusBadge>
                      </td>
                      <td className="px-3 py-2 text-[10px] text-muted-foreground max-w-[200px] truncate">{s.notes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* What's missing */}
          {empty > 0 && (
            <div className="rounded-lg border border-status-error/20 bg-status-error/5 p-4">
              <p className="text-xs font-semibold text-status-error mb-2">
                <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
                {empty} data source(s) are EMPTY — need spreadsheets or API connections:
              </p>
              <ul className="space-y-1">
                {sources.filter((s: any) => !s.has_real_data).map((s: any) => (
                  <li key={s.id} className="text-xs text-foreground/70">
                    <span className="font-semibold text-status-error">{s.source_name}</span>
                    <span className="text-muted-foreground"> — {s.notes}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        {/* ─── ACCOUNTS TAB ─── */}
        <TabsContent value="accounts" className="space-y-4">
          {Object.entries(byPlatform).sort().map(([platform, accts]) => {
            const pColors: Record<string, string> = {
              gmail: "border-l-status-error", instagram: "border-l-status-pink",
              ghl: "border-l-status-success", facebook: "border-l-status-info",
              clickup: "border-l-status-cyan",
            };
            return (
              <div key={platform} className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {platform} ({accts.length})
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {accts.map((a: any) => (
                    <div key={a.id} className={cn("rounded-lg border border-border/50 bg-card p-3", pColors[platform] || "", "border-l-2")}>
                      <div className="text-xs font-semibold text-foreground truncate">{a.email || a.username}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <StatusBadge variant={a.is_active ? "success" : "error"}>
                          {a.is_active ? "ACTIVE" : "OFF"}
                        </StatusBadge>
                        {a.metadata?.name && (
                          <span className="text-[9px] text-muted-foreground">{a.metadata.name}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* ─── DATA AUDIT TAB ─── */}
        <TabsContent value="audit" className="space-y-4">
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background">
                  {["Table", "Live Count", "Status"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(liveCounts).sort(([,a],[,b]) => (b as number) - (a as number)).map(([table, count]) => (
                  <tr key={table} className="border-b border-border/20 hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-2 font-mono text-xs text-foreground">{table}</td>
                    <td className="px-4 py-2 font-mono text-sm font-bold text-foreground">{(count as number).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <StatusBadge variant={(count as number) > 0 ? "success" : "error"}>
                        {(count as number) > 0 ? "HAS DATA" : "EMPTY"}
                      </StatusBadge>
                    </td>
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

export default Settings;
