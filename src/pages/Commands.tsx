import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { COMMAND_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { format } from "date-fns";
import { Check, X, RotateCcw, Eye ,ChevronLeft } from "lucide-react";
import { retryCommand, killCommand } from "@/lib/commands";

const Commands = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<any>(null);

  const { data: commands = [] } = useQuery({
    queryKey: ["commands"],
    queryFn: async () => {
      const { data } = await supabase
        .from("command_log")
        .select("*")
        .order("executed_at", { ascending: false })
        .limit(100);
      return data || [];
    },
    refetchInterval: 15000,
  });

  const statusColor = (s: string) => {
    if (s === 'success') return 'bg-green-100 text-green-800 border-green-200';
    if (s === 'failed' || s === 'killed') return 'bg-red-100 text-red-800 border-red-200';
    if (s === 'queued' || s === 'pending') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (s === 'running') return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const getLabel = (type: string) => COMMAND_LABELS[type]?.label || type.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const getDesc = (type: string) => COMMAND_LABELS[type]?.desc || '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Commands</h1>
          <p className="text-sm text-muted-foreground mt-1">Every action the system has taken. Click to see details.</p>
        </div>
        <Badge variant="outline" className="text-base px-4 py-1">{commands.length} total</Badge>
      </div>

      <div className="space-y-2">
        {commands.map((cmd: any) => (
          <div
            key={cmd.id}
            onClick={() => setSelected(cmd)}
            className="flex items-center justify-between p-4 bg-white border rounded-lg hover:border-gray-300 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full" style={{
                backgroundColor: cmd.status === 'success' ? '#16a34a' : cmd.status === 'failed' ? '#dc2626' : '#f59e0b'
              }} />
              <div>
                <div className="font-semibold text-sm">{getLabel(cmd.command_type)}</div>
                <div className="text-xs text-muted-foreground">{getDesc(cmd.command_type)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {cmd.scope && cmd.scope !== 'global' && (
                <Badge variant="secondary" className="text-xs">{cmd.scope}</Badge>
              )}
              {cmd.target_key && (
                <Badge variant="outline" className="text-xs">{cmd.target_key}</Badge>
              )}
              <Badge className={statusColor(cmd.status)}>{cmd.status}</Badge>
              <span className="text-xs text-muted-foreground w-20 text-right">
                {cmd.executed_at ? format(new Date(cmd.executed_at), 'MMM d, h:mm a') : '—'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg">{getLabel(selected.command_type)}</SheetTitle>
                <p className="text-sm text-muted-foreground">{getDesc(selected.command_type)}</p>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Status:</span> <Badge className={statusColor(selected.status)}>{selected.status}</Badge></div>
                  <div><span className="text-muted-foreground">Scope:</span> {selected.scope || 'global'}</div>
                  <div><span className="text-muted-foreground">Target:</span> {selected.target_key || '—'}</div>
                  <div><span className="text-muted-foreground">Time:</span> {selected.executed_at ? format(new Date(selected.executed_at), 'MMM d, h:mm a') : '—'}</div>
                </div>

                {selected.payload?.output && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Output</h3>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                      {typeof selected.payload.output === 'string' ? selected.payload.output : JSON.stringify(selected.payload.output, null, 2)}
                    </div>
                  </div>
                )}

                {selected.payload?.message && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Message Sent</h3>
                    <div className="bg-blue-50 rounded-lg p-4 text-sm">{selected.payload.message}</div>
                  </div>
                )}

                {selected.payload?.recipients && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Recipients</h3>
                    <div className="text-sm">{Array.isArray(selected.payload.recipients) ? selected.payload.recipients.join(', ') : selected.payload.recipients}</div>
                  </div>
                )}

                {selected.payload && !selected.payload.output && !selected.payload.message && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Details</h3>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono text-xs whitespace-pre-wrap">
                      {JSON.stringify(selected.payload, null, 2)}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button size="sm" variant="outline" onClick={() => { retryCommand(selected.id); setSelected(null); queryClient.invalidateQueries({ queryKey: ["commands"] }); }}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Retry
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => { killCommand(selected.id); setSelected(null); queryClient.invalidateQueries({ queryKey: ["commands"] }); }}>
                    <X className="h-3 w-3 mr-1" /> Kill
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Commands;
