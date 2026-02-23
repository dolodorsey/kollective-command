import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { DIVISIONS } from "@/lib/constants";
import { Calendar, ChevronLeft, ChevronRight, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const Events = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [brandFilter, setBrandFilter] = useState("all");

  const { data: events = [] } = useQuery({
    queryKey: ["all-events"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").order("date", { ascending: true });
      return data || [];
    },
  });

  const filtered = brandFilter === "all" ? events : events.filter((e: any) =>
    (e.brand || "").includes(brandFilter) || (e.series || "").toLowerCase().includes(brandFilter)
  );

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start, end });
    const startPad = start.getDay();
    const padded = Array(startPad).fill(null).concat(allDays);
    return padded;
  }, [currentMonth]);

  const eventsOnDay = (day: Date) => filtered.filter((e: any) => {
    try { return isSameDay(parseISO(e.date), day); } catch { return false; }
  });

  const selectedEvents = selectedDay ? eventsOnDay(selectedDay) : [];
  const upcoming = filtered.filter((e: any) => {
    try { return parseISO(e.date) >= new Date(); } catch { return false; }
  });

  const seriesColors: Record<string, string> = {
    "NOIR": "bg-purple-100 text-purple-700 border-purple-200",
    "Taste of Art": "bg-orange-100 text-orange-700 border-orange-200",
    "Shut Up & Dance": "bg-pink-100 text-pink-700 border-pink-200",
    "Paparazzi": "bg-red-100 text-red-700 border-red-200",
    "Sunday's Best": "bg-yellow-100 text-yellow-700 border-yellow-200",
    "Gangsta Gospel": "bg-indigo-100 text-indigo-700 border-indigo-200",
    "Napkin King": "bg-green-100 text-green-700 border-green-200",
    "Pawchella": "bg-amber-100 text-amber-700 border-amber-200",
    "Black Ball": "bg-gray-800 text-white border-gray-900",
    "Snow Ball": "bg-blue-100 text-blue-700 border-blue-200",
  };

  const getEventColor = (e: any) => {
    const s = e.series || e.title || "";
    for (const [key, val] of Object.entries(seriesColors)) {
      if (s.toLowerCase().includes(key.toLowerCase())) return val;
    }
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
        <div className="flex gap-1">
          {(["calendar", "list"] as const).map(v => (
            <button key={v} onClick={() => setViewMode(v)}
              className={cn("rounded-md px-3 py-1.5 text-xs font-semibold uppercase",
                viewMode === v ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}>{v}</button>
          ))}
        </div>
      </div>

      {/* Brand filter */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        <button onClick={() => setBrandFilter("all")} className={cn("shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold", brandFilter === "all" ? "bg-blue-100 text-blue-700" : "text-muted-foreground hover:bg-muted")}>ALL ({events.length})</button>
        {DIVISIONS.filter(d => d.key === "huglife" || d.key === "casper" || d.key === "scented" || d.key === "bodegea").map(d => (
          <button key={d.key} onClick={() => setBrandFilter(d.key)} className={cn("shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap", brandFilter === d.key ? "bg-blue-100 text-blue-700" : "text-muted-foreground hover:bg-muted")}>{d.name}</button>
        ))}
      </div>

      {viewMode === "calendar" ? (
        <div className="flex gap-4">
          {/* Calendar Grid */}
          <div className="flex-1 rounded-lg border border-border/50 bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="rounded-md p-1 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
              <h2 className="text-sm font-bold text-foreground">{format(currentMonth, "MMMM yyyy")}</h2>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="rounded-md p-1 hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
              ))}
              {days.map((day, i) => {
                if (!day) return <div key={`pad-${i}`} className="h-20" />;
                const dayEvents = eventsOnDay(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const today = isToday(day);
                return (
                  <button key={i} onClick={() => setSelectedDay(day)}
                    className={cn("h-20 rounded-md border p-1 text-left transition-all overflow-hidden",
                      isSelected ? "border-blue-400 bg-blue-50 ring-1 ring-blue-200" :
                      today ? "border-blue-200 bg-blue-50/30" :
                      dayEvents.length > 0 ? "border-border/50 bg-card hover:border-blue-200" : "border-border/20 hover:bg-muted/30")}>
                    <span className={cn("text-[10px] font-bold", today ? "text-blue-600" : "text-foreground")}>{format(day, "d")}</span>
                    <div className="mt-0.5 space-y-0.5">
                      {dayEvents.slice(0, 2).map((e: any, j: number) => (
                        <div key={j} className={cn("rounded px-1 py-0.5 text-[8px] font-semibold truncate border", getEventColor(e))}>
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && <div className="text-[8px] text-muted-foreground">+{dayEvents.length - 2} more</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day Detail */}
          <div className="w-[300px] rounded-lg border border-border/50 bg-card p-4">
            <h3 className="text-sm font-bold text-foreground mb-3">
              {selectedDay ? format(selectedDay, "EEEE, MMMM d") : "Select a day"}
            </h3>
            {selectedDay && selectedEvents.length === 0 && (
              <p className="text-xs text-muted-foreground/40 py-8 text-center">No events</p>
            )}
            <div className="space-y-2">
              {selectedEvents.map((e: any) => (
                <div key={e.id} className={cn("rounded-lg border p-3", getEventColor(e))}>
                  <p className="text-xs font-bold">{e.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="h-3 w-3" /><span className="text-[10px]">{e.city}</span>
                  </div>
                  {e.series && <p className="text-[10px] mt-1 opacity-70">Series: {e.series}</p>}
                  {e.description && <p className="text-[10px] mt-1 opacity-70 line-clamp-3">{e.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{upcoming.length} upcoming events</p>
          {upcoming.map((e: any) => (
            <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-muted">
                <span className="text-[8px] font-bold uppercase text-muted-foreground">{format(parseISO(e.date), "MMM")}</span>
                <span className="text-lg font-bold text-foreground leading-none">{format(parseISO(e.date), "d")}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{e.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{e.city}</span>
                  {e.series && <StatusBadge variant="default">{e.series}</StatusBadge>}
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
