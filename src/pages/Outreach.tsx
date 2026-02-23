import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DIVISIONS, LEAD_TYPES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
