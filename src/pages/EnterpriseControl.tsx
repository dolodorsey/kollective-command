import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Activity, AlertTriangle, ExternalLink, RefreshCcw, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { makeMandateUpdate, overdue, parseControlRows, proofState, safeProofUrl } from "@/lib/control-truth";
import type { ControlRow, MandateStatus } from "@/lib/control-truth";

const statuses: MandateStatus[] = ["todo", "in_progress", "blocked", "done"];
const label = (s: string | null) => s === "done" ? "Ready for QA" : s === "verified" ? "Legacy verified claim" : (s || "Unassigned").replaceAll("_", " ");
const time = (v: string | null | undefined) => v && Number.isFinite(Date.parse(v)) ? new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(v)) : "Unknown";
const blocked = (r: ControlRow) => r.blocked_operations > 0 || r.failed_operations > 0 || r.mandate_status === "blocked";

function EvidenceEditor({ row, close }: { row: ControlRow; close: () => void }) {
  const client = useQueryClient();
  const [status, setStatus] = useState<MandateStatus>(row.mandate_status || "todo");
  const [url, setUrl] = useState(row.mandate_proof_url || "");
  const [note, setNote] = useState(row.mandate_proof_note || "");
  const save = useMutation({
    mutationFn: async () => {
      const update = makeMandateUpdate(row, status, url, note);
      const { data, error } = await supabase.from("enterprise_daily_mandates")
        .update(update).eq("id", row.mandate_id!).eq("enterprise_entity_id", row.enterprise_entity_id)
        .eq("updated_at", row.mandate_last_updated_at!).select("id");
      if (error) throw error;
      if (!data || data.length !== 1) throw new Error("Nothing was saved. The record changed or access was denied. Refresh before retrying.");
    },
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["enterprise-control-cycle"] }); close(); },
  });
  return <form className="mt-4 space-y-3 rounded-xl border border-border bg-background p-4" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
    <p className="text-xs text-muted-foreground">Record progress or submit evidence for independent QA. This form cannot certify completion, change ownership, or reset the original deadline.</p>
    <label className="block text-xs font-semibold">Progress state<select className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3" value={status} onChange={e => setStatus(e.target.value as MandateStatus)}>{statuses.map(s => <option key={s} value={s}>{label(s)}</option>)}</select></label>
    <label className="block text-xs font-semibold">Authoritative evidence URL<input className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" /></label>
    <label className="block text-xs font-semibold">Actual result and evidence type<textarea className="mt-1 w-full rounded-lg border border-border bg-card p-3" rows={4} value={note} onChange={e => setNote(e.target.value)} placeholder="Describe the result. Identify implementation, controlled-test, operational, or business-outcome evidence. Do not present a test as a real transaction." /></label>
    {save.error && <p role="alert" className="text-sm text-red-600">{save.error.message}</p>}
    <div className="flex justify-end gap-2"><button type="button" onClick={close} className="rounded-lg border border-border px-3 py-2 text-xs">Cancel</button><button disabled={save.isPending} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">{save.isPending ? "Saving…" : "Save progress / QA submission"}</button></div>
  </form>;
}

