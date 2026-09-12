import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Clock3,
  Database,
  ExternalLink,
  Gauge,
  Layers3,
  PauseCircle,
  RefreshCcw,
  ShieldCheck,
  Workflow,
  XCircle,
} from "lucide-react";
import {
  asNumber,
  DepartmentExecutionRow,
  EntityExecutionRow,
  fetchExecutionDashboard,
  FounderExecutionSummary,
  PlatformExecutionRow,
} from "@/lib/execution-dashboard";
import { cn } from "@/lib/utils";

const STATE_LABELS: Record<string, string> = {
  operational_verified: "Operational · Verified",
  partial_execution: "Partial Execution",
  configured_not_running: "Configured · Not Running",
  blocked: "Blocked / Failed",
  not_configured: "Not Configured",
  paused: "Parked",
  running_verified: "Running · Verified",
  running: "Running",
  stale: "Stale",
  failed: "Failed",
  n_a_by_plan: "N/A by Plan",
};

const PLATFORM_LABELS: Record<string, string> = {
  ghl: "GHL",
  drive_icloud: "Drive / iCloud",
  email: "Email",
  instagram: "Instagram",
  tiktok: "TikTok",
  clickup: "ClickUp",
  team_updates: "Team Updates",
  shopify: "Shopify",
  amazon: "Amazon",
  eventbrite: "Eventbrite",
  pr: "PR",
  seo_geo_aeo: "SEO / GEO / AEO",
  sales: "Sales",
  conversation_close: "Conversation / Close",
  github: "GitHub",
  vercel: "Vercel",
  supabase: "Supabase",
};

const DEPARTMENT_LABELS: Record<string, string> = {
  executive_strategy: "Executive Strategy",
  growth_marketing: "Growth & Marketing",
  sales_partnerships: "Sales & Partnerships",
  operations_fulfillment: "Operations & Fulfillment",
  technology_data_automation: "Technology, Data & Automation",
  creative_media: "Creative & Media",
  customer_community: "Customer & Community",
  finance_treasury: "Finance & Treasury",
  legal_compliance_risk: "Legal, Compliance & Risk",
  people_talent_training: "People, Talent & Training",
  events_activations: "Events & Activations",
  product_brand: "Product & Brand",
  capital_ma_expansion: "Capital & Expansion",
};

function stateTone(state: string) {
  if (state === "operational_verified" || state === "running_verified") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (state === "partial_execution" || state === "running") return "border-blue-200 bg-blue-50 text-blue-800";
  if (state === "blocked" || state === "failed") return "border-red-200 bg-red-50 text-red-800";
  if (state === "configured_not_running" || state === "stale" || state === "not_configured") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-border bg-muted/40 text-muted-foreground";
}

function stateIcon(state: string) {
  if (state === "operational_verified" || state === "running_verified") return CheckCircle2;
  if (state === "blocked" || state === "failed") return XCircle;
  if (state === "partial_execution" || state === "running") return Activity;
  if (state === "paused" || state === "n_a_by_plan") return PauseCircle;
  return CircleDashed;
}

function formatTime(value?: string | null) {
  if (!value) return "No proof yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function friendlyJson(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => (typeof item === "string" ? item : JSON.stringify(item)));
  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    if (Array.isArray(objectValue.complete_when)) return objectValue.complete_when.map(String);
    return Object.entries(objectValue).map(([key, item]) => `${key.replaceAll("_", " ")}: ${typeof item === "string" ? item : JSON.stringify(item)}`);
  }
  return [String(value)];
}

function StatusPill({ state }: { state: string }) {
  const Icon = stateIcon(state);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em]", stateTone(state))}>
      <Icon className="h-3 w-3" />
      {STATE_LABELS[state] || state.replaceAll("_", " ")}
    </span>
  );
}

