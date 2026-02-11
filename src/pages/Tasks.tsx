import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { CheckSquare, Clock, AlertCircle, Check, X, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Tasks = () => {
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: approvals = [] } = useQuery({
    queryKey: ["approval-queue", filter],
    queryFn: async () => {
      let q = supabase.from("approval_queue").select("*").order("created_at", { ascending: false }).limit(50);
      if (filter !== "all") q = q.eq("status", filter);
      const { data } = await q;
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
    const { error } = await supabase.from("approval_queue").update({ status: action, reviewed_at: new Date().toISOString(), reviewed_by: "dr.dorsey" }).eq("id", id);
    if (!error) {
      toast.success(`Item ${action}`);
      queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
      queryClient.invalidateQueries({ queryKey: ["approval-stats"] });
    } else {
      toast.error("Failed to update");
    }
  };

  const filters = [
    { key: "all", label: "All" },
    { key: "pending", label: `Pending (${stats?.pending ?? 0})` },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Tasks & Approvals</h1>
        <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />New Task</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending", value: stats?.pending ?? "—", icon: Clock, color: "text-status-warning" },
          { label: "Approved", value: stats?.approved ?? "—", icon: Check, color: "text-status-success" },
          { label: "Rejected", value: stats?.rejected ?? "—", icon: X, color: "text-status-error" },
        ].map((s, i) => (
          <div key={i} className="rounded-lg border border-border/50 bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <s.icon className={cn("h-4 w-4", s.color)} />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-foreground">{s.value}</div>
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
            {f.label}
          </button>
        ))}
      </div>

      {/* Queue */}
      <div className="space-y-2">
        {approvals.length === 0 && <div className="rounded-lg border border-border/50 bg-card p-8 text-center text-sm text-muted-foreground/40">No items</div>}
        {approvals.map((item: any) => (
          <div key={item.id} className={cn(
            "rounded-lg border bg-card p-4 transition-all",
            item.status === "pending" ? "border-primary/20" : "border-border/50"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{item.item_type || item.type || "Task"}</p>
                  <StatusBadge variant={item.status === "pending" ? "warning" : item.status === "approved" ? "success" : "error"}>{item.status}</StatusBadge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.description || item.payload ? JSON.stringify(item.payload || {}).substring(0, 150) : "No description"}</p>
                <p className="mt-1 text-[10px] text-muted-foreground/40">
                  {item.created_at && format(new Date(item.created_at), "MMM d, HH:mm")}
                  {item.requested_by && ` · by ${item.requested_by}`}
                </p>
              </div>
              {item.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleAction(item.id, "rejected")}
                    className="border-status-error/30 text-status-error hover:bg-status-error/10">
                    <X className="mr-1 h-3 w-3" />Reject
                  </Button>
                  <Button size="sm" onClick={() => handleAction(item.id, "approved")} className="gap-1">
                    <Check className="h-3 w-3" />Approve
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tasks;
