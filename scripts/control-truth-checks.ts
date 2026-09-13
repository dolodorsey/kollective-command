import assert from 'node:assert/strict';
import { overdue, safeProofUrl, proofState, parseControlRows, makeMandateUpdate } from '../src/lib/control-truth.ts';
import type { ControlRow } from '../src/lib/control-truth.ts';
const fixture = { enterprise_entity_id: 'entity-a', entity_key: 'a', entity_name: 'A', division: 'Division A', execution_state: 'active_execution', entity_operational_state: 'configured_not_running', control_cycle_date: '2026-09-13', operation_count: 1, executing_or_verified: 0, configured_not_running: 1, blocked_operations: 0, failed_operations: 0, stale_operations: 0, agents_active: 1, agents_recent_heartbeat: 0, open_mandate_count: 1, mandate_id: 'original-id', mandate_date: '2026-09-12', mandate_owner: 'Existing owner', mandate_due_at: '2026-09-13T04:59:00Z', mandate_last_updated_at: '2026-09-12T21:33:00Z', mandate_status: 'todo', mandate_proof_url: null, mandate_proof_note: null, mandate_is_carryover: true } as ControlRow;
const tests: [string, () => void][] = [
 ['preserves mandate identity/date/owner/deadline', () => { const row = parseControlRows([fixture])[0]; for (const k of ['mandate_id','mandate_date','mandate_owner','mandate_due_at']) assert.equal(row[k as keyof ControlRow], fixture[k as keyof ControlRow]); }],
 ['rejects duplicate entities', () => assert.throws(() => parseControlRows([fixture, fixture]), /Duplicate/)],
 ['does not coerce unavailable counters to zero', () => assert.throws(() => parseControlRows([{...fixture, operation_count: null}]), /Invalid/)],
 ['rejects blank numeric counters', () => assert.throws(() => parseControlRows([{...fixture, operation_count:''}]), /Invalid/)],
 ['rejects an unknown mandate state', () => assert.throws(() => parseControlRows([{...fixture, mandate_status:'fictional'}]), /Unknown mandate/)],
 ['rejects a missing carryover flag', () => assert.throws(() => parseControlRows([{...fixture, mandate_is_carryover:undefined}]), /carryover/)],
 ['accepts numeric database counter strings', () => assert.equal(parseControlRows([{...fixture, operation_count:'1'}])[0].operation_count, 1)],
 ['invalid due dates are not fabricated overdue facts', () => assert.equal(overdue('invalid'), false)],
 ['overdue age follows original deadline', () => assert.equal(overdue(fixture.mandate_due_at, Date.parse('2026-09-13T09:00:00Z')), true)],
 ['javascript proof links rejected', () => assert.equal(safeProofUrl('javascript:alert(1)'), null)],
 ['embedded credentials rejected', () => assert.equal(safeProofUrl('https://user:pass@example.com'), null)],
 ['plain prose is not verified outcome', () => assert.match(proofState({...fixture, mandate_proof_note:'Someone said this was done.'}), /independent review pending/)],
 ['verified without evidence exposed', () => assert.equal(proofState({...fixture, mandate_status:'verified'}), 'Unsupported completion claim')],
 ['legacy verification note is not independent verification', () => assert.match(proofState({...fixture, mandate_status:'verified', mandate_proof_note:'checked'}), /independent review not supplied/)],
 ['cannot self-verify', () => assert.throws(() => makeMandateUpdate(fixture,'verified','https://example.com','Enough words to describe a result for review.'), /Independent/)],
 ['cannot clear a prior verification claim', () => assert.throws(() => makeMandateUpdate({...fixture, mandate_status:'verified'},'todo','',''), /reopen/)],
 ['QA submission does not set completion timestamp', () => { const u = makeMandateUpdate(fixture,'done','https://example.com','Controlled test evidence only, not a real commercial result.'); assert.equal(u.completed_at,null); assert.equal('due_at' in u,false); assert.equal('owner' in u,false); }],
 ['QA requires link and substantive note', () => assert.throws(() => makeMandateUpdate(fixture,'done','','Checked'), /QA submission/)],
 ['missing optimistic-lock version blocks editing', () => assert.throws(() => makeMandateUpdate({...fixture, mandate_last_updated_at:null},'blocked','',''), /identity\/version/)],
 ['New York date has no Chicago midnight lag', () => { const date = new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date('2026-09-13T04:30:00Z')); assert.equal(date,'2026-09-13'); }],
];
for (const [name, run] of tests) { run(); console.log(`PASS ${name}`); }
console.log(`${tests.length}/${tests.length} controlled unit checks passed. No external calls or business actions performed.`);
