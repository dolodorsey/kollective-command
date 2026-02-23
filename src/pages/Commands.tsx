import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { sendCommand } from "@/lib/commands";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Terminal, Plus, ChevronRight, X, Save, RotateCw, Image, Calendar, Search, Brain, Bug, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  running: "text-green-600", queued: "text-amber-600", completed: "text-blue-600",
  failed: "text-red-600", needs_approval: "text-purple-600", pending: "text-amber-600",
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
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [editPayload, setEditPayload] = useState("");

  const { data: commands = [] } = useQuery({
    queryKey: ["active-commands"],
    queryFn: async () => {
      const { data } = await supabase.from("command_log").select("*").order("executed_at", { ascending: false }).limit(50);
      return data || [];
    },
    refetchInterval: 10000,
  });

  const updateCommand = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const { error } = await supabase.from("command_log").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Command updated");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["active-commands"] });
    },
    onError: () => toast.error("Failed to update"),
  });

  const statusCounts = {
    total: commands.length,
    queued: commands.filter((c: any) => c.status === "queued").length,
    completed: commands.filter((c: any) => c.status === "completed" || c.status === "success").length,
    failed: commands.filter((c: any) => c.status === "failed" || c.status === "error").length,
  };

  return (
    <div className="flex h-[calc(100vh-7.5rem)] gap-4 animate-fade-in">
      {/* LEFT — Command List */}
      <div className={cn("flex flex-col gap-3", selected ? "w-1/2" : "w-full")}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Commands</h1>
          <Button size="sm" className="gap-1.5" onClick={() => sendCommand("manual.new", {})}>
            <Plus className="h-3.5 w-3.5" />New Command
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total", value: statusCounts.total, color: "text-foreground" },
            { label: "Queued", value: statusCounts.queued, color: "text-amber-600" },
            { label: "Completed", value: statusCounts.completed, color: "text-blue-600" },
            { label: "Failed", value: statusCounts.failed, color: "text-red-600" },
          ].map((s, i) => (
            <div key={i} className="rounded-lg border border-border/50 bg-card p-2 text-center">
              <div className={cn("font-mono text-lg font-bold", s.color)}>{s.value}</div>
              <div className="text-[9px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Command list */}
        <div className="flex-1 overflow-auto space-y-1">
          {commands.map((cmd: any) => {
            const st = cmd.status || "queued";
            return (
              <button key={cmd.id} onClick={() => { setSelected(cmd); setEditing(false); }}
                className={cn("w-full rounded-lg border bg-card p-3 text-left transition-all hover:border-blue-200",
                  selected?.id === cmd.id ? "border-blue-300 ring-1 ring-blue-100" : "border-border/50")}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-foreground truncate max-w-[70%]">{cmd.command_type}</span>
                  <span className={cn("text-[10px] font-semibold capitalize", STATUS_COLORS[st] || "text-muted-foreground")}>{st}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge variant="default">{cmd.scope || "global"}</StatusBadge>
                  {cmd.target_key && <span className="text-[10px] text-muted-foreground">{cmd.target_key}</span>}
                  <span className="text-[9px] text-muted-foreground/40 ml-auto">{cmd.executed_at ? format(new Date(cmd.executed_at), "MMM d, h:mm a") : "—"}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Templates */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Quick Templates</p>
          <div className="grid grid-cols-3 gap-2">
            {TEMPLATES.map((t, i) => {
              const TIcon = t.icon;
              return (
                <button key={i} onClick={() => sendCommand(t.name.toLowerCase().replace(/ /g, "."), { target: t.target })}
                  className="rounded-lg border border-border/50 bg-card p-2.5 text-left hover:border-blue-200 transition-all">
                  <TIcon className="h-3.5 w-3.5 text-muted-foreground mb-1" />
                  <p className="text-[10px] font-semibold text-foreground">{t.name}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT — Detail + Edit */}
      {selected && (
        <div className="flex-1 rounded-lg border border-border/50 bg-card p-5 flex flex-col gap-4 overflow-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground font-mono">{selected.command_type}</h3>
            <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground text-xs">ID:</span> <span className="font-mono text-foreground">{selected.id}</span></div>
            <div><span className="text-muted-foreground text-xs">Status:</span> <span className={cn("font-semibold capitalize", STATUS_COLORS[selected.status] || "")}>{selected.status || "—"}</span></div>
            <div><span className="text-muted-foreground text-xs">Scope:</span> <span className="text-foreground">{selected.scope || "global"}</span></div>
            <div><span className="text-muted-foreground text-xs">Target:</span> <span className="text-foreground">{selected.target_key || "—"}</span></div>
            <div><span className="text-muted-foreground text-xs">Executed By:</span> <span className="text-foreground">{selected.executed_by || "system"}</span></div>
            <div><span className="text-muted-foreground text-xs">Time:</span> <span className="text-foreground">{selected.executed_at ? format(new Date(selected.executed_at), "MMM d, h:mm:ss a") : "—"}</span></div>
          </div>

          {/* Payload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Payload</span>
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => { setEditing(!editing); setEditPayload(JSON.stringify(selected.payload || {}, null, 2)); }}>
                {editing ? "Cancel" : "Edit"}
              </Button>
            </div>
            {editing ? (
              <div className="space-y-2">
                <textarea value={editPayload} onChange={e => setEditPayload(e.target.value)} rows={8}
                  className="w-full rounded-md border border-border/50 bg-input px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-blue-300" />
                <Button size="sm" className="gap-1" onClick={() => {
                  try {
                    const parsed = JSON.parse(editPayload);
                    updateCommand.mutate({ id: selected.id, updates: { payload: parsed } });
                  } catch { toast.error("Invalid JSON"); }
                }}><Save className="h-3 w-3" />Save Payload</Button>
              </div>
            ) : (
              <pre className="rounded-lg bg-muted/50 p-3 text-[10px] font-mono text-foreground overflow-auto max-h-40">
                {JSON.stringify(selected.payload || {}, null, 2)}
              </pre>
            )}
          </div>

          {/* Result */}
          {selected.result && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Result</span>
              <pre className="mt-1 rounded-lg bg-muted/50 p-3 text-[10px] font-mono text-foreground overflow-auto max-h-32">
                {typeof selected.result === "string" ? selected.result : JSON.stringify(selected.result, null, 2)}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-auto">
            <Button variant="outline" size="sm" className="gap-1" onClick={() => {
              sendCommand("command.retry", { command_id: selected.id, command_type: selected.command_type });
              toast.success("Retry triggered");
            }}><RotateCw className="h-3 w-3" />Retry</Button>
            <Button variant="outline" size="sm" onClick={() => {
              updateCommand.mutate({ id: selected.id, updates: { status: "completed" } });
            }}>Mark Complete</Button>
            <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => {
              updateCommand.mutate({ id: selected.id, updates: { status: "failed" } });
            }}>Mark Failed</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Commands;
