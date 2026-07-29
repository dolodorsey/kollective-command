import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { APPROVAL_TYPES, formatDateTime, statusLabel } from "@/lib/opsTypes";

export default function OpsApprovals() {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const { data: approvals = [] } = useQuery({
    queryKey: ["ops-approvals"],
    queryFn: async () => (await supabase.from("khg_approval_requests").select("*").order("due_at", { ascending: true }).limit(500)).data || [],
  });
  const metrics = ["pending", "approved", "needs_revision", "rejected", "cancelled"].map((status) => [statusLabel(status), approvals.filter((item: any) => item.status === status).length] as [string, number]);

  async function decide(item: any, status: "approved" | "rejected" | "needs_revision" | "cancelled") {
    if (status === "needs_revision" && !note.trim()) return toast.error("Revision decisions need a note");
    const { error } = await supabase.from("khg_approval_requests").update({
      status,
      decision_note: note || null,
      decided_at: status === "approved" || status === "rejected" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq("id", item.id);
    if (error) return toast.error(error.message);
    if (item.source_type === "content" && item.source_id) {
      const contentStatus = status === "approved" ? "approved" : status === "needs_revision" ? "needs_caption" : status === "rejected" ? "archived" : "failed";
      await supabase.from("khg_content_items").update({ status: contentStatus, updated_at: new Date().toISOString() }).eq("id", item.source_id);
    }
    if (item.source_type === "marketing" && item.source_id) {
      const marketingStatus = status === "approved" ? "approved" : status === "needs_revision" ? "needs_copy" : status === "rejected" ? "cancelled" : "failed";
      await supabase.from("khg_marketing_calendar_items").update({ status: marketingStatus, updated_at: new Date().toISOString() }).eq("id", item.source_id);
    }
    toast.success(`Approval marked ${statusLabel(status)}`);
    setNote("");
    qc.invalidateQueries({ queryKey: ["ops-approvals"] });
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div><p className="text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground">Ops OS</p><h1 className="text-2xl font-bold">Universal Approval Command Center</h1><p className="text-sm text-muted-foreground">Graphics, captions, email, SMS, ads, event flyers, budgets, website changes, automations, and revenue offers.</p></div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">{metrics.map(([label, value]) => <div key={label} className="rounded-lg border bg-card p-3"><div className="text-xl font-black">{value}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div></div>)}</div>
      <Tabs defaultValue="pending">
        <TabsList className="flex h-auto flex-wrap justify-start"><TabsTrigger value="pending">Pending</TabsTrigger>{APPROVAL_TYPES.map((type) => <TabsTrigger key={type} value={type}>{statusLabel(type)}</TabsTrigger>)}</TabsList>
        <TabsContent value="pending" className="mt-4 grid gap-3 xl:grid-cols-2">{approvals.filter((item: any) => item.status === "pending").map((item: any) => <ApprovalCard key={item.id} item={item} note={note} setNote={setNote} decide={decide} />)}</TabsContent>
        {APPROVAL_TYPES.map((type) => <TabsContent key={type} value={type} className="mt-4 grid gap-3 xl:grid-cols-2">{approvals.filter((item: any) => item.source_type === type || item.metadata?.approval_type === type).map((item: any) => <ApprovalCard key={item.id} item={item} note={note} setNote={setNote} decide={decide} />)}</TabsContent>)}
      </Tabs>
    </div>
  );
}

function ApprovalCard({ item, note, setNote, decide }: any) {
  return (
    <Card>
      <CardContent className="grid gap-4 p-4 md:grid-cols-[160px_1fr]">
        <div className="flex min-h-32 items-center justify-center rounded-md border bg-muted text-center text-xs text-muted-foreground">
          {item.preview_url ? <img src={item.preview_url} alt="" className="h-full max-h-40 w-full rounded-md object-cover" /> : "No Preview URL"}
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2"><Badge variant="outline">{item.brand_key || "parent-command"}</Badge><Badge>{item.department_key || item.source_type}</Badge><Badge variant="secondary">{statusLabel(item.status)}</Badge><Badge variant={item.risk_level === "critical" ? "destructive" : "outline"}>{item.risk_level || "normal"}</Badge></div>
          <h3 className="font-semibold">{item.title}</h3>
          <p className="text-sm text-muted-foreground">{item.preview_text || "No preview copy attached."}</p>
          <div className="grid gap-2 text-xs md:grid-cols-3"><span>Requested: {item.requested_by || "Ops"}</span><span>Approver: {item.approver_label || "Dr. Dorsey"}</span><span>Due: {formatDateTime(item.due_at)}</span></div>
          <Textarea placeholder="Decision note" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => decide(item, "approved")}>Approve</Button><Button size="sm" variant="outline" onClick={() => decide(item, "needs_revision")}>Needs Revision</Button><Button size="sm" variant="destructive" onClick={() => decide(item, "rejected")}>Reject</Button><Button size="sm" variant="ghost" onClick={() => decide(item, "cancelled")}>Cancel</Button></div>
        </div>
      </CardContent>
    </Card>
  );
}
