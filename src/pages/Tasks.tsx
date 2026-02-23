import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DIVISIONS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewTaskDialog } from "@/components/NewTaskDialog";
import { CheckSquare, Plus, Circle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const BRAND_FILTERS = [
  { key: 'all', label: 'All', color: '#6B7280' },
  { key: 'dr_dorsey', label: 'Dr. Dorsey', color: '#18181B' },
  { key: 'dolo', label: 'DOLO', color: '#374151' },
  { key: 'linda', label: 'Linda (Asst)', color: '#475569' },
  ...DIVISIONS.flatMap(d => d.brands.slice(0, 3).map(b => ({
    key: b.toLowerCase().replace(/[\s.']+/g, '_'),
    label: b.length > 15 ? b.substring(0, 15) + '...' : b,
    color: d.color,
  }))),
];

const Tasks = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", filter],
    queryFn: async () => {
      let query = supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(200);
      if (filter !== "all") {
        query = query.or(`brand_key.eq.${filter},assigned_to.eq.${filter}`);
      }
      const { data } = await query;
      return data || [];
    },
  });

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'done' ? 'todo' : current === 'todo' ? 'in_progress' : 'done';
    await supabase.from("tasks").update({ status: next }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const grouped = {
    todo: tasks.filter((t: any) => t.status === 'todo' || t.status === 'pending'),
    in_progress: tasks.filter((t: any) => t.status === 'in_progress' || t.status === 'active'),
    done: tasks.filter((t: any) => t.status === 'done' || t.status === 'completed'),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">Organized by brand. Click status to cycle.</p>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Task
        </Button>
      </div>

      <div className="flex gap-1 flex-wrap">
        {BRAND_FILTERS.slice(0, 15).map(f => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
            className="text-xs h-7"
            style={filter === f.key ? { backgroundColor: f.color, borderColor: f.color } : {}}
          >
            <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: f.color }} />
            {f.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(['todo', 'in_progress', 'done'] as const).map(status => (
          <div key={status} className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {status === 'todo' ? <Circle className="h-4 w-4" /> : status === 'in_progress' ? <Clock className="h-4 w-4 text-amber-500" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
              {status.replace('_', ' ')} ({grouped[status].length})
            </div>
            {grouped[status].map((task: any) => (
              <div
                key={task.id}
                className={cn(
                  "p-3 bg-white border rounded-lg cursor-pointer hover:border-gray-300 transition-all",
                  status === 'done' && "opacity-60"
                )}
                onClick={() => toggleStatus(task.id, task.status)}
              >
                <div className="font-medium text-sm">{task.title || task.description?.substring(0, 60)}</div>
                {task.description && task.title && (
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</div>
                )}
                <div className="flex gap-1 mt-2">
                  {task.brand_key && (
                    <Badge variant="outline" className="text-[10px]">{task.brand_key}</Badge>
                  )}
                  {task.priority && (
                    <Badge className={cn("text-[10px]",
                      task.priority === 'P1' ? 'bg-red-100 text-red-800' :
                      task.priority === 'P2' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
                    )}>{task.priority}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <NewTaskDialog open={showNew} onOpenChange={setShowNew} />
    </div>
  );
};

export default Tasks;
