import { supabase } from "@/lib/supabase";

const DOT_FOCUS_OS_URL =
  "https://wfkohcwxxsrhcxhepfql.supabase.co/functions/v1/dot-focus-space-os";

export interface DigitalEmployeeCoverage {
  observed_at: string;
  dot_status: string;
  muse_status: string;
  coverage_state: string;
  primary_worker: string | null;
  backup_worker: string | null;
  dead_zone: boolean;
  details: Record<string, unknown>;
}

export interface DigitalEmployeeRosterRow {
  employee_key: string;
  display_name: string;
  system_name: string;
  role_title: string;
  coverage_mode: string;
  expected_heartbeat_minutes: number;
  takeover_after_minutes: number;
  primary_responsibilities: string[];
  active: boolean;
  updated_at: string;
}

export interface DeadExecutionRiskRow {
  entity_key: string;
  focus_group: string;
  focus_rank: number;
  last_progress_at: string | null;
  dead_execution_risk: boolean;
  open_work_count: number;
}

export interface OperatingTruthRow {
  entity_key: string;
  focus_group: string;
  focus_rank: number;
  applicable_daily_lanes: number;
  active_or_completed_lanes: number;
  blocked_lanes: number;
  queued_not_operating_lanes: number;
  proof_backed_lanes: number;
  reconciled_external_actions: number;
  operating_state: string;
}

export interface WorkerComponentRow {
  component_key: string;
  status: string;
  health_score: number;
  last_checked_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  metadata: Record<string, unknown>;
}

export interface DigitalWorkforcePayload {
  ok: boolean;
  schema_version: string;
  generated_at: string;
  counts: {
    focus_spaces: number;
    machine_ready: number;
    dead_execution_count?: number;
  };
  workforce?: {
    coverage: DigitalEmployeeCoverage | null;
    roster: DigitalEmployeeRosterRow[];
    dead_execution_risk: DeadExecutionRiskRow[];
    dead_execution_count: number;
    operating_truth: OperatingTruthRow[];
    worker_components: WorkerComponentRow[];
  };
}

export async function fetchDigitalWorkforce(): Promise<DigitalWorkforcePayload> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.access_token) {
    throw new Error("No authenticated command-center session.");
  }

  const response = await fetch(
    `${DOT_FOCUS_OS_URL}?workforce=true`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload?.error || `Digital workforce request failed (${response.status}).`,
    );
  }

  return payload as DigitalWorkforcePayload;
}
