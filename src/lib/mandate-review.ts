export type ReviewContext = {
  version: 1; mandate_id: string; enterprise_entity_id: string;
  expected_updated_at: string; status: string; submission_revision: number;
  evidence_url: string | null; evidence_note: string | null;
  can_review: boolean; hold_reason: string | null;
  is_submitter: boolean | null; verification_current: boolean;
};
export function httpsEvidence(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? value : null; } catch { return null; }
}
export function parseReviewContext(input: unknown, entityId: string, mandateId: string): ReviewContext {
  if (!input || typeof input !== 'object') throw new Error('Review context unavailable.');
  const r = input as ReviewContext;
  if (r.version !== 1 || r.enterprise_entity_id !== entityId || r.mandate_id !== mandateId) throw new Error('Review identity mismatch; no action is permitted.');
  if (typeof r.expected_updated_at !== 'string' || !Number.isFinite(Date.parse(r.expected_updated_at))) throw new Error('Review revision timestamp missing.');
  if (!Number.isSafeInteger(r.submission_revision) || r.submission_revision < 0) throw new Error('Review revision invalid.');
  if (typeof r.can_review !== 'boolean' || typeof r.verification_current !== 'boolean' || (r.is_submitter !== null && typeof r.is_submitter !== 'boolean')) throw new Error('Review authorization state invalid.');
  if (!['todo','in_progress','blocked','done','verified'].includes(r.status)) throw new Error('Review status invalid.');
  for (const k of ['evidence_url','evidence_note','hold_reason'] as const) if (r[k] !== null && typeof r[k] !== 'string') throw new Error('Review evidence shape invalid.');
  if (r.verification_current && r.status !== 'verified') throw new Error('Inconsistent verification state.');
  return r;
}
export function makeReviewRequest(c: ReviewContext, decision: 'approved' | 'revise', note: string, sourceChecked: boolean) {
  if (!c.can_review || c.status !== 'done' || c.is_submitter !== false) throw new Error('An independent authorized reviewer is required.');
  if (!sourceChecked) throw new Error('Review the source and acceptance criteria before recording a decision.');
  if (!httpsEvidence(c.evidence_url) || !c.evidence_note || c.evidence_note.trim().length < 40) throw new Error('The submitted source or result note is incomplete.');
  if (!['approved','revise'].includes(decision) || note.trim().length < 40) throw new Error('A substantive review decision and explanation are required.');
  return {p_mandate_id:c.mandate_id,p_expected_updated_at:c.expected_updated_at,p_decision:decision,p_review_note:note.trim(),p_source_url:c.evidence_url};
}