function EntityCard({ row }: { row: ControlRow }) {
  const [edit, setEdit] = useState(false);
  const proof = safeProofUrl(row.mandate_proof_url);
  const owner = row.mandate_owner && !/^AI\s*\+/i.test(row.mandate_owner) ? row.mandate_owner : "Assignment unresolved in this mandate";
  return <article className={cn("rounded-2xl border bg-card p-5", blocked(row) ? "border-red-500/40" : "border-border/70")}>
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{row.division} · {row.execution_state.replaceAll("_", " ")}</p><h2 className="mt-1 text-xl font-black">{row.entity_name}</h2></div>
      <span className={cn("rounded-full border px-3 py-1 text-xs font-bold", blocked(row) ? "border-red-500/40 text-red-600" : row.operation_count === 0 ? "text-muted-foreground" : "border-amber-500/40 text-amber-600")}>{blocked(row) ? "Confirmed execution blocker" : row.operation_count === 0 ? "Execution unknown" : "Incomplete execution"}</span>
    </header>
    <div className="mt-4 rounded-xl border border-border/60 bg-background p-4">
      <div className="flex flex-wrap justify-between gap-2 text-xs font-bold"><span>{row.mandate_is_carryover ? `Unresolved carryover · originated ${row.mandate_date}` : "Current mandate"}</span><span className={overdue(row.mandate_due_at) ? "text-red-600" : "text-muted-foreground"}>Original deadline: {time(row.mandate_due_at)}</span></div>
      <p className="mt-3 text-sm font-semibold leading-6">{row.mandate || "No executable mandate has been identified."}</p>
      <p className="mt-2 text-xs text-muted-foreground">Recorded mandate owner: {owner} · {label(row.mandate_status)} · {row.open_mandate_count} open obligation(s)</p>
      <p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">Mandate ID: {row.mandate_id || "Unknown"}</p>
      <p className="mt-3 text-xs font-bold text-amber-600">{proofState(row)}</p>
      {row.mandate_proof_note && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{row.mandate_proof_note}</p>}
      {proof && <a className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary" href={proof} target="_blank" rel="noopener noreferrer">Open submitted evidence <ExternalLink className="h-3 w-3" /></a>}
      {row.mandate_proof_url && !proof && <p className="mt-2 text-xs text-red-600">Unsafe or invalid evidence URL withheld.</p>}
    </div>
    <dl className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {[["Configured idle",row.configured_not_running],["Blocked / failed",`${row.blocked_operations} / ${row.failed_operations}`],["Stale operations",row.stale_operations],["Recent heartbeats",`${row.agents_recent_heartbeat} / ${row.agents_active}`],["Control proof only",time(row.latest_execution_proof_at)],["Original update due",time(row.next_update_due_at)]].map(([k,v]) => <div key={String(k)}><dt className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{k}</dt><dd className="mt-1 text-xs font-semibold">{v}</dd></div>)}
    </dl>
    <p className="mt-3 text-xs text-muted-foreground">{row.executing_or_verified}/{row.operation_count} operations have running/verified labels. These labels and heartbeats are not evidence of a sale, application, booking, or other mandate outcome.</p>
    {overdue(row.next_update_due_at) && <p className="mt-2 text-xs text-red-600">The original control-update deadline is overdue. A refreshed audit does not reset it.</p>}
    {!row.next_update_due_at && <p className="mt-2 text-xs text-muted-foreground">Control-update schedule is unknown; no human response deadline has been invented.</p>}
    <footer className="mt-4 flex flex-wrap items-center justify-between gap-3"><Link className="text-xs font-bold text-primary" to={`/brand/${encodeURIComponent(row.entity_key)}`}>Open existing entity records →</Link>{row.mandate_id && row.mandate_status !== "verified" && <button className="rounded-lg border border-border px-3 py-2 text-xs font-bold" onClick={() => setEdit(!edit)}>{edit ? "Close editor" : "Record progress / evidence"}</button>}</footer>
    {edit && <EvidenceEditor row={row} close={() => setEdit(false)} />}
  </article>;
}

export default function EnterpriseControl() {
  const [search, setSearch] = useState("");
  const [division, setDivision] = useState("all");
  const [attention, setAttention] = useState("all");
  const query = useQuery({ queryKey: ["enterprise-control-cycle"], queryFn: async () => { const { data, error } = await supabase.from("v_enterprise_command_center_v2").select("*"); if (error) throw error; return parseControlRows(data); }, refetchInterval: 60_000 });
  const rows = query.data || [];
  const divisions = useMemo(() => [...new Set(rows.map(r => r.division))].sort(), [rows]);
  const filtered = useMemo(() => rows.filter(r => (division === "all" || r.division === division) && (!search || `${r.entity_name} ${r.division}`.toLowerCase().includes(search.toLowerCase())) && (attention === "all" || attention === "blocked" && blocked(r) || attention === "carryover" && r.mandate_is_carryover || attention === "unknown" && r.operation_count === 0)).sort((a,b) => Number(blocked(b)) - Number(blocked(a)) || a.division.localeCompare(b.division) || a.entity_name.localeCompare(b.entity_name)), [rows, division, search, attention]);
  return <main className="mx-auto max-w-[1600px] space-y-5">
    <section className="rounded-3xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><Activity className="h-4 w-4" /> Enterprise Control</p><h1 className="mt-3 text-3xl font-black tracking-tight">Keep the obligation. Prove the outcome.</h1></div><button className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold" onClick={() => query.refetch()}><RefreshCcw className={cn("h-4 w-4", query.isFetching && "animate-spin")} /> Refresh</button></div>
      <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">Unresolved mandates remain visible across midnight with their original identity, owner, date and deadline. Control evidence, submitted deliverables and verified business results remain separate.</p>
      <p className="mt-2 text-xs text-muted-foreground">Feed fetched: {query.dataUpdatedAt ? time(new Date(query.dataUpdatedAt).toISOString()) : "Not yet fetched"}. This timestamp is not work or outcome evidence.</p>
    </section>
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-5"><strong>Independent verification is not wired into this feed yet.</strong> Historical “done” and “verified” values are displayed as claims, not certified outcomes. Evidence submission cannot self-approve completion.</div>
    {query.error ? <div role="alert" className="rounded-xl border border-red-500/40 p-5 text-red-600"><AlertTriangle className="mb-2 h-5 w-5" />Feed unavailable or invalid; totals and cached cards withheld. {query.error.message}</div> : query.isLoading ? <p className="p-8 text-center text-muted-foreground">Loading authoritative control records…</p> : <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["Records in scope",rows.length],["Confirmed blockers",rows.filter(blocked).length],["Unresolved carryovers",rows.filter(r => r.mandate_is_carryover).length],["No operating controls",rows.filter(r => r.operation_count === 0).length],["Original mandate overdue",rows.filter(r => overdue(r.mandate_due_at)).length]].map(([k,v]) => <div className="rounded-xl border border-border bg-card p-4" key={String(k)}><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k}</p><p className="mt-2 text-3xl font-black">{v}</p></div>)}</section>
      <section className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-3"><label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input aria-label="Search entity" className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-xs" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entity or division" /></label><select aria-label="Division" className="h-10 rounded-lg border border-border bg-background px-3 text-xs" value={division} onChange={e => setDivision(e.target.value)}><option value="all">All divisions</option>{divisions.map(d => <option key={d}>{d}</option>)}</select><select aria-label="Attention filter" className="h-10 rounded-lg border border-border bg-background px-3 text-xs" value={attention} onChange={e => setAttention(e.target.value)}><option value="all">All records</option><option value="blocked">Confirmed blockers</option><option value="carryover">Unresolved carryovers</option><option value="unknown">No operating controls</option></select></section>
      <section className="space-y-4">{filtered.map(row => <EntityCard key={row.enterprise_entity_id} row={row} />)}{!filtered.length && <p className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">No matching records. This is not a healthy-enterprise assertion.</p>}</section>
    </>}
  </main>;
}
