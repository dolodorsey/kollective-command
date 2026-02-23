import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Activity, Database, Zap, AlertTriangle, CheckCircle, Clock, Server } from "lucide-react";
import { cn } from "@/lib/utils";

const SystemHealth = () => {
  const { data: webhookHealth = [] } = useQuery({
    queryKey: ["webhook-health"],
    queryFn: async () => {
      const { data } = await supabase.from("webhook_health").select("*").order("last_triggered_at", { ascending: false }).limit(30);
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: failures = [] } = useQuery({
    queryKey: ["failures"],
    queryFn: async () => {
      const { data } = await supabase.from("failure_log").select("*").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const { data: commandStats = { total: 0, success: 0, failed: 0, recent: [] } } = useQuery({
    queryKey: ["command-stats"],
    queryFn: async () => {
      const { data: all } = await supabase.from("command_log").select("*").order("executed_at", { ascending: false }).limit(100);
      const items = all || [];
      return {
        total: items.length,
        success: items.filter((c: any) => c.status === 'success').length,
        failed: items.filter((c: any) => c.status === 'failed' || c.status === 'error').length,
        recent: items.slice(0, 10),
      };
    },
  });

  const { data: tableCounts = {} } = useQuery({
    queryKey: ["table-counts"],
    queryFn: async () => {
      const tables = ['contacts_master', 'mcp_leads', 'social_outreach_targets', 'pr_contacts', 'brand_entities', 'events', 'mcp_outreach_scripts', 'tasks', 'approval_queue', 'mcp_core_config'];
      const counts: Record<string, number> = {};
      for (const t of tables) {
        const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
        counts[t] = count || 0;
      }
      return counts;
    },
  });

  const healthyWebhooks = webhookHealth.filter((w: any) => w.status === 'healthy' || w.status === 'ok').length;
  const totalWebhooks = webhookHealth.length;
  const overallHealth = totalWebhooks > 0 ? Math.round((healthyWebhooks / totalWebhooks) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
        <Badge variant={overallHealth > 80 ? "default" : overallHealth > 50 ? "secondary" : "destructive"} className="text-base px-4 py-1">
          {overallHealth}% Healthy
        </Badge>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Database className="h-4 w-4" /> Tables</div>
          <div className="text-2xl font-bold">{Object.keys(tableCounts).length}</div>
          <div className="text-xs text-muted-foreground">{Object.values(tableCounts).reduce((a: number, b: number) => a + b, 0).toLocaleString()} total rows</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Zap className="h-4 w-4" /> Commands</div>
          <div className="text-2xl font-bold">{commandStats.total}</div>
          <div className="text-xs text-green-600">{commandStats.success} success / {commandStats.failed} failed</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Activity className="h-4 w-4" /> Webhooks</div>
          <div className="text-2xl font-bold">{healthyWebhooks}/{totalWebhooks}</div>
          <div className="text-xs text-muted-foreground">monitored endpoints</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><AlertTriangle className="h-4 w-4" /> Failures</div>
          <div className="text-2xl font-bold text-red-600">{failures.length}</div>
          <div className="text-xs text-muted-foreground">logged errors</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><Server className="h-4 w-4" /> Database Tables</h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="text-left p-2 font-medium">Table</th>
                <th className="text-right p-2 font-medium">Rows</th>
              </tr></thead>
              <tbody>
                {Object.entries(tableCounts).sort(([,a]: any, [,b]: any) => b - a).map(([table, count]: [string, any]) => (
                  <tr key={table} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-mono text-xs">{table}</td>
                    <td className="p-2 text-right font-semibold">{count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><Activity className="h-4 w-4" /> Webhook Status</h2>
            <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
              {webhookHealth.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between p-2 bg-white border rounded-lg text-xs">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", w.status === 'healthy' || w.status === 'ok' ? 'bg-green-500' : 'bg-red-500')} />
                    <span className="font-medium">{w.webhook_name || w.endpoint}</span>
                  </div>
                  <span className="text-muted-foreground">{w.last_triggered_at ? format(new Date(w.last_triggered_at), 'MMM d, h:mm a') : '—'}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Recent Failures</h2>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {failures.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" /> No recent failures
                </div>
              ) : (
                failures.map((f: any) => (
                  <div key={f.id} className="p-2 bg-red-50 border border-red-100 rounded-lg text-xs">
                    <div className="font-medium text-red-800">{f.error_type || f.workflow_name}</div>
                    <div className="text-red-600 mt-0.5">{f.error_message?.substring(0, 100)}</div>
                    <div className="text-red-400 mt-0.5">{f.created_at ? format(new Date(f.created_at), 'MMM d, h:mm a') : ''}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><Clock className="h-4 w-4" /> Recent Commands</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="text-left p-2 font-medium">Command</th>
              <th className="text-left p-2 font-medium">Brand</th>
              <th className="text-left p-2 font-medium">Status</th>
              <th className="text-left p-2 font-medium">Time</th>
            </tr></thead>
            <tbody>
              {commandStats.recent.map((c: any) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-mono text-xs">{c.command_type}</td>
                  <td className="p-2"><Badge variant="outline" className="text-[10px]">{c.scope}</Badge></td>
                  <td className="p-2">
                    <Badge variant={c.status === 'success' ? 'default' : c.status === 'failed' ? 'destructive' : 'secondary'} className="text-[10px]">
                      {c.status}
                    </Badge>
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">{c.executed_at ? format(new Date(c.executed_at), 'MMM d, h:mm a') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
