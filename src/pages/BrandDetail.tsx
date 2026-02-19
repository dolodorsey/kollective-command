import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { sendCommand } from "@/lib/commands";
import { DIVISIONS } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Calendar, Users, Target, Send, Mail, Instagram,
  CheckSquare, Plus, MessageSquare, Share2, Zap, Star,
  Building2, Clock, ChevronRight, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState } from "react";

const BrandDetail = () => {
  const { brandKey } = useParams<{ brandKey: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newTask, setNewTask] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");

  // Find the brand in DIVISIONS
  const brandInfo = (() => {
    for (const div of DIVISIONS) {
      const brandIndex = div.brands.findIndex(
        b => b.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') === brandKey ||
             b.toLowerCase().replace(/\s+/g, '-') === brandKey ||
             b.toLowerCase().replace(/[^a-z0-9]/g, '') === brandKey?.replace(/-/g, '')
      );
      if (brandIndex >= 0) {
        return { brand: div.brands[brandIndex], division: div };
      }
    }
    return null;
  })();

  // Brand entity from DB
  const { data: entity } = useQuery({
    queryKey: ["brand-entity", brandKey],
    queryFn: async () => {
      const { data } = await supabase
        .from("brand_entities")
        .select("*")
        .or(`entity_id.eq.${brandKey},entity_name.ilike.%${brandKey?.replace(/-/g, ' ')}%`)
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Events for this brand
  const { data: events = [] } = useQuery({
    queryKey: ["brand-events", brandKey],
    queryFn: async () => {
      if (!brandInfo) return [];
      const brandName = brandInfo.brand;
      const { data } = await supabase
        .from("events")
        .select("*")
        .or(`brand.eq.${brandInfo.division.key},title.ilike.%${brandName}%,series.ilike.%${brandKey}%`)
        .gte("date", new Date().toISOString())
        .order("date", { ascending: true })
        .limit(20);
      return data || [];
    },
  });

  // Tasks for this brand
  const { data: tasks = [] } = useQuery({
    queryKey: ["brand-tasks", brandKey],
    queryFn: async () => {
      const { data } = await supabase
        .from("approval_queue")
        .select("*")
        .ilike("brand_key", `%${brandKey?.replace(/-/g, '%')}%`)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  // Social outreach targets for this brand
  const { data: targets = [] } = useQuery({
    queryKey: ["brand-targets", brandKey],
    queryFn: async () => {
      const { data } = await supabase
        .from("social_outreach_targets")
        .select("*")
        .or(`brand_key.ilike.%${brandKey}%,brand_key.is.null`)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // PR activity for this brand
  const { data: prActivity = [] } = useQuery({
    queryKey: ["brand-pr", brandKey],
    queryFn: async () => {
      const { data } = await supabase
        .from("pr_outreach_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  // Commands for this brand
  const { data: commands = [] } = useQuery({
    queryKey: ["brand-commands", brandKey],
    queryFn: async () => {
      const { data } = await supabase
        .from("command_log")
        .select("*")
        .or(`target_key.ilike.%${brandKey}%,scope.ilike.%${brandKey}%`)
        .order("executed_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    const { error } = await supabase.from("approval_queue").insert({
      item_type: "task",
      brand_key: brandKey,
      title: newTask.trim(),
      content_preview: newTask.trim(),
      full_payload: JSON.stringify({ task: newTask.trim(), priority: taskPriority, brand: brandKey }),
      source_workflow: "manual",
      score: taskPriority === "high" ? 95 : taskPriority === "medium" ? 75 : 50,
      status: "pending",
    });
    if (!error) {
      toast.success(`Task added for ${brandInfo?.brand || brandKey}`);
      setNewTask("");
      queryClient.invalidateQueries({ queryKey: ["brand-tasks"] });
    } else {
      toast.error("Failed to add task");
    }
  };

  const handleQuickAction = async (action: string) => {
    await sendCommand(`brand.${action}`, { brand_key: brandKey, brand_name: brandInfo?.brand });
    toast.success(`${action} triggered for ${brandInfo?.brand || brandKey}`);
  };

  if (!brandInfo) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" />Back
        </Button>
        <div className="rounded-lg border border-border/50 bg-card p-12 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground/20" />
          <p className="mt-3 text-sm text-muted-foreground">Brand not found: {brandKey}</p>
        </div>
      </div>
    );
  }

  const pendingTasks = tasks.filter((t: any) => t.status === "pending");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-1.5 shrink-0">
          <ArrowLeft className="h-3.5 w-3.5" />Back
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{brandInfo.division.icon}</span>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{brandInfo.brand}</h1>
              <p className="text-xs text-muted-foreground">
                {brandInfo.division.name} — {brandInfo.division.sub}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0" style={{ borderLeft: `3px solid ${brandInfo.division.color}`, paddingLeft: 12 }}>
          <StatusBadge variant="success">Active</StatusBadge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Launch PR", action: "launch_pr", icon: Send },
          { label: "Send DMs", action: "send_dms", icon: MessageSquare },
          { label: "Generate Content", action: "generate_content", icon: Zap },
          { label: "Email Blast", action: "email_blast", icon: Mail },
          { label: "IG Outreach", action: "ig_outreach", icon: Instagram },
          { label: "Scrape Leads", action: "scrape_leads", icon: Target },
        ].map(a => {
          const AIcon = a.icon;
          return (
            <Button key={a.action} variant="outline" size="sm" className="gap-1.5 text-xs"
              onClick={() => handleQuickAction(a.action)}>
              <AIcon className="h-3 w-3" />{a.label}
            </Button>
          );
        })}
      </div>

      {/* System Prompt / Brand Voice */}
      {entity?.system_prompt && (
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Brand Voice</p>
          <p className="text-sm text-foreground leading-relaxed">{entity.system_prompt}</p>
          {entity.tone_profile && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(entity.tone_profile as Record<string, string>).map(([k, v]) => (
                <span key={k} className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  {k}: {v}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Task Creator */}
          <div className="rounded-lg border border-primary/30 bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Plus className="h-3.5 w-3.5 text-primary" />Add Task for {brandInfo.brand}
            </h2>
            <div className="flex gap-2">
              <input
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddTask()}
                placeholder="What needs to happen?"
                className="flex-1 rounded-md border border-border/50 bg-input px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary/40"
              />
              <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)}
                className="rounded-md border border-border/50 bg-input px-2 py-2 text-xs text-foreground outline-none">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <Button size="sm" onClick={handleAddTask} disabled={!newTask.trim()}>
                <Plus className="mr-1 h-3.5 w-3.5" />Add
              </Button>
            </div>
          </div>

          {/* Tasks / Approvals */}
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <h2 className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <CheckSquare className="mr-1.5 inline h-3.5 w-3.5" />Tasks & Approvals
              </span>
              {pendingTasks.length > 0 && (
                <span className="rounded-md bg-status-warning/10 px-2 py-0.5 text-[10px] font-bold text-status-warning">
                  {pendingTasks.length} pending
                </span>
              )}
            </h2>
            <div className="space-y-2">
              {tasks.slice(0, 10).map((t: any) => (
                <div key={t.id} className={cn(
                  "flex items-center gap-3 rounded-md border p-3 transition-colors hover:border-primary/20",
                  t.status === "pending" ? "border-l-2 border-l-status-warning border-border/50" : "border-border/30"
                )}>
                  <div className={cn("h-2 w-2 rounded-full shrink-0",
                    t.status === "pending" ? "bg-status-warning" : t.status === "approved" ? "bg-status-success" : "bg-muted-foreground"
                  )} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                    <p className="text-[10px] text-muted-foreground">{t.item_type?.replace(/_/g, " ")}</p>
                  </div>
                  <StatusBadge variant={t.status === "pending" ? "warning" : t.status === "approved" ? "success" : "error"}>
                    {t.status}
                  </StatusBadge>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground/40">No tasks yet — add one above</p>
              )}
            </div>
          </div>

          {/* Events */}
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Calendar className="mr-1.5 inline h-3.5 w-3.5" />Upcoming Events
            </h2>
            <div className="space-y-2">
              {events.slice(0, 8).map((e: any) => (
                <div key={e.id} className="flex items-center gap-3 rounded-md border border-border/30 bg-secondary/30 p-3">
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary">
                    <span className="text-[9px] font-semibold uppercase text-muted-foreground">{format(new Date(e.date), "MMM")}</span>
                    <span className="text-sm font-bold text-foreground">{format(new Date(e.date), "d")}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{e.city}</p>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground/40">No upcoming events for this brand</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Outreach Targets */}
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <h2 className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Target className="mr-1.5 inline h-3.5 w-3.5" />Outreach Targets
              </span>
              <span className="font-mono text-xs text-muted-foreground">{targets.length}</span>
            </h2>
            <div className="space-y-1.5">
              {targets.slice(0, 10).map((t: any) => (
                <div key={t.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
                  <Instagram className="h-3 w-3 text-status-purple shrink-0" />
                  <span className="flex-1 truncate text-xs text-foreground">{t.handle || t.full_name || "—"}</span>
                  <span className="text-[9px] text-muted-foreground">{t.city || ""}</span>
                  <StatusBadge variant={t.status === "active" ? "success" : "default"} className="text-[8px]">
                    {t.status || "new"}
                  </StatusBadge>
                </div>
              ))}
              {targets.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground/40">No outreach targets</p>
              )}
            </div>
            {targets.length > 10 && (
              <Button variant="outline" size="sm" className="mt-3 w-full text-xs"
                onClick={() => navigate("/social")}>
                View All {targets.length} Targets <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>

          {/* PR Activity */}
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Send className="mr-1.5 inline h-3.5 w-3.5" />PR & Outreach Activity
            </h2>
            <div className="space-y-2">
              {prActivity.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 rounded-md border border-border/30 p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{p.subject || p.action_type || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{p.recipient || p.outlet || "—"}</p>
                  </div>
                  <span className="font-mono text-[9px] text-muted-foreground">
                    {p.created_at ? format(new Date(p.created_at), "MMM d") : "—"}
                  </span>
                </div>
              ))}
              {prActivity.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground/40">No PR activity logged</p>
              )}
            </div>
          </div>

          {/* Recent Commands */}
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Zap className="mr-1.5 inline h-3.5 w-3.5" />Command History
            </h2>
            <div className="space-y-1.5">
              {commands.map((c: any) => (
                <div key={c.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span className="flex-1 truncate font-mono text-xs text-foreground">{c.command_type}</span>
                  <span className="font-mono text-[9px] text-muted-foreground">
                    {c.executed_at ? format(new Date(c.executed_at), "HH:mm") : "—"}
                  </span>
                </div>
              ))}
              {commands.length === 0 && (
                <p className="py-3 text-center text-[10px] text-muted-foreground/40">No commands yet</p>
              )}
            </div>
          </div>

          {/* All Brands in Same Division */}
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {brandInfo.division.icon} Other {brandInfo.division.name} Brands
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {brandInfo.division.brands.filter(b => b !== brandInfo.brand).map(b => {
                const slug = b.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
                return (
                  <button key={b} onClick={() => navigate(`/brand/${slug}`)}
                    className="rounded-md border border-border/50 px-2.5 py-1.5 text-xs text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5">
                    {b}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandDetail;
