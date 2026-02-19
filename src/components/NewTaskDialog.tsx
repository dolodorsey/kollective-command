import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DIVISIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const ALL_BRANDS = DIVISIONS.flatMap(d => d.brands.map(b => ({ name: b, division: d.name, key: b.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") })));

const TASK_TYPES = [
  "social post", "email blast", "pr pitch", "dm", "comment", "graphic", "scrape",
];

interface NewTaskDialogProps {
  defaultBrand?: string;
  triggerLabel?: string;
}

export function NewTaskDialog({ defaultBrand, triggerLabel = "+ New Task" }: NewTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState(defaultBrand || "");
  const [type, setType] = useState("social post");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!title.trim() || !brand) return;
    const { error } = await supabase.from("approval_queue").insert({
      item_type: type.replace(/\s+/g, "_"),
      brand_key: brand,
      title: title.trim(),
      content_preview: content.trim() || title.trim(),
      full_payload: JSON.stringify({ title: title.trim(), type, content: content.trim(), priority, due_date: dueDate || null, brand }),
      source_workflow: "manual",
      score: priority === "high" ? 95 : priority === "medium" ? 75 : 50,
      status: "pending",
    });
    if (!error) {
      toast.success(`Task created: ${title.trim()}`);
      setTitle(""); setContent(""); setPriority("medium"); setDueDate("");
      if (!defaultBrand) setBrand("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
      queryClient.invalidateQueries({ queryKey: ["approval-stats"] });
      queryClient.invalidateQueries({ queryKey: ["brand-tasks"] });
    } else {
      toast.error("Failed to create task");
    }
  };

  const inputClass = "w-full rounded-md border border-border/50 bg-input px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary/40";
  const labelClass = "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1 block";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />{triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className={labelClass}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to happen?" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Brand *</label>
            <select value={brand} onChange={e => setBrand(e.target.value)} className={inputClass}>
              <option value="">Select brand...</option>
              {ALL_BRANDS.map(b => (
                <option key={b.key} value={b.key}>{b.name} ({b.division})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className={inputClass}>
                {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className={inputClass}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Content / Description</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Details..." className={inputClass} rows={3} />
          </div>
          <div>
            <label className={labelClass}>Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass} />
          </div>
          <Button onClick={handleSubmit} disabled={!title.trim() || !brand} className="w-full">
            Create Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
