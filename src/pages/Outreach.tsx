import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DIVISIONS, LEAD_TYPES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";


const ScriptsPanel = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [filterBrand, setFilterBrand] = useState("all");

  const { data: scripts = [] } = useQuery({
    queryKey: ["outreach-scripts-panel", filterBrand],
    queryFn: async () => {
      let q = supabase.from("mcp_outreach_scripts").select("*").order("brand_key");
      if (filterBrand !== "all") q = q.eq("brand_key", filterBrand);
      const { data } = await q;
      return data || [];
    },
  });

  const saveScript = async (id: string) => {
    await supabase.from("mcp_outreach_scripts").update({ body: editBody }).eq("id", id);
    toast.success("Script saved");
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ["outreach-scripts-panel"] });
  };

  const allBrands = [...new Set(scripts.map((s: any) => s.brand_key).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select value={filterBrand} onValueChange={setFilterBrand}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Brands" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands ({scripts.length})</SelectItem>
            {allBrands.map((b: string) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline">{scripts.length} scripts</Badge>
      </div>
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
        {scripts.map((s: any) => (
          <div key={s.id} className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{s.brand_key}</Badge>
                <Badge variant="secondary" className="text-[10px]">{s.lead_type || s.script_type || 'outreach'}</Badge>
                {s.channel && <Badge variant="secondary" className="text-[10px]">{s.channel}</Badge>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => { 
                if (editingId === s.id) { setEditingId(null); } 
                else { setEditingId(s.id); setEditBody(s.body || ''); }
              }}>
                {editingId === s.id ? 'Cancel' : 'Edit'}
              </Button>
            </div>
            {editingId === s.id ? (
              <div className="space-y-2">
                <Textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={5} className="font-mono text-sm" />
                <Button size="sm" onClick={() => saveScript(s.id)}>Save Script</Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.body}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const Outreach = () => {
  const [selectedType, setSelectedType] = useState("pr");
  const [selectedBrand, setSelectedBrand] = useState("all");

  const allBrands = DIVISIONS.flatMap(d =>
    d.brands.map(b => ({ key: b.toLowerCase().replace(/[\s.']+/g, '_'), name: b, division: d.key, color: d.color }))
  );

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["outreach-leads", selectedType, selectedBrand],
    queryFn: async () => {
      let query = supabase
        .from("mcp_leads")
        .select("*")
        .eq("lead_type", selectedType)
        .order("score", { ascending: false })
        .limit(200);
      if (selectedBrand !== "all") {
        query = query.eq("brand_key", selectedBrand);
      }
      const { data } = await query;
      return data || [];
    },
  });

  const typeLabels: Record<string, string> = {
    pr: 'PR / Media', sponsor: 'Sponsors', grant: 'Grants', customer: 'Customers',
    influencer: 'Influencers', dj_host: 'DJs & Hosts', vendor: 'Vendors', media: 'Media'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Outreach</h1>
          <p className="text-sm text-muted-foreground mt-1">Leads filtered by type and brand. Each brand has its own pipeline.</p>
        </div>
        <Badge variant="outline" className="text-base px-4 py-1">{leads.length} leads</Badge>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex gap-1 flex-wrap">
          {(LEAD_TYPES || ['pr','sponsor','grant','customer','influencer','dj_host','vendor','media']).map(t => (
            <Button
              key={t}
              size="sm"
              variant={selectedType === t ? "default" : "outline"}
              onClick={() => setSelectedType(t)}
              className="text-xs"
            >
              {typeLabels[t] || t}
            </Button>
          ))}
        </div>
        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {DIVISIONS.map(d => (
              <SelectItem key={d.key} value="" disabled className="font-bold text-xs opacity-50">
                — {d.name} —
              </SelectItem>
            ))}
            {allBrands.map(b => (
              <SelectItem key={b.key} value={b.key}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                  {b.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading leads...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No {typeLabels[selectedType]} leads found{selectedBrand !== 'all' ? ` for ${selectedBrand}` : ''}.</p>
          <p className="text-xs text-muted-foreground mt-2">Run a scrape or import leads to populate this pipeline.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Company</th>
                <th className="text-left p-3 font-medium">City</th>
                <th className="text-left p-3 font-medium">Contact</th>
                <th className="text-left p-3 font-medium">Brand</th>
                <th className="text-center p-3 font-medium">Score</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead: any) => (
                <tr key={lead.lead_id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{lead.name || lead.full_name || '—'}</td>
                  <td className="p-3 text-muted-foreground">{lead.company || '—'}</td>
                  <td className="p-3">{lead.city || '—'}</td>
                  <td className="p-3">
                    {lead.email && <div className="text-xs">{lead.email}</div>}
                    {lead.phone && <div className="text-xs text-muted-foreground">{lead.phone}</div>}
                    {lead.handle && <div className="text-xs text-purple-600">@{lead.handle}</div>}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs">{lead.brand_key || '—'}</Badge>
                  </td>
                  <td className="p-3 text-center">
                    <span className={cn("font-mono font-bold text-xs",
                      (lead.score || 0) >= 70 ? "text-green-600" :
                      (lead.score || 0) >= 50 ? "text-amber-600" : "text-gray-400"
                    )}>{lead.score || 0}</span>
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary" className="text-xs">{lead.status || 'new'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Outreach;
