import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  CheckSquare, Plus, Clock, AlertCircle, Check, X,
  Eye, ChevronRight, Send, MessageSquare, Star, Trash2, Edit2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DIVISIONS } from "@/lib/constants";

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  platform?: string;
  due_date?: string;
  metadata?: any;
  created_at?: string;
}

interface ApprovalItem {
  id: string;
  item_type: string;
  brand_key: string;
  title: string;
  content_preview: string;
  full_payload: any;
  source_workflow: string;
  score: number;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  expires_at: string | null;
}

const TASK_STATUSES = ["todo", "in_progress", "blocked", "done"];
const TASK_PRIORITIES = ["urgent", "high", "medium", "low"];

// ClickUp spaces mapped
const CLICKUP_SPACES = ["MCP Ops", "Casper Group", "HugLife Events", "Umbrella Group", "Museums", "Products", "Apps"];

// Communication channels
const COMM_CHANNELS = [
  { key: "email", label: "Email", color: "text-status-error" },
  { key: "ig_dm", label: "Instagram DM", color: "text-status-pink" },
  { key: "sms", label: "SMS / Phone", color: "text-status-success" },
  { key: "ghl", label: "GHL", color: "text-status-info" },
  { key: "fb", label: "Facebook", color: "text-status-info" },
];

