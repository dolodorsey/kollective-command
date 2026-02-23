import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { BRAND_COLORS } from "@/lib/constants";

export function ApprovalQueue() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["approval-queue"],
    queryFn: async () => {
      const { data } = await supabase
        .from("approval_queue")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    refetchInterval: 15000,
  });

  const approve = async (id: number) => {
    await supabase.from("approval_queue").update({
      status: "approved",
      reviewed_by: "dr_dorsey",
      reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    toast.success("Approved");
    queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
    queryClient.invalidateQueries({ queryKey: ["pending-count"] });
  };

  const reject = async (id: number) => {
    await supabase.from("approval_queue").update({
      status: "rejected",
      reviewed_by: "dr_dorsey",
      reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    toast.success("Rejected");
    queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
    queryClient.invalidateQueries({ queryKey: ["pending-count"] });
  };

  const approveAll = async () => {
    const ids = items.map((i: any) => i.id);
    for (const id of ids) {
      await supabase.from("approval_queue").update({
        status: "approved",
        reviewed_by: "dr_dorsey",
        reviewed_at: new Date().toISOString(),
      }).eq("id", id);
    }
    toast.success(`${ids.length} items approved`);
    queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
    queryClient.invalidateQueries({ queryKey: ["pending-count"] });
  };

  if (items.length === 0) return null;

  const channelColor = (type: string) => {
    if (type?.includes('email') || type?.includes('pr')) return 'bg-blue-100 text-blue-800';
    if (type?.includes('ig') || type?.includes('social') || type?.includes('comment')) return 'bg-pink-100 text-pink-800';
    if (type?.includes('sms')) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-600';
  };

  const getBrandColor = (key: string) => {
    if (!key) return '#6B7280';
    for (const [div, color] of Object.entries(BRAND_COLORS)) {
      if (key.includes(div)) return color;
    }
    return '#6B7280';
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-600" />
          <h2 className="font-bold text-sm">APPROVAL REQUIRED</h2>
          <Badge className="bg-amber-500 text-white">{items.length} pending</Badge>
        </div>
        <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100" onClick={approveAll}>
          <Check className="h-3 w-3 mr-1" /> Approve All
        </Button>
      </div>

      <div className="divide-y divide-amber-100">
        {items.map((item: any) => {
          const payload = typeof item.full_payload === 'string' ? JSON.parse(item.full_payload || '{}') : (item.full_payload || {});
          const isExpanded = expanded === item.id;
          return (
            <div key={item.id} className="bg-white">
              <div className="flex items-center justify-between p-3 hover:bg-gray-50">
                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : item.id)}>
                  <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: getBrandColor(item.brand_key) }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{item.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{item.brand_key}</Badge>
                      <Badge className={channelColor(item.item_type) + " text-[10px]"}>{item.item_type}</Badge>
                      {payload.target && <span className="text-[10px] text-muted-foreground">{payload.target}</span>}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex gap-1 ml-3">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600 hover:bg-green-50" onClick={() => approve(item.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:bg-red-50" onClick={() => reject(item.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-3 pt-1">
                  <div className="bg-gray-50 rounded-lg p-3 text-sm whitespace-pre-wrap">{item.content_preview}</div>
                  {item.score && <div className="text-xs text-muted-foreground mt-2">Confidence score: {item.score}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
