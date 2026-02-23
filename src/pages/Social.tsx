import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DIVISIONS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Send, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

const Social = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("targets");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [newComment, setNewComment] = useState("");
  const [newCommentBrand, setNewCommentBrand] = useState("");

  const { data: targets = [] } = useQuery({
    queryKey: ["social-targets", selectedBrand],
    queryFn: async () => {
      let q = supabase.from("social_outreach_targets").select("*").order("created_at", { ascending: false }).limit(200);
      if (selectedBrand !== "all") q = q.eq("brand_key", selectedBrand);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: scripts = [] } = useQuery({
    queryKey: ["outreach-scripts"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_outreach_scripts").select("*").order("brand_key");
      return data || [];
    },
  });

  const commentScripts = scripts.filter((s: any) => s.script_type === 'comment' || s.channel === 'comment');
  const dmScripts = scripts.filter((s: any) => s.script_type !== 'comment' && s.channel !== 'comment');

  const [editingScript, setEditingScript] = useState<any>(null);
  const [editBody, setEditBody] = useState("");

  const saveScript = async () => {
    if (!editingScript) return;
    await supabase.from("mcp_outreach_scripts").update({ body: editBody }).eq("id", editingScript.id);
    toast.success("Script saved");
    setEditingScript(null);
    queryClient.invalidateQueries({ queryKey: ["outreach-scripts"] });
  };

  const addCommentScript = async () => {
    if (!newComment || !newCommentBrand) return;
    await supabase.from("mcp_outreach_scripts").insert({
      brand_key: newCommentBrand,
      body: newComment,
      channel: 'comment',
      script_type: 'comment',
      lead_type: 'social',
    });
    toast.success("Comment script added");
    setNewComment("");
    queryClient.invalidateQueries({ queryKey: ["outreach-scripts"] });
  };

  const allBrands = DIVISIONS.flatMap(d => d.brands.map(b => ({ key: b.toLowerCase().replace(/[\s.']+/g, '_'), name: b, color: d.color })));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Social Control</h1>
        <Badge variant="outline" className="text-base px-4 py-1">{targets.length} targets</Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="targets">Targets ({targets.length})</TabsTrigger>
          <TabsTrigger value="dm_scripts">DM Scripts ({dmScripts.length})</TabsTrigger>
          <TabsTrigger value="comment_scripts">Comment Scripts ({commentScripts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="targets" className="mt-4">
          <div className="flex gap-2 mb-4">
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Brands" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {allBrands.map(b => <SelectItem key={b.key} value={b.key}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="text-left p-3 font-medium">Handle</th>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">City</th>
                <th className="text-left p-3 font-medium">Brand</th>
                <th className="text-left p-3 font-medium">Platform</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {targets.map((t: any) => (
                  <tr key={t.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono text-purple-600 text-xs">@{t.handle}</td>
                    <td className="p-3">{t.full_name || '—'}</td>
                    <td className="p-3 text-xs">{t.city || '—'}</td>
                    <td className="p-3"><Badge variant="outline" className="text-[10px]">{t.brand_key}</Badge></td>
                    <td className="p-3 text-xs">{t.platform || 'instagram'}</td>
                    <td className="p-3"><Badge variant="secondary" className="text-[10px]">{t.status || 'ready'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="dm_scripts" className="mt-4">
          <div className="space-y-3">
            {dmScripts.map((s: any) => (
              <div key={s.id} className="p-4 bg-white border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Badge style={{ backgroundColor: allBrands.find(b => b.key === s.brand_key)?.color || '#6B7280', color: 'white' }} className="text-xs">{s.brand_key}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingScript(s); setEditBody(s.body); }}><MessageCircle className="h-3 w-3 mr-1" /> Edit</Button>
                </div>
                {editingScript?.id === s.id ? (
                  <div className="space-y-2">
                    <Textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={4} />
                    <div className="flex gap-2"><Button size="sm" onClick={saveScript}><Save className="h-3 w-3 mr-1" /> Save</Button><Button size="sm" variant="ghost" onClick={() => setEditingScript(null)}>Cancel</Button></div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.body}</p>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="comment_scripts" className="mt-4">
          <div className="bg-white border rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-sm mb-2">Add New Comment Script</h3>
            <div className="flex gap-2">
              <Select value={newCommentBrand} onValueChange={setNewCommentBrand}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Brand" /></SelectTrigger>
                <SelectContent>{allBrands.map(b => <SelectItem key={b.key} value={b.key}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Comment text..." value={newComment} onChange={e => setNewComment(e.target.value)} className="flex-1" />
              <Button onClick={addCommentScript} disabled={!newComment || !newCommentBrand}><Plus className="h-4 w-4 mr-1" /> Add</Button>
            </div>
          </div>
          <div className="space-y-2">
            {commentScripts.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">No comment scripts yet. Add one above.</p>
            ) : (
              commentScripts.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px]">{s.brand_key}</Badge>
                    <span className="text-sm">{s.body}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={async () => {
                    await supabase.from("mcp_outreach_scripts").delete().eq("id", s.id);
                    queryClient.invalidateQueries({ queryKey: ["outreach-scripts"] });
                  }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Social;
