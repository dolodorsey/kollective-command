import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckSquare, FileOutput, LayoutDashboard, Send, Share2, Target, Terminal } from "lucide-react";
import { formatDateTime } from "@/lib/opsTypes";

const departments = [
  {
    key: "daily_ops",
    title: "Daily Ops",
    purpose: "Today command board and urgent movement across the parent command layer.",
    priority: "p0",
    route: "/ops-os",
    secondary: "/ops-os/tasks?tab=create",
    primaryLabel: "Open Daily Command",
    secondaryLabel: "Add Task",
    owner: "Command",
    icon: LayoutDashboard,
  },
  {
    key: "social",
    title: "Social Media",
    purpose: "Programmable social calendar, uploads, graphics, captions, approvals, publishing, and performance.",
    priority: "p0",
    route: "/ops-os/social",
    secondary: "/ops-os/social?tab=upload",
    primaryLabel: "Open Social Command",
    secondaryLabel: "Quick Upload",
    owner: "Social Ops",
    icon: Share2,
  },
  {
    key: "marketing",
    title: "Marketing",
    purpose: "Email, SMS, Evite/Eventbrite, SEO, ads, retargeting, landing pages, and send status.",
    priority: "p0",
    route: "/ops-os/marketing",
    secondary: "/ops-os/marketing?tab=create",
    primaryLabel: "Open Marketing Calendar",
    secondaryLabel: "Create Campaign",
    owner: "Marketing Ops",
    icon: Send,
  },
  {
    key: "content_studio",
    title: "Content Studio",
    purpose: "Creative requests, prompt packs, source files, review queue, approved assets, and generation logs.",
    priority: "p1",
    route: "/ops-os/content-studio",
    secondary: "/ops-os/content-studio?tab=requests",
    primaryLabel: "Open Content Studio",
    secondaryLabel: "New Creative Request",
    owner: "Creative Ops",
    icon: FileOutput,
  },
  {
    key: "approvals",
    title: "Approvals",
    purpose: "Universal review queue for graphics, captions, campaigns, event assets, automations, and revenue offers.",
    priority: "p0",
    route: "/ops-os/approvals",
    secondary: "/ops-os/approvals?filter=pending",
    primaryLabel: "Open Approvals",
    secondaryLabel: "Review Pending",
    owner: "Dr. Dorsey",
    icon: CheckSquare,
  },
  {
    key: "events",
    title: "Events",
    purpose: "Ticketing, flyers, social rollout, marketing rollout, ambassadors, street team, staffing, vendors, and recap.",
    priority: "p1",
    route: "/ops-os/events",
    secondary: "/ops-os/events?tab=create",
    primaryLabel: "Open Events Command",
    secondaryLabel: "Add Event",
    owner: "Events Ops",
    icon: Calendar,
  },
  {
    key: "revenue",
    title: "Revenue",
    purpose: "Money moves by lane: follow-up, offers, blockers, owners, due dates, and estimated value.",
    priority: "p0",
    route: "/ops-os/revenue",
    secondary: "/ops-os/revenue?tab=create",
    primaryLabel: "Open Revenue Command",
    secondaryLabel: "Add Money Move",
    owner: "Revenue Ops",
    icon: Target,
  },
  {
    key: "tasks",
    title: "Tasks",
    purpose: "Work queue, blockers, approvals, proof requirements, handoffs, recurring work, and done queue.",
    priority: "p0",
    route: "/ops-os/tasks",
    secondary: "/ops-os/tasks?tab=create",
    primaryLabel: "Open Task Command",
    secondaryLabel: "Add Task",
    owner: "Operations",
    icon: Terminal,
  },
];

export default function OpsOSHome() {
  const navigate = useNavigate();
  const { data: queues = [] } = useQuery({
    queryKey: ["ops-home-queues"],
    queryFn: async () => {
      const { data } = await supabase.from("khg_work_queues").select("*").neq("status", "done").limit(500);
      return data || [];
    },
  });

  const { data: approvals = [] } = useQuery({
    queryKey: ["ops-home-approvals"],
    queryFn: async () => {
      const { data } = await supabase.from("khg_approval_requests").select("*").eq("status", "pending").limit(200);
      return data || [];
    },
  });

  const nextFor = (department: string) => {
    const task = queues.find((item: any) => item.department_key === department);
    if (task) return task.title;
    if (department === "approvals" && approvals.length) return "Clear pending approvals";
    return "Open full command center";
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground">KHG Ops OS</p>
          <h1 className="text-2xl font-bold text-foreground">Department Command Centers</h1>
        </div>
        <Button onClick={() => navigate("/ops-os/tasks?tab=create")}>Add Work Item</Button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Metric label="Open Work" value={queues.length} />
        <Metric label="Blocked" value={queues.filter((item: any) => item.status === "blocked").length} />
        <Metric label="Pending Approvals" value={approvals.length} />
        <Metric label="Departments" value={departments.length} />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {departments.map((department) => {
          const Icon = department.icon;
          const open = queues.filter((item: any) => item.department_key === department.key);
          const blockers = open.filter((item: any) => item.status === "blocked").length;
          const lastUpdated = open[0]?.updated_at || open[0]?.created_at;
          return (
            <Card key={department.key} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base">{department.title}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">{department.purpose}</p>
                    </div>
                  </div>
                  <Badge variant={department.priority === "p0" ? "destructive" : "secondary"}>{department.priority}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                  <Field label="Owner" value={department.owner} />
                  <Field label="Open" value={String(open.length)} />
                  <Field label="Blockers" value={String(blockers)} />
                  <Field label="Updated" value={formatDateTime(lastUpdated)} />
                </div>
                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Next Best Action</p>
                  <p className="mt-1 text-sm font-medium">{nextFor(department.key)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => navigate(department.route)}>{department.primaryLabel}</Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(department.secondary)}>{department.secondaryLabel}</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-medium">{value}</p>
    </div>
  );
}
