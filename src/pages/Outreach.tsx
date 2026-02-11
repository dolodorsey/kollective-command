import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Send, Users, Target, Mail, Plus, ChevronRight, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const Outreach = () => {
  const { data: pitches = [] } = useQuery({
    queryKey: ["pr-pitches"],
    queryFn: async () => {
      const { data } = await supabase.from("pr_pitches").select("*").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["pr-contacts"],
    queryFn: async () => {
      const { data } = await supabase.from("pr_contacts").select("*").order("score", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: activity = [] } = useQuery({
    queryKey: ["pr-activity"],
    queryFn: async () => {
      const { data } = await supabase.from("pr_outreach_activity").select("*, pr_contacts(reporter_name, outlet_name), pr_pitches(pitch_title)").order("created_at", { ascending: false }).limit(30);
      return data || [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["pr-stats"],
    queryFn: async () => {
      const [totalContacts, activePitches, totalTouches] = await Promise.all([
        supabase.from("pr_contacts").select("*", { count: "exact", head: true }),
        supabase.from("pr_pitches").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("pr_outreach_activity").select("*", { count: "exact", head: true }),
      ]);
      return {
        contacts: totalContacts.count ?? 0,
        activePitches: activePitches.count ?? 0,
        touches: totalTouches.count ?? 0,
      };
    },
  });

  const statusVariant = (s: string): "success" | "warning" | "error" | "info" | "default" => {
    const map: Record<string, "success" | "warning" | "error" | "info" | "default"> = {
      Active: "success", active: "success", sent: "info", replied: "success",
      follow_up_1: "warning", follow_up_2: "warning", pitched: "info",
      bounced: "error", declined: "error", interested: "success",
    };
    return map[s] || "default";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">PR Outreach</h1>
        <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />New Pitch</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Media Contacts", value: stats?.contacts ?? "—", icon: Users },
          { label: "Active Pitches", value: stats?.activePitches ?? "—", icon: Target },
          { label: "Total Touches", value: stats?.touches ?? "—", icon: Mail },
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

      {/* Active Pitches */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Pitches</h2>
        <div className="space-y-3">
          {pitches.length === 0 && <p className="text-sm text-muted-foreground/40">No pitches yet</p>}
          {pitches.map((p: any) => (
            <div key={p.id} className="rounded-md border border-border/30 bg-secondary/30 p-4 transition-colors hover:border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{p.pitch_title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.pitch_angle?.substring(0, 120)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge variant={statusVariant(p.status)}>{p.status}</StatusBadge>
                  <StatusBadge variant={p.priority === "high" ? "error" : "default"}>{p.priority}</StatusBadge>
                </div>
              </div>
              {p.target_outlets && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(p.target_outlets || []).map((outlet: string, i: number) => (
                    <span key={i} className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{outlet}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact List */}
      <div className="rounded-lg border border-border/50 bg-card">
        <div className="flex items-center justify-between border-b border-border/30 px-5 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Media Contacts</h2>
          <span className="text-[10px] text-muted-foreground">{contacts.length} contacts</span>
        </div>
        <div className="max-h-96 overflow-auto">
          {contacts.map((c: any) => (
            <div key={c.contact_id} className="flex items-center gap-3 border-b border-border/20 px-5 py-3 last:border-0 transition-colors hover:bg-secondary/30">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {(c.reporter_name || "?")[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{c.reporter_name}</p>
                <p className="truncate text-xs text-muted-foreground">{c.outlet_name} · {c.beat} · {c.city}</p>
              </div>
              <div className="flex items-center gap-2">
                {c.score && (
                  <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] font-bold",
                    c.score >= 80 ? "bg-status-success/10 text-status-success" :
                    c.score >= 50 ? "bg-status-warning/10 text-status-warning" :
                    "bg-muted text-muted-foreground"
                  )}>{c.score}</span>
                )}
                <StatusBadge variant={statusVariant(c.status)}>{c.status}</StatusBadge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="rounded-lg border border-border/50 bg-card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity Timeline</h2>
        <div className="space-y-2">
          {activity.length === 0 && <p className="text-sm text-muted-foreground/40">No activity yet</p>}
          {activity.map((a: any) => (
            <div key={a.id} className="flex items-center gap-3 rounded px-3 py-2 transition-colors hover:bg-muted/30">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <div className="flex-1">
                <span className="text-xs font-medium text-foreground">
                  {a.activity_type?.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {" "}→ {a.pr_contacts?.reporter_name || "Unknown"} ({a.pr_contacts?.outlet_name || ""})
                </span>
              </div>
              <StatusBadge variant={statusVariant(a.activity_type)} className="text-[8px]">{a.channel || "—"}</StatusBadge>
              <span className="font-mono text-[10px] text-muted-foreground">
                {a.created_at ? format(new Date(a.created_at), "MMM d HH:mm") : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Outreach;
