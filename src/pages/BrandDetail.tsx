import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { sendCommand } from "@/lib/commands";
import { DIVISIONS } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Users, Target, Send, Mail, Instagram, MessageSquare, Zap, Building2, Edit2, Globe, Phone, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SOCIAL_FIELDS = [
  { key: "email", label: "Email", icon: Mail, placeholder: "brand@email.com" },
  { key: "phone", label: "Phone", icon: Phone, placeholder: "+1 (555) 000-0000" },
  { key: "website", label: "Website", icon: Globe, placeholder: "https://..." },
  { key: "instagram", label: "Instagram", icon: Instagram, placeholder: "@handle" },
  { key: "facebook", label: "Facebook", icon: ExternalLink, placeholder: "facebook.com/..." },
  { key: "tiktok", label: "TikTok", icon: ExternalLink, placeholder: "@handle" },
  { key: "google_url", label: "Google", icon: ExternalLink, placeholder: "Google Business URL" },
  { key: "pinterest", label: "Pinterest", icon: ExternalLink, placeholder: "pinterest.com/..." },
];

const BrandDetail = () => {
  const { brandKey } = useParams<{ brandKey: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [editEntity, setEditEntity] = useState(false);
  const [entityPrompt, setEntityPrompt] = useState("");

  const brandInfo = (() => {
    for (const div of DIVISIONS) {
      const idx = div.brands.findIndex(b => b.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") === brandKey);
      if (idx >= 0) return { brand: div.brands[idx], division: div };
    }
    return null;
  })();

  const { data: registry } = useQuery({
    queryKey: ["brand-reg", brandKey],
    queryFn: async () => {
      const { data } = await supabase.from("brand_registry").select("*")
        .or(`brand_key.eq.${brandKey},brand_name.ilike.%${brandKey?.replace(/-/g, " ")}%`)
        .limit(1).maybeSingle();
      return data;
    },
  });

  const { data: entity } = useQuery({
    queryKey: ["brand-entity", brandKey],
    queryFn: async () => {
      const { data } = await supabase.from("brand_entities").select("*")
        .or(`entity_id.eq.${brandKey},entity_name.ilike.%${brandKey?.replace(/-/g, " ")}%`)
        .limit(1).maybeSingle();
      if (data) setEntityPrompt(data.system_prompt || "");
      return data;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["brand-tasks", brandKey],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*")
        .or(`platform.ilike.%${brandKey}%,metadata->>brand_key.eq.${brandKey}`)
        .order("created_at", { ascending: false }).limit(30);
      return data || [];
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["brand-contacts", brandKey],
    queryFn: async () => {
      const { data } = await supabase.from("contacts_master").select("*")
        .or(`brand.ilike.%${brandKey?.replace(/-/g, "%")}%,brand_key.ilike.%${brandKey}%`)
        .order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["brand-events", brandKey],
    queryFn: async () => {
      if (!brandInfo) return [];
      const { data } = await supabase.from("events").select("*")
        .or(`brand.eq.${brandInfo.division.key},title.ilike.%${brandInfo.brand}%,series.ilike.%${brandKey}%`)
        .order("date", { ascending: true }).limit(20);
      return data || [];
    },
  });

  const { data: commands = [] } = useQuery({
    queryKey: ["brand-cmds", brandKey],
    queryFn: async () => {
      const { data } = await supabase.from("command_log").select("*")
        .or(`target_key.ilike.%${brandKey}%,scope.ilike.%${brandKey}%`)
        .order("executed_at", { ascending: false }).limit(15);
      return data || [];
    },
  });

  const saveRegistry = useMutation({
    mutationFn: async () => {
      if (!registry) return;
      const { error } = await supabase.from("brand_registry").update(editData).eq("id", registry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Brand info saved");
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["brand-reg"] });
    },
  });

  const saveEntity = useMutation({
    mutationFn: async () => {
      if (!entity) return;
      const { error } = await supabase.from("brand_entities").update({ system_prompt: entityPrompt }).eq("id", entity.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Brand voice saved");
      setEditEntity(false);
      queryClient.invalidateQueries({ queryKey: ["brand-entity"] });
    },
  });

  const handleQuickAction = async (action: string) => {
    await sendCommand(`brand.${action}`, { brand_key: brandKey, brand_name: brandInfo?.brand });
    toast.success(`${action} triggered`);
  };

  if (!brandInfo) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-1.5"><ArrowLeft className="h-3.5 w-3.5" />Back</Button>
        <div className="rounded-lg border border-border/50 bg-card p-12 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground/20" />
          <p className="mt-3 text-sm text-muted-foreground">Brand not found: {brandKey}</p>
        </div>
      </div>
    );
  }

  const regData = registry || {} as any;
  const ed = editMode ? editData : regData;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-1.5 shrink-0"><ArrowLeft className="h-3.5 w-3.5" />Back</Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{brandInfo.division.icon}</span>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{brandInfo.brand}</h1>
              <button onClick={() => navigate(`/division/${brandInfo.division.key}`)} className="text-xs text-muted-foreground hover:text-blue-500 transition-colors">{brandInfo.division.name}</button>
            </div>
          </div>
        </div>
        <StatusBadge variant="success">Active</StatusBadge>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Send DM", action: "send_dms", icon: MessageSquare },
          { label: "Generate Content", action: "generate_content", icon: Zap },
          { label: "Email Blast", action: "email_blast", icon: Mail },
          { label: "Scrape Leads", action: "scrape_leads", icon: Target },
          { label: "IG Outreach", action: "ig_outreach", icon: Instagram },
          { label: "Launch PR", action: "launch_pr", icon: Send },
        ].map(a => (
          <Button key={a.action} variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleQuickAction(a.action)}><a.icon className="h-3 w-3" />{a.label}</Button>
        ))}
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="voice">Brand Voice</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="events">Events ({events.length})</TabsTrigger>
          <TabsTrigger value="commands">Commands ({commands.length})</TabsTrigger>
        </TabsList>

        {/* PROFILE — Editable */}
        <TabsContent value="profile" className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand Information</span>
            {!editMode ? (
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { setEditMode(true); setEditData({ ...regData }); }}><Edit2 className="h-3 w-3" />Edit</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>Cancel</Button>
                <Button size="sm" className="gap-1" onClick={() => saveRegistry.mutate()} disabled={saveRegistry.isPending}><Save className="h-3 w-3" />Save</Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SOCIAL_FIELDS.map(f => {
              const Icon = f.icon;
              const val = ed[f.key] || "";
              return (
                <div key={f.key} className="rounded-lg border border-border/50 bg-card p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</span>
                  </div>
                  {editMode ? (
                    <input value={editData[f.key] || ""} onChange={e => setEditData((p: any) => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder} className="w-full rounded-md border border-border/50 bg-input px-3 py-1.5 text-sm text-foreground outline-none focus:border-blue-300" />
                  ) : (
                    <p className={cn("text-sm", val ? "text-foreground" : "text-muted-foreground/30")}>{val || "Not set"}</p>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* BRAND VOICE — Editable */}
        <TabsContent value="voice" className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System Prompt / Brand Voice</span>
            {!editEntity ? (
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setEditEntity(true)}><Edit2 className="h-3 w-3" />Edit</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditEntity(false)}>Cancel</Button>
                <Button size="sm" className="gap-1" onClick={() => saveEntity.mutate()}><Save className="h-3 w-3" />Save</Button>
              </div>
            )}
          </div>
          {editEntity ? (
            <textarea value={entityPrompt} onChange={e => setEntityPrompt(e.target.value)} rows={8}
              className="w-full rounded-md border border-border/50 bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-blue-300 leading-relaxed" />
          ) : (
            <div className="rounded-lg border border-border/50 bg-card p-4">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{entity?.system_prompt || "No brand voice configured"}</p>
            </div>
          )}
          {entity?.tone_profile && (
            <div className="rounded-lg border border-border/50 bg-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tone Profile</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(entity.tone_profile as Record<string, string>).map(([k, v]) => (
                  <span key={k} className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{k}: {v}</span>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* TASKS */}
        <TabsContent value="tasks" className="space-y-2">
          {tasks.map((t: any) => (
            <div key={t.id} className={cn("flex items-center gap-3 rounded-md border p-3", t.status === "done" ? "border-border/20" : "border-border/50")}>
              <div className={cn("h-2 w-2 rounded-full shrink-0", t.status === "done" ? "bg-green-500" : t.status === "in_progress" ? "bg-blue-500" : "bg-amber-500")} />
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm font-medium", t.status === "done" ? "text-muted-foreground line-through" : "text-foreground")}>{t.title}</p>
                <p className="text-[10px] text-muted-foreground">{t.priority} · {t.status}</p>
              </div>
            </div>
          ))}
          {tasks.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground/40">No tasks for this brand yet</p>}
        </TabsContent>

        {/* CONTACTS */}
        <TabsContent value="contacts" className="space-y-1.5">
          {contacts.map((c: any) => (
            <div key={c.id} className="flex items-center gap-3 rounded-md border border-border/30 p-3">
              <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{c.full_name || c.name || c.email || "—"}</p>
                <p className="text-[10px] text-muted-foreground">{[c.phone, c.instagram_handle, c.city].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
          ))}
          {contacts.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground/40">No contacts linked</p>}
        </TabsContent>

        {/* EVENTS */}
        <TabsContent value="events" className="space-y-1.5">
          {events.map((e: any) => (
            <div key={e.id} className="flex items-center gap-3 rounded-md border border-border/30 p-3">
              <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded bg-muted">
                <span className="text-[8px] font-bold uppercase text-muted-foreground">{format(new Date(e.date), "MMM")}</span>
                <span className="text-xs font-bold text-foreground leading-none">{format(new Date(e.date), "d")}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                <p className="text-[10px] text-muted-foreground">{e.city}</p>
              </div>
            </div>
          ))}
          {events.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground/40">No events</p>}
        </TabsContent>

        {/* COMMANDS */}
        <TabsContent value="commands" className="space-y-1">
          {commands.map((c: any) => (
            <div key={c.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
              <span className="flex-1 truncate font-mono text-xs text-foreground">{c.command_type}</span>
              <StatusBadge variant="default">{c.status || "queued"}</StatusBadge>
              <span className="font-mono text-[9px] text-muted-foreground">{c.executed_at ? format(new Date(c.executed_at), "h:mm a") : "—"}</span>
            </div>
          ))}
          {commands.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground/40">No commands</p>}
        </TabsContent>
      </Tabs>

      {/* Sibling brands */}
      <div className="rounded-lg border border-border/50 bg-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{brandInfo.division.icon} Other {brandInfo.division.name} Brands</p>
        <div className="flex flex-wrap gap-1.5">
          {brandInfo.division.brands.filter(b => b !== brandInfo.brand).map(b => {
            const s = b.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
            return (<button key={b} onClick={() => navigate(`/brand/${s}`)} className="rounded-md border border-border/30 px-2.5 py-1 text-xs text-foreground hover:border-blue-300 hover:text-blue-600 transition-colors">{b}</button>);
          })}
        </div>
      </div>
    </div>
  );
};

export default BrandDetail;
