import assert from 'node:assert/strict';
import {parseReviewContext,makeReviewRequest,httpsEvidence} from '../src/lib/mandate-review.ts';
const c={version:1 as const,mandate_id:'m1',enterprise_entity_id:'e1',expected_updated_at:'2026-09-13T10:00:00Z',status:'done',submission_revision:2,evidence_url:'https://example.invalid/controlled',evidence_note:'Controlled evidence fixture; not an external verified business outcome.',can_review:true,hold_reason:null,is_submitter:false,verification_current:false};
const tests:[string,()=>void][]=[
 ['accepts exact scoped revision',()=>assert.equal(parseReviewContext(c,'e1','m1').submission_revision,2)],
 ['rejects other entity',()=>assert.throws(()=>parseReviewContext(c,'e2','m1'),/identity/)],
 ['rejects other mandate',()=>assert.throws(()=>parseReviewContext(c,'e1','m2'),/identity/)],
 ['rejects malformed authority',()=>assert.throws(()=>parseReviewContext({...c,can_review:'true'},'e1','m1'),/authorization/)],
 ['rejects missing revision',()=>assert.throws(()=>parseReviewContext({...c,submission_revision:null},'e1','m1'),/revision/)],
 ['rejects stale timestamp shape',()=>assert.throws(()=>parseReviewContext({...c,expected_updated_at:'not-a-date'},'e1','m1'),/timestamp/)],
 ['rejects unsafe link',()=>assert.equal(httpsEvidence('javascript:alert(1)'),null)],
 ['rejects URL credentials',()=>assert.equal(httpsEvidence('https://user:password@example.invalid'),null)],
 ['rejects self review',()=>assert.throws(()=>makeReviewRequest({...c,is_submitter:true},'approved','Independent review findings that explain the exact controlled source.',true),/independent/)],
 ['rejects unresolved submitter',()=>assert.throws(()=>makeReviewRequest({...c,is_submitter:null},'approved','Independent review findings that explain the exact controlled source.',true),/independent/)],
 ['requires source acknowledgement',()=>assert.throws(()=>makeReviewRequest(c,'approved','Independent review findings that explain the exact controlled source.',false),/source/)],
 ['preserves original server revision and URL',()=>{const r=makeReviewRequest(c,'revise','Independent review found that additional source verification is necessary.',true);assert.equal(r.p_expected_updated_at,c.expected_updated_at);assert.equal(r.p_source_url,c.evidence_url);assert.equal('owner' in r,false);}],
 ['does not certify inconsistent state',()=>assert.throws(()=>parseReviewContext({...c,verification_current:true},'e1','m1'),/Inconsistent/)],
 ['rejects absent evidence',()=>assert.throws(()=>makeReviewRequest({...c,evidence_url:null},'approved','Independent review findings that explain the exact controlled source.',true),/incomplete/)],
];
for(const [name,run] of tests){run();console.log(`PASS ${name}`);} console.log(`${tests.length}/${tests.length} review UI contract checks passed. No network or commercial actions.`);
