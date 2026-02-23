import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { DIVISIONS } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Save, X, CheckSquare, Zap, Edit2, Trash2, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const PRIORITIES = ["urgent", "high", "medium", "low"];
const STATUSES = ["todo", "in_progress", "blocked", "done"];
const BRAND_TAGS = DIVISIONS.flatMap(d => d.brands.map(b => ({ label: b, value: b.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") })));

const Tasks = () => {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"tasks" | "approvals">("tasks");
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium", status: "todo", platform: "" });

  const { data: tasks = [] } = useQuery({
    queryKey: ["all-tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const { data: approvals = [] } = useQuery({
    queryKey: ["approval-queue"],
    queryFn: async () => {
      const { data } = await supabase.from("approval_queue").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        title: newTask.title, description: newTask.description || null,
        priority: newTask.priority, status: newTask.status,
        platform: newTask.platform || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task created");
      setShowCreate(false);
      setNewTask({ title: "", description: "", priority: "medium", status: "todo", platform: "" });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.from("tasks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task updated");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task deleted");
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
    },
  });

  const executeTask = async (task: any) => {
    try {
      const res = await fetch("https://drdorsey.app.n8n.cloud/webhook/exec-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: task.id, title: task.title, description: task.description, brand: task.platform, source: "mcp-tasks" }),
      });
      if (res.ok) {
        toast.success("Task sent to execution engine");
        updateTask.mutate({ id: task.id, updates: { status: "in_progress" } });
      } else { toast.error("Execution failed: " + res.status); }
    } catch { toast.error("Could not reach execution engine"); }
  };

  const handleApproval = async (id: string, status: string) => {
    await supabase.from("approval_queue").update({ status, reviewed_at: new Date().toISOString(), reviewed_by: "dr_dorsey" }).eq("id", id);
    toast.success(status === "approved" ? "Approved" : "Rejected");
    queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
  };

  const filtered = filter === "all" ? tasks :
    PRIORITIES.includes(filter) ? tasks.filter((t: any) => t.priority === filter) :
    tasks.filter((t: any) => t.status === filter);

  const todoCt = tasks.filter((t: any) => t.status === "todo").length;
  const ipCt = tasks.filter((t: any) => t.status === "in_progress").length;
  const blockedCt = tasks.filter((t: any) => t.status === "blocked").length;
  const doneCt = tasks.filter((t: any) => t.status === "done").length;
  const pendingApprovals = approvals.filter((a: any) => a.status === "pending").length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Task Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setView(view === "tasks" ? "approvals" : "tasks")}>
            {view === "tasks" ? `Approvals (${pendingApprovals})` : "Tasks"}
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-3.5 w-3.5" />{showCreate ? "Cancel" : "New Task"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Todo", value: todoCt, color: "text-amber-600" },
          { label: "In Progress", value: ipCt, color: "text-blue-600" },
          { label: "Blocked", value: blockedCt, color: "text-red-600" },
          { label: "Done", value: doneCt, color: "text-green-600" },
        ].map((s, i) => (
          <div key={i} className="rounded-lg border border-border/50 bg-card p-2 text-center cursor-pointer hover:bg-muted/30" onClick={() => setFilter(s.label.toLowerCase().replace(" ", "_"))}>
            <div className={cn("font-mono text-lg font-bold", s.color)}>{s.value}</div>
            <div className="text-[9px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
          <input value={newTask.title} onChange={e => setNewTask(p => ({...p, title: e.target.value}))} placeholder="Task title"
            className="w-full rounded-md border border-border/50 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300" />
          <textarea value={newTask.description} onChange={e => setNewTask(p => ({...p, description: e.target.value}))} placeholder="Description (optional)" rows={2}
            className="w-full rounded-md border border-border/50 bg-white px-3 py-2 text-xs outline-none focus:border-blue-300 resize-none" />
          <div className="flex gap-2">
            <select value={newTask.priority} onChange={e => setNewTask(p => ({...p, priority: e.target.value}))}
              className="rounded-md border border-border/50 bg-white px-3 py-1.5 text-xs outline-none">
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={newTask.platform} onChange={e => setNewTask(p => ({...p, platform: e.target.value}))}
              className="flex-1 rounded-md border border-border/50 bg-white px-3 py-1.5 text-xs outline-none">
              <option value="">No brand tag</option>
              {BRAND_TAGS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
            <Button size="sm" onClick={() => newTask.title && createTask.mutate()} disabled={!newTask.title}>Create</Button>
          </div>
        </div>
      )}

      {view === "tasks" ? (
        <div className="flex gap-4" style={{ minHeight: "50vh" }}>
          {/* Task list */}
          <div className={cn("space-y-1 overflow-auto", selected ? "w-1/2" : "w-full")}>
            {/* Filter */}
            <div className="flex gap-1 mb-2 flex-wrap">
              <button onClick={() => setFilter("all")} className={cn("rounded-md px-2.5 py-1 text-[10px] font-semibold", filter === "all" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}>All ({tasks.length})</button>
              {STATUSES.map(s => (
                <button key={s} onClick={() => setFilter(s)} className={cn("rounded-md px-2.5 py-1 text-[10px] font-semibold", filter === s ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}>{s.replace("_", " ")}</button>
              ))}
            </div>
            {filtered.map((t: any) => (
              <button key={t.id} onClick={() => { setSelected(t); setEditing(false); }}
                className={cn("w-full rounded-lg border bg-card p-3 text-left transition-all hover:border-blue-200",
                  selected?.id === t.id ? "border-blue-300 ring-1 ring-blue-100" :
                  t.status === "blocked" ? "border-l-2 border-l-red-400 border-border/50" :
                  t.priority === "urgent" ? "border-l-2 border-l-red-500 border-border/50" : "border-border/50")}>
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-semibold truncate", t.status === "done" ? "line-through text-muted-foreground" : "text-foreground")}>{t.title}</span>
                  <StatusBadge variant={t.status === "done" ? "success" : t.status === "blocked" ? "error" : t.status === "in_progress" ? "info" : "warning"}>{t.status}</StatusBadge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge variant={t.priority === "urgent" ? "error" : t.priority === "high" ? "warning" : "default"}>{t.priority}</StatusBadge>
                  {t.platform && <span className="text-[9px] text-muted-foreground">{t.platform}</span>}
                </div>
              </button>
            ))}
            {filtered.length === 0 && <p className="py-12 text-center text-xs text-muted-foreground/40">No tasks matching filter</p>}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="flex-1 rounded-lg border border-border/50 bg-card p-5 flex flex-col gap-3 overflow-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">{selected.title}</h3>
                <button onClick={() => setSelected(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
              </div>

              {editing ? (
                <div className="space-y-3">
                  <input value={editData.title || ""} onChange={e => setEditData((p: any) => ({...p, title: e.target.value}))}
                    className="w-full rounded-md border border-border/50 bg-input px-3 py-2 text-sm outline-none focus:border-blue-300" />
                  <textarea value={editData.description || ""} onChange={e => setEditData((p: any) => ({...p, description: e.target.value}))} rows={3}
                    className="w-full rounded-md border border-border/50 bg-input px-3 py-2 text-xs outline-none focus:border-blue-300 resize-none" />
                  <div className="flex gap-2">
                    <select value={editData.priority} onChange={e => setEditData((p: any) => ({...p, priority: e.target.value}))}
                      className="rounded-md border border-border/50 bg-input px-3 py-1.5 text-xs outline-none">
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={editData.status} onChange={e => setEditData((p: any) => ({...p, status: e.target.value}))}
                      className="rounded-md border border-border/50 bg-input px-3 py-1.5 text-xs outline-none">
                      {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-1" onClick={() => updateTask.mutate({ id: selected.id, updates: editData })}><Save className="h-3 w-3" />Save</Button>
                    <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground text-xs">Status:</span> <StatusBadge variant={selected.status === "done" ? "success" : selected.status === "blocked" ? "error" : "warning"}>{selected.status}</StatusBadge></div>
                    <div><span className="text-muted-foreground text-xs">Priority:</span> <StatusBadge variant={selected.priority === "urgent" ? "error" : "default"}>{selected.priority}</StatusBadge></div>
                    {selected.platform && <div><span className="text-muted-foreground text-xs">Brand:</span> <span className="text-foreground text-xs">{selected.platform}</span></div>}
                    <div><span className="text-muted-foreground text-xs">Created:</span> <span className="text-xs text-foreground">{selected.created_at ? format(new Date(selected.created_at), "MMM d, h:mm a") : "\u2014"}</span></div>
                  </div>
                  {selected.description && (
                    <div className="rounded-lg bg-muted/50 p-3 text-sm text-foreground whitespace-pre-wrap">{selected.description}</div>
                  )}
                </>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-3 border-t border-border/30">
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { setEditing(true); setEditData({ title: selected.title, description: selected.description, priority: selected.priority, status: selected.status }); }}>
                  <Edit2 className="h-3 w-3" />Edit
                </Button>
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => executeTask(selected)}>
                  <Play className="h-3 w-3" />Execute
                </Button>
                {STATUSES.filter(s => s !== selected.status).slice(0, 2).map(s => (
                  <Button key={s} variant="outline" size="sm" className="text-xs" onClick={() => updateTask.mutate({ id: selected.id, updates: { status: s } })}>
                    \u2192 {s.replace("_", " ")}
                  </Button>
                ))}
                <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 text-xs gap-1 ml-auto"
                  onClick={() => { if (confirm("Delete task?")) deleteTask.mutate(selected.id); }}>
                  <Trash2 className="h-3 w-3" />Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* APPROVALS VIEW */
        <div className="space-y-2">
          {approvals.map((a: any) => (
            <div key={a.id} className={cn("rounded-lg border bg-card p-3", a.status === "pending" ? "border-amber-200" : "border-border/50")}>
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{a.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge variant={a.status === "pending" ? "warning" : a.status === "approved" ? "success" : "error"}>{a.status}</StatusBadge>
                    {a.brand_key && <StatusBadge variant="default">{a.brand_key}</StatusBadge>}
                    {a.item_type && <span className="text-[9px] text-muted-foreground">{a.item_type}</span>}
                  </div>
                </div>
                {a.status === "pending" && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" className="h-7 px-3 text-[10px] bg-green-600 hover:bg-green-700" onClick={() => handleApproval(a.id, "approved")}>Approve</Button>
                    <Button variant="outline" size="sm" className="h-7 px-3 text-[10px] text-red-500 border-red-200" onClick={() => handleApproval(a.id, "rejected")}>Reject</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {approvals.length === 0 && <p className="py-12 text-center text-xs text-muted-foreground/40">No approvals in queue</p>}
        </div>
      )}
    </div>
  );
};

export default Tasks;
