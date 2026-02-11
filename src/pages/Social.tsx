import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { sendCommand } from "@/lib/commands";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Share2, Instagram, Music, Twitter, Facebook,
  Plus, Filter, Calendar, CheckCircle, AlertCircle,
  Clock, Edit, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  { key: "all", label: "All", icon: Share2 },
  { key: "ig", label: "Instagram", icon: Instagram },
  { key: "tiktok", label: "TikTok", icon: Music },
  { key: "x", label: "X", icon: Twitter },
  { key: "fb", label: "Facebook", icon: Facebook },
];

const STATUSES = ["All", "Drafted", "Scheduled", "Published", "Failed", "Needs Approval"];

const STATUS_MAP: Record<string, { variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'; icon: React.ElementType }> = {
  drafted: { variant: "default", icon: Edit },
  scheduled: { variant: "info", icon: Calendar },
  published: { variant: "success", icon: CheckCircle },
  failed: { variant: "error", icon: AlertCircle },
  needs_approval: { variant: "purple", icon: Clock },
};

const Social = () => {
  const [platform, setPlatform] = useState("all");
  const [status, setStatus] = useState("All");

  const { data: targets = [] } = useQuery({
    queryKey: ["social-targets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("social_outreach_targets")
        .select("*")
        .limit(50);
      return data || [];
    },
  });

  const { data: scheduled = [] } = useQuery({
    queryKey: ["scheduled-messages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("scheduled_messages")
        .select("*")
        .order("scheduled_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: platformStatus } = useQuery({
    queryKey: ["platform-status"],
    queryFn: async () => {
      const { data } = await supabase
        .from("mcp_core_config")
        .select("config_value")
        .eq("config_key", "platform_status")
        .maybeSingle();
      return data?.config_value ? JSON.parse(data.config_value as string) : {};
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Social Control</h1>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New Post
        </Button>
      </div>

      {/* Platform Connection Status */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { name: "Instagram", key: "meta_ig", icon: Instagram },
          { name: "TikTok", key: "tiktok", icon: Music },
          { name: "X / Twitter", key: "twitter_x", icon: Twitter },
          { name: "Gmail", key: "gmail", icon: Share2 },
        ].map(p => {
          const pStatus = platformStatus?.[p.key] || "not_connected";
          const connected = pStatus === "token_loaded" || pStatus === "connected";
          return (
            <div key={p.key} className={cn(
              "rounded-lg border p-4 transition-all",
              connected ? "border-status-success/30 bg-status-success/5" : "border-border/50 bg-card"
            )}>
              <div className="flex items-center gap-2">
                <p.icon className={cn("h-4 w-4", connected ? "text-status-success" : "text-muted-foreground/40")} />
                <span className="text-sm font-medium text-foreground">{p.name}</span>
              </div>
              <StatusBadge variant={connected ? "success" : "default"} className="mt-2">
                {typeof pStatus === 'string' ? pStatus.replace(/_/g, ' ') : 'unknown'}
              </StatusBadge>
            </div>
          );
        })}
      </div>

      {/* Platform + Status Filters */}
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map(p => {
          const PIcon = p.icon;
          return (
            <button key={p.key} onClick={() => setPlatform(p.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                platform === p.key
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "text-muted-foreground/50 border border-border/50 hover:text-muted-foreground"
              )}>
              <PIcon className="h-3 w-3" />
              {p.label}
            </button>
          );
        })}
        <div className="h-6 w-px bg-border/50 mx-1" />
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
              status === s
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-muted-foreground/50 border border-transparent hover:text-muted-foreground"
            )}>
            {s}
          </button>
        ))}
      </div>

      {/* Social Targets */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Social Outreach Targets ({targets.length})
        </h2>
        <div className="max-h-96 space-y-1 overflow-auto">
          {targets.length === 0 && <p className="text-sm text-muted-foreground/40">No targets loaded</p>}
          {targets.slice(0, 25).map((t: any, i: number) => (
            <div key={i} className="flex items-center gap-3 rounded px-3 py-2 transition-colors hover:bg-muted/50">
              <Instagram className="h-3.5 w-3.5 text-status-pink/60" />
              <span className="flex-1 truncate font-mono text-xs text-foreground">
                {t.instagram_handle || t.handle || t.full_name || '—'}
              </span>
              <span className="text-[10px] text-muted-foreground">{t.city || ''}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled Posts */}
      {scheduled.length > 0 && (
        <div className="rounded-lg border border-border/50 bg-card p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Scheduled Posts ({scheduled.length})
          </h2>
          <div className="space-y-2">
            {scheduled.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-3 rounded-md border border-border/30 bg-secondary/50 p-3">
                <Calendar className="h-4 w-4 text-status-info/60" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-foreground">{s.content || s.message || '—'}</p>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {s.scheduled_at ? new Date(s.scheduled_at).toLocaleDateString() : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Social;
