import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { CheckSquare, Clock, AlertCircle, Check, X, Plus, Eye, ChevronRight, Send, MessageSquare, Star } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ApprovalItem {
  id: string;
  item_type: string;
  brand_key: string;
  title: string;
  content_preview: string;
  full_payload: any;
  source_workflow: string;
  score: number;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  expires_at: string | null;
}

const Tasks = () => {
  const [filter, setFilter] = useState("pending");
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: approvals = [] } = useQuery({
    queryKey: ["approval-queue", filter],
    queryFn: async () => {
      let q = supabase.from("approval_queue").select("*").order("created_at", { ascending: false }).limit(50);
      if (filter !== "all") q = q.eq("status", filter);
      const { data } = await q;
      return (data || []) as ApprovalItem[];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-list"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["approval-stats"],
    queryFn: async () => {
      const [pending, approved, rejected] = await Promise.all([
        supabase.from("approval_queue").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("approval_queue").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("approval_queue").select("*", { count: "exact", head: true }).eq("status", "rejected"),
      ]);
      return { pending: pending.count ?? 0, approved: approved.count ?? 0, rejected: rejected.count ?? 0 };
    },
  });

  const handleAction = async (id: string, action: "approved" | "rejected") => {
    const { error } = await supabase.from("approval_queue").update({
      status: action,
      reviewed_at: new Date().toISOString(),
      reviewed_by: "dr.dorsey",
      notes: reviewNotes || null,
    }).eq("id", id);
    if (!error) {
      toast.success(action === "approved" ? "Approved and queued for execution" : "Rejected");
      setSelectedItem(null);
      setReviewNotes("");
      queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
      queryClient.invalidateQueries({ queryKey: ["approval-stats"] });
    } else {
      toast.error("Failed to update");
    }
  };

  const typeIcons: Record<string, typeof Send> = {
    pr_pitch: Send, social_post: MessageSquare, email_blast: Send,
  };
  const typeColors: Record<string, string> = {
    pr_pitch: "text-blue-400", social_post: "text-purple-400", email_blast: "text-amber-400",
  };

  const filters = [
    { key: "pending", label: "Pending", count: stats?.pending },
    { key: "approved", label: "Approved", count: stats?.approved },
    { key: "rejected", label: "Rejected", count: stats?.rejected },
    { key: "all", label: "All" },
  ];

  return (
    <div className="flex h-full gap-4 animate-fade-in">
      {/* LEFT: Queue List */}
      <div className={cn("flex flex-col space-y-4", selectedItem ? "w-1/2" : "w-full")}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Tasks & Approvals</h1>
          <span className="rounded-md bg-status-warning/10 px-2.5 py-1 text-xs font-bold text-status-warning">
            {stats?.pending ?? 0} pending
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Pending", value: stats?.pending ?? "—", color: "text-status-warning" },
            { label: "Approved", value: stats?.approved ?? "—", color: "text-status-success" },
            { label: "Rejected", value: stats?.rejected ?? "—", color: "text-status-error" },
          ].map((s, i) => (
            <div key={i} className="rounded-lg border border-border/50 bg-card p-3 text-center">
              <div className={cn("font-mono text-xl font-bold", s.color)}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-1">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
                filter === f.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}>
              {f.label}{f.count !== undefined ? ` (${f.count})` : ""}
            </button>
          ))}
        </div>

        {/* Approval Items */}
        <div className="flex-1 space-y-2 overflow-auto">
          {approvals.map((item) => {
            const TIcon = typeIcons[item.item_type] || CheckSquare;
            const tColor = typeColors[item.item_type] || "text-muted-foreground";
            const isSelected = selectedItem?.id === item.id;
            return (
              <button key={item.id} onClick={() => { setSelectedItem(item); setReviewNotes(""); }}
                className={cn(
                  "w-full rounded-lg border bg-card p-4 text-left transition-all hover:border-primary/30",
                  isSelected ? "border-primary/50 ring-1 ring-primary/20" : "border-border/50",
                  item.status === "pending" ? "border-l-2 border-l-status-warning" : ""
                )}>
                <div className="flex items-start gap-3">
                  <TIcon className={cn("mt-0.5 h-4 w-4 shrink-0", tColor)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                      {item.score >= 90 && <Star className="h-3 w-3 text-primary fill-primary" />}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.content_preview}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <StatusBadge variant={item.status === "pending" ? "warning" : item.status === "approved" ? "success" : "error"}>{item.status}</StatusBadge>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{item.item_type?.replace(/_/g, " ")}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{item.brand_key}</span>
                      {item.score && (
                        <span className={cn("rounded px-1.5 py-0.5 font-mono text-[9px] font-bold",
                          item.score >= 90 ? "bg-status-success/10 text-status-success" :
                          item.score >= 70 ? "bg-status-warning/10 text-status-warning" :
                          "bg-muted text-muted-foreground"
                        )}>Score: {item.score}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/30" />
                </div>
              </button>
            );
          })}
          {approvals.length === 0 && (
            <div className="rounded-lg border border-border/50 bg-card p-12 text-center">
              <CheckSquare className="mx-auto h-8 w-8 text-muted-foreground/20" />
              <p className="mt-3 text-sm text-muted-foreground/40">No {filter} items</p>
            </div>
          )}
        </div>

        {/* Tasks Section */}
        {tasks.length > 0 && (
          <div className="rounded-lg border border-border/50 bg-card p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open Tasks ({tasks.length})</h3>
            <div className="space-y-2">
              {tasks.slice(0, 5).map((t: any) => (
                <div key={t.id} className="flex items-center gap-2">
                  <div className={cn("h-2 w-2 rounded-full",
                    t.priority === "high" ? "bg-status-error" : "bg-status-warning")} />
                  <p className="flex-1 truncate text-xs text-foreground">{t.title}</p>
                  <span className="text-[9px] text-muted-foreground">{t.priority}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Review Panel */}
      {selectedItem && (
        <div className="w-1/2 overflow-auto rounded-lg border border-border/50 bg-card">
          {/* Header */}
          <div className="border-b border-border/30 bg-secondary/30 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-foreground">{selectedItem.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge variant={selectedItem.status === "pending" ? "warning" : selectedItem.status === "approved" ? "success" : "error"}>
                    {selectedItem.status}
                  </StatusBadge>
                  <span className="text-xs text-muted-foreground">via {selectedItem.source_workflow}</span>
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Meta */}
          <div className="border-b border-border/30 px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground/50">Brand</p>
                <p className="text-sm font-medium text-foreground">{selectedItem.brand_key}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground/50">Type</p>
                <p className="text-sm font-medium text-foreground">{selectedItem.item_type?.replace(/_/g, " ")}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground/50">Score</p>
                <p className={cn("text-sm font-bold",
                  selectedItem.score >= 90 ? "text-status-success" :
                  selectedItem.score >= 70 ? "text-status-warning" : "text-status-error"
                )}>{selectedItem.score}/100</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground/50">Expires</p>
                <p className="text-sm text-foreground">
                  {selectedItem.expires_at ? format(new Date(selectedItem.expires_at), "MMM d, HH:mm") : "No expiry"}
                </p>
              </div>
            </div>
          </div>

          {/* Content Preview */}
          <div className="border-b border-border/30 px-6 py-4">
            <p className="text-[10px] font-semibold uppercase text-muted-foreground/50">Content Preview</p>
            <div className="mt-2 rounded-md border border-border/30 bg-secondary/20 p-4">
              <p className="whitespace-pre-wrap text-sm text-foreground">{selectedItem.content_preview}</p>
            </div>
          </div>

          {/* Full Payload */}
          <div className="border-b border-border/30 px-6 py-4">
            <p className="text-[10px] font-semibold uppercase text-muted-foreground/50">Full Payload</p>
            <div className="mt-2 max-h-48 overflow-auto rounded-md border border-border/30 bg-secondary/20 p-4">
              <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                {JSON.stringify(selectedItem.full_payload, null, 2)}
              </pre>
            </div>
          </div>

          {/* Review Notes */}
          {selectedItem.status === "pending" && (
            <div className="border-b border-border/30 px-6 py-4">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground/50">Review Notes (Optional)</p>
              <textarea
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                placeholder="Add notes about your decision..."
                className="mt-2 w-full rounded-md border border-border/50 bg-input p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/30 focus:border-primary/40"
                rows={3}
              />
            </div>
          )}

          {/* Previous Review */}
          {selectedItem.reviewed_by && (
            <div className="border-b border-border/30 px-6 py-4">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground/50">Review Decision</p>
              <p className="mt-1 text-sm text-foreground">
                {selectedItem.status} by {selectedItem.reviewed_by}
                {selectedItem.reviewed_at && ` on ${format(new Date(selectedItem.reviewed_at), "MMM d, HH:mm")}`}
              </p>
              {selectedItem.notes && <p className="mt-1 text-xs text-muted-foreground">{selectedItem.notes}</p>}
            </div>
          )}

          {/* Action Buttons */}
          {selectedItem.status === "pending" && (
            <div className="flex gap-3 px-6 py-5">
              <Button className="flex-1 gap-1.5" variant="outline"
                onClick={() => handleAction(String(selectedItem.id), "rejected")}
                style={{ borderColor: "rgba(239,68,68,0.3)", color: "rgb(239,68,68)" }}>
                <X className="h-4 w-4" />Reject
              </Button>
              <Button className="flex-1 gap-1.5" onClick={() => handleAction(String(selectedItem.id), "approved")}>
                <Check className="h-4 w-4" />Approve & Execute
              </Button>
            </div>
          )}

          {/* Metadata */}
          <div className="px-6 py-3">
            <p className="text-[9px] text-muted-foreground/30">
              Created {selectedItem.created_at ? format(new Date(selectedItem.created_at), "MMM d, HH:mm:ss") : "—"} | ID: {selectedItem.id}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
