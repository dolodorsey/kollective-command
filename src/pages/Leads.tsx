import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Users, Search, Download, Filter, Phone, Mail, Instagram, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const Leads = () => {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts-master", search, sourceFilter],
    queryFn: async () => {
      let q = supabase.from("contacts_master").select("*").order("created_at", { ascending: false }).limit(100);
      if (search) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`);
      if (sourceFilter !== "all") q = q.eq("source", sourceFilter);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["contacts-stats"],
    queryFn: async () => {
      const [total, withEmail, withPhone, withIG] = await Promise.all([
        supabase.from("contacts_master").select("*", { count: "exact", head: true }),
        supabase.from("contacts_master").select("*", { count: "exact", head: true }).not("email", "is", null),
        supabase.from("contacts_master").select("*", { count: "exact", head: true }).not("phone", "is", null),
        supabase.from("contacts_master").select("*", { count: "exact", head: true }).not("instagram_handle", "is", null),
      ]);
      return {
        total: total.count ?? 0,
        withEmail: withEmail.count ?? 0,
        withPhone: withPhone.count ?? 0,
        withIG: withIG.count ?? 0,
      };
    },
  });

  const { data: sources = [] } = useQuery({
    queryKey: ["contact-sources"],
    queryFn: async () => {
      const { data } = await supabase.from("contacts_master").select("source").not("source", "is", null);
      const unique = [...new Set((data || []).map((d: any) => d.source))].filter(Boolean).sort();
      return unique as string[];
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Contacts & Leads</h1>
        <Button size="sm" variant="outline" className="gap-1.5"><Download className="h-3.5 w-3.5" />Export</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Contacts", value: stats?.total?.toLocaleString() ?? "—", icon: Users },
          { label: "With Email", value: stats?.withEmail?.toLocaleString() ?? "—", icon: Mail },
          { label: "With Phone", value: stats?.withPhone?.toLocaleString() ?? "—", icon: Phone },
          { label: "With Instagram", value: stats?.withIG?.toLocaleString() ?? "—", icon: Instagram },
        ].map((s, i) => (
          <div key={i} className="rounded-lg border border-border/50 bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-primary/60" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or city..."
            className="w-full rounded-md border border-border/50 bg-input py-2.5 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary/40"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="rounded-md border border-border/50 bg-input px-3 py-2 text-sm text-foreground outline-none"
        >
          <option value="all">All Sources</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Contact Table */}
      <div className="overflow-hidden rounded-lg border border-border/50">
        <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-3 bg-secondary/50 px-4 py-2.5">
          {["Name", "Email / Phone", "City", "Source", "Socials"].map(h => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{h}</span>
          ))}
        </div>
        {isLoading && <div className="px-4 py-6 text-center text-sm text-muted-foreground/40">Loading...</div>}
        {contacts.map((c: any) => (
          <div key={c.id} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] items-center gap-3 border-t border-border/30 bg-card px-4 py-3 transition-colors hover:bg-card/80">
            <div>
              <p className="truncate text-sm font-medium text-foreground">{c.full_name || "—"}</p>
              {c.tags?.length > 0 && (
                <div className="mt-0.5 flex gap-1">
                  {c.tags.slice(0, 3).map((t: string, i: number) => (
                    <span key={i} className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{t}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="min-w-0">
              {c.email && <p className="truncate text-xs text-muted-foreground">{c.email}</p>}
              {c.phone && <p className="truncate font-mono text-xs text-muted-foreground">{c.phone}</p>}
            </div>
            <div className="flex items-center gap-1">
              {c.city && <><MapPin className="h-3 w-3 text-muted-foreground/40" /><span className="text-xs text-muted-foreground">{c.city}</span></>}
            </div>
            <StatusBadge variant="default">{c.source || "—"}</StatusBadge>
            <div className="flex gap-2">
              {c.instagram_handle && <span className="text-[10px] text-status-purple">{c.instagram_handle}</span>}
              {c.tiktok_handle && <span className="text-[10px] text-status-info">{c.tiktok_handle}</span>}
            </div>
          </div>
        ))}
        {!isLoading && contacts.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground/40">No contacts match your filters</div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/40">Showing {contacts.length} of {stats?.total?.toLocaleString() ?? "—"} total contacts</p>
    </div>
  );
};

export default Leads;
