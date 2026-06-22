import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { OPS_BRANDS, TASK_DEPARTMENTS, formatDateTime, statusLabel } from "@/lib/opsTypes";

const tabs = ["today", "blocked", "due_soon", "needs_approval", "needs_proof", "handoffs", "recurring", "by_brand", "by_department", "done", "create"];

export default function OpsTasksCommand() {
  const qc = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const [tab, setTab] = useState(params.get("tab") || "today");
  const [draft, setDraft] = useState({ department_key: "daily_ops", queue_key: "command", brand_key: "the-kollective", source_type: "", source_id: "", title: "", description: "", priority: "normal", status: "open", owner_label: "Operations", due_at: "", proof_required: false, proof_url: "", blocker_reason: "" });
  const { data: tasks = [] } = useQuery({ queryKey: ["ops-tasks"], queryFn: async () => (await supabase.from("khg_work_queues").select("*").order("due_at", { ascending: true }).limit(600)).data || [] });

  async function createTask() {
    if (!draft.department_key || !draft.title) return toast.error("Department and title are required");
    if (draft.status === "blocked" && !draft.blocker_reason) return toast.error("Blocked tasks need a blocker reason");
    const { error } = await supabase.from("khg_work_queues").insert({
      department_key: draft.department_key,
      queue_key: draft.queue_key,
      brand_key: draft.brand_key === "parent-command" ? null : draft.brand_key,
      source_type: draft.source_type || null,
      source_id: draft.source_id || null,
      title: draft.title,
      description: draft.description,
      priority: draft.priority,
      status: draft.status,
      owner_label: draft.owner_label,
      due_at: draft.due_at || null,
      proof_required: draft.proof_required,
      proof_url: draft.proof_url || null,
      metadata: { blocker_reason: draft.blocker_reason },
    });
    if (error) return toast.error(error.message);
    toast.success("Work item created");
    setDraft({ ...draft, source_type: "", source_id: "", title: "", description: "", due_at: "", proof_url: "", blocker_reason: "", proof_required: false });
    qc.invalidateQueries({ queryKey: ["ops-tasks"] });
  }

  async function updateStatus(task: any, status: string) {
    const { error } = await supabase.from("khg_work_queues").update({ status, updated_at: new Date().toISOString() }).eq("id", task.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["ops-tasks"] });
  }

  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground">Ops OS</p><h1 className="text-2xl font-bold">Task Command Center</h1><p className="text-sm text-muted-foreground">Work queue with department, brand, blockers, approvals, proof, handoffs, recurring work, and done states.</p></div><Button onClick={() => setTab("create")}>Add Task</Button></div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5"><Metric label="Open" value={tasks.filter((t: any) => t.status !== "done").length} /><Metric label="Blocked" value={tasks.filter((t: any) => t.status === "blocked").length} /><Metric label="Due Soon" value={tasks.filter((t: any) => t.due_at && t.due_at.slice(0, 10) <= soon).length} /><Metric label="Needs Proof" value={tasks.filter((t: any) => t.proof_required && !t.proof_url).length} /><Metric label="Done" value={tasks.filter((t: any) => t.status === "done").length} /></div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap justify-start">{tabs.map((tab) => <TabsTrigger key={tab} value={tab}>{statusLabel(tab)}</TabsTrigger>)}</TabsList>
        <TabsContent value="today" className="mt-4 grid gap-3 lg:grid-cols-2">{tasks.filter((task: any) => !task.due_at || task.due_at.slice(0, 10) <= today).map((task: any) => <TaskCard key={task.id} task={task} updateStatus={updateStatus} />)}</TabsContent>
        <TabsContent value="blocked" className="mt-4 grid gap-3 lg:grid-cols-2">{tasks.filter((task: any) => task.status === "blocked").map((task: any) => <TaskCard key={task.id} task={task} updateStatus={updateStatus} />)}</TabsContent>
        <TabsContent value="due_soon" className="mt-4 grid gap-3 lg:grid-cols-2">{tasks.filter((task: any) => task.due_at && task.due_at.slice(0, 10) <= soon).map((task: any) => <TaskCard key={task.id} task={task} updateStatus={updateStatus} />)}</TabsContent>
        <TabsContent value="needs_approval" className="mt-4 grid gap-3 lg:grid-cols-2">{tasks.filter((task: any) => task.status === "waiting_approval").map((task: any) => <TaskCard key={task.id} task={task} updateStatus={updateStatus} />)}</TabsContent>
        <TabsContent value="needs_proof" className="mt-4 grid gap-3 lg:grid-cols-2">{tasks.filter((task: any) => task.proof_required && !task.proof_url).map((task: any) => <TaskCard key={task.id} task={task} updateStatus={updateStatus} />)}</TabsContent>
        <TabsContent value="done" className="mt-4 grid gap-3 lg:grid-cols-2">{tasks.filter((task: any) => task.status === "done").map((task: any) => <TaskCard key={task.id} task={task} updateStatus={updateStatus} />)}</TabsContent>
        <TabsContent value="by_brand" className="mt-4 grid gap-3 lg:grid-cols-3">{OPS_BRANDS.map((brand) => <Lane key={brand} title={brand} tasks={tasks.filter((task: any) => task.brand_key === brand)} updateStatus={updateStatus} />)}</TabsContent>
        <TabsContent value="by_department" className="mt-4 grid gap-3 lg:grid-cols-3">{TASK_DEPARTMENTS.map((dep) => <Lane key={dep} title={dep} tasks={tasks.filter((task: any) => task.department_key === dep)} updateStatus={updateStatus} />)}</TabsContent>
        {["handoffs", "recurring"].map((tab) => <TabsContent key={tab} value={tab} className="mt-4 grid gap-3 lg:grid-cols-2">{tasks.filter((task: any) => task.metadata?.[tab] || task.queue_key === tab).map((task: any) => <TaskCard key={task.id} task={task} updateStatus={updateStatus} />)}</TabsContent>)}
        <TabsContent value="create" className="mt-4"><Card><CardHeader><CardTitle className="text-lg">Create Work Item</CardTitle></CardHeader><CardContent className="space-y-3"><div className="grid gap-3 md:grid-cols-4"><Select value={draft.department_key} onValueChange={(v) => setDraft({ ...draft, department_key: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TASK_DEPARTMENTS.map((b) => <SelectItem key={b} value={b}>{statusLabel(b)}</SelectItem>)}</SelectContent></Select><Select value={draft.brand_key} onValueChange={(v) => setDraft({ ...draft, brand_key: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="parent-command">Parent Command</SelectItem>{OPS_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select><Select value={draft.priority} onValueChange={(v) => setDraft({ ...draft, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["low", "normal", "high", "critical", "executive"].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select><Input type="datetime-local" value={draft.due_at} onChange={(e) => setDraft({ ...draft, due_at: e.target.value })} /></div><Input placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /><Textarea placeholder="Description / next action" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /><div className="grid gap-3 md:grid-cols-4"><Input placeholder="Source type" value={draft.source_type} onChange={(e) => setDraft({ ...draft, source_type: e.target.value })} /><Input placeholder="Source ID" value={draft.source_id} onChange={(e) => setDraft({ ...draft, source_id: e.target.value })} /><Input placeholder="Owner" value={draft.owner_label} onChange={(e) => setDraft({ ...draft, owner_label: e.target.value })} /><Input placeholder="Proof URL" value={draft.proof_url} onChange={(e) => setDraft({ ...draft, proof_url: e.target.value, proof_required: Boolean(e.target.value) })} /></div><Textarea placeholder="Blocker reason" value={draft.blocker_reason} onChange={(e) => setDraft({ ...draft, blocker_reason: e.target.value, status: e.target.value ? "blocked" : draft.status })} /><Button onClick={createTask}>Create Work Item</Button></CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border bg-card p-3"><div className="text-xl font-black">{value}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div></div>;
}

function Lane({ title, tasks, updateStatus }: any) {
  return <Card><CardHeader><CardTitle className="text-sm">{statusLabel(title)}</CardTitle></CardHeader><CardContent className="space-y-2">{tasks.map((task: any) => <TaskCard key={task.id} task={task} updateStatus={updateStatus} />)}{tasks.length === 0 && <p className="text-sm text-muted-foreground">No work items.</p>}</CardContent></Card>;
}

function TaskCard({ task, updateStatus }: any) {
  return <Card><CardContent className="p-4"><div className="flex flex-wrap gap-2"><Badge variant="outline">{task.brand_key || "parent-command"}</Badge><Badge>{statusLabel(task.department_key)}</Badge><Badge variant="secondary">{statusLabel(task.status)}</Badge><Badge variant={task.priority === "critical" ? "destructive" : "outline"}>{task.priority}</Badge></div><h3 className="mt-2 font-semibold">{task.title}</h3><p className="text-sm text-muted-foreground">{task.description || "No description"}</p><div className="mt-3 grid gap-2 text-xs md:grid-cols-3"><span>Owner: {task.owner_label || "Unassigned"}</span><span>Due: {formatDateTime(task.due_at)}</span><span>Proof: {task.proof_required ? task.proof_url || "Needed" : "Not required"}</span></div>{task.metadata?.blocker_reason && <div className="mt-3 rounded-md border bg-muted/40 p-2 text-sm">Blocker: {task.metadata.blocker_reason}</div>}<div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => updateStatus(task, "in_progress")}>Start</Button><Button size="sm" variant="outline" onClick={() => updateStatus(task, "blocked")}>Block</Button><Button size="sm" onClick={() => updateStatus(task, "done")}>Done</Button></div></CardContent></Card>;
}
