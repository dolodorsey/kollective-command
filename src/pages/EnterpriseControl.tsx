import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  RefreshCcw,
  Search,
  ShieldAlert,
  Target,
  Users,
  Workflow,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Health = "green" | "yellow" | "red";
type MandateStatus = "todo" | "in_progress" | "blocked" | "done" | "verified";

type ControlRow = {
  enterprise_entity_id: string;
  entity_key: string;
  entity_name: string;
  division: string;
  execution_state: string;
  execution_priority: string;
  entity_operational_state: string;
  operation_count: number;
  executing_or_verified: number;
  configured_not_running: number;
  blocked_operations: number;
  failed_operations: number;
  stale_operations: number;
  agents_active: number;
  agents_recent_heartbeat: number;
  last_agent_heartbeat: string | null;
  latest_execution_proof_at: string | null;
  last_progress_at: string | null;
  next_update_due_at: string | null;
  required_platforms: number;
  required_platforms_verified: number;
  required_platforms_attention: number;
  platform_states: Record<string, unknown> | null;
  mandate_id: string | null;
  mandate_date: string | null;
  mandate_lane: string | null;
  mandate: string | null;
  mandate_owner: string | null;
  mandate_status: MandateStatus | null;
  mandate_proof_url: string | null;
  mandate_proof_note: string | null;
  mandate_due_at: string | null;
  command_health: Health;
};

const HEALTH_ORDER: Record<Health, number> = { red: 0, yellow: 1, green: 2 };
const STATUS_OPTIONS: MandateStatus[] = ["todo", "in_progress", "blocked", "done", "verified"];

function formatTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function isOverdue(value?: string | null) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time < Date.now();
}

function healthTone(health: Health) {
  if (health === "green") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (health === "red") return "border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-300";
  return "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function statusTone(status?: MandateStatus | null) {
  if (status === "verified") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "blocked") return "border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-300";
  if (status === "done") return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  if (status === "in_progress") return "border-primary/30 bg-primary/10 text-primary";
  return "border-border bg-muted/40 text-muted-foreground";
}

function StatusPill({ status }: { status?: MandateStatus | null }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[.12em]", statusTone(status))}>
      {(status || "todo").replaceAll("_", " ")}
    </span>
  );
}

function HealthPill({ health }: { health: Health }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[.13em]", healthTone(health))}>
      <span className={cn("h-1.5 w-1.5 rounded-full", health === "green" ? "bg-emerald-500" : health === "red" ? "bg-red-500" : "bg-amber-500")} />
      {health}
    </span>
  );
}

function Kpi({ label, value, note, tone = "default" }: { label: string; value: number; note: string; tone?: "default" | "green" | "yellow" | "red" }) {
  const toneClass = tone === "green" ? "border-emerald-500/30" : tone === "red" ? "border-red-500/30" : tone === "yellow" ? "border-amber-500/30" : "border-border/60";
  return (
    <div className={cn("rounded-2xl border bg-card p-4", toneClass)}>
      <p className="text-[9px] font-bold uppercase tracking-[.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-[-.04em]">{value}</p>
      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{note}</p>
    </div>
  );
}