function SummaryCard({ label, value, note, tone = "default" }: { label: string; value: number; note: string; tone?: "default" | "good" | "warn" | "bad" }) {
  const toneClass = tone === "good" ? "border-emerald-200" : tone === "bad" ? "border-red-200" : tone === "warn" ? "border-amber-200" : "border-border/60";
  return (
    <div className={cn("rounded-2xl border bg-card p-4", toneClass)}>
      <p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">{label}</p>
      <div className="mt-2 text-3xl font-black tracking-[-.04em] text-foreground">{value}</div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}

function ActionPlan({ plan }: { plan: DepartmentExecutionRow["action_plans"][number] }) {
  const [open, setOpen] = useState(false);
  const assets = friendlyJson(plan.assets_needed);
  const process = friendlyJson(plan.process_plan);
  const done = friendlyJson(plan.completion_definition);
  const stuck = friendlyJson(plan.stuck_playbook);

  return (
    <div className="rounded-xl border border-border/60 bg-background">
      <button className="flex w-full items-start gap-3 p-3 text-left" onClick={() => setOpen((value) => !value)}>
        <div className="mt-0.5 rounded-lg border border-border/60 bg-muted/40 p-1.5">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-foreground">{plan.lane_key.replaceAll("_", " ")}</p>
            <StatusPill state={plan.status} />
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{plan.goal}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm font-black">{plan.progress_percent || 0}%</p>
          <p className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">Last proof</p>
          <p className="text-[10px] text-muted-foreground">{formatTime(plan.latest_proof_at)}</p>
        </div>
      </button>

      {open && (
        <div className="grid gap-4 border-t border-border/50 p-4 lg:grid-cols-2">
          <PlanBlock title="Things / Assets Needed" items={assets} empty="Inputs are not yet defined." />
          <PlanBlock title="Completion Definition" items={done} empty="Completion gate is missing." />
          <PlanBlock title="Process Plan" items={process} empty="Process plan is missing." numbered />
          <PlanBlock title="When Stuck / Confused" items={stuck} empty="Escalation playbook is missing." />
          <div className="rounded-lg bg-muted/35 p-3 lg:col-span-2">
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniFact label="Progress Update" value={plan.last_progress_summary || "No progress report yet"} />
              <MiniFact label="Next Update Due" value={formatTime(plan.next_update_due_at)} />
              <MiniFact label="Cycle Deadline" value={formatTime(plan.cycle_deadline_at)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanBlock({ title, items, empty, numbered = false }: { title: string; items: string[]; empty: string; numbered?: boolean }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">{title}</p>
      {items.length ? (
        <div className="space-y-1.5">
          {items.map((item, index) => (
            <div key={`${title}-${index}`} className="flex gap-2 text-xs leading-5 text-foreground/80">
              <span className="font-mono text-[10px] text-muted-foreground">{numbered ? `${index + 1}.` : "•"}</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-amber-700">{empty}</p>
      )}
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs leading-5 text-foreground">{value}</p>
    </div>
  );
}

export default function ExecutionDashboard() {
  const [selectedEntityKey, setSelectedEntityKey] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [showParked, setShowParked] = useState(false);

  const founderQuery = useQuery({
    queryKey: ["execution-dashboard-founder"],
    queryFn: () => fetchExecutionDashboard<FounderExecutionSummary>("founder"),
    refetchInterval: 60_000,
  });

  const entitiesQuery = useQuery({
    queryKey: ["execution-dashboard-entities", showParked],
    queryFn: () => fetchExecutionDashboard<EntityExecutionRow[]>("entities", { includeParked: showParked }),
    refetchInterval: 60_000,
  });

  const entityQuery = useQuery({
    queryKey: ["execution-dashboard-entity", selectedEntityKey],
    queryFn: () => fetchExecutionDashboard<EntityExecutionRow | null>("entity", { entityKey: selectedEntityKey }),
    enabled: Boolean(selectedEntityKey),
    refetchInterval: 60_000,
  });

  const departmentsQuery = useQuery({
    queryKey: ["execution-dashboard-departments", selectedEntityKey],
    queryFn: () => fetchExecutionDashboard<DepartmentExecutionRow[]>("departments", { entityKey: selectedEntityKey }),
    enabled: Boolean(selectedEntityKey),
    refetchInterval: 60_000,
  });

  const platformsQuery = useQuery({
    queryKey: ["execution-dashboard-platforms", selectedEntityKey],
    queryFn: () => fetchExecutionDashboard<PlatformExecutionRow[]>("platforms", { entityKey: selectedEntityKey }),
    enabled: Boolean(selectedEntityKey),
    refetchInterval: 60_000,
  });

  const entities = entitiesQuery.data || [];
  const divisions = useMemo(() => Array.from(new Set(entities.map((entity) => entity.division))).sort(), [entities]);

  const sortedEntities = useMemo(() => {
    const weight: Record<string, number> = { blocked: 0, not_configured: 1, configured_not_running: 2, partial_execution: 3, operational_verified: 4, paused: 5 };
    return [...entities]
      .filter((entity) => divisionFilter === "all" || entity.division === divisionFilter)
      .filter((entity) => stateFilter === "all" || entity.entity_operational_state === stateFilter)
      .sort((a, b) => (weight[a.entity_operational_state] ?? 9) - (weight[b.entity_operational_state] ?? 9) || a.entity_name.localeCompare(b.entity_name));
  }, [entities, divisionFilter, stateFilter]);

  useEffect(() => {
    if (!selectedEntityKey && entities.length) {
      const firstAttention = entities.find((entity) => entity.entity_operational_state === "blocked") || entities[0];
      setSelectedEntityKey(firstAttention.entity_key);
    }
  }, [entities, selectedEntityKey]);

  const selectedEntity = entityQuery.data || entities.find((entity) => entity.entity_key === selectedEntityKey) || null;
  const founder = founderQuery.data;
  const anyError = founderQuery.error || entitiesQuery.error || entityQuery.error || departmentsQuery.error || platformsQuery.error;

  const refreshAll = () => {
    founderQuery.refetch();
    entitiesQuery.refetch();
    if (selectedEntityKey) {
      entityQuery.refetch();
      departmentsQuery.refetch();
      platformsQuery.refetch();
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 animate-fade-in">
      <section className="rounded-3xl border border-border/60 bg-card p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-primary">
              <Gauge className="h-3.5 w-3.5" />
              Execution Control Plane
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-[-.045em] text-foreground sm:text-4xl">One entity at a time. Proof over promises.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              This screen separates configured systems from verified execution. An agent heartbeat, task, campaign draft, or deployment does not count as completion without the required proof and closeout.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-[.14em] text-muted-foreground">Last enterprise proof</p>
              <p className="mt-1 text-xs font-semibold">{formatTime(founder?.latest_enterprise_execution_proof_at)}</p>
            </div>
            <button onClick={refreshAll} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background px-3 text-xs font-bold hover:bg-muted">
              <RefreshCcw className={cn("h-3.5 w-3.5", (founderQuery.isFetching || entitiesQuery.isFetching) && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {anyError && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-bold">Execution truth feed needs attention.</p>
              <p className="mt-1 text-xs">{String((anyError as Error)?.message || anyError)}</p>
            </div>
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Verified Operational" value={asNumber(founder?.operational_verified)} note="Proof meets the current operating gate." tone="good" />
        <SummaryCard label="Partial" value={asNumber(founder?.partial_execution)} note="Some proof exists; required systems still missing." />
        <SummaryCard label="Configured, Not Running" value={asNumber(founder?.configured_not_running)} note="Built on paper, but no current execution proof." tone="warn" />
        <SummaryCard label="Blocked" value={asNumber(founder?.blocked)} note="Failed or blocked work requires recovery." tone="bad" />
        <SummaryCard label="Not Configured" value={asNumber(founder?.not_configured)} note="Control plan still needs to be built." tone="warn" />
        <SummaryCard label="Verified Ops" value={asNumber(founder?.operations_executing_or_verified)} note={`${asNumber(founder?.operations_in_scope)} operations currently in scope.`} />
      </section>

      <section className="grid min-h-[720px] gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-border/60 bg-card p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <p className="text-xs font-black uppercase tracking-[.14em]">Entities</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Each is scored independently.</p>
            </div>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="grid grid-cols-2 gap-2 pb-3">
            <select value={divisionFilter} onChange={(event) => setDivisionFilter(event.target.value)} className="rounded-lg border border-border bg-background px-2 py-2 text-[11px] font-semibold">
              <option value="all">All divisions</option>
              {divisions.map((division) => <option key={division} value={division}>{division}</option>)}
            </select>
            <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)} className="rounded-lg border border-border bg-background px-2 py-2 text-[11px] font-semibold">
              <option value="all">All states</option>
              <option value="blocked">Blocked</option>
              <option value="not_configured">Not configured</option>
              <option value="configured_not_running">Not running</option>
              <option value="partial_execution">Partial</option>
              <option value="operational_verified">Verified</option>
              <option value="paused">Parked</option>
            </select>
          </div>

          <label className="mb-3 flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-2 text-[10px] font-semibold text-muted-foreground">
            <input type="checkbox" checked={showParked} onChange={(event) => setShowParked(event.target.checked)} />
            Show parked / old event queue
          </label>

          <div className="max-h-[610px] space-y-1.5 overflow-auto pr-1">
            {sortedEntities.map((entity) => {
              const selected = entity.entity_key === selectedEntityKey;
              return (
                <button key={entity.entity_key} onClick={() => setSelectedEntityKey(entity.entity_key)} className={cn("w-full rounded-xl border p-3 text-left transition", selected ? "border-primary/40 bg-primary/[.06]" : "border-transparent bg-muted/30 hover:border-border hover:bg-muted/55")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{entity.entity_name}</p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{entity.division}</p>
                    </div>
                    <ChevronRight className={cn("mt-1 h-3.5 w-3.5 shrink-0", selected ? "text-primary" : "text-muted-foreground/40")} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <StatusPill state={entity.entity_operational_state} />
                    <span className="text-[9px] font-mono text-muted-foreground">{entity.executing_or_verified}/{entity.operation_count} verified</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          {selectedEntity ? (
            <>
              <section className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 max-w-3xl">
                    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">{selectedEntity.division}</p>
                    <h2 className="mt-1 text-2xl font-black tracking-[-.035em]">{selectedEntity.entity_name}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedEntity.focus_reason}</p>
                  </div>
                  <div className="shrink-0"><StatusPill state={selectedEntity.entity_operational_state} /></div>
                </div>

                <div className="mt-5 rounded-xl border border-border/50 bg-muted/30 p-4">
                  <p className="text-xs font-bold">What the system is saying</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{selectedEntity.founder_status_explanation}</p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
                  <MiniMetric label="Operations" value={selectedEntity.operation_count} />
                  <MiniMetric label="Verified / Running" value={selectedEntity.executing_or_verified} good={selectedEntity.executing_or_verified > 0} />
                  <MiniMetric label="Configured Only" value={selectedEntity.configured_not_running} warn={selectedEntity.configured_not_running > 0} />
                  <MiniMetric label="Blocked" value={selectedEntity.blocked_operations} bad={selectedEntity.blocked_operations > 0} />
                  <MiniMetric label="Failed" value={selectedEntity.failed_operations} bad={selectedEntity.failed_operations > 0} />
                  <MiniMetric label="Active Agents" value={selectedEntity.agents_active} />
                  <MiniMetric label="Recent Heartbeats" value={selectedEntity.agents_recent_heartbeat} good={selectedEntity.agents_recent_heartbeat > 0} />
                </div>
              </section>

              <section className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.14em]">Platform Operating Proof</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">A connected account is not the same as current execution.</p>
                  </div>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {(platformsQuery.data || []).map((platform) => (
                    <div key={platform.platform_key} className="rounded-xl border border-border/60 bg-background p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-black">{PLATFORM_LABELS[platform.platform_key] || platform.platform_key}</p>
                          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{platform.applicability.replaceAll("_", " ")}</p>
                        </div>
                        <StatusPill state={platform.platform_state} />
                      </div>
                      <p className="mt-2 line-clamp-3 text-[11px] leading-5 text-muted-foreground">{platform.operational_definition}</p>
                      <div className="mt-3 border-t border-border/40 pt-2">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Latest attributable proof</p>
                        <p className="mt-1 text-[10px] font-semibold">{formatTime(platform.latest_any_proof_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.14em]">Department Dashboards</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Every department keeps its own action plan, proof, blocker and completion gate.</p>
                  </div>
                  <Layers3 className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="mt-4 space-y-3">
                  {(departmentsQuery.data || []).map((department) => (
                    <DepartmentCard key={department.department_key || "unassigned"} department={department} />
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className="grid min-h-[500px] place-items-center rounded-2xl border border-dashed border-border bg-card">
              <div className="text-center">
                <Workflow className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-3 text-sm font-bold">Choose an entity.</p>
                <p className="mt-1 text-xs text-muted-foreground">Its execution stays isolated from every other brand.</p>
              </div>
            </div>
          )}
        </main>
      </section>
    </div>
  );
}

function MiniMetric({ label, value, good, warn, bad }: { label: string; value: number; good?: boolean; warn?: boolean; bad?: boolean }) {
  return (
    <div className={cn("rounded-xl border bg-background p-3", good && "border-emerald-200", warn && "border-amber-200", bad && "border-red-200")}>
      <p className="text-[9px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-mono text-xl font-black", good && "text-emerald-700", warn && "text-amber-700", bad && "text-red-700")}>{value || 0}</p>
    </div>
  );
}

function DepartmentCard({ department }: { department: DepartmentExecutionRow }) {
  const [open, setOpen] = useState(department.failed > 0 || department.blocked > 0);
  const departmentState = department.failed > 0 || department.blocked > 0
    ? "blocked"
    : department.verified_or_running > 0 && department.configured_not_running === 0
      ? "running_verified"
      : department.verified_or_running > 0
        ? "partial_execution"
        : "configured_not_running";

  return (
    <div className="rounded-xl border border-border/60 bg-background">
      <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen((value) => !value)}>
        <div className="rounded-lg border border-border/60 bg-muted/40 p-1.5">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">{DEPARTMENT_LABELS[department.department_key || ""] || (department.department_key || "Unassigned").replaceAll("_", " ")}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{department.operation_count} active plans · latest proof {formatTime(department.latest_proof_at)}</p>
        </div>
        <StatusPill state={departmentState} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-border/50 p-3">
          {department.action_plans.map((plan) => <ActionPlan key={plan.lane_key} plan={plan} />)}
        </div>
      )}
    </div>
  );
}
