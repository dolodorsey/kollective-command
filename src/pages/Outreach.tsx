import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { DIVISIONS, LEAD_TYPES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CheckCircle2, Circle, Shield, Mail, MessageCircle, MessageSquare, Phone, Target, ArrowLeft } from "lucide-react";

const ACTIVE_BRANDS = ["good-times","forever-futbol","noir","taste-of-art","remix","wrst-bhvr-napkins","sundays-best","paparazzi","gangsta-gospel"];
const CHANNEL_ICONS: Record<string, any> = { DM: MessageCircle, Comment: MessageSquare, Email: Mail, SMS: Phone };
const CHANNEL_COLORS: Record<string, string> = { DM: "text-purple-600 bg-purple-50", Comment: "text-blue-600 bg-blue-50", Email: "text-green-600 bg-green-50", SMS: "text-orange-600 bg-orange-50" };

const Outreach = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState("plans");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  const allBrands = DIVISIONS.flatMap(d =>
    d.brands.map(b => ({ key: b.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""), name: b, division: d.key, color: d.color }))
  );

  // Outreach Plans (the playbooks you review/approve)
  const { data: plans = [] } = useQuery({
    queryKey: ["outreach-plans", selectedBrand],
    queryFn: async () => {
      let q = supabase.from("outreach_plans").select("*").order("brand_name").order("channel").order("target_type");
      if (selectedBrand !== "all") q = q.eq("brand_key", selectedBrand);
      const { data } = await q;
      return data || [];
    },
  });

  // Outreach Targets (from sheets)
  const { data: targets = [] } = useQuery({
    queryKey: ["outreach-targets-page", selectedBrand],
    queryFn: async () => {
      let q = supabase.from("outreach_targets").select("*").order("brand_name").limit(500);
      if (selectedBrand !== "all") q = q.eq("brand_key", selectedBrand);
      const { data } = await q;
      return data || [];
    },
  });

  // Scripts
  const { data: scripts = [] } = useQuery({
    queryKey: ["outreach-scripts-page", selectedBrand],
    queryFn: async () => {
      let q = supabase.from("mcp_outreach_scripts").select("*").order("brand_key");
      if (selectedBrand !== "all") q = q.eq("brand_key", selectedBrand);
      const { data } = await q;
      return data || [];
    },
  });

  const approvePlan = async (id: number, approved: boolean) => {
    await supabase.from("outreach_plans").update({ approved, status: approved ? "approved" : "proposed", approved_at: approved ? new Date().toISOString() : null }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["outreach-plans"] });
    toast.success(approved ? "Approved" : "Reverted to proposed");
  };

  const typeLabels: Record<string, string> = { pr_media: "PR / Media", sponsors: "Sponsors", grants: "Grants", customers: "Customers", influencers: "Influencers", dj_host: "DJs & Hosts", vendors: "Vendors" };
  const targetTypes = [...new Set(plans.map((p: any) => p.target_type))];

  const filteredPlans = selectedType === "all" ? plans : plans.filter((p: any) => p.target_type === selectedType);

  // Group plans by brand
  const plansByBrand = filteredPlans.reduce((acc: any, p: any) => {
    if (!acc[p.brand_name]) acc[p.brand_name] = [];
    acc[p.brand_name].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={() => navigate("/")} className="h-8 w-8 p-0"><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Outreach Command</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{plans.length} outreach plays across {Object.keys(plansByBrand).length} brands</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{plans.filter((p: any) => p.approved).length} approved</Badge>
          <Badge variant="outline" className="text-xs text-amber-600">{plans.filter((p: any) => !p.approved).length} pending</Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
          <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue placeholder="All Brands" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Active Brands</SelectItem>
            {allBrands.filter(b => ACTIVE_BRANDS.includes(b.key)).map(b => (
              <SelectItem key={b.key} value={b.key}><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />{b.name}</span></SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button size="sm" variant={selectedType === "all" ? "default" : "outline"} className="text-xs h-7" onClick={() => setSelectedType("all")}>All</Button>
          {targetTypes.map(t => (
            <Button key={t} size="sm" variant={selectedType === t ? "default" : "outline"} className="text-xs h-7" onClick={() => setSelectedType(t)}>{typeLabels[t] || t}</Button>
          ))}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="plans"><Shield className="h-3.5 w-3.5 mr-1" />Outreach Plans ({plans.length})</TabsTrigger>
          <TabsTrigger value="targets"><Target className="h-3.5 w-3.5 mr-1" />Targets ({targets.length})</TabsTrigger>
          <TabsTrigger value="scripts"><MessageCircle className="h-3.5 w-3.5 mr-1" />Scripts ({scripts.length})</TabsTrigger>
        </TabsList>

        {/* OUTREACH PLANS — Review & Approve */}
        <TabsContent value="plans" className="mt-4 space-y-6">
          {Object.entries(plansByBrand).map(([brandName, brandPlans]: [string, any]) => (
            <div key={brandName} className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{brandName}</span>
                  <Badge variant="outline" className="text-[10px]">{brandPlans.length} plays</Badge>
                  <Badge className={cn("text-[10px]", brandPlans.every((p: any) => p.approved) ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                    {brandPlans.filter((p: any) => p.approved).length}/{brandPlans.length} approved
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => brandPlans.forEach((p: any) => approvePlan(p.id, true))}>Approve All</Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-500" onClick={() => brandPlans.forEach((p: any) => approvePlan(p.id, false))}>Reset All</Button>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50/50"><tr>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold uppercase text-muted-foreground w-8"></th>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold uppercase text-muted-foreground">Channel</th>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold uppercase text-muted-foreground">Target Type</th>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold uppercase text-muted-foreground">Action</th>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold uppercase text-muted-foreground">Frequency</th>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold uppercase text-muted-foreground">Priority</th>
                  <th className="text-center px-4 py-2 text-[10px] font-semibold uppercase text-muted-foreground">Status</th>
                </tr></thead>
                <tbody>
                  {brandPlans.map((plan: any) => {
                    const Icon = CHANNEL_ICONS[plan.channel] || MessageCircle;
                    return (
                      <tr key={plan.id} className={cn("border-t hover:bg-gray-50/50 transition-colors", plan.approved && "bg-green-50/30")}>
                        <td className="px-4 py-2.5">
                          <button onClick={() => approvePlan(plan.id, !plan.approved)} className="transition-colors">
                            {plan.approved ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-gray-300 hover:text-gray-500" />}
                          </button>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge className={cn("text-[10px] gap-1", CHANNEL_COLORS[plan.channel] || "")}>
                            <Icon className="h-3 w-3" />{plan.channel}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px] capitalize">{typeLabels[plan.target_type] || plan.target_type}</Badge></td>
                        <td className="px-4 py-2.5 text-xs max-w-md">{plan.action_description}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{plan.frequency}</td>
                        <td className="px-4 py-2.5">
                          <Badge className={cn("text-[9px]", plan.priority === "high" ? "bg-red-100 text-red-700" : plan.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600")}>{plan.priority}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge variant={plan.approved ? "default" : "secondary"} className="text-[9px]">{plan.approved ? "Approved" : "Proposed"}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </TabsContent>

        {/* TARGETS — From Sheets (spreadsheet-style) */}
        <TabsContent value="targets" className="mt-4">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0"><tr>
                {["Brand", "Type", "Platform", "Target Name", "Handle", "City", "Category", "Context", "Draft", "Status"].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {targets.map((t: any) => (
                  <tr key={t.id} className="border-b hover:bg-gray-50/50">
                    <td className="px-3 py-1.5"><Badge variant="outline" className="text-[9px]">{t.brand_name || t.brand_key}</Badge></td>
                    <td className="px-3 py-1.5 text-[10px]">{t.outreach_type || "—"}</td>
                    <td className="px-3 py-1.5 text-[10px]">{t.platform || "—"}</td>
                    <td className="px-3 py-1.5 text-xs font-medium">{t.target_name || "—"}</td>
                    <td className="px-3 py-1.5 text-[10px] font-mono text-purple-600">{t.handle ? `@${t.handle}` : "—"}</td>
                    <td className="px-3 py-1.5 text-[10px]">{t.city || "—"}</td>
                    <td className="px-3 py-1.5 text-[10px]">{t.category || "—"}</td>
                    <td className="px-3 py-1.5 text-[10px] max-w-[200px] truncate">{t.context || "—"}</td>
                    <td className="px-3 py-1.5 text-[10px] max-w-[200px] truncate">{t.draft_message || "—"}</td>
                    <td className="px-3 py-1.5"><Badge variant="secondary" className="text-[9px]">{t.status || "queued"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {targets.length === 0 && <div className="px-4 py-8 text-center text-xs text-muted-foreground">No targets loaded. Populate your Social Outreach Center or Outreach Command Center sheets.</div>}
          </div>
        </TabsContent>

        {/* SCRIPTS */}
        <TabsContent value="scripts" className="mt-4">
          <div className="space-y-2 max-h-[65vh] overflow-y-auto">
            {scripts.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">No scripts yet. Scripts are generated per brand during outreach execution.</div>
            ) : scripts.map((s: any) => (
              <div key={s.id} className="p-3 bg-white border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px]">{s.brand_key}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{s.lead_type || s.script_type || "outreach"}</Badge>
                  {s.channel && <Badge variant="secondary" className="text-[10px]">{s.channel}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.body}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Outreach;
