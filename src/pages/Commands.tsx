import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { sendCommand } from "@/lib/commands";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Terminal, Play, Pause, Square, RotateCw,
  CheckCircle, Clock, AlertCircle, Image,
  Calendar, Search, Brain, Bug, Newspaper, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { color: string; variant: 'success' | 'warning' | 'error' | 'info' | 'purple' | 'default' }> = {
  running: { color: "text-status-success", variant: "success" },
  queued: { color: "text-status-warning", variant: "warning" },
  completed: { color: "text-status-info", variant: "info" },
  failed: { color: "text-status-error", variant: "error" },
  needs_approval: { color: "text-status-purple", variant: "purple" },
  pending: { color: "text-status-warning", variant: "warning" },
};

const TEMPLATES = [
  { name: "Generate IG pack", target: "Clawbot", icon: Image, desc: "Create branded social assets" },
  { name: "Schedule posts for city", target: "Social", icon: Calendar, desc: "Queue city-specific content" },
  { name: "Scrape & enrich leads", target: "n8n", icon: Search, desc: "Find and enrich new contacts" },
  { name: "Daily intel brief", target: "AI", icon: Brain, desc: "Competitive + market summary" },
  { name: "Clawbot directory crawl", target: "Clawbot", icon: Bug, desc: "Crawl venue/influencer directories" },
  { name: "PR blast to media", target: "n8n", icon: Newspaper, desc: "Send pitch to media contacts" },
];

const Commands = () => {
  const queryClient = useQueryClient();

  const { data: commands = [] } = useQuery({
    queryKey: ['active-commands'],
    queryFn: async () => {
      const { data } = await supabase
        .from('command_log')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(25);
      return data || [];
    },
    refetchInterval: 10000,
  });

  const handleAction = async (action: string, cmd: any) => {
    await sendCommand(`command.${action}`, { command_id: cmd.id, command_type: cmd.command_type });
    queryClient.invalidateQueries({ queryKey: ['active-commands'] });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Workflow Control Center</h1>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New Command
        </Button>
      </div>

      {/* Active Commands Table */}
      <div className="overflow-hidden rounded-lg border border-border/50">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr] gap-3 bg-secondary/50 px-4 py-2.5">
          {["Command", "Scope", "Status", "Time", "Actions"].map(h => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{h}</span>
          ))}
        </div>
        {commands.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground/40">No commands yet</div>
        )}
        {commands.map((cmd: any) => {
          const status = cmd.scope?.includes('error') ? 'failed' : 'completed';
          const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.completed;
          return (
            <div key={cmd.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr] items-center gap-3 border-t border-border/30 bg-card px-4 py-3 transition-colors hover:bg-card/80">
              <span className="truncate font-mono text-sm font-medium text-foreground">{cmd.command_type}</span>
              <StatusBadge variant="default">{cmd.scope || 'global'}</StatusBadge>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: `hsl(var(--status-${cfg.variant === 'default' ? 'info' : cfg.variant}))` }} />
                <span className={cn("text-xs capitalize", cfg.color)}>{status}</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {cmd.executed_at ? format(new Date(cmd.executed_at), 'HH:mm') : '—'}
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleAction('retry', cmd)}
                  className="rounded border border-status-info/20 bg-status-info/10 px-2.5 py-1 text-[10px] font-semibold text-status-info transition-colors hover:bg-status-info/20"
                >
                  Retry
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Command Templates */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Command Templates</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {TEMPLATES.map((t, i) => {
            const TIcon = t.icon;
            return (
              <button
                key={i}
                onClick={() => sendCommand(t.name.toLowerCase().replace(/ /g, '.'), { target: t.target })}
                className="group rounded-lg border border-border/50 bg-card p-4 text-left transition-all duration-200 hover:border-primary/30 hover:shadow-gold-glow"
              >
                <TIcon className="mb-2 h-5 w-5 text-primary/60 transition-colors group-hover:text-primary" />
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{t.desc}</p>
                <p className="mt-2 text-[10px] text-muted-foreground/40">Target: {t.target}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Commands;
