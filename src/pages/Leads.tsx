import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { DIVISIONS } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Target, Search, Mail, Phone, Instagram, ChevronLeft, Crosshair, Copy, Globe, Linkedin, Music2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CITIES = ["Atlanta","Houston","Los Angeles","Charlotte","Washington DC","Miami","Las Vegas"];

const SCRAPE_FORMULAS = [
  { id: "google_venues", label: "Google → Venues/Restaurants", icon: Globe, category: "google", formula: '"{city}" "{type}" site:instagram.com OR site:yelp.com', variables: ["city","type"], example: '"Atlanta" "rooftop bar" site:instagram.com', desc: "Find venue Instagram handles from Google index" },
  { id: "google_influencers", label: "Google → Influencers by Niche", icon: Globe, category: "google", formula: '"{city}" "{niche}" "influencer" OR "content creator" site:instagram.com', variables: ["city","niche"], example: '"Atlanta" "food blogger" "content creator" site:instagram.com', desc: "Find influencer profiles by city + niche" },
  { id: "google_djs", label: "Google → DJs / Hosts", icon: Globe, category: "google", formula: '"{city}" "DJ" OR "host" "{genre}" site:instagram.com -agency', variables: ["city","genre"], example: '"Houston" "DJ" "hip hop" site:instagram.com -agency', desc: "Find DJ and host Instagram profiles" },
  { id: "google_sponsors", label: "Google → Sponsor Contacts", icon: Globe, category: "google", formula: '"{company}" "partnerships" OR "sponsorships" OR "experiential" email site:linkedin.com', variables: ["company"], example: '"Red Bull" "partnerships" email site:linkedin.com', desc: "Find partnership decision-maker info" },
  { id: "google_pr", label: "Google → PR/Media Contacts", icon: Globe, category: "google", formula: '"{city}" "{beat}" "reporter" OR "journalist" OR "editor" email', variables: ["city","beat"], example: '"Atlanta" "nightlife" OR "entertainment" "reporter" email', desc: "Find journalist emails covering your beat" },
  { id: "google_grants", label: "Google → Grant Opportunities", icon: Globe, category: "google", formula: '"grant" "{category}" "{city}" OR "{state}" 2026 application', variables: ["category","city","state"], example: '"grant" "arts and culture" "Georgia" 2026 application', desc: "Find active grants for events/arts" },
  { id: "ig_followers", label: "IG → Competitor Followers", icon: Instagram, category: "instagram", formula: "Scrape followers of @{competitor_handle} → filter by {city} in bio → extract handles", variables: ["competitor_handle","city"], example: "Scrape followers of @daypartyatl → filter 'Atlanta' in bio", desc: "Mine competitor audiences for outreach targets" },
  { id: "ig_likers", label: "IG → Post Likers/Commenters", icon: Instagram, category: "instagram", formula: "Scrape likers/commenters on {post_url} → filter by follower count > {min_followers}", variables: ["post_url","min_followers"], example: "Scrape likers on competitor event post → filter >1000 followers", desc: "Find engaged users from competitor content" },
  { id: "ig_hashtag", label: "IG → Hashtag Mining", icon: Instagram, category: "instagram", formula: "Scrape top posts for #{hashtag} → extract poster handles + bios → filter by {city}", variables: ["hashtag","city"], example: "#atlantanightlife → extract handles → filter Atlanta bios", desc: "Mine hashtag feeds for local influencers" },
  { id: "ig_location", label: "IG → Location Tag Mining", icon: Instagram, category: "instagram", formula: "Scrape recent posts at {location_id} → extract poster handles → filter by engagement rate", variables: ["location_id"], example: "Posts tagged at 'Whiskey Mistress ATL' → extract active posters", desc: "Find people who post from target venues" },
  { id: "linkedin_sponsors", label: "LinkedIn → Decision Makers", icon: Linkedin, category: "linkedin", formula: '"{company}" AND ("brand partnerships" OR "experiential marketing" OR "sponsorships") AND "{city}"', variables: ["company","city"], example: '"Coca-Cola" AND "brand partnerships" AND "Atlanta"', desc: "Find partnership leads at target companies" },
  { id: "linkedin_pr", label: "LinkedIn → Journalists", icon: Linkedin, category: "linkedin", formula: '"{beat}" AND ("reporter" OR "journalist" OR "editor") AND "{city}" AND "{outlet_type}"', variables: ["beat","city","outlet_type"], example: '"entertainment" AND "journalist" AND "Atlanta" AND "magazine"', desc: "Find journalists covering your space" },
  { id: "tiktok_creators", label: "TikTok → Local Creators", icon: Music2, category: "tiktok", formula: "Search TikTok for #{city_hashtag} → filter by follower count > {min} → extract profile links", variables: ["city_hashtag","min"], example: "#atlantanights → filter >5000 followers → extract profiles", desc: "Find TikTok creators for event content partnerships" },
  { id: "fb_groups", label: "Facebook → Group Mining", icon: Globe, category: "facebook", formula: 'Search FB groups: "{city}" "{interest}" → extract member profiles → cross-reference IG', variables: ["city","interest"], example: '"Atlanta" "nightlife" groups → extract active members', desc: "Mine Facebook groups for warm outreach targets" },
  { id: "eventbrite_scrape", label: "Eventbrite → Competitor Events", icon: Globe, category: "events", formula: "Scrape attendees/organizers of {event_type} events in {city} on Eventbrite → extract contact info", variables: ["event_type","city"], example: "Day party events in Atlanta → organizer contact info", desc: "Find competitor event organizers and attendees" },
  { id: "yelp_venues", label: "Yelp → Venue Owners", icon: Globe, category: "directory", formula: "Scrape Yelp for {category} in {city} → extract business names + websites → find owner contacts", variables: ["category","city"], example: "Lounges in Atlanta → extract names + websites", desc: "Build venue owner contact list from Yelp" },
];

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
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
          <h1 className="text-2xl font-bold text-foreground">Leads & Contacts</h1>
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
          <TabsTrigger value="sourcing" className="gap-1"><Crosshair className="h-3.5 w-3.5" />Sourcing Engine</TabsTrigger>
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

        <TabsContent value="sourcing">
          <SourcingEngine />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const SourcingEngine = () => {
  const [catFilter, setCatFilter] = useState("all");
  const [scrapeCity, setScrapeCity] = useState("Atlanta");
  const [scrapeBrand, setScrapeBrand] = useState("");
  const categories = [...new Set(SCRAPE_FORMULAS.map(f => f.category))];
  const filtered = catFilter === "all" ? SCRAPE_FORMULAS : SCRAPE_FORMULAS.filter(f => f.category === catFilter);

  const buildFormula = (formula: typeof SCRAPE_FORMULAS[0]) => {
    let result = formula.formula;
    result = result.replace(/\{city\}/g, scrapeCity);
    return result;
  };

  const copyFormula = (formula: typeof SCRAPE_FORMULAS[0]) => {
    navigator.clipboard.writeText(buildFormula(formula));
    toast.success("Formula copied — paste into search");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Lead Sourcing Engine</h2>
          <p className="text-xs text-muted-foreground">Copy-paste search formulas to find fresh leads across platforms. {SCRAPE_FORMULAS.length} formulas across {categories.length} sources.</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <Select value={scrapeCity} onValueChange={setScrapeCity}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="City" /></SelectTrigger>
          <SelectContent>{CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={scrapeBrand} onValueChange={setScrapeBrand}>
          <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Brand (optional)" /></SelectTrigger>
          <SelectContent><SelectItem value="">All Brands</SelectItem>{DIVISIONS.flatMap(d => d.brands).map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button size="sm" variant={catFilter === "all" ? "default" : "outline"} className="text-xs h-7" onClick={() => setCatFilter("all")}>All ({SCRAPE_FORMULAS.length})</Button>
          {categories.map(c => (
            <Button key={c} size="sm" variant={catFilter === c ? "default" : "outline"} className="text-xs h-7 capitalize" onClick={() => setCatFilter(c)}>
              {c} ({SCRAPE_FORMULAS.filter(f => f.category === c).length})
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(formula => {
          const Icon = formula.icon;
          return (
            <div key={formula.id} className="border rounded-lg p-4 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-gray-50 shrink-0"><Icon className="h-4 w-4 text-gray-600" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{formula.label}</span>
                      <Badge variant="outline" className="text-[9px] capitalize">{formula.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{formula.desc}</p>
                    <div className="mt-2 bg-gray-50 rounded-md p-2.5 font-mono text-xs text-gray-700 break-all">{buildFormula(formula)}</div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground">Example:</span>
                      <span className="text-[10px] font-mono text-blue-600">{formula.example}</span>
                    </div>
                    <div className="mt-1 flex gap-1">
                      {formula.variables.map(v => <Badge key={v} variant="secondary" className="text-[8px]">{`{${v}}`}</Badge>)}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 h-8 text-xs gap-1" onClick={() => copyFormula(formula)}><Copy className="h-3 w-3" />Copy</Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Leads;