const Tasks = () => {
  const [view, setView] = useState<"tasks" | "approvals">("tasks");
  const [filter, setFilter] = useState("all");
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium", status: "todo", platform: "" });
  const queryClient = useQueryClient();

  // Tasks from DB
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-list", filter],
    queryFn: async () => {
      let q = supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(100);
      if (filter !== "all" && TASK_STATUSES.includes(filter)) q = q.eq("status", filter);
      if (filter !== "all" && TASK_PRIORITIES.includes(filter)) q = q.eq("priority", filter);
      const { data } = await q;
      return (data || []) as TaskItem[];
    },
  });

  // Approvals
  const { data: approvals = [] } = useQuery({
    queryKey: ["approval-queue"],
    queryFn: async () => {
      const { data } = await supabase.from("approval_queue").select("*").order("created_at", { ascending: false }).limit(50);
      return (data || []) as ApprovalItem[];
    },
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["task-stats"],
    queryFn: async () => {
      const [todo, inProg, blocked, done, pending, approved, rejected] = await Promise.all([
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "todo"),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "blocked"),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "done"),
        supabase.from("approval_queue").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("approval_queue").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("approval_queue").select("*", { count: "exact", head: true }).eq("status", "rejected"),
      ]);
      return {
        todo: todo.count ?? 0, inProg: inProg.count ?? 0, blocked: blocked.count ?? 0, done: done.count ?? 0,
        pending: pending.count ?? 0, approved: approved.count ?? 0, rejected: rejected.count ?? 0,
      };
    },
  });

  // Create task
  const createTask = useMutation({
    mutationFn: async (task: typeof newTask) => {
      const { error } = await supabase.from("tasks").insert({
        title: task.title,
        description: task.description || null,
        priority: task.priority,
        status: task.status,
        platform: task.platform || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task created");
      setShowCreate(false);
      setNewTask({ title: "", description: "", priority: "medium", status: "todo", platform: "" });
      queryClient.invalidateQueries({ queryKey: ["tasks-list"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
    },
    onError: () => toast.error("Failed to create task"),
  });

  // Update task status
  const updateTask = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TaskItem> }) => {
      const { error } = await supabase.from("tasks").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task updated");
      queryClient.invalidateQueries({ queryKey: ["tasks-list"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
    },
  });

  // Delete task
  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task deleted");
      setSelectedTask(null);
      queryClient.invalidateQueries({ queryKey: ["tasks-list"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
    },
  });

  // Approval action
  const handleApproval = async (id: string, action: "approved" | "rejected") => {
    const { error } = await supabase.from("approval_queue").update({
      status: action, reviewed_at: new Date().toISOString(), reviewed_by: "dr.dorsey",
    }).eq("id", id);
    if (!error) {
      toast.success(action === "approved" ? "Approved" : "Rejected");
      setSelectedApproval(null);
      queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
    }
  };

  const priorityColors: Record<string, string> = { urgent: "text-status-error", high: "text-status-warning", medium: "text-status-info", low: "text-muted-foreground" };
  const statusColors: Record<string, string> = { todo: "warning", in_progress: "info", blocked: "error", done: "success" };

  return (
    <div className="flex h-[calc(100vh-7.5rem)] gap-4 animate-fade-in">
      {/* LEFT */}
      <div className={cn("flex flex-col gap-3", (selectedTask || selectedApproval) ? "w-1/2" : "w-full")}>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {(["tasks", "approvals"] as const).map(v => (
              <button key={v} onClick={() => { setView(v); setSelectedTask(null); setSelectedApproval(null); }}
                className={cn("rounded-md px-4 py-1.5 text-xs font-semibold transition-all uppercase tracking-wider",
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                {v} ({v === "tasks" ? tasks.length : approvals.length})
              </button>
            ))}
          </div>
          {view === "tasks" && (
            <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(!showCreate)}>
              <Plus className="h-3.5 w-3.5" />{showCreate ? "Cancel" : "New Task"}
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {(view === "tasks"
            ? [
              { label: "Todo", value: (stats && stats.todo) || 0, color: "text-status-warning" },
              { label: "In Progress", value: (stats && stats.inProg) || 0, color: "text-status-info" },
              { label: "Blocked", value: (stats && stats.blocked) || 0, color: "text-status-error" },
              { label: "Done", value: (stats && stats.done) || 0, color: "text-status-success" },
            ]
            : [
              { label: "Pending", value: (stats && stats.pending) || 0, color: "text-status-warning" },
              { label: "Approved", value: (stats && stats.approved) || 0, color: "text-status-success" },
              { label: "Rejected", value: (stats && stats.rejected) || 0, color: "text-status-error" },
              { label: "Total", value: approvals.length, color: "text-foreground" },
            ]
          ).map((s, i) => (
            <div key={i} className="rounded-lg border border-border/50 bg-card p-2.5 text-center">
              <div className={cn("font-mono text-lg font-bold", s.color)}>{s.value}</div>
              <div className="text-[9px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="rounded-lg border border-primary/20 bg-card p-4 space-y-3">
            <input value={newTask.title} onChange={e => setNewTask(p => ({...p, title: e.target.value}))}
              placeholder="Task title..." className="w-full rounded-md border border-border/50 bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40" />
            <textarea value={newTask.description} onChange={e => setNewTask(p => ({...p, description: e.target.value}))}
              placeholder="Description..." rows={2} className="w-full rounded-md border border-border/50 bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40 resize-y" />
            <div className="flex gap-2">
              <select value={newTask.priority} onChange={e => setNewTask(p => ({...p, priority: e.target.value}))}
                className="rounded-md border border-border/50 bg-input px-3 py-1.5 text-xs text-foreground outline-none">
                {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={newTask.status} onChange={e => setNewTask(p => ({...p, status: e.target.value}))}
                className="rounded-md border border-border/50 bg-input px-3 py-1.5 text-xs text-foreground outline-none">
                {TASK_STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
              <select value={newTask.platform} onChange={e => setNewTask(p => ({...p, platform: e.target.value}))}
                className="rounded-md border border-border/50 bg-input px-3 py-1.5 text-xs text-foreground outline-none">
                <option value="">No channel</option>
                {COMM_CHANNELS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                {CLICKUP_SPACES.map(s => <option key={s} value={`clickup:${s}`}>ClickUp: {s}</option>)}
              </select>
              <Button size="sm" onClick={() => newTask.title && createTask.mutate(newTask)}
                disabled={!newTask.title || createTask.isPending}>Create</Button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-1 flex-wrap">
          {["all", ...(view === "tasks" ? [...TASK_STATUSES, ...TASK_PRIORITIES] : ["pending", "approved", "rejected"])].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("rounded-md px-2.5 py-1 text-[10px] font-semibold transition-all",
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
              {f.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto space-y-1.5">
          {view === "tasks" ? (
            tasks.length === 0 ? (
              <div className="rounded-lg border border-border/50 bg-card p-12 text-center">
                <CheckSquare className="mx-auto h-8 w-8 text-muted-foreground/20" />
                <p className="mt-3 text-sm text-muted-foreground/50">No tasks yet. Create one above.</p>
              </div>
            ) : tasks.map(task => (
              <button key={task.id} onClick={() => { setSelectedTask(task); setSelectedApproval(null); }}
                className={cn("w-full rounded-lg border bg-card p-3 text-left transition-all hover:border-primary/30",
                  selectedTask?.id === task.id ? "border-primary/50 ring-1 ring-primary/20" : "border-border/50",
                  task.status === "blocked" ? "border-l-2 border-l-status-error" :
                  task.status === "in_progress" ? "border-l-2 border-l-status-info" :
                  task.status === "done" ? "border-l-2 border-l-status-success" : "border-l-2 border-l-status-warning")}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className={cn("text-xs font-semibold", task.status === "done" ? "text-muted-foreground line-through" : "text-foreground")}>
                      {task.title}
                    </div>
                    <div className="flex gap-1.5 mt-1">
                      <StatusBadge variant={(statusColors[task.status || ""] || "default") as any}>{task.status || "todo"}</StatusBadge>
                      <span className={cn("text-[10px] font-semibold", priorityColors[task.priority || "medium"])}>{task.priority}</span>
                      {task.platform && <StatusBadge variant="default">{task.platform}</StatusBadge>}
                    </div>
                  </div>
                  {task.created_at && <span className="text-[9px] text-muted-foreground/40 shrink-0 ml-2">{format(new Date(task.created_at), "MMM d")}</span>}
                </div>
              </button>
            ))
          ) : (
            approvals.filter((a: any) => filter === "all" || a.status === filter).map(item => (
              <button key={item.id} onClick={() => { setSelectedApproval(item); setSelectedTask(null); }}
                className={cn("w-full rounded-lg border bg-card p-3 text-left transition-all hover:border-primary/30",
                  selectedApproval?.id === item.id ? "border-primary/50 ring-1 ring-primary/20" : "border-border/50",
                  item.status === "pending" ? "border-l-2 border-l-status-warning" : "border-l-2 border-l-border")}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-semibold text-foreground">{item.title}</div>
                    <div className="flex gap-1.5 mt-1">
                      <StatusBadge variant="default">{item.brand_key}</StatusBadge>
                      <StatusBadge variant="default">{item.item_type}</StatusBadge>
                      <StatusBadge variant={item.status === "pending" ? "warning" : item.status === "approved" ? "success" : "error"}>{item.status}</StatusBadge>
                    </div>
                  </div>
                  <span className="text-[9px] text-muted-foreground/40">{item.score}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT — Detail */}
      {(selectedTask || selectedApproval) && (
        <div className="flex-1 rounded-lg border border-border/50 bg-card p-5 flex flex-col gap-4 overflow-auto">
          {selectedTask && (
            <>
              <div>
                <h3 className="text-lg font-bold text-foreground">{selectedTask.title}</h3>
                <div className="flex gap-2 mt-2">
                  <StatusBadge variant={(statusColors[selectedTask.status || ""] || "default") as any}>{selectedTask.status || "todo"}</StatusBadge>
                  <span className={cn("text-xs font-semibold", priorityColors[selectedTask.priority || "medium"])}>{selectedTask.priority}</span>
                </div>
              </div>
              {selectedTask.description && (
                <div className="rounded-lg bg-secondary p-3 text-sm text-foreground/80 whitespace-pre-wrap">{selectedTask.description}</div>
              )}
              <div className="flex gap-2 flex-wrap">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 w-full mb-1">Change Status</p>
                {TASK_STATUSES.map(s => (
                  <Button key={s} variant={selectedTask.status === s ? "default" : "outline"} size="sm"
                    onClick={() => updateTask.mutate({ id: selectedTask.id, updates: { status: s } })}>
                    {s.replace("_", " ")}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 w-full mb-1">Priority</p>
                {TASK_PRIORITIES.map(p => (
                  <Button key={p} variant={selectedTask.priority === p ? "default" : "outline"} size="sm"
                    onClick={() => updateTask.mutate({ id: selectedTask.id, updates: { priority: p } })}>
                    {p}
                  </Button>
                ))}
              </div>
              <Button variant="outline" size="sm" className="text-status-error border-status-error/20 hover:bg-status-error/10 w-fit mt-auto"
                onClick={() => { if (confirm("Delete this task?")) deleteTask.mutate(selectedTask.id); }}>
                <Trash2 className="h-3 w-3 mr-1" />Delete Task
              </Button>
            </>
          )}
          {selectedApproval && (
            <>
              <div>
                <h3 className="text-lg font-bold text-foreground">{selectedApproval.title}</h3>
                <div className="flex gap-2 mt-2">
                  <StatusBadge variant="default">{selectedApproval.brand_key}</StatusBadge>
                  <StatusBadge variant="default">{selectedApproval.item_type}</StatusBadge>
                  <span className="text-xs text-muted-foreground">Score: {selectedApproval.score}</span>
                </div>
              </div>
              <div className="flex-1 rounded-lg bg-secondary p-4 overflow-auto">
                <pre className="text-sm text-foreground/90 font-mono whitespace-pre-wrap leading-relaxed">
                  {selectedApproval.content_preview || JSON.stringify(selectedApproval.full_payload, null, 2)}
                </pre>
              </div>
              {selectedApproval.status === "pending" && (
                <div className="flex gap-3">
                  <Button className="flex-1 gap-1.5 bg-status-success/10 text-status-success border border-status-success/20 hover:bg-status-success/20" variant="outline"
                    onClick={() => handleApproval(selectedApproval.id, "approved")}>
                    <Check className="h-3.5 w-3.5" />Approve
                  </Button>
                  <Button className="flex-1 gap-1.5 bg-status-error/10 text-status-error border border-status-error/20 hover:bg-status-error/20" variant="outline"
                    onClick={() => handleApproval(selectedApproval.id, "rejected")}>
                    <X className="h-3.5 w-3.5" />Reject
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Tasks;
