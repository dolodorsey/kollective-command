import { useState, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { DIVISIONS } from "@/lib/constants";
import { Calendar, ChevronLeft, ChevronRight, MapPin, Plus, Save, X, Clock, CheckSquare, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, parseISO, startOfWeek, endOfWeek, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const Events = () => {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "list" | "week">("calendar");
  const [brandFilter, setBrandFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", date: format(new Date(), "yyyy-MM-dd"), time: "", city: "", type: "event", series: "", description: "", brand: "" });

  const { data: events = [] } = useQuery({
    queryKey: ["all-events"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").order("date", { ascending: true });
      return data || [];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["schedule-tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").not("due_date", "is", null).order("due_date", { ascending: true });
      return data || [];
    },
  });

  const addEvent = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: newItem.title,
        date: newItem.date,
        city: newItem.city || null,
        series: newItem.series || null,
        description: newItem.description || null,
        brand: newItem.brand || null,
      };
      const { error } = await supabase.from("events").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event added");
      setShowAdd(false);
      setNewItem({ title: "", date: format(new Date(), "yyyy-MM-dd"), time: "", city: "", type: "event", series: "", description: "", brand: "" });
      queryClient.invalidateQueries({ queryKey: ["all-events"] });
    },
    onError: (e: any) => toast.error("Failed: " + String(e)),
  });

  const filtered = brandFilter === "all" ? events : events.filter((e: any) =>
    (e.brand || "").includes(brandFilter) || (e.series || "").toLowerCase().includes(brandFilter)
  );

  // Combine events + scheduled tasks
  const allItems = useMemo(() => {
    const eventItems = filtered.map((e: any) => ({ ...e, itemType: "event" }));
    const taskItems = tasks.map((t: any) => ({ id: t.id, title: t.title, date: t.due_date, city: "", series: t.platform || "", description: t.description, itemType: "task", status: t.status, priority: t.priority }));
    return [...eventItems, ...taskItems].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filtered, tasks]);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start, end });
    const startPad = start.getDay();
    return Array(startPad).fill(null).concat(allDays);
  }, [currentMonth]);

  // Week view days
  const weekDays = useMemo(() => {
    const base = selectedDay || new Date();
    const start = startOfWeek(base);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDay]);

  const itemsOnDay = (day: Date) => allItems.filter((e: any) => {
    try { return isSameDay(parseISO(e.date), day); } catch { return false; }
  });

  const selectedEvents = selectedDay ? itemsOnDay(selectedDay) : [];
  const upcoming = allItems.filter((e: any) => {
    try { return parseISO(e.date) >= new Date(); } catch { return false; }
  });

  const seriesColors: Record<string, string> = {
    "NOIR": "bg-purple-100 text-purple-700 border-purple-200",
    "Taste of Art": "bg-orange-100 text-orange-700 border-orange-200",
    "Shut Up & Dance": "bg-pink-100 text-pink-700 border-pink-200",
    "Paparazzi": "bg-red-100 text-red-700 border-red-200",
    "Sunday": "bg-yellow-100 text-yellow-700 border-yellow-200",
    "Gangsta Gospel": "bg-indigo-100 text-indigo-700 border-indigo-200",
    "Napkin": "bg-green-100 text-green-700 border-green-200",
    "Pawchella": "bg-amber-100 text-amber-700 border-amber-200",
    "Black Ball": "bg-gray-800 text-white border-gray-900",
    "Snow Ball": "bg-blue-100 text-blue-700 border-blue-200",
    "Birthday": "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
    "World Cup": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Monster": "bg-orange-200 text-orange-800 border-orange-300",
    "Haunted": "bg-gray-200 text-gray-800 border-gray-300",
    "Winter": "bg-sky-100 text-sky-700 border-sky-200",
    "Beauty": "bg-rose-100 text-rose-700 border-rose-200",
  };

  const getColor = (e: any) => {
    if (e.itemType === "task") return "bg-cyan-100 text-cyan-700 border-cyan-200";
    const s = (e.series || e.title || "").toLowerCase();
    for (const [key, val] of Object.entries(seriesColors)) {
      if (s.includes(key.toLowerCase())) return val;
    }
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Calendar & Schedule</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-3 w-3" />{showAdd ? "Cancel" : "Add"}
          </Button>
          <div className="flex gap-0.5">
            {(["calendar", "week", "list"] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={cn("rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase",
                  viewMode === v ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}>{v}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        <button onClick={() => setBrandFilter("all")} className={cn("shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold", brandFilter === "all" ? "bg-blue-100 text-blue-700" : "text-muted-foreground hover:bg-muted")}>ALL ({events.length})</button>
        {DIVISIONS.filter(d => ["huglife","casper","scented","bodegea","playmakers"].includes(d.key)).map(d => (
          <button key={d.key} onClick={() => setBrandFilter(d.key)} className={cn("shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap", brandFilter === d.key ? "bg-blue-100 text-blue-700" : "text-muted-foreground hover:bg-muted")}>{d.name}</button>
        ))}
      </div>

      {/* Add Event/Schedule form */}
      {showAdd && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
          <div className="grid grid-cols-4 gap-2">
            <input value={newItem.title} onChange={e => setNewItem(p => ({...p, title: e.target.value}))} placeholder="Title" className="col-span-2 rounded border border-border/50 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-300" />
            <input type="date" value={newItem.date} onChange={e => setNewItem(p => ({...p, date: e.target.value}))} className="rounded border border-border/50 bg-white px-3 py-1.5 text-xs outline-none" />
            <input value={newItem.city} onChange={e => setNewItem(p => ({...p, city: e.target.value}))} placeholder="City" className="rounded border border-border/50 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-300" />
          </div>
          <div className="flex gap-2">
            <input value={newItem.series} onChange={e => setNewItem(p => ({...p, series: e.target.value}))} placeholder="Series / Brand" className="flex-1 rounded border border-border/50 bg-white px-3 py-1.5 text-xs outline-none" />
            <input value={newItem.description} onChange={e => setNewItem(p => ({...p, description: e.target.value}))} placeholder="Notes" className="flex-[2] rounded border border-border/50 bg-white px-3 py-1.5 text-xs outline-none" />
            <Button size="sm" onClick={() => newItem.title && addEvent.mutate()} disabled={!newItem.title || addEvent.isPending}>Add</Button>
          </div>
        </div>
      )}

      {viewMode === "calendar" ? (
        <div className="flex gap-4">
          <div className="flex-1 rounded-lg border border-border/50 bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="rounded-md p-1 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
              <h2 className="text-sm font-bold text-foreground">{format(currentMonth, "MMMM yyyy")}</h2>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="rounded-md p-1 hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map(d => <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>)}
              {days.map((day, i) => {
                if (!day) return <div key={`p-${i}`} className="h-20" />;
                const di = itemsOnDay(day);
                const sel = selectedDay && isSameDay(day, selectedDay);
                const td = isToday(day);
                return (
                  <button key={i} onClick={() => setSelectedDay(day)}
                    className={cn("h-20 rounded-md border p-1 text-left transition-all overflow-hidden",
                      sel ? "border-blue-400 bg-blue-50 ring-1 ring-blue-200" :
                      td ? "border-blue-200 bg-blue-50/30" :
                      di.length > 0 ? "border-border/50 bg-card hover:border-blue-200" : "border-border/20 hover:bg-muted/30")}>
                    <span className={cn("text-[10px] font-bold", td ? "text-blue-600" : "text-foreground")}>{format(day, "d")}</span>
                    <div className="mt-0.5 space-y-0.5">
                      {di.slice(0, 2).map((e: any, j: number) => (
                        <div key={j} className={cn("rounded px-1 py-0.5 text-[8px] font-semibold truncate border", getColor(e))}>
                          {e.itemType === "task" ? "\u2611 " : ""}{e.title}
                        </div>
                      ))}
                      {di.length > 2 && <div className="text-[8px] text-muted-foreground">+{di.length - 2}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="w-[300px] rounded-lg border border-border/50 bg-card p-4">
            <h3 className="text-sm font-bold text-foreground mb-3">{selectedDay ? format(selectedDay, "EEEE, MMMM d") : "Select a day"}</h3>
            {selectedDay && selectedEvents.length === 0 && <p className="text-xs text-muted-foreground/40 py-8 text-center">Nothing scheduled</p>}
            <div className="space-y-2">
              {selectedEvents.map((e: any) => (
                <div key={e.id} className={cn("rounded-lg border p-3", getColor(e))}>
                  <div className="flex items-center gap-1.5">
                    {e.itemType === "task" && <CheckSquare className="h-3 w-3" />}
                    <p className="text-xs font-bold">{e.title}</p>
                  </div>
                  {e.city && <div className="flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" /><span className="text-[10px]">{e.city}</span></div>}
                  {e.series && <p className="text-[10px] mt-1 opacity-70">{e.series}</p>}
                  {e.description && <p className="text-[10px] mt-1 opacity-70 line-clamp-3">{e.description}</p>}
                  {e.itemType === "task" && e.priority && <StatusBadge variant={e.priority === "urgent" ? "error" : "warning"}>{e.priority}</StatusBadge>}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : viewMode === "week" ? (
        /* WEEK VIEW */
        <div className="rounded-lg border border-border/50 bg-card">
          <div className="grid grid-cols-7 divide-x divide-border/30">
            {weekDays.map((day, i) => {
              const di = itemsOnDay(day);
              const td = isToday(day);
              return (
                <div key={i} className={cn("min-h-[300px] p-2", td ? "bg-blue-50/30" : "")}>
                  <div className="text-center mb-2">
                    <div className="text-[10px] font-semibold text-muted-foreground">{format(day, "EEE")}</div>
                    <div className={cn("text-sm font-bold", td ? "text-blue-600" : "text-foreground")}>{format(day, "d")}</div>
                  </div>
                  <div className="space-y-1">
                    {di.map((e: any, j: number) => (
                      <div key={j} className={cn("rounded-md border p-1.5 text-[9px] font-semibold", getColor(e))}>
                        {e.title}
                        {e.city && <div className="text-[8px] opacity-70 mt-0.5">{e.city}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{upcoming.length} upcoming</p>
          {upcoming.map((e: any) => (
            <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-muted">
                <span className="text-[8px] font-bold uppercase text-muted-foreground">{format(parseISO(e.date), "MMM")}</span>
                <span className="text-lg font-bold text-foreground leading-none">{format(parseISO(e.date), "d")}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {e.itemType === "task" && <CheckSquare className="h-3 w-3 text-cyan-600" />}
                  <p className="text-sm font-semibold text-foreground">{e.title}</p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {e.city && <span className="text-xs text-muted-foreground">{e.city}</span>}
                  {e.series && <StatusBadge variant="default">{e.series}</StatusBadge>}
                  {e.itemType === "task" && <StatusBadge variant="info">Task</StatusBadge>}
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{format(parseISO(e.date), "EEEE")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Events;
