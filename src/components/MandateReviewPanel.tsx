import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { httpsEvidence, makeReviewRequest, parseReviewContext } from '@/lib/mandate-review';
import type { ControlRow } from '@/lib/control-truth';

export function MandateReviewPanel({ row }: {row: ControlRow}) {
  const client = useQueryClient();
  const [decision,setDecision] = useState<'approved'|'revise'>('revise');
  const [note,setNote] = useState('');
  const [checked,setChecked] = useState(false);
  const context = useQuery({queryKey:['mandate-review',row.enterprise_entity_id,row.mandate_id,row.mandate_last_updated_at],queryFn:async()=>{
    const {data,error}=await supabase.rpc('get_mandate_review_context',{p_mandate_id:row.mandate_id});
    if(error) throw error;
    return parseReviewContext(data,row.enterprise_entity_id,row.mandate_id!);
  },enabled:Boolean(row.mandate_id),retry:false,staleTime:0});
  const save = useMutation({mutationFn:async()=>{
    if(!context.data) throw new Error('Refresh the review context first.');
    const payload=makeReviewRequest(context.data,decision,note,checked);
    const {data,error}=await supabase.rpc('review_enterprise_mandate',payload);
    if(error) throw error;
    if(!data || data.mandate_id!==row.mandate_id || data.decision!==decision || !data.review_id) throw new Error('Review receipt was not verified. Refresh before retrying.');
    return data;
  },retry:false,onSuccess:async()=>{
    setNote('');setChecked(false);
    await Promise.all([client.invalidateQueries({queryKey:['enterprise-control-cycle']}),client.invalidateQueries({queryKey:['mandate-review',row.enterprise_entity_id,row.mandate_id]})]);
  }});
  if(context.isLoading) return <p className="mt-4 text-sm text-muted-foreground">Checking scoped review access…</p>;
  if(context.error) return <div role="alert" className="mt-4 rounded-xl border border-red-500/40 p-4 text-sm">Review unavailable. {context.error.message}<button className="ml-2 underline" onClick={()=>context.refetch()}>Retry read</button></div>;
  const c=context.data;if(!c) return null;
  const source=httpsEvidence(c.evidence_url);
  return <section className="mt-4 space-y-3 rounded-xl border border-border bg-background p-4" aria-label={`${row.entity_name} independent review`}>
    <h3 className="text-sm font-bold">Independent mandate review</h3>
    <p className="text-xs text-muted-foreground">This decision covers only {row.entity_name}, mandate {row.mandate_id}, revision {c.submission_revision}. Infrastructure tests are not commercial results.</p>
    {c.verification_current ? <p className="text-sm font-semibold">A matching independent review receipt is recorded for this evidence revision.</p> : <p className="text-xs text-amber-600">No current independent completion receipt is established.</p>}
    {source && <a href={source} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-bold text-primary underline">Inspect submitted source</a>}
    {c.evidence_note && <p className="whitespace-pre-wrap text-xs leading-5">{c.evidence_note}</p>}
    {!c.can_review ? <p className="text-xs text-muted-foreground">Review held: {(c.hold_reason||'authorization required').replaceAll('_',' ')}. Ownership does not permit reviewing your own submission.</p> : <form className="space-y-3" onSubmit={e=>{e.preventDefault();save.mutate();}}>
      <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)} /><span>I inspected the exact source and mandate acceptance criteria and distinguished test evidence from real outcomes.</span></label>
      <label className="block text-xs font-bold">Decision<select value={decision} onChange={e=>setDecision(e.target.value as 'approved'|'revise')} className="mt-1 block h-10 w-full rounded-lg border border-border bg-card px-3"><option value="revise">Return for revision</option><option value="approved">Approve this evidence revision</option></select></label>
      <label className="block text-xs font-bold">Independent findings<textarea value={note} onChange={e=>setNote(e.target.value)} rows={4} minLength={40} required className="mt-1 block w-full rounded-lg border border-border bg-card p-3" placeholder="Describe what you verified against the acceptance criteria, exact source, and any remaining limitation." /></label>
      {save.error && <p role="alert" className="text-sm text-red-600">Not recorded: {save.error.message}</p>}
      <button disabled={save.isPending||!checked||!source} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">{save.isPending?'Recording…':'Record independent decision'}</button>
    </form>}
    {save.isSuccess && <p role="status" className="text-sm">Review receipt recorded. The command feed has been refreshed.</p>}
  </section>;
}
