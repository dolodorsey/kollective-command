import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Share2, Users, MessageSquare, Plus, Instagram, Twitter, Facebook, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  Instagram: Instagram, instagram: Instagram,
  Twitter: Twitter, twitter: Twitter,
  Facebook: Facebook, facebook: Facebook,
};

const Social = () => {
  const [tab, setTab] = useState<"targets" | "outreach" | "calendar">("targets");
  const [platformFilter, setPlatformFilter] = useState("all");

  const { data: targets = [] } = useQuery({
    queryKey: ["social-targets", platformFilter],
    queryFn: async () => {
      let q = supabase.from("social_outreach_targets").select("*").order("created_at", { ascending: false }).limit(100);
      if (platformFilter !== "all") q = q.eq("platform", platformFilter);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: outreachLog = [] } = useQuery({
    queryKey: ["social-outreach-log"],
    queryFn: async () => {
      const { data } = await supabase.from("social_outreach_log").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: brandRegistry = [] } = useQuery({
    queryKey: ["brand-registry"],
    queryFn: async () => {
      const { data } = await supabase.from("brand_registry").select("brand_key, brand_name, division, instagram").eq("is_active", true).order("brand_name");
      return data || [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["social-stats"],
    queryFn: async () => {
      const [totalTargets, activeBrands] = await Promise.all([
        supabase.from("social_outreach_targets").select("*", { count: "exact", head: true }),
        supabase.from("brand_registry").select("*", { count: "exact", head: true }).eq("is_active", true),
      ]);
      return { targets: totalTargets.count ?? 0, brands: activeBrands.count ?? 0 };
    },
  });

  const tabs = [
    { key: "targets", label: "Outreach Targets", count: targets.length },
    { key: "outreach", label: "Outreach Log", count: outreachLog.length },
    { key: "calendar", label: "Brand Accounts", count: brandRegistry.length },
  ] as const;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Social Control</h1>
        <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Add Target</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Outreach Targets", value: stats?.targets ?? "—", icon: Users },
          { label: "Active Brands", value: stats?.brands ?? "—", icon: Share2 },
          { label: "DMs Sent", value: outreachLog.length, icon: MessageSquare },
        ].map((s, i) => (
          <div key={i} className="rounded-lg border border-border/50 bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-primary/60" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/50 pb-px">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("rounded-t-md px-4 py-2 text-xs font-semibold transition-all",
              tab === t.key ? "border border-b-0 border-border/50 bg-card text-foreground" : "text-muted-foreground/50 hover:text-muted-foreground"
            )}>
            {t.label} <span className="ml-1 text-[10px] text-muted-foreground">({t.count})</span>
          </button>
        ))}
      </div>

      {/* TARGETS TAB */}
      {tab === "targets" && (
        <div>
          <div className="mb-3 flex gap-1">
            {["all", "Instagram", "TikTok", "Twitter"].map(p => (
              <button key={p} onClick={() => setPlatformFilter(p)}
                className={cn("rounded px-3 py-1 text-[10px] font-semibold transition-all",
                  platformFilter === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}>{p === "all" ? "All" : p}</button>
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border border-border/50">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-3 bg-secondary/50 px-4 py-2.5">
              {["Handle", "Platform", "City", "Followers", "Status"].map(h => (
                <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{h}</span>
              ))}
            </div>
            {targets.map((t: any) => {
              const PIcon = PLATFORM_ICONS[t.platform] || Share2;
              return (
                <div key={t.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] items-center gap-3 border-t border-border/30 bg-card px-4 py-3 hover:bg-card/80">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.handle}</p>
                    {t.full_name && <p className="text-[10px] text-muted-foreground">{t.full_name}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <PIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{t.platform}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{t.city || "—"}</span>
                  <span className="font-mono text-xs text-muted-foreground">{t.followers?.toLocaleString() || "—"}</span>
                  <StatusBadge variant={t.status === "active" ? "success" : t.status === "messaged" ? "info" : "default"}>{t.status || "—"}</StatusBadge>
                </div>
              );
            })}
            {targets.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground/40">No targets yet</div>}
          </div>
        </div>
      )}

      {/* OUTREACH LOG TAB */}
      {tab === "outreach" && (
        <div className="space-y-2">
          {outreachLog.length === 0 && <div className="rounded-lg border border-border/50 bg-card p-8 text-center text-sm text-muted-foreground/40">No outreach logged yet</div>}
          {outreachLog.map((log: any) => (
            <div key={log.id} className="rounded-md border border-border/30 bg-card p-3 hover:border-primary/20">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{log.handle || log.target_handle || "—"}</p>
                <span className="font-mono text-[10px] text-muted-foreground">{log.created_at ? format(new Date(log.created_at), "MMM d HH:mm") : "—"}</span>
              </div>
              {log.message && <p className="mt-1 text-xs text-muted-foreground">{log.message.substring(0, 200)}</p>}
            </div>
          ))}
        </div>
      )}

      {/* BRAND ACCOUNTS TAB */}
      {tab === "calendar" && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {brandRegistry.map((b: any) => (
            <div key={b.brand_key} className="rounded-lg border border-border/50 bg-card p-4 transition-all hover:border-primary/30"
              style={{ borderLeftColor: "hsl(var(--primary))", borderLeftWidth: 3 }}>
              <p className="text-sm font-semibold text-foreground">{b.brand_name}</p>
              <p className="text-[10px] text-muted-foreground">{b.division}</p>
              {b.instagram && <p className="mt-2 text-xs text-status-purple">{b.instagram}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Social;