function MandateEditor({ row, onClose }: { row: ControlRow; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<MandateStatus>(row.mandate_status || "todo");
  const [proofUrl, setProofUrl] = useState(row.mandate_proof_url || "");
  const [proofNote, setProofNote] = useState(row.mandate_proof_note || "");
  const [localError, setLocalError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!row.mandate_id) throw new Error("This entity does not have a mandate row for today.");
      if ((status === "done" || status === "verified") && !proofUrl.trim() && !proofNote.trim()) {
        throw new Error("Proof is required before a mandate can be marked done or verified.");
      }
      const { error } = await supabase
        .from("enterprise_daily_mandates")
        .update({
          status,
          proof_url: proofUrl.trim() || null,
          proof_note: proofNote.trim() || null,
          completed_at: status === "done" || status === "verified" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.mandate_id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["enterprise-control-cycle"] });
      onClose();
    },
    onError: (error: Error) => setLocalError(error.message),
  });

  return (
    <div className="mt-4 rounded-2xl border border-primary/20 bg-background p-4">
      <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
        <label className="space-y-1.5">
          <span className="text-[9px] font-bold uppercase tracking-[.14em] text-muted-foreground">Mandate status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as MandateStatus)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-xs">
            {STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-[9px] font-bold uppercase tracking-[.14em] text-muted-foreground">Proof URL</span>
          <input value={proofUrl} onChange={(event) => setProofUrl(event.target.value)} placeholder="https://... live URL, file, deployment, CRM proof" className="h-10 w-full rounded-lg border border-border bg-card px-3 text-xs outline-none focus:border-primary/50" />
        </label>
      </div>
      <label className="mt-4 block space-y-1.5">
        <span className="text-[9px] font-bold uppercase tracking-[.14em] text-muted-foreground">Proof note / actual output</span>
        <textarea value={proofNote} onChange={(event) => setProofNote(event.target.value)} rows={3} placeholder="What actually shipped, changed, sold, launched, tested, contacted, or moved?" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs leading-5 outline-none focus:border-primary/50" />
      </label>
      {localError && <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{localError}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted">Cancel</button>
        <button onClick={() => { setLocalError(""); mutation.mutate(); }} disabled={mutation.isPending} className="rounded-lg bg-primary px-4 py-2 text-xs font-black text-primary-foreground disabled:opacity-50">
          {mutation.isPending ? "Saving…" : "Save proof + status"}
        </button>
      </div>
    </div>
  );
}

