import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DIVISIONS, US_HOLIDAYS_2026, CULTURAL_DATES_2026, WORLD_CUP_2026 } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight , ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const Events = () => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [tab, setTab] = useState("all");

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").order("date");
      return data || [];
    },
  });

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return { days: eachDayOfInterval({ start, end }), startPad: start.getDay() };
  }, [currentMonth]);

  const getEventsForDate = (date: Date) => {
    const ds = format(date, 'yyyy-MM-dd');
    return {
      events: events.filter((e: any) => { try { const ed = e.date?.includes('T') ? format(parseISO(e.date), 'yyyy-MM-dd') : e.date; return ed === ds; } catch { return false; } }),
      holidays: US_HOLIDAYS_2026.filter(h => h.date === ds),
      cultural: CULTURAL_DATES_2026.filter(c => c.date === ds),
    };
  };

  const getDivColor = (brand: string) => DIVISIONS.find(d => d.brands.some(b => b.toLowerCase().includes(brand?.toLowerCase() || '')) || d.key === brand?.toLowerCase())?.color || '#6B7280';

  const sel = selectedDate ? getEventsForDate(selectedDate) : null;

  const filtered = events.filter((e: any) => tab === 'all' || (tab === 'huglife' && e.brand === 'huglife') || (tab === 'drdorsey' && (e.series?.includes('dorsey') || e.series?.includes('Dorsey'))));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Events & Calendar</h1>
        <Badge variant="outline" className="text-base px-4 py-1">{events.length} events</Badge>
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all">All Events</TabsTrigger>
              <TabsTrigger value="huglife">HugLife</TabsTrigger>
              <TabsTrigger value="drdorsey">Dr. Dorsey</TabsTrigger>
              <TabsTrigger value="holidays">Holidays</TabsTrigger>
              <TabsTrigger value="other">Other</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {tab === 'holidays' ? (
                  [...US_HOLIDAYS_2026, ...CULTURAL_DATES_2026].sort((a, b) => a.date.localeCompare(b.date)).map(h => (
                    <div key={h.date + h.name} className="flex items-center gap-4 p-3 bg-white border rounded-lg">
                      <div className="w-14 text-center"><div className="text-[10px] text-muted-foreground uppercase">{format(parseISO(h.date), 'MMM')}</div><div className="text-lg font-bold">{format(parseISO(h.date), 'd')}</div></div>
                      <div><div className="font-medium text-sm">{h.name}</div>{'city' in h && <div className="text-xs text-muted-foreground">{(h as any).city}</div>}</div>
                    </div>
                  ))
                ) : (
                  filtered.map((event: any) => (
                    <div key={event.id} className="flex items-center gap-4 p-3 bg-white border rounded-lg hover:border-gray-300">
                      <div className="w-14 text-center"><div className="text-[10px] text-muted-foreground uppercase">{event.date ? format(new Date(event.date), 'MMM') : '—'}</div><div className="text-lg font-bold">{event.date ? format(new Date(event.date), 'd') : '—'}</div></div>
                      <div className="flex-1"><div className="font-semibold text-sm">{event.title}</div><div className="text-xs text-muted-foreground">{event.city || '—'} {event.series ? `• ${event.series}` : ''}</div></div>
                      <div className="w-2 h-8 rounded-full" style={{ backgroundColor: getDivColor(event.brand || event.series) }} />
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <h3 className="font-semibold text-sm">{format(currentMonth, 'MMMM yyyy')}</h3>
              <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (<div key={d} className="text-[10px] text-muted-foreground font-medium py-1">{d}</div>))}
              {Array.from({ length: days.startPad }).map((_, i) => <div key={'p'+i} />)}
              {days.days.map(day => {
                const { events: de, holidays: dh } = getEventsForDate(day);
                const isSel = selectedDate && isSameDay(day, selectedDate);
                const isWC = day >= parseISO(WORLD_CUP_2026.start) && day <= parseISO(WORLD_CUP_2026.end);
                return (
                  <button key={day.toISOString()} onClick={() => setSelectedDate(day)} className={cn("relative h-8 w-full rounded text-xs transition-all", isToday(day) && "font-bold ring-1 ring-gray-900", isSel && "bg-gray-900 text-white", !isSel && de.length > 0 && "bg-purple-50 font-semibold", !isSel && dh.length > 0 && "bg-red-50", !isSel && isWC && !de.length && !dh.length && "bg-green-50", !isSel && "hover:bg-gray-100")}>
                    {format(day, 'd')}
                    {de.length > 0 && !isSel && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">{de.slice(0, 3).map((e: any, i: number) => <span key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: getDivColor(e.brand || e.series) }} />)}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDate && sel && (
            <div className="bg-white border rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</h4>
              {sel.holidays.map(h => <div key={h.name} className="text-sm p-2 bg-red-50 rounded flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500" />{h.name}</div>)}
              {sel.cultural.map(c => <div key={c.name} className="text-sm p-2 bg-amber-50 rounded flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" />{c.name} {'city' in c && <span className="text-xs text-muted-foreground ml-auto">{(c as any).city}</span>}</div>)}
              {sel.events.map((e: any) => <div key={e.id} className="text-sm p-2 bg-purple-50 rounded flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: getDivColor(e.brand || e.series) }} /><span className="font-medium">{e.title}</span><span className="text-xs text-muted-foreground ml-auto">{e.city}</span></div>)}
              {sel.events.length === 0 && sel.holidays.length === 0 && sel.cultural.length === 0 && <p className="text-xs text-muted-foreground">No events this day.</p>}
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="font-semibold text-sm text-green-800">FIFA World Cup 2026</div>
            <div className="text-xs text-green-700 mt-1">Jun 11 - Jul 19 • Atlanta • Houston • Los Angeles</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Events;
