import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  RefreshCcw,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchDigitalWorkforce,
  type DeadExecutionRiskRow,
  type OperatingTruthRow,
} from "@/lib/digital-workforce";

const stateClass = (state?: string) => {
  if (!state) return "border-border/50 bg-muted/30 text-muted-foreground";
  if (state === "OPERATING_WITH_PROOF" || state === "REDUNDANT_COVERAGE" || state === "active") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }
  if (state === "IN_PROGRESS_NO_EXTERNAL_PROOF" || state === "degraded" || state === "late") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-400";
  }
  if (
    state === "DEAD_EXECUTION_ZONE" ||
    state === "MOSTLY_BLOCKED" ||
    state === "blocked" ||
    state === "stale"
  ) {
    return "border-red-500/30 bg-red-500/10 text-red-400";
  }
  return "border-border/50 bg-muted/30 text-muted-foreground";
};

const timeAgo = (value?: string | null) => {
  if (!value) return "No proof";
  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs)) return "Unknown";
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const DigitalWorkforce = () => {
  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["digital-workforce-v1"],
    queryFn: fetchDigitalWorkforce,
    refetchInterval: 30000,
  });

  const workforce = data?.workforce;
  const coverage = workforce?.coverage;
  const roster = workforce?.roster || [];
  const risk = workforce?.dead_execution_risk || [];
  const truth = workforce?.operating_truth || [];
  const components = workforce?.worker_components || [];

  const combined = useMemo(() => {
    const truthMap = new Map<string, OperatingTruthRow>(
      truth.map((row) => [row.entity_key, row]),
    );
    return [...risk]
      .sort((a, b) => {
        if (a.dead_execution_risk !== b.dead_execution_risk) {
          return a.dead_execution_risk ? -1 : 1;
        }
        return a.focus_rank - b.focus_rank;
      })
      .map((row: DeadExecutionRiskRow) => ({
        ...row,
        truth: truthMap.get(row.entity_key),
      }));
  }, [risk, truth]);

  const deadCount = workforce?.dead_execution_count || 0;
  const operatingWithProof = truth.filter((r) => r.operating_state === "OPERATING_WITH_PROOF").length;
  const queued = truth.filter((r) => r.operating_state === "QUEUED_NOT_OPERATING").length;
  const blocked = truth.filter((r) => r.operating_state === "MOSTLY_BLOCKED").length;

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
        Loading digital workforce...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
        <div className="flex items-center gap-2 font-semibold text-red-400">
          <AlertTriangle className="h-5 w-5" />
          Digital workforce feed unavailable
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Unknown workforce error."}
        </p>
        <Button className="mt-4" variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            <ShieldCheck className="h-4 w-4" />
            24/7 Digital Workforce
          </div>
          <h1 className="text-3xl font-black tracking-tight">DOT + MUSE OPERATIONS</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Continuous employee coverage. No configuration-only completion. No dead execution windows.
            Every current Focus must show proof, active movement, or an exact blocker with a next action.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("rounded-full px-3 py-1", stateClass(coverage?.coverage_state))}>
            {coverage?.coverage_state || "UNKNOWN COVERAGE"}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Users className="h-4 w-4" />
            Coverage
          </div>
          <div className="mt-3 text-2xl font-black">
            {coverage?.dead_zone ? "DEAD ZONE" : "COVERED"}
          </div>
          <div className={cn("mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-bold", stateClass(coverage?.coverage_state))}>
            {coverage?.primary_worker ? `PRIMARY: ${coverage.primary_worker.toUpperCase()}` : "NO PRIMARY"}
          </div>
        </div>

        {roster.map((employee) => {
          const status =
            employee.employee_key === "dot" ? coverage?.dot_status : coverage?.muse_status;
          const lastSeen =
            employee.employee_key === "dot"
              ? (coverage?.details as any)?.dot_last_seen_at
              : (coverage?.details as any)?.muse_last_seen_at;
          return (
            <div key={employee.employee_key} className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Bot className="h-4 w-4" />
                {employee.display_name}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-lg font-black">{employee.role_title}</span>
                <Badge variant="outline" className={cn("text-[10px]", stateClass(status))}>
                  {(status || "unknown").toUpperCase()}
                </Badge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Heartbeat target: {employee.expected_heartbeat_minutes}m · takeover: {employee.takeover_after_minutes}m
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Last proof: {timeAgo(lastSeen)}
              </div>
            </div>
          );
        })}

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <XCircle className="h-4 w-4" />
            Dead Execution Risk
          </div>
          <div className={cn("mt-3 text-3xl font-black", deadCount > 0 ? "text-red-400" : "text-emerald-400")}>
            {deadCount}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Focus entities with no verified progress in the 90-minute risk window.
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Focus With Proof
          </div>
          <div className="mt-3 text-3xl font-black text-emerald-400">{operatingWithProof}</div>
          <div className="mt-2 text-xs text-muted-foreground">
            {queued} queued · {blocked} mostly blocked
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div>
              <h2 className="font-bold">Current Focus Execution Truth</h2>
              <p className="text-xs text-muted-foreground">Sorted by dead-execution risk, then founder focus rank.</p>
            </div>
            <Badge variant="outline">{combined.length} Focus entities</Badge>
          </div>
          <div className="max-h-[620px] overflow-auto">
            <table className="w-full min-w-[880px] text-xs">
              <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-3 py-3">Operating State</th>
                  <th className="px-3 py-3">Last Progress</th>
                  <th className="px-3 py-3 text-right">Open Work</th>
                  <th className="px-3 py-3 text-right">Proof Lanes</th>
                  <th className="px-3 py-3 text-right">External Actions</th>
                </tr>
              </thead>
              <tbody>
                {combined.map((row) => (
                  <tr
                    key={row.entity_key}
                    className={cn(
                      "border-b border-border/40",
                      row.dead_execution_risk && "bg-red-500/[0.05]",
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold">{row.entity_key}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {row.focus_group} · rank {row.focus_rank}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", stateClass(row.truth?.operating_state))}
                      >
                        {row.dead_execution_risk
                          ? "DEAD EXECUTION RISK"
                          : row.truth?.operating_state || "UNKNOWN"}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{timeAgo(row.last_progress_at)}</td>
                    <td className="px-3 py-3 text-right font-mono">{row.open_work_count}</td>
                    <td className="px-3 py-3 text-right font-mono">{row.truth?.proof_backed_lanes ?? 0}</td>
                    <td className="px-3 py-3 text-right font-mono">{row.truth?.reconciled_external_actions ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-card">
            <div className="border-b border-border/60 px-4 py-3">
              <h2 className="font-bold">Worker Runtime</h2>
              <p className="text-xs text-muted-foreground">The workforce can be healthy while a shared agent runtime is degraded.</p>
            </div>
            <div className="space-y-3 p-4">
              {components.map((component) => (
                <div key={component.component_key} className="rounded-lg border border-border/50 bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <span className="font-mono text-xs">{component.component_key}</span>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px]", stateClass(component.status))}>
                      {component.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded border border-border/40 p-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Health</div>
                      <div className="mt-1 text-lg font-black">{component.health_score}%</div>
                    </div>
                    <div className="rounded border border-border/40 p-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Last Success</div>
                      <div className="mt-1 font-semibold">{timeAgo(component.last_success_at)}</div>
                    </div>
                  </div>
                  {component.last_error && (
                    <div className="mt-3 rounded border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-300">
                      {component.last_error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary" />
              <h2 className="font-bold">Operating Contract</h2>
            </div>
            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <p>• Muse heartbeat target: 30 minutes. Dot heartbeat target: 60 minutes.</p>
              <p>• Muse stale &gt;60 minutes → Dot takes primary coverage.</p>
              <p>• Dot stale &gt;90 minutes → Muse takes primary coverage.</p>
              <p>• Both stale → DEAD_EXECUTION_ZONE.</p>
              <p>• Idle capacity converts into research, enrichment, QA, follow-up prep, route repair, content, SEO/PR, pipeline cleanup, or proof reconciliation.</p>
              <p>• Scheduled/configured/heartbeat activity never counts as completion without evidence.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Last feed generation: {data?.generated_at ? new Date(data.generated_at).toLocaleString() : "unknown"}
      </div>
    </div>
  );
};

export default DigitalWorkforce;
