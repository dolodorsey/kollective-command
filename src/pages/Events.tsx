import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Calendar, MapPin, Star, Filter, ChevronRight } from "lucide-react";
import { format, isPast, isThisMonth, isAfter } from "date-fns";
import { cn } from "@/lib/utils";

const SERIES_COLORS: Record<string, string> = {
  espresso: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  "taste-of-art": "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "shut-up-dance": "bg-pink-500/10 text-pink-500 border-pink-500/20",
  paparazzi: "bg-red-500/10 text-red-500 border-red-500/20",
  "sundays-best": "bg-sky-500/10 text-sky-500 border-sky-500/20",
  "gangsta-gospel": "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  "napkin-king": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  birthday: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  "world-cup": "bg-green-500/10 text-green-500 border-green-500/20",
  pawchella: "bg-teal-500/10 text-teal-500 border-teal-500/20",
  "black-ball": "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
  "snow-ball": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

const Events = () => {
  const [cityFilter, setCityFilter] = useState("all");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [showPast, setShowPast] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ["events-2026", cityFilter, seriesFilter],
    queryFn: async () => {
      let q = supabase.from("events").select("*").order("date", { ascending: true });
      if (cityFilter !== "all") q = q.eq("city", cityFilter);
      if (seriesFilter !== "all") q = q.eq("series", seriesFilter);
      const { data } = await q;
      return data || [];
    },
  });

  const now = new Date();
  const upcoming = events.filter((e: any) => !isPast(new Date(e.date)));
  const past = events.filter((e: any) => isPast(new Date(e.date)));
  const nextEvent = upcoming[0];

  const cities = [...new Set(events.map((e: any) => e.city))].sort();
  const seriesList = [...new Set(events.map((e: any) => e.series).filter(Boolean))].sort();

  const displayEvents = showPast ? events : upcoming;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Events Calendar</h1>
        <span className="rounded-md bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{upcoming.length} upcoming</span>
      </div>

      {/* Next Event Highlight */}
      {nextEvent && (
        <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-6">
          <div className="absolute right-4 top-4 text-5xl font-black text-primary/10">NEXT</div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/60">Next Event</p>
          <h2 className="mt-1 text-xl font-bold text-foreground">{nextEvent.title}</h2>
          <div className="mt-2 flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />{format(new Date(nextEvent.date), "EEEE, MMMM d, yyyy")}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />{nextEvent.city}
            </span>
            {nextEvent.is_featured && <Star className="h-4 w-4 text-primary fill-primary" />}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Events", value: events.length },
          { label: "Cities", value: cities.length },
          { label: "Series", value: seriesList.length },
          { label: "Featured", value: events.filter((e: any) => e.is_featured).length },
        ].map((s, i) => (
          <div key={i} className="rounded-lg border border-border/50 bg-card p-3 text-center">
            <div className="font-mono text-xl font-bold text-foreground">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
          className="rounded-md border border-border/50 bg-input px-3 py-1.5 text-xs text-foreground">
          <option value="all">All Cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={seriesFilter} onChange={e => setSeriesFilter(e.target.value)}
          className="rounded-md border border-border/50 bg-input px-3 py-1.5 text-xs text-foreground">
          <option value="all">All Series</option>
          {seriesList.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => setShowPast(!showPast)}
          className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
            showPast ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          )}>
          {showPast ? "Show All" : "Show Past"}
        </button>
      </div>

      {/* Event Grid */}
      <div className="space-y-2">
        {displayEvents.map((e: any) => {
          const eventDate = new Date(e.date);
          const isNext = e.id === nextEvent?.id;
          const colorClass = SERIES_COLORS[e.series] || "bg-muted text-muted-foreground border-border/30";
          return (
            <div key={e.id} className={cn(
              "flex items-center gap-4 rounded-lg border bg-card p-4 transition-all hover:border-primary/20",
              isNext ? "border-primary/30" : "border-border/50",
              isPast(eventDate) && "opacity-50"
            )}>
              {/* Date Block */}
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">{format(eventDate, "MMM")}</span>
                <span className="text-lg font-bold text-foreground">{format(eventDate, "d")}</span>
              </div>
              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{e.title}</p>
                  {e.is_featured && <Star className="h-3 w-3 shrink-0 text-primary fill-primary" />}
                </div>
                <div className="mt-0.5 flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />{e.city}
                  </span>
                  <span className="text-xs text-muted-foreground">{format(eventDate, "EEEE")}</span>
                </div>
              </div>
              {/* Series Badge */}
              <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold", colorClass)}>
                {e.series?.replace(/-/g, " ")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Events;
