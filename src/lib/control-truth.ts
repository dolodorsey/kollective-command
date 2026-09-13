export type MandateStatus = "todo" | "in_progress" | "blocked" | "done" | "verified";
export type ControlRow = {
  enterprise_entity_id: string;
  entity_key: string;
  entity_name: string;
  division: string;
  execution_state: string;
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
  last_progress_at: string | null;
  latest_execution_proof_at: string | null;
  next_update_due_at: string | null;
  mandate_id: string | null;
  mandate_date: string | null;
  mandate: string | null;
  mandate_owner: string | null;
  mandate_status: MandateStatus | null;
  mandate_proof_url: string | null;
  mandate_proof_note: string | null;
  mandate_due_at: string | null;
  mandate_last_updated_at: string | null;
  mandate_is_carryover: boolean;
  control_cycle_date: string;
  open_mandate_count: number;
};

export function overdue(value: string | null | undefined, now = Date.now()): boolean {
  if (!value) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && time < now;
}

export function safeProofUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function proofState(row: Pick<ControlRow, "mandate_status" | "mandate_proof_url" | "mandate_proof_note">): string {
  const supplied = Boolean(row.mandate_proof_url?.trim() || row.mandate_proof_note?.trim());
  if (!supplied) return row.mandate_status === "done" || row.mandate_status === "verified" ? "Unsupported completion claim" : "No mandate evidence";
  return row.mandate_status === "verified" ? "Legacy verified claim; independent review not supplied" : "Evidence submitted; independent review pending";
}

export function parseControlRows(value: unknown): ControlRow[] {
  if (!Array.isArray(value)) throw new Error("Control feed did not return an array.");
  const seen = new Set<string>();
  const counters = ["operation_count", "executing_or_verified", "configured_not_running", "blocked_operations", "failed_operations", "stale_operations", "agents_active", "agents_recent_heartbeat", "open_mandate_count"] as const;
  return value.map((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid control record.");
    const row = { ...input } as Record<string, unknown>;
    for (const key of ["enterprise_entity_id", "entity_key", "entity_name", "division", "execution_state", "entity_operational_state", "control_cycle_date"]) {
      if (typeof row[key] !== "string" || !String(row[key]).trim()) throw new Error(`Missing ${key} in control feed.`);
    }
    const id = String(row.enterprise_entity_id);
    if (seen.has(id)) throw new Error("Duplicate entity in control feed; totals withheld.");
    seen.add(id);
    for (const key of counters) {
      const n = Number(row[key]);
      if ((typeof row[key] !== "number" && typeof row[key] !== "string") || String(row[key]).trim() === "" || !Number.isFinite(n) || n < 0 || !Number.isInteger(n)) throw new Error(`Invalid ${key}; totals withheld.`);
      row[key] = n;
    }
    if (typeof row.mandate_is_carryover !== "boolean") throw new Error("Invalid carryover flag.");
    if (row.mandate_status != null && !["todo", "in_progress", "blocked", "done", "verified"].includes(String(row.mandate_status))) throw new Error("Unknown mandate status.");
    return row as unknown as ControlRow;
  });
}

export function makeMandateUpdate(row: ControlRow, status: MandateStatus, url: string, note: string, now = new Date()) {
  if (!row.mandate_id || !row.enterprise_entity_id || !row.mandate_last_updated_at) throw new Error("Missing mandate identity/version. Refresh the feed.");
  if (row.mandate_status === "verified") throw new Error("A verified claim requires an authorized review/reopen path; this editor cannot alter it.");
  if (!["todo", "in_progress", "blocked", "done"].includes(status)) throw new Error("Independent verification is not available through this editor.");
  const checkedUrl = url.trim() ? safeProofUrl(url) : null;
  if (url.trim() && !checkedUrl) throw new Error("Use an HTTPS proof URL without embedded credentials.");
  if (status === "done" && (!checkedUrl || note.trim().length < 40)) throw new Error("QA submission requires a source URL and a substantive result note of at least 40 characters.");
  return { status, proof_url: checkedUrl, proof_note: note.trim() || null, completed_at: null, updated_at: now.toISOString() };
}
