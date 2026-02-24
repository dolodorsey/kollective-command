import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DIVISIONS, TEAM } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckSquare, Plus, Circle, CheckCircle2, Clock, Users, ListChecks, Mail, Search, ChevronLeft, Library, ExternalLink, User, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

const ACTIVE_BRANDS = ["good-times","forever-futbol","noir","taste-of-art","remix","wrst-bhvr-napkins","sundays-best","paparazzi","gangsta-gospel"];
const ALL_BRANDS = DIVISIONS.flatMap(d => d.brands.map(b => ({
  name: b, division: d.name, divKey: d.key, color: d.color,
  key: b.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""),
})));

const Tasks = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState("board");
  const [brandFilter, setBrandFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [showTaskBank, setShowTaskBank] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [bankBrand, setBankBrand] = useState("");
  const [bankMember, setBankMember] = useState("");
  const [bankDue, setBankDue] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [bankLinks, setBankLinks] = useState("");

  // New task form
  const [newTitle, setNewTitle] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newMember, setNewMember] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newType, setNewType] = useState("general");
  const [newDesc, setNewDesc] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newLinks, setNewLinks] = useState("");

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-full"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(500);
      return data || [];
    },
    refetchInterval: 10000,
  });

  const { data: taskBank = [] } = useQuery({
    queryKey: ["task-bank"],
    queryFn: async () => {
      const { data } = await supabase.from("task_bank").select("*").order("category").order("subcategory").order("title");
      return data || [];
    },
  });

  // Filter tasks
  const filtered = useMemo(() => {
    let list = tasks;
    if (brandFilter !== "all") list = list.filter((t: any) => t.brand_key === brandFilter);
    if (memberFilter !== "all") list = list.filter((t: any) => t.assigned_to === memberFilter || t.assigned_team_member === memberFilter);
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter((t: any) => (t.title || "").toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q));
    }
    return list;
  }, [tasks, brandFilter, memberFilter, searchQ]);

  const grouped = {
    todo: filtered.filter((t: any) => t.status === "todo" || t.status === "pending"),
    in_progress: filtered.filter((t: any) => t.status === "in_progress" || t.status === "active"),
    done: filtered.filter((t: any) => t.status === "done" || t.status === "completed"),
  };

  const advanceStatus = async (e: React.MouseEvent, id: string, current: string) => {
    e.stopPropagation();
    e.preventDefault();
    const next = current === "todo" || current === "pending" ? "in_progress" : current === "in_progress" || current === "active" ? "done" : "todo";
    await supabase.from("tasks").update({ status: next, updated_at: new Date().toISOString(), ...(next === "done" ? { completed_at: new Date().toISOString() } : { completed_at: null }) }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks-full"] });
    toast.success(`→ ${next.replace("_", " ")}`);
  };

  const setTaskStatus = async (id: string, status: string) => {
    await supabase.from("tasks").update({ status, updated_at: new Date().toISOString(), ...(status === "done" ? { completed_at: new Date().toISOString() } : { completed_at: null }) }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks-full"] });
    setSelectedTask((prev: any) => prev ? { ...prev, status } : null);
    toast.success(`Set to ${status.replace("_", " ")}`);
  };

  const updateTaskField = async (id: string, updates: any) => {
    await supabase.from("tasks").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks-full"] });
    setSelectedTask((prev: any) => prev ? { ...prev, ...updates } : null);
    toast.success("Updated");
  };

  const emailMemberTasks = (member: any) => {
    const nm = member.name.toLowerCase();
    const mt = tasks.filter((t: any) => ((t.assigned_to || "").toLowerCase() === nm || (t.assigned_team_member || "").toLowerCase() === nm) && t.status !== "done" && t.status !== "completed");
    if (mt.length === 0) { toast.info("No open tasks"); return; }
    const lines = mt.map((t: any, i: number) => { const b = ALL_BRANDS.find(x => x.key === t.brand_key); return `${i+1}. [${b?.name || t.brand_key}] ${t.title} — Due: ${t.due_date ? format(new Date(t.due_date), "MMM d") : "TBD"}${t.links?.length ? "\n   " + t.links.join("\n   ") : ""}`; }).join("\n");
    const subj = `Your Task List — ${mt.length} Open Tasks (${format(new Date(), "MMM d")})`;
    const body = `Hi ${member.name},\n\nHere are your current open tasks:\n\n${lines}\n\n— Kollective Command Center`;
    window.open(`mailto:?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`);
  };

  const createFromBank = async (template: any) => {
    if (!bankBrand) { toast.error("Select a brand"); return; }
    const { error } = await supabase.from("tasks").insert({
      title: template.title,
      description: bankDetails || template.description,
      brand_key: bankBrand,
      assigned_to: bankMember || null,
      assigned_team_member: bankMember || null,
      priority: template.default_priority === "high" ? "P1" : template.default_priority === "medium" ? "P2" : "P3",
      task_type: template.default_type,
      status: "todo",
      due_date: bankDue || null,
      details: bankDetails || null,
      links: bankLinks ? bankLinks.split("\n").filter(Boolean) : null,
      metadata: { from_bank: template.id, category: template.category, subcategory: template.subcategory, estimated_hours: template.estimated_hours },
    });
    if (!error) {
      toast.success(`Task created: ${template.title}`);
      setShowTaskBank(false);
      setBankBrand(""); setBankMember(""); setBankDue(""); setBankDetails(""); setBankLinks("");
      qc.invalidateQueries({ queryKey: ["tasks-full"] });
    } else toast.error("Failed: " + error.message);
  };

  const createManualTask = async () => {
    if (!newTitle || !newBrand) { toast.error("Title and brand required"); return; }
    const { error } = await supabase.from("tasks").insert({
      title: newTitle,
      description: newDesc,
      brand_key: newBrand,
      assigned_to: newMember || null,
      assigned_team_member: newMember || null,
      priority: newPriority === "high" ? "P1" : newPriority === "medium" ? "P2" : "P3",
      task_type: newType,
      status: "todo",
      due_date: newDue || null,
      links: newLinks ? newLinks.split("\n").filter(Boolean) : null,
    });
    if (!error) {
      toast.success("Task created");
      setShowNewTask(false);
      setNewTitle(""); setNewBrand(""); setNewMember(""); setNewDesc(""); setNewDue(""); setNewLinks("");
      qc.invalidateQueries({ queryKey: ["tasks-full"] });
    } else toast.error("Failed: " + error.message);
  };

  const bankCategories = [...new Set(taskBank.map((t: any) => t.category))];
  const [bankCatFilter, setBankCatFilter] = useState("all");
  const filteredBank = bankCatFilter === "all" ? taskBank : taskBank.filter((t: any) => t.category === bankCatFilter);

  const TaskCard = ({ task }: { task: any }) => {
    const brand = ALL_BRANDS.find(b => b.key === task.brand_key);
    const isActive = ACTIVE_BRANDS.includes(task.brand_key);
    return (
      <div className={cn("p-3 bg-white border rounded-lg hover:border-gray-300 transition-all cursor-pointer", task.status === "done" && "opacity-50")}
        onClick={() => setSelectedTask(task)}>
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium text-sm leading-tight flex-1">{task.title || task.description?.substring(0, 60)}</div>
          <button onClick={(e) => advanceStatus(e, task.id, task.status)}
            className="shrink-0 p-1 rounded hover:bg-gray-100" title="Click to advance status">
            {task.status === "done" || task.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : task.status === "in_progress" || task.status === "active" ? <Clock className="h-4 w-4 text-amber-500" /> : <Circle className="h-4 w-4 text-gray-300" />}
          </button>
        </div>
        {task.description && task.title && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</div>}
        <div className="flex flex-wrap gap-1 mt-2">
          {task.brand_key && <Badge variant="outline" className="text-[10px]" style={brand ? { borderColor: brand.color, color: brand.color } : {}}>{brand?.name || task.brand_key}</Badge>}
          {task.priority && <Badge className={cn("text-[10px]", task.priority === "P1" ? "bg-red-100 text-red-800" : task.priority === "P2" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600")}>{task.priority}</Badge>}
          {(task.assigned_to || task.assigned_team_member) && <Badge variant="secondary" className="text-[10px]"><User className="h-2.5 w-2.5 mr-0.5" />{task.assigned_team_member || task.assigned_to}</Badge>}
          {task.due_date && <Badge variant="secondary" className="text-[10px]">{format(new Date(task.due_date), "MMM d")}</Badge>}
          {!isActive && task.brand_key && <Badge variant="secondary" className="text-[9px] bg-gray-50 text-gray-400">inactive</Badge>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} tasks {brandFilter !== "all" ? `for ${ALL_BRANDS.find(b => b.key === brandFilter)?.name || brandFilter}` : ""}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowTaskBank(true)}><Library className="h-3.5 w-3.5 mr-1" />Task Bank</Button>
          <Button size="sm" onClick={() => setShowNewTask(true)}><Plus className="h-3.5 w-3.5 mr-1" />New Task</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search tasks..." className="w-full rounded-md border border-border/50 bg-input pl-8 pr-3 py-1.5 text-sm outline-none focus:border-primary/40" />
        </div>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="All Brands" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            <SelectItem value="__active__" disabled className="font-bold text-[10px] opacity-40">— ACTIVE —</SelectItem>
            {ALL_BRANDS.filter(b => ACTIVE_BRANDS.includes(b.key)).map(b => <SelectItem key={b.key} value={b.key}><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />{b.name}</span></SelectItem>)}
            <SelectItem value="__others__" disabled className="font-bold text-[10px] opacity-40">— OTHERS —</SelectItem>
            {ALL_BRANDS.filter(b => !ACTIVE_BRANDS.includes(b.key)).map(b => <SelectItem key={b.key} value={b.key}><span className="flex items-center gap-1.5 opacity-50"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />{b.name}</span></SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={memberFilter} onValueChange={setMemberFilter}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="All Members" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            {TEAM.map(m => <SelectItem key={m.name} value={m.name.toLowerCase()}>{m.name} — {m.role}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="board"><CheckSquare className="h-3.5 w-3.5 mr-1" />Board</TabsTrigger>
          <TabsTrigger value="by_brand"><ListChecks className="h-3.5 w-3.5 mr-1" />By Brand</TabsTrigger>
          <TabsTrigger value="by_member"><Users className="h-3.5 w-3.5 mr-1" />By Member</TabsTrigger>
        </TabsList>

        {/* KANBAN BOARD */}
        <TabsContent value="board" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            {(["todo", "in_progress", "done"] as const).map(status => (
              <div key={status} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {status === "todo" ? <Circle className="h-4 w-4" /> : status === "in_progress" ? <Clock className="h-4 w-4 text-amber-500" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {status.replace("_", " ")} ({grouped[status].length})
                </div>
                <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                  {grouped[status].map((task: any) => <TaskCard key={task.id} task={task} />)}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* BY BRAND */}
        <TabsContent value="by_brand" className="mt-4">
          <div className="space-y-6">
            {ALL_BRANDS.filter(b => ACTIVE_BRANDS.includes(b.key)).map(brand => {
              const brandTasks = tasks.filter((t: any) => t.brand_key === brand.key);
              if (brandTasks.length === 0 && brandFilter !== "all") return null;
              return (
                <div key={brand.key} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: brand.color }} />
                      <span className="font-semibold text-sm">{brand.name}</span>
                      <Badge variant="outline" className="text-[10px]">{brand.division}</Badge>
                      <Badge className="text-[10px] bg-green-50 text-green-700">Active</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{brandTasks.length} tasks</span>
                  </div>
                  {brandTasks.length > 0 ? (
                    <div className="divide-y">
                      {brandTasks.slice(0, 15).map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedTask(t)}>
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button onClick={(e) => advanceStatus(e, t.id, t.status)} className="shrink-0">
                              {t.status === "done" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : t.status === "in_progress" ? <Clock className="h-4 w-4 text-amber-500" /> : <Circle className="h-4 w-4 text-gray-300" />}
                            </button>
                            <span className={cn("text-sm truncate", t.status === "done" && "line-through text-muted-foreground")}>{t.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {(t.assigned_team_member || t.assigned_to) && <span className="text-[10px] text-muted-foreground">{t.assigned_team_member || t.assigned_to}</span>}
                            {t.priority && <Badge className={cn("text-[9px]", t.priority === "P1" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800")}>{t.priority}</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center text-xs text-muted-foreground">No tasks yet. Use Task Bank to add.</div>
                  )}
                </div>
              );
            })}
            {/* Inactive brands */}
            <div className="pt-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Inactive Brands</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ALL_BRANDS.filter(b => !ACTIVE_BRANDS.includes(b.key)).map(brand => {
                  const cnt = tasks.filter((t: any) => t.brand_key === brand.key).length;
                  return (
                    <div key={brand.key} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed opacity-40 text-xs">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: brand.color }} />
                      <span>{brand.name}</span>
                      {cnt > 0 && <span className="text-muted-foreground">({cnt})</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* BY MEMBER */}
        <TabsContent value="by_member" className="mt-4">
          <div className="space-y-4">
            {TEAM.map(member => {
              const memberName = member.name.toLowerCase();
              const memberTasks = tasks.filter((t: any) => (t.assigned_to || "").toLowerCase() === memberName || (t.assigned_team_member || "").toLowerCase() === memberName);
              const openTasks = memberTasks.filter((t: any) => t.status !== "done" && t.status !== "completed");
              return (
                <div key={member.name} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">{member.name}</span>
                      <Badge variant="outline" className="text-[10px]">{member.role}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{openTasks.length} open / {memberTasks.length} total</span>
                      <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => emailMemberTasks(member)}><Mail className="h-3 w-3 mr-1" />Email List</Button>
                    </div>
                  </div>
                  {memberTasks.length > 0 ? (
                    <div className="divide-y">
                      {memberTasks.map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedTask(t)}>
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button onClick={(e) => advanceStatus(e, t.id, t.status)} className="shrink-0">
                              {t.status === "done" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : t.status === "in_progress" ? <Clock className="h-4 w-4 text-amber-500" /> : <Circle className="h-4 w-4 text-gray-300" />}
                            </button>
                            <span className={cn("text-sm truncate", t.status === "done" && "line-through text-muted-foreground")}>{t.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {t.brand_key && <Badge variant="outline" className="text-[9px]">{t.brand_key}</Badge>}
                            {t.due_date && <span className="text-[10px] text-muted-foreground">{format(new Date(t.due_date), "MMM d")}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-4 text-center text-xs text-muted-foreground">No tasks assigned to {member.name}</div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* TASK DETAIL MODAL */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{selectedTask?.title}</DialogTitle></DialogHeader>
          {selectedTask && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap gap-2">
                {selectedTask.brand_key && <Badge variant="outline">{ALL_BRANDS.find(b => b.key === selectedTask.brand_key)?.name || selectedTask.brand_key}</Badge>}
                {selectedTask.priority && <Badge className={cn(selectedTask.priority === "P1" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800")}>{selectedTask.priority}</Badge>}
                {selectedTask.task_type && <Badge variant="secondary">{selectedTask.task_type}</Badge>}
              </div>
              {selectedTask.description && <p className="text-sm text-muted-foreground">{selectedTask.description}</p>}
              {selectedTask.details && <div className="text-sm bg-gray-50 rounded p-3">{selectedTask.details}</div>}
              {selectedTask.links && selectedTask.links.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">Links</span>
                  {selectedTask.links.map((l: string, i: number) => (
                    <a key={i} href={l} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><ExternalLink className="h-3 w-3" />{l}</a>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-muted-foreground">Assigned:</span> {selectedTask.assigned_team_member || selectedTask.assigned_to || "Unassigned"}</div>
                <div><span className="text-muted-foreground">Due:</span> {selectedTask.due_date ? format(new Date(selectedTask.due_date), "MMM d, yyyy") : "No date"}</div>
              </div>
              {/* Explicit status buttons */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">Status</span>
                <div className="flex gap-2">
                  {["todo", "in_progress", "done"].map(s => (
                    <Button key={s} size="sm" variant={selectedTask.status === s ? "default" : "outline"} className="text-xs capitalize flex-1" onClick={() => setTaskStatus(selectedTask.id, s)}>
                      {s === "todo" ? <Circle className="h-3 w-3 mr-1" /> : s === "in_progress" ? <Clock className="h-3 w-3 mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {s.replace("_", " ")}
                    </Button>
                  ))}
                </div>
              </div>
              {/* Assign to team member */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">Assign To</span>
                <Select value={selectedTask.assigned_team_member || selectedTask.assigned_to || "unassigned"} onValueChange={v => updateTaskField(selectedTask.id, { assigned_to: v === "unassigned" ? null : v, assigned_team_member: v === "unassigned" ? null : v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {TEAM.map(m => <SelectItem key={m.name} value={m.name.toLowerCase()}>{m.name} — {m.role}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" variant="destructive" onClick={async () => { await supabase.from("tasks").delete().eq("id", selectedTask.id); qc.invalidateQueries({ queryKey: ["tasks-full"] }); setSelectedTask(null); toast.success("Deleted"); }}><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* TASK BANK MODAL */}
      <Dialog open={showTaskBank} onOpenChange={setShowTaskBank}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Task Bank — Pick a Template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap items-center">
              <Select value={bankBrand} onValueChange={setBankBrand}>
                <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue placeholder="Select brand *" /></SelectTrigger>
                <SelectContent>{ALL_BRANDS.filter(b => ACTIVE_BRANDS.includes(b.key)).map(b => <SelectItem key={b.key} value={b.key}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={bankMember} onValueChange={setBankMember}>
                <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Assign to..." /></SelectTrigger>
                <SelectContent>{TEAM.map(m => <SelectItem key={m.name} value={m.name.toLowerCase()}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="date" value={bankDue} onChange={e => setBankDue(e.target.value)} className="w-[140px] h-8 text-xs" placeholder="Due date" />
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant={bankCatFilter === "all" ? "default" : "outline"} className="text-xs h-7" onClick={() => setBankCatFilter("all")}>All ({taskBank.length})</Button>
              {bankCategories.map(c => (
                <Button key={c} size="sm" variant={bankCatFilter === c ? "default" : "outline"} className="text-xs h-7 capitalize" onClick={() => setBankCatFilter(c)}>{c} ({taskBank.filter((t: any) => t.category === c).length})</Button>
              ))}
            </div>
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
              {filteredBank.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="font-medium text-sm">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.description}</div>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-[9px] capitalize">{t.category}</Badge>
                      <Badge variant="secondary" className="text-[9px] capitalize">{t.subcategory}</Badge>
                      {t.estimated_hours && <Badge variant="secondary" className="text-[9px]">{t.estimated_hours}h</Badge>}
                    </div>
                  </div>
                  <Button size="sm" className="shrink-0 h-7 text-xs" onClick={() => createFromBank(t)} disabled={!bankBrand}>
                    <Plus className="h-3 w-3 mr-1" />Add
                  </Button>
                </div>
              ))}
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">Custom Details (optional)</span>
              <Textarea value={bankDetails} onChange={e => setBankDetails(e.target.value)} placeholder="Add specific instructions for this task..." rows={2} className="text-sm" />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">Links (one per line)</span>
              <Textarea value={bankLinks} onChange={e => setBankLinks(e.target.value)} placeholder="https://..." rows={2} className="text-sm font-mono" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* NEW TASK MODAL */}
      <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Custom Task</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <span className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">Title *</span>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="What needs to happen?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">Brand *</span>
                <Select value={newBrand} onValueChange={setNewBrand}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Brand" /></SelectTrigger>
                  <SelectContent>{ALL_BRANDS.map(b => <SelectItem key={b.key} value={b.key}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">Assign To</span>
                <Select value={newMember} onValueChange={setNewMember}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Team member" /></SelectTrigger>
                  <SelectContent>{TEAM.map(m => <SelectItem key={m.name} value={m.name.toLowerCase()}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">Priority</span>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">Type</span>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="general">General</SelectItem><SelectItem value="dm">DM</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="sms">SMS</SelectItem><SelectItem value="comment">Comment</SelectItem><SelectItem value="graphic">Graphic</SelectItem><SelectItem value="scrape">Scrape</SelectItem><SelectItem value="document">Document</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">Due</span>
                <Input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} className="text-xs" />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">Description / Details</span>
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Details, instructions, context..." rows={3} />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">Links (one per line)</span>
              <Textarea value={newLinks} onChange={e => setNewLinks(e.target.value)} placeholder="https://..." rows={2} className="font-mono text-xs" />
            </div>
            <Button onClick={createManualTask} disabled={!newTitle || !newBrand} className="w-full">Create Task</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tasks;
