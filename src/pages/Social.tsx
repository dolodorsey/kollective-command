import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { DIVISIONS } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Social = () => {
  const queryClient = useQueryClient();
  const [brandFilter, setBrandFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newTarget, setNewTarget] = useState({ handle: "", brand_key: "", city: "", platform: "instagram", tags: "", status: "ready" });

  const { data: targets = [] } = useQuery({
    queryKey: ["social-targets"],
    queryFn: async () => {
      const { data } = await supabase.from("social_outreach_targets").select("*").order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brand-list-social"],
    queryFn: async () => {
      const { data } = await supabase.from("brand_registry").select("brand_key, brand_name").eq("is_active", true).order("brand_name");
      return data || [];
    },
  });

  const { data: touches = [] } = useQuery({
    queryKey: ["social-touches"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_touchpoints").select("*").in("channel", ["dm", "comment", "ig"]).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: scripts = [] } = useQuery({
    queryKey: ["dm-scripts-all"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_outreach_scripts").select("*").eq("channel", "dm").order("brand_key");
      return data || [];
    },
  });

  const addTarget = useMutation({
    mutationFn: async () => {
      const payload: any = {
        handle: newTarget.handle,
        brand_key: newTarget.brand_key,
        city: newTarget.city || null,
        platform: newTarget.platform,
        tags: newTarget.tags ? newTarget.tags.split(",").map((t: string) => t.trim()) : [],
        status: newTarget.status,
      };
      const { error } = await supabase.from("social_outreach_targets").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Target added");
      setShowAdd(false);
      setNewTarget({ handle: "", brand_key: "", city: "", platform: "instagram", tags: "", status: "ready" });
      queryClient.invalidateQueries({ queryKey: ["social-targets"] });
    },
    onError: (e: any) => toast.error("Failed: " + String(e)),
  });

  const filtered = brandFilter === "all" ? targets : targets.filter((t: any) => (t.brand_key || "").includes(brandFilter));
  const readyCount = filtered.filter((t: any) => t.status === "ready").length;
  const sentCount = filtered.filter((t: any) => t.status === "sent").length;
  const repliedCount = filtered.filter((t: any) => t.status === "replied").length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Social Control</h1>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3.5 w-3.5" />{showAdd ? "Cancel" : "Add Target"}
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        <button onClick={() => setBrandFilter("all")}
          className={cn("shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold",
            brandFilter === "all" ? "bg-pink-100 text-pink-700" : "text-muted-foreground hover:bg-muted")}>
          ALL ({targets.length})
        </button>
        {DIVISIONS.map(d => (
          <button key={d.key} onClick={() => setBrandFilter(d.key)}
            className={cn("shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap",
              brandFilter === d.key ? "bg-pink-100 text-pink-700" : "text-muted-foreground hover:bg-muted")}>
            {d.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Ready", value: readyCount, color: "text-amber-600" },
          { label: "Sent", value: sentCount, color: "text-blue-600" },
          { label: "Replied", value: repliedCount, color: "text-green-600" },
        ].map((s, i) => (
          <div key={i} className="rounded-lg border border-border/50 bg-card p-2.5 text-center">
            <div className={cn("font-mono text-lg font-bold", s.color)}>{s.value}</div>
            <div className="text-[9px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="rounded-lg border border-pink-200 bg-pink-50 p-4 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <input value={newTarget.handle} onChange={e => setNewTarget(p => ({...p, handle: e.target.value}))}
              placeholder="@handle" className="rounded border border-border/50 bg-white px-3 py-1.5 text-xs outline-none focus:border-pink-300" />
            <select value={newTarget.brand_key} onChange={e => setNewTarget(p => ({...p, brand_key: e.target.value}))}
              className="rounded border border-border/50 bg-white px-3 py-1.5 text-xs outline-none">
              <option value="">Select brand</option>
              {brands.map((b: any) => <option key={b.brand_key} value={b.brand_key}>{b.brand_name}</option>)}
            </select>
            <input value={newTarget.city} onChange={e => setNewTarget(p => ({...p, city: e.target.value}))}
              placeholder="City" className="rounded border border-border/50 bg-white px-3 py-1.5 text-xs outline-none focus:border-pink-300" />
          </div>
          <div className="flex gap-2">
            <input value={newTarget.tags} onChange={e => setNewTarget(p => ({...p, tags: e.target.value}))}
              placeholder="Tags (comma separated)" className="flex-1 rounded border border-border/50 bg-white px-3 py-1.5 text-xs outline-none focus:border-pink-300" />
            <Button size="sm" onClick={() => newTarget.handle && newTarget.brand_key && addTarget.mutate()}
              disabled={!newTarget.handle || !newTarget.brand_key || addTarget.isPending}>Add</Button>
          </div>
        </div>
      )}

      <Tabs defaultValue="targets" className="space-y-3">
        <TabsList>
          <TabsTrigger value="targets">Targets ({filtered.length})</TabsTrigger>
          <TabsTrigger value="scripts">DM Scripts ({scripts.length})</TabsTrigger>
          <TabsTrigger value="touches">Touch Log ({touches.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="targets">
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/30">
                {["Handle", "Brand", "City", "Tags", "Status"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.slice(0, 60).map((t: any) => (
                  <tr key={t.id} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-3 py-2 font-semibold text-pink-600">{t.handle}</td>
                    <td className="px-3 py-2"><StatusBadge variant="default">{t.brand_key}</StatusBadge></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{t.city || "\u2014"}</td>
                    <td className="px-3 py-2">{(t.tags || []).slice(0, 2).map((tag: string, j: number) => <StatusBadge key={j} variant="default">{tag}</StatusBadge>)}</td>
                    <td className="px-3 py-2"><StatusBadge variant={t.status === "ready" ? "warning" : t.status === "sent" ? "info" : t.status === "replied" ? "success" : "default"}>{t.status || "\u2014"}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

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

        <TabsContent value="touches">
          <div className="space-y-1.5">
            {touches.map((t: any, i: number) => (
              <div key={i} className="flex items-center gap-3 rounded-md border border-border/30 p-2.5">
                <Send className="h-3 w-3 text-muted-foreground shrink-0" />
                <StatusBadge variant="default">{t.brand_key}</StatusBadge>
                <span className="text-xs text-muted-foreground">{t.channel}</span>
                <StatusBadge variant={t.outcome === "replied" ? "success" : t.outcome === "sent" ? "info" : "default"}>{t.outcome || "\u2014"}</StatusBadge>
                <span className="text-[10px] text-muted-foreground truncate flex-1">{t.message_preview || "\u2014"}</span>
              </div>
            ))}
            {touches.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground/40">No DM touches recorded</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Social;
