import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { FileOutput, Image, FileText, Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";

const Outputs = () => {
  const { data: deliverables = [] } = useQuery({
    queryKey: ["deliverables"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_final_deliverables").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data } = await supabase.from("content_assets").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const allItems = [
    ...deliverables.map((d: any) => ({ ...d, _type: "deliverable" })),
    ...assets.map((a: any) => ({ ...a, _type: "asset" })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Outputs</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Deliverables</span>
            <FileOutput className="h-4 w-4 text-primary/60" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-foreground">{deliverables.length}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Content Assets</span>
            <Image className="h-4 w-4 text-primary/60" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-foreground">{assets.length}</div>
        </div>
      </div>

      <div className="space-y-2">
        {allItems.length === 0 && (
          <div className="rounded-lg border border-border/50 bg-card p-12 text-center">
            <FileOutput className="mx-auto h-8 w-8 text-muted-foreground/20" />
            <p className="mt-3 text-sm text-muted-foreground/40">No outputs yet. Run commands to generate deliverables.</p>
          </div>
        )}
        {allItems.map((item: any) => (
          <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-4 transition-colors hover:border-primary/20">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {item._type === "asset" ? <Image className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-primary" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{item.title || item.file_name || item.asset_type || "Untitled"}</p>
              <p className="text-xs text-muted-foreground">{item.description?.substring(0, 100) || item.brand_key || "—"}</p>
            </div>
            <StatusBadge variant={item._type === "deliverable" ? "info" : "default"}>{item._type}</StatusBadge>
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
              {item.created_at ? format(new Date(item.created_at), "MMM d") : "—"}
            </span>
            {item.file_url && (
              <a href={item.file_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" /></a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Outputs;
