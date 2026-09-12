import { supabase } from "@/lib/supabase";

const BOH_EXECUTION_DASHBOARD_URL =
  "https://wfkohcwxxsrhcxhepfql.supabase.co/functions/v1/agent-ops-dashboard";

export type ExecutionView = "founder" | "entities" | "entity" | "departments" | "platforms";

export type EntityOperationalState =
  | "operational_verified"
  | "partial_execution"
  | "configured_not_running"
  | "blocked"
  | "not_configured"
  | "paused";

export interface FounderExecutionSummary {
  generated_at: string;
  entities_in_scope: number | string;
  active_execution_entities: number | string;
  future_planning_entities: number | string;
  parked_entities: number | string;
  operational_verified: number | string;
  partial_execution: number | string;
  configured_not_running: number | string;
  blocked: number | string;
  not_configured: number | string;
  operations_in_scope: number | string;
  operations_executing_or_verified: number | string;
  failed_operations: number | string;
  blocked_operations: number | string;
  latest_enterprise_execution_proof_at: string | null;
  entity_rollup: Array<Record<string, unknown>>;
}

export interface EntityExecutionRow {
  enterprise_entity_id: string;
  entity_key: string;
  entity_name: string;
  division: string;
  directory_priority: string;
  execution_state: string;
  focus_reason: string;
  execution_priority: string;
  founder_update_required: boolean;
  update_cadence_hours: number;
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
  platform_states: Record<string, { state: string; applicability: string; owner?: string | null }>;
  entity_operational_state: EntityOperationalState;
  founder_status_explanation: string;
}

export interface DepartmentExecutionRow {
  entity_key: string;
  entity_name: string;
  division: string;
  execution_state: string;
  department_key: string | null;
  operation_count: number;
  verified_or_running: number;
  configured_not_running: number;
  blocked: number;
  failed: number;
  stale: number;
  last_progress_at: string | null;
  latest_proof_at: string | null;
  next_update_due_at: string | null;
  action_plans: Array<{
    lane_key: string;
    goal: string;
    status: string;
    progress_percent: number;
    assets_needed: unknown;
    process_plan: unknown;
    execution_plan: unknown;
    last_progress_summary: string | null;
    next_update_due_at: string | null;
    cycle_deadline_at: string | null;
    completion_definition: unknown;
    stuck_playbook: unknown;
    latest_proof_at: string | null;
  }>;
}

export interface PlatformExecutionRow {
  enterprise_entity_id: string;
  entity_key: string;
  entity_name: string;
  division: string;
  execution_state: string;
  platform_key: string;
  department_key: string | null;
  applicability: "required" | "conditional" | "not_applicable";
  owner_agent_key: string | null;
  proof_sla_hours: number;
  operational_definition: string;
  required_proof: unknown;
  platform_state: string;
  latest_any_proof_at: string | null;
  blocker_escalation: unknown;
  metadata: unknown;
}

export async function fetchExecutionDashboard<T>(
  view: ExecutionView,
  options?: { entityKey?: string; includeParked?: boolean },
): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.access_token) throw new Error("No authenticated command-center session.");

  const params = new URLSearchParams({ view });
  if (options?.entityKey) params.set("entity_key", options.entityKey);
  if (options?.includeParked) params.set("include_parked", "true");

  const response = await fetch(`${BOH_EXECUTION_DASHBOARD_URL}?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `Execution dashboard request failed (${response.status}).`);
  }
  return payload.data as T;
}

export const asNumber = (value: number | string | null | undefined) => Number(value || 0);
