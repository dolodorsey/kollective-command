import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { DIVISIONS } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Target, Search, Mail, Phone, Instagram, ArrowLeft ,ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Leads = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ["contacts-master"],
    queryFn: async () => {
      const { data } = await supabase.from("contacts_master").select("*").order("created_at", { ascending: false }).limit(300);
      return data || [];
    },
  });

  const { data: mcpLeads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ["mcp-leads"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_leads").select("*").order("score", { ascending: false }).limit(300);
      return data || [];
    },
  });

  const { data: prContacts = [] } = useQuery({
    queryKey: ["pr-contacts-leads"],
    queryFn: async () => {
      const { data } = await supabase.from("pr_contacts").select("*").order("score", { ascending: false }).limit(200);
      return data || [];
    },
  });

  const { data: targets = [] } = useQuery({
    queryKey: ["social-targets-leads"],
    queryFn: async () => {
      const { data } = await supabase.from("social_outreach_targets").select("*").order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
  });

  // Unified search
  const filterBySearch = (items: any[], fields: string[]) => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item: any) => fields.some(f => (item[f] || "").toLowerCase().includes(q)));
  };

  const filterByBrand = (items: any[], brandField: string) => {
    if (brandFilter === "all") return items;
    return items.filter((item: any) => (item[brandField] || "").toLowerCase().includes(brandFilter));
  };

  const filteredContacts = filterByBrand(filterBySearch(contacts, ["full_name", "name", "email", "phone", "company", "city", "instagram_handle"]), "brand");
  const filteredLeads = filterByBrand(filterBySearch(mcpLeads, ["full_name", "email", "phone", "company", "city", "instagram_handle"]), "brand_key");
  const filteredPR = filterByBrand(filterBySearch(prContacts, ["reporter_name", "contact_name", "email", "outlet_name"]), "brand_key");
  const filteredTargets = filterByBrand(filterBySearch(targets, ["handle", "city"]), "brand_key");

  const totalRecords = contacts.length + mcpLeads.length + prContacts.length + targets.length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={() => navigate("/")} className="h-8 w-8 p-0"><ArrowLeft className="h-4 w-4" /></Button>
          <div className="flex items-center gap-3"><Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button><h1 className="text-2xl font-bold text-foreground">Leads <div className="flex items-center gap-3"><button onClick={() => navigate("/")} className="h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100"><ChevronLeft className="h-4 w-4" /></button><h1 className="text-2xl font-bold text-foreground">Leads & Contacts</h1></div> Contacts</h1></div>
        </div>
        <span className="text-xs text-muted-foreground">{totalRecords.toLocaleString()} total records across 4 sources</span>
      </div>

      {/* Source stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Contacts Master", value: contacts.length, color: "text-blue-600" },
          { label: "MCP Leads", value: mcpLeads.length, color: "text-green-600" },
          { label: "PR Contacts", value: prContacts.length, color: "text-orange-600" },
          { label: "Social Targets", value: targets.length, color: "text-pink-600" },
        ].map((s, i) => (
          <div key={i} className="rounded-lg border border-border/50 bg-card p-2.5 text-center">
            <div className={cn("font-mono text-lg font-bold", s.color)}>{s.value}</div>
            <div className="text-[9px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + Brand filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, phone, company..."
            className="w-full rounded-lg border border-border/50 bg-input pl-9 pr-4 py-2 text-sm outline-none focus:border-blue-300" />
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        <button onClick={() => setBrandFilter("all")} className={cn("shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold", brandFilter === "all" ? "bg-blue-100 text-blue-700" : "text-muted-foreground hover:bg-muted")}>ALL</button>
        {DIVISIONS.map(d => (
          <button key={d.key} onClick={() => setBrandFilter(d.key)} className={cn("shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap", brandFilter === d.key ? "bg-blue-100 text-blue-700" : "text-muted-foreground hover:bg-muted")}>{d.name}</button>
        ))}
      </div>

      <Tabs defaultValue="contacts" className="space-y-3">
        <TabsList>
          <TabsTrigger value="contacts" className="gap-1"><Users className="h-3.5 w-3.5" />Contacts ({filteredContacts.length})</TabsTrigger>
          <TabsTrigger value="leads" className="gap-1"><Target className="h-3.5 w-3.5" />MCP Leads ({filteredLeads.length})</TabsTrigger>
          <TabsTrigger value="pr" className="gap-1"><Mail className="h-3.5 w-3.5" />PR ({filteredPR.length})</TabsTrigger>
          <TabsTrigger value="social" className="gap-1"><Instagram className="h-3.5 w-3.5" />Social ({filteredTargets.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts">
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/30">
                {["Name", "Email", "Phone", "IG", "Company", "City", "Brand"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredContacts.slice(0, 80).map((c: any) => (
                  <tr key={c.id} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-3 py-2 font-semibold text-foreground text-xs">{c.full_name || c.name || "\u2014"}</td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground">{c.email || "\u2014"}</td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground">{c.phone || "\u2014"}</td>
                    <td className="px-3 py-2 text-[10px] text-pink-600">{c.instagram_handle || "\u2014"}</td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground">{c.company || "\u2014"}</td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground">{c.city || "\u2014"}</td>
                    <td className="px-3 py-2">{c.brand ? <StatusBadge variant="default">{c.brand}</StatusBadge> : "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredContacts.length > 80 && <div className="px-3 py-2 text-[10px] text-muted-foreground text-center bg-muted/20">Showing 80 of {filteredContacts.length}</div>}
          </div>
        </TabsContent>

        <TabsContent value="leads">
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/30">
                {["Name", "Email", "Phone", "IG", "Score", "Priority", "City", "Brand"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredLeads.slice(0, 80).map((l: any) => (
                  <tr key={l.id} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-3 py-2 font-semibold text-foreground text-xs">{l.full_name || "\u2014"}</td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground">{l.email || "\u2014"}</td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground">{l.phone || "\u2014"}</td>
                    <td className="px-3 py-2 text-[10px] text-pink-600">{l.instagram_handle || "\u2014"}</td>
                    <td className="px-3 py-2 font-mono text-xs font-bold">{l.score || 0}</td>
                    <td className="px-3 py-2"><StatusBadge variant={l.priority === "P1" ? "error" : l.priority === "P2" ? "warning" : "default"}>{l.priority || "\u2014"}</StatusBadge></td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground">{l.city || "\u2014"}</td>
                    <td className="px-3 py-2">{l.brand_key ? <StatusBadge variant="default">{l.brand_key}</StatusBadge> : "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="pr">
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/30">
                {["Name", "Outlet", "Email", "Score", "Tags"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredPR.slice(0, 60).map((p: any) => (
                  <tr key={p.id} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-3 py-2 font-semibold text-foreground text-xs">{p.reporter_name || p.contact_name || "\u2014"}</td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground">{p.outlet_name || "\u2014"}</td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground">{p.email || "\u2014"}</td>
                    <td className="px-3 py-2 font-mono text-xs font-bold">{p.score || "\u2014"}</td>
                    <td className="px-3 py-2">{(p.tags || []).slice(0, 2).map((t: string, j: number) => <StatusBadge key={j} variant="default">{t}</StatusBadge>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="social">
          <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/30">
                {["Handle", "Platform", "Brand", "City", "Status", "Tags"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredTargets.slice(0, 60).map((t: any) => (
                  <tr key={t.id} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-3 py-2 font-semibold text-pink-600 text-xs">{t.handle}</td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground">{t.platform || "instagram"}</td>
                    <td className="px-3 py-2"><StatusBadge variant="default">{t.brand_key}</StatusBadge></td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground">{t.city || "\u2014"}</td>
                    <td className="px-3 py-2"><StatusBadge variant={t.status === "ready" ? "warning" : t.status === "replied" ? "success" : "info"}>{t.status || "\u2014"}</StatusBadge></td>
                    <td className="px-3 py-2">{(t.tags || []).slice(0, 2).map((tag: string, j: number) => <StatusBadge key={j} variant="default">{tag}</StatusBadge>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leads;