function EntityRow({ row }: { row: ControlRow }) {
  const [editing, setEditing] = useState(false);
  const overdue = isOverdue(row.next_update_due_at);
  const noHeartbeat = row.agents_active > 0 && row.agents_recent_heartbeat === 0;
  const proofMissing = (row.mandate_status === "done" || row.mandate_status === "verified") && !row.mandate_proof_url && !row.mandate_proof_note;

  return (
    <div className={cn("rounded-2xl border bg-card p-4", row.command_health === "red" ? "border-red-500/30" : row.command_health === "yellow" ? "border-amber-500/25" : "border-border/60")}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <HealthPill health={row.command_health} />
            <StatusPill status={row.mandate_status} />
            <span className="text-[9px] font-bold uppercase tracking-[.12em] text-muted-foreground">{row.execution_priority}</span>
            {overdue && <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-red-700 dark:text-red-300">4-hour update overdue</span>}
            {noHeartbeat && <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-red-700 dark:text-red-300">no recent agent heartbeat</span>}
          </div>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-lg font-black tracking-[-.025em]">{row.entity_name}</h3>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">{row.division}</p>
          </div>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{row.entity_operational_state.replaceAll("_", " ")}</p>

          <div className="mt-4 rounded-xl border border-border/60 bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[9px] font-black uppercase tracking-[.15em] text-muted-foreground">Today&apos;s primary mandate</p>
              <p className={cn("text-[9px] font-bold uppercase tracking-wider", isOverdue(row.mandate_due_at) && row.mandate_status !== "verified" ? "text-red-600" : "text-muted-foreground")}>
                Due {formatTime(row.mandate_due_at)}
              </p>
            </div>
            <p className="mt-2 text-sm font-semibold leading-6">{row.mandate || "No daily mandate is attached."}</p>
            <p className="mt-2 text-[10px] text-muted-foreground">Owner: {row.mandate_owner || "AI + assigned owner"}</p>
            {proofMissing && <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-red-600">Completion rejected: proof is missing.</p>}
            {(row.mandate_proof_url || row.mandate_proof_note) && (
              <div className="mt-3 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                {row.mandate_proof_note && <p className="leading-5">{row.mandate_proof_note}</p>}
                {row.mandate_proof_url && (
                  <a href={row.mandate_proof_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-bold text-primary hover:underline">
                    Open proof <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[500px]">
          <MiniMetric label="Executing / Verified" value={`${row.executing_or_verified}/${row.operation_count}`} bad={row.executing_or_verified === 0} />
          <MiniMetric label="Configured Idle" value={String(row.configured_not_running)} warn={row.configured_not_running > 0} />
          <MiniMetric label="Blocked / Failed" value={`${row.blocked_operations}/${row.failed_operations}`} bad={row.blocked_operations > 0 || row.failed_operations > 0} />
          <MiniMetric label="Agent Heartbeat" value={`${row.agents_recent_heartbeat}/${row.agents_active}`} bad={noHeartbeat} />
          <MiniMetric label="Stale Ops" value={String(row.stale_operations)} warn={row.stale_operations > 0} />
          <MiniMetric label="Platforms" value={`${row.required_platforms_verified}/${row.required_platforms}`} warn={row.required_platforms_attention > 0} />
          <MiniMetric label="Last Progress" value={formatTime(row.last_progress_at)} />
          <MiniMetric label="Next Control" value={formatTime(row.next_update_due_at)} bad={overdue} />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button onClick={() => setEditing((value) => !value)} className="rounded-lg border border-border bg-background px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] hover:border-primary/40 hover:text-primary">
          {editing ? "Close update" : "Update status + proof"}
        </button>
      </div>
      {editing && <MandateEditor row={row} onClose={() => setEditing(false)} />}
    </div>
  );
}

function MiniMetric({ label, value, bad = false, warn = false }: { label: string; value: string; bad?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-3">
      <p className="text-[8px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</p>
      <p className={cn("mt-1.5 text-sm font-black", bad ? "text-red-600 dark:text-red-300" : warn ? "text-amber-600 dark:text-amber-300" : "text-foreground")}>{value}</p>
    </div>
  );
}

export default function EnterpriseControl() {
  const [search, setSearch] = useState("");
  const [division, setDivision] = useState("all");
  const [health, setHealth] = useState<"all" | Health>("all");
  const [status, setStatus] = useState<"all" | MandateStatus>("all");

  const query = useQuery({
    queryKey: ["enterprise-control-cycle"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_enterprise_command_center_v2").select("*");
      if (error) throw error;
      return (data || []) as ControlRow[];
    },
    refetchInterval: 60_000,
  });

  const rows = query.data || [];
  const divisions = useMemo(() => Array.from(new Set(rows.map((row) => row.division))).sort(), [rows]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return [...rows]
      .filter((row) => !needle || row.entity_name.toLowerCase().includes(needle) || row.division.toLowerCase().includes(needle))
      .filter((row) => division === "all" || row.division === division)
      .filter((row) => health === "all" || row.command_health === health)
      .filter((row) => status === "all" || (row.mandate_status || "todo") === status)
      .sort((a, b) => HEALTH_ORDER[a.command_health] - HEALTH_ORDER[b.command_health] || Number(isOverdue(b.next_update_due_at)) - Number(isOverdue(a.next_update_due_at)) || a.division.localeCompare(b.division) || a.entity_name.localeCompare(b.entity_name));
  }, [rows, search, division, health, status]);

  const stats = useMemo(() => {
    const red = rows.filter((row) => row.command_health === "red").length;
    const yellow = rows.filter((row) => row.command_health === "yellow").length;
    const green = rows.filter((row) => row.command_health === "green").length;
    const running = rows.filter((row) => row.executing_or_verified > 0).length;
    const stalled = rows.filter((row) => row.executing_or_verified === 0 && row.operation_count > 0).length;
    const overdue = rows.filter((row) => isOverdue(row.next_update_due_at)).length;
    const proofComplete = rows.filter((row) => (row.mandate_status === "done" || row.mandate_status === "verified") && Boolean(row.mandate_proof_url || row.mandate_proof_note)).length;
    return { red, yellow, green, running, stalled, overdue, proofComplete };
  }, [rows]);

  const divisionRollup = useMemo(() => divisions.map((name) => {
    const items = rows.filter((row) => row.division === name);
    return {
      name,
      total: items.length,
      red: items.filter((row) => row.command_health === "red").length,
      yellow: items.filter((row) => row.command_health === "yellow").length,
      green: items.filter((row) => row.command_health === "green").length,
    };
  }).sort((a, b) => b.red - a.red || b.yellow - a.yellow || a.name.localeCompare(b.name)), [rows, divisions]);

  return (
    <div className="mx-auto max-w-[1700px] space-y-5 animate-fade-in">
      <section className="rounded-3xl border border-border/60 bg-card p-5 sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[9px] font-black uppercase tracking-[.16em] text-primary">
                <Activity className="h-3 w-3" /> 4-Hour Control Cycle
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[.14em] text-muted-foreground">Parallel Enterprise Operating System</span>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-[-.045em] sm:text-4xl">Every active entity moves. Every completion requires proof.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              This is the founder control layer above ClickUp and GHL. It does not confuse configured systems with operating systems. Red entities are handled first, then yellow. Green requires verified execution and a closed daily mandate with proof.
            </p>
          </div>
          <button onClick={() => query.refetch()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-xs font-black uppercase tracking-wider hover:border-primary/40">
            <RefreshCcw className={cn("h-3.5 w-3.5", query.isFetching && "animate-spin")} /> Refresh truth
          </button>
        </div>

        {query.error && (
          <div className="mt-5 flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-700 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div><p className="text-sm font-black">Command-center feed is blocked.</p><p className="mt-1 text-xs">{String((query.error as Error).message)}</p></div>
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Kpi label="Entities in cycle" value={rows.length} note="Active + readiness scope" />
        <Kpi label="Red" value={stats.red} note="Blocked / failed / mandate blocked" tone="red" />
        <Kpi label="Yellow" value={stats.yellow} note="Incomplete or not executing" tone="yellow" />
        <Kpi label="Green" value={stats.green} note="Verified execution + mandate" tone="green" />
        <Kpi label="Actually moving" value={stats.running} note="Has executing / verified ops" />
        <Kpi label="Stalled" value={stats.stalled} note="Configured but 0 executing" tone={stats.stalled ? "red" : "green"} />
        <Kpi label="Proof complete" value={stats.proofComplete} note={`${stats.overdue} control updates overdue`} tone={stats.overdue ? "yellow" : "green"} />
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.15em]"><Workflow className="h-3.5 w-3.5 text-primary" /> Division pressure map</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {divisionRollup.map((item) => (
            <button key={item.name} onClick={() => setDivision(item.name)} className="rounded-xl border border-border/60 bg-background p-3 text-left hover:border-primary/35">
              <p className="truncate text-xs font-black">{item.name}</p>
              <div className="mt-2 flex items-center gap-2 text-[10px] font-bold">
                <span className="text-red-600">R {item.red}</span><span className="text-amber-600">Y {item.yellow}</span><span className="text-emerald-600">G {item.green}</span><span className="ml-auto text-muted-foreground">{item.total}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="grid gap-2 lg:grid-cols-[1fr_220px_150px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search entity or division" className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs outline-none focus:border-primary/40" />
          </div>
          <select value={division} onChange={(event) => setDivision(event.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-xs">
            <option value="all">All divisions</option>
            {divisions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={health} onChange={(event) => setHealth(event.target.value as "all" | Health)} className="h-10 rounded-xl border border-border bg-background px-3 text-xs">
            <option value="all">All health</option><option value="red">Red</option><option value="yellow">Yellow</option><option value="green">Green</option>
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value as "all" | MandateStatus)} className="h-10 rounded-xl border border-border bg-background px-3 text-xs">
            <option value="all">All mandate statuses</option>{STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Red first</span>
          <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {stats.overdue} overdue</span>
          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> heartbeat enforced</span>
          <span className="inline-flex items-center gap-1"><Target className="h-3 w-3" /> proof required</span>
          {(division !== "all" || health !== "all" || status !== "all" || search) && <button onClick={() => { setDivision("all"); setHealth("all"); setStatus("all"); setSearch(""); }} className="ml-auto font-black uppercase tracking-wider text-primary hover:underline">Clear filters</button>}
        </div>
      </section>

      <section className="space-y-3">
        {query.isLoading ? (
          <div className="rounded-2xl border border-border/60 bg-card p-10 text-center text-sm text-muted-foreground">Loading enterprise truth…</div>
        ) : filtered.length ? filtered.map((row) => <EntityRow key={row.enterprise_entity_id} row={row} />) : (
          <div className="rounded-2xl border border-border/60 bg-card p-10 text-center">
            <CheckCircle2 className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-sm font-black">No entities match this filter.</p>
          </div>
        )}
      </section>
    </div>
  );
}
