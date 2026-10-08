import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ShieldAlert, RefreshCcw, CircleDollarSign } from "lucide-react";

type RecordRow = Record<string, any>;
type ViewName = "dot_muse_company_brief_v1" | "dot_muse_work_items_v1" | "dot_muse_approval_v1" | "dot_muse_closing_v1" | "dot_muse_pipeline_brief_v1" | "dot_muse_scorecard_v1";
type Tab = "dot" | "muse" | "founder" | "scorecard" | "approvals";

async function rows(view: ViewName, date?: string): Promise<RecordRow[]> {
  let query = supabase.from(view).select("*").limit(1200);
  if (date && view !== "dot_muse_closing_v1" && view !== "dot_muse_pipeline_brief_v1") {
    query = query.eq("business_date", date);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

const tabs: { value: Tab; label: string }[] = [
  { value: "dot", label: "DOT Production" },
  { value: "muse", label: "MUSE Execution" },
  { value: "founder", label: "Founder Closing Desk" },
  { value: "scorecard", label: "Verified Scorecard" },
  { value: "approvals", label: "Midnight Approvals" },
];

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-border bg-card p-4"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-black tabular-nums">{value}</p></div>;
}

const pretty = (value: unknown) => String(value ?? "unknown").replaceAll("_", " ");

export default function DotMuseCommand() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("dot");
  const [entity, setEntity] = useState("all");
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }));
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [decisionNote, setDecisionNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const daily = useQuery({ queryKey: ["dot-muse-brief", date], queryFn: () => rows("dot_muse_company_brief_v1", date), refetchInterval: 60_000 });
  const work = useQuery({ queryKey: ["dot-muse-work", date], queryFn: () => rows("dot_muse_work_items_v1", date), refetchInterval: 60_000 });
  const approvals = useQuery({ queryKey: ["dot-muse-approvals", date], queryFn: () => rows("dot_muse_approval_v1", date), refetchInterval: 60_000 });
  const pipeline = useQuery({ queryKey: ["dot-muse-pipeline"], queryFn: () => rows("dot_muse_pipeline_brief_v1"), refetchInterval: 60_000 });
  const closing = useQuery({ queryKey: ["dot-muse-closing"], queryFn: () => rows("dot_muse_closing_v1"), refetchInterval: 60_000 });
  const metrics = useQuery({ queryKey: ["dot-muse-scorecard", date], queryFn: () => rows("dot_muse_scorecard_v1", date), refetchInterval: 60_000 });
  const queries = [daily, work, approvals, pipeline, closing, metrics];
  const error = queries.find(q => q.error)?.error;
  const loading = queries.some(q => q.isLoading);

  const visibleCompanies = useMemo(() => (daily.data ?? []).filter(r => entity === "all" || r.entity_key === entity), [daily.data, entity]);
  const filteredWork = useMemo(() => (work.data ?? []).filter(r => entity === "all" || r.entity_key === entity), [work.data, entity]);
  const dotWork = filteredWork.filter(r => r.owner === "dot");
  const museWork = filteredWork.filter(r => r.owner === "muse");
  const founderDeals = (closing.data ?? []).filter(r => entity === "all" || r.entity_key === entity);
  const backgroundDeals = (pipeline.data ?? []).filter(r => entity === "all" || r.entity_key === entity);
  const scoreRows = (metrics.data ?? []).filter(r => entity === "all" || r.entity_key === entity);
  const displayedApprovals = (approvals.data ?? []).filter(r => entity === "all" || r.entity_key === entity);

  const summary = {
    candidates: visibleCompanies.reduce((n, r) => n + Number(r.candidate_research_items || 0), 0),
    dot: visibleCompanies.reduce((n, r) => n + Number(r.dot_items || 0), 0),
    museBlocked: visibleCompanies.reduce((n, r) => n + Number(r.blocked_actions || 0), 0),
    verified: visibleCompanies.reduce((n, r) => n + Number(r.verified_actions || 0), 0),
  };

  async function refresh() {
    await Promise.all(["dot-muse-brief","dot-muse-work","dot-muse-approvals","dot-muse-pipeline","dot-muse-closing","dot-muse-scorecard"]
      .map(key => queryClient.invalidateQueries({ queryKey: [key] })));
  }

  async function recordProgress(id: string, next: string) {
    setBusyId(id);
    try {
      const { error } = await supabase.rpc("dot_muse_record_progress", {
        p_task: id, p_state: next, p_note: notes[id] ?? "",
      });
      if (error) throw new Error(error.message);
      toast.success("Preparation updated. This is NOT execution proof.");
      await refresh();
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusyId(null); }
  }

  async function decideCycle(id: string, decision: "approve" | "reject" | "revise") {
    if (!decisionNote.trim()) return toast.error("Enter a decision reason or approval evidence first.");
    setBusyId(id);
    try {
      const { error } = await supabase.rpc("dot_muse_decide_cycle", {
        p_cycle: id, p_decision: decision, p_note: decisionNote.trim(),
      });
      if (error) throw new Error(error.message);
      toast.success("Founder decision recorded. No external sends were triggered.");
      setDecisionNote("");
      await refresh();
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusyId(null); }
  }

  return (
    <main className="mx-auto max-w-[1600px] space-y-5">
      <section className="rounded-3xl border border-border bg-card p-6">
        <p className="text-[10px] font-bold uppercase tracking-[.26em] text-primary">KOLLECTIVE BOH / AGENT CONTROL</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">DOT + MUSE / Founder Closing Desk</h1>
        <p className="mt-2 text-sm text-muted-foreground">Night production. Midnight founder approvals. Daytime authorized execution. Only independently verified receipts count as actuals.</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold">Business date <input className="ml-2 rounded-lg border bg-background px-3 py-2" type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
          <label className="text-xs font-bold">Entity
            <select className="ml-2 max-w-[250px] rounded-lg border bg-background px-3 py-2" value={entity} onChange={e => setEntity(e.target.value)}>
              <option value="all">All independent companies</option>
              {(daily.data ?? []).map(r => <option key={r.entity_key} value={r.entity_key}>{r.entity_name}</option>)}
            </select>
          </label>
          <button className="rounded-lg border px-3 py-2 text-xs font-semibold" onClick={refresh}><RefreshCcw className="mr-1 inline h-3.5 w-3.5" />Refresh</button>
        </div>
      </section>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Stat label="Company queues" value={visibleCompanies.length} />
        <Stat label="Accounts in research" value={summary.candidates} />
        <Stat label="DOT assignments" value={summary.dot} />
        <Stat label="MUSE held actions" value={summary.museBlocked} />
        <Stat label="Verified completions" value={summary.verified} />
      </div>
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-5">
        <ShieldAlert className="mr-2 inline h-4 w-4" />All external company lanes are disabled until sender verification and founder approval. Research records are not cleared contacts. The screen never initiates bulk sends.
      </div>

      <nav className="flex flex-wrap gap-2">{tabs.map(t =>
        <button key={t.value} onClick={() => setTab(t.value)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${tab === t.value ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>{t.label}</button>
      )}</nav>

      {error && <div role="alert" className="rounded-xl border border-red-500/40 p-4 text-sm text-red-600"><AlertTriangle className="mb-2 h-5 w-5" />Secure Command data is unavailable. No cached activity or unverified totals are substituted. {error.message}</div>}
      {loading && !error && <p className="p-6 text-sm text-muted-foreground">Loading authorized company records…</p>}

      {!error && !loading && tab === "dot" &&
        <section className="grid gap-3 lg:grid-cols-2">{dotWork.slice(0,150).map(item =>
          <article key={item.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap gap-2 text-[10px] uppercase text-muted-foreground"><span>{item.entity_key}</span><span>{item.task_kind}</span><span>{pretty(item.task_state)}</span></div>
            <h3 className="mt-2 text-sm font-semibold">{item.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">Target {item.target_quantity} · {item.source_system || "internal task"} · {item.scheduled_for ? new Date(item.scheduled_for).toLocaleString("en-US",{timeZone:"America/New_York"}) : "unscheduled"}</p>
            {item.notes && <p className="mt-2 text-xs text-muted-foreground">{item.notes}</p>}
            {!["verified","executed","approved","cancelled"].includes(item.task_state) &&
              <div className="mt-3 space-y-2">
                <input aria-label="Progress note" className="w-full rounded-lg border bg-background p-2 text-xs" placeholder="Evidence/next action note" value={notes[item.id] || ""} onChange={e => setNotes(o => ({...o,[item.id]:e.target.value}))} />
                <div className="flex flex-wrap gap-2">
                  <button disabled={busyId===item.id} onClick={()=>recordProgress(item.id,"research")} className="rounded-lg border px-3 py-1.5 text-xs">Research</button>
                  <button disabled={busyId===item.id} onClick={()=>recordProgress(item.id,"qa")} className="rounded-lg border px-3 py-1.5 text-xs">Submit to QA</button>
                  <button disabled={busyId===item.id} onClick={()=>recordProgress(item.id,"blocked")} className="rounded-lg border px-3 py-1.5 text-xs">Mark blocked</button>
                </div>
              </div>}
          </article>
        )}
        {dotWork.length > 150 && <p className="col-span-full text-xs text-muted-foreground">Showing first 150 assignments. Filter to a company to manage remaining work.</p>}
        </section>}

      {!error && !loading && tab === "muse" &&
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">Execution inbox. These are held channels, not sends. Muse may proceed only after company routing, individual approval, source/contact checks and provider integration are verified.</p>
          <div className="grid gap-3 md:grid-cols-2">{museWork.map(item =>
            <article key={item.id} className="rounded-xl border bg-card p-4">
              <div className="flex justify-between gap-2 text-xs"><strong>{item.entity_key}</strong><span className="text-amber-600">{pretty(item.task_state)}</span></div>
              <h3 className="mt-2 font-medium">{item.title}</h3>
              <p className="mt-2 text-xs text-muted-foreground">Goal {item.target_quantity} · no provider receipts until actually executed</p>
            </article>
          )}</div>
        </section>}

      {!error && !loading && tab === "founder" &&
        <section className="space-y-4">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
            <Stat label="Founder-ready verified deals" value={founderDeals.length} />
            <Stat label="Still in research/qualification" value={backgroundDeals.reduce((n,r)=>n+Number(r.unqualified_opportunities || 0),0)} />
            <Stat label="Confirmed meetings" value={backgroundDeals.reduce((n,r)=>n+Number(r.meetings_confirmed || 0),0)} />
          </div>
          {founderDeals.length === 0 && <div className="rounded-xl border bg-card p-6"><CircleDollarSign className="mb-3 h-6 w-6 text-muted-foreground" /><h3 className="font-semibold">No verified founder-ready opportunities yet</h3><p className="mt-2 text-sm text-muted-foreground">Research prospects remain with Dot and Muse. Nothing is elevated until decision-maker authority plus real interest or a confirmed appointment is documented.</p></div>}
          <div className="grid gap-3 lg:grid-cols-2">{founderDeals.map(d=>
            <article key={d.id} className="rounded-xl border bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">{d.entity_key} · Priority {d.priority}</p>
              <h3 className="mt-2 text-lg font-bold">{d.business_name}</h3>
              <p className="text-xs text-muted-foreground">{d.decision_maker_name || "Verified decision maker"} · {d.deal_type}</p>
              <p className="mt-2 text-sm">{d.offer_summary}</p>
              <p className="mt-3 text-xs">Your next action: {d.founder_action || "Confirm commercial terms"}</p>
              {d.appointment_at && <p className="mt-1 text-xs">Appointment: {new Date(d.appointment_at).toLocaleString()}</p>}
            </article>
          )}</div>
        </section>}

      {!error && !loading && tab === "scorecard" &&
        <section className="overflow-auto rounded-xl border bg-card">
          <table className="w-full text-left text-xs">
            <thead><tr className="border-b text-muted-foreground"><th className="p-3">Company</th><th className="p-3">Metric</th><th className="p-3">Target</th><th className="p-3">Verified actual</th><th className="p-3">Unverified proof</th></tr></thead>
            <tbody>{scoreRows.slice(0,300).map((item,i)=><tr key={item.entity_key+item.metric_key+i} className="border-b border-border/50"><td className="p-3">{item.entity_key}</td><td className="p-3">{item.label}</td><td className="p-3">{item.goal}</td><td className="p-3 font-bold tabular-nums">{item.actual}</td><td className="p-3">{item.unverified_items}</td></tr>)}</tbody>
          </table>
        </section>}

      {!error && !loading && tab === "approvals" &&
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">Only authorized owners can issue founder decisions. Approval is rejected unless individualized external packets have content hashes and are truly ready. A decision does not initiate sends.</p>
          <label className="block text-xs font-bold">Decision evidence / reason<textarea rows={2} className="mt-2 w-full rounded-lg border bg-card p-3" value={decisionNote} onChange={e=>setDecisionNote(e.target.value)} placeholder="Explain what is approved or what needs correction…" /></label>
          <div className="grid gap-3 lg:grid-cols-2">{displayedApprovals.map(item=>
            <article key={item.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2"><strong className="text-sm">{item.entity_key}</strong><span className="text-xs text-amber-600">{pretty(item.approval_state)}</span></div>
              <p className="mt-2 text-xs text-muted-foreground">Ready: {item.approval_ready_items} · Blocked: {item.blocked_external_lanes} · Version: {item.revision}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button disabled={busyId===item.id || !item.approval_ready_items} onClick={()=>decideCycle(item.id,"approve")} className="rounded-lg border border-primary px-3 py-1.5 text-xs"><CheckCircle2 className="mr-1 inline h-3 w-3" />Approve ready packets</button>
                <button disabled={busyId===item.id} onClick={()=>decideCycle(item.id,"revise")} className="rounded-lg border px-3 py-1.5 text-xs">Needs revision</button>
                <button disabled={busyId===item.id} onClick={()=>decideCycle(item.id,"reject")} className="rounded-lg border px-3 py-1.5 text-xs">Reject</button>
              </div>
            </article>
          )}</div>
        </section>}
    </main>
  );
}
