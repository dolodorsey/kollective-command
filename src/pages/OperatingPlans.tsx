import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  Layers3,
  Loader2,
  Printer,
  Search,
  Users,
} from "lucide-react";

interface PlanModule {
  slug: string;
  title: string;
  department: string;
  batch_number?: number;
  batch?: string;
  entities: string[];
  summary: string;
  data_path?: string;
  viewer_path?: string;
  display_order?: number;
  size?: number;
}

interface PlanPayload extends PlanModule {
  html_gzip_base64: string;
}

const BATCHES = ["All", "Batch 1", "Batch 2", "Batch 3", "Batch 4", "Batch 5", "Batch 6"];

function batchLabel(plan: PlanModule) {
  return plan.batch || `Batch ${plan.batch_number || 0}`;
}

function base64ToBytes(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function inflatePlan(value: string) {
  if (!("DecompressionStream" in window)) throw new Error("This browser cannot open compressed plan files.");
  const stream = new Blob([base64ToBytes(value)]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

let bundlePromise: Promise<{ plans: PlanPayload[] }> | null = null;

async function loadPlanBundle() {
  if (!bundlePromise) {
    bundlePromise = fetch("/operating-plans/plans-bundle.json", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Plan library failed to load");
      return response.json();
    });
  }
  return bundlePromise;
}

async function loadFallbackManifest(): Promise<PlanModule[]> {
  const payload = await loadPlanBundle();
  return (payload.plans || []).map(({ html_gzip_base64: _html, ...plan }) => plan);
}

export default function OperatingPlans() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selectedSlug = params.get("plan");
  const [query, setQuery] = useState("");
  const [batch, setBatch] = useState("All");
  const [selectedHtml, setSelectedHtml] = useState("");
  const [viewerError, setViewerError] = useState("");
  const [viewerLoading, setViewerLoading] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["operating-plan-modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operating_plan_modules")
        .select("slug,title,department,batch_number,entities,summary,data_path,viewer_path,display_order,status")
        .eq("status", "active")
        .order("display_order", { ascending: true });
      if (!error && data?.length) return data as PlanModule[];
      return loadFallbackManifest();
    },
    staleTime: 60_000,
  });

  const selectedPlan = useMemo(() => plans.find((plan) => plan.slug === selectedSlug) || null, [plans, selectedSlug]);

  useEffect(() => {
    let cancelled = false;
    async function loadViewer() {
      if (!selectedPlan) {
        setSelectedHtml("");
        setViewerError("");
        return;
      }
      setViewerLoading(true);
      setViewerError("");
      try {
        const bundle = await loadPlanBundle();
        const payload = bundle.plans.find((plan) => plan.slug === selectedPlan.slug);
        if (!payload) throw new Error("The plan file could not be loaded.");
        const html = await inflatePlan(payload.html_gzip_base64);
        if (!cancelled) {
          setSelectedHtml(html);
          localStorage.setItem("kollective:last-operating-plan", selectedPlan.slug);
        }
      } catch (error) {
        if (!cancelled) setViewerError(error instanceof Error ? error.message : "The plan could not be opened.");
      } finally {
        if (!cancelled) setViewerLoading(false);
      }
    }
    loadViewer();
    return () => { cancelled = true; };
  }, [selectedPlan]);

  const departments = useMemo(() => new Set(plans.map((plan) => plan.department)).size, [plans]);
  const entityCount = useMemo(() => new Set(plans.flatMap((plan) => plan.entities || [])).size, [plans]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return plans.filter((plan) => {
      const matchesBatch = batch === "All" || batchLabel(plan) === batch;
      const searchable = [plan.title, plan.department, plan.summary, ...(plan.entities || [])].join(" ").toLowerCase();
      return matchesBatch && (!needle || searchable.includes(needle));
    });
  }, [plans, query, batch]);

  function openPlan(slug: string) {
    setParams({ plan: slug });
  }

  function closePlan() {
    setParams({});
    setSelectedHtml("");
  }

  function printPlan() {
    const frame = document.querySelector<HTMLIFrameElement>("#operating-plan-frame");
    frame?.contentWindow?.print();
  }

  if (selectedPlan) {
    return (
      <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4 animate-fade-in">
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Button size="icon" variant="outline" onClick={closePlan} aria-label="Back to all operating plans">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{batchLabel(selectedPlan)}</Badge>
                <Badge>{selectedPlan.department}</Badge>
              </div>
              <h1 className="mt-2 truncate text-xl font-black sm:text-2xl">{selectedPlan.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{selectedPlan.summary}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={printPlan}><Printer className="mr-2 h-4 w-4" />Print / PDF</Button>
            <Button onClick={() => window.open("/operating-plans/plans-bundle.json", "_blank")} variant="ghost">
              <ExternalLink className="mr-2 h-4 w-4" />Source
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-black shadow-2xl">
          {viewerLoading && <div className="flex h-[70vh] items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Opening command plan…</div>}
          {viewerError && <div className="flex h-[70vh] flex-col items-center justify-center gap-3 p-8 text-center"><FileText className="h-10 w-10 text-destructive" /><p className="font-semibold">{viewerError}</p><Button onClick={closePlan}>Return to Plan Library</Button></div>}
          {!viewerLoading && !viewerError && selectedHtml && (
            <iframe
              id="operating-plan-frame"
              title={selectedPlan.title}
              srcDoc={selectedHtml}
              className="h-[calc(100vh-12rem)] min-h-[720px] w-full border-0 bg-[#070809]"
              sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads allow-same-origin"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-xl sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,hsl(var(--primary)/0.16),transparent_35%),radial-gradient(circle_at_88%_16%,hsl(var(--accent)/0.1),transparent_30%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.35fr_0.65fr] xl:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-primary"><BookOpen className="h-4 w-4" />Kollective Operating Plans</div>
            <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight sm:text-4xl">One operating library. Every department fully equipped.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">All six planning batches are connected here. Open the full interactive command for any department, execute its daily checklist, manage revenue and close, and print the plan directly from the viewer.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Metric icon={Layers3} label="Batches" value="6" />
            <Metric icon={Building2} label="Plans" value={String(plans.length || 13)} />
            <Metric icon={Users} label="Entities" value={String(entityCount)} />
          </div>
        </div>
      </section>

      <div className="grid gap-3 rounded-xl border bg-card p-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a department, company, app, event or location…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {BATCHES.map((item) => <Button key={item} size="sm" variant={batch === item ? "default" : "outline"} onClick={() => setBatch(item)}>{item}</Button>)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Metric icon={CheckCircle2} label="Live Plans" value={String(plans.length || 13)} />
        <Metric icon={Building2} label="Departments" value={String(departments)} />
        <Metric icon={Users} label="Company Lanes" value={String(entityCount)} />
        <Metric icon={FileText} label="Format" value="Interactive" />
      </div>

      {isLoading ? (
        <div className="flex min-h-80 items-center justify-center rounded-xl border bg-card"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading operating plans…</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((plan) => (
            <Card key={plan.slug} className="group overflow-hidden transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2"><Badge variant="outline">{batchLabel(plan)}</Badge><Badge>{plan.department}</Badge></div>
                    <CardTitle className="mt-3 text-xl">{plan.title}</CardTitle>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.summary}</p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-1.5">{(plan.entities || []).slice(0, 7).map((entity) => <Badge key={entity} variant="secondary">{entity}</Badge>)}{(plan.entities || []).length > 7 && <Badge variant="secondary">+{plan.entities.length - 7}</Badge>}</div>
                <div className="flex flex-wrap gap-2"><Button onClick={() => openPlan(plan.slug)}>Open Full Command</Button><Button variant="outline" onClick={() => navigate(`/ops-os/tasks?tab=create`)}>Create Execution Item</Button></div>
              </CardContent>
            </Card>
          ))}
          {!filtered.length && <div className="col-span-full rounded-xl border bg-card p-12 text-center text-muted-foreground">No operating plans match this search.</div>}
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/70 p-3 backdrop-blur">
      <div className="flex items-center gap-2 text-muted-foreground"><Icon className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-wider">{label}</span></div>
      <div className="mt-2 text-xl font-black sm:text-2xl">{value}</div>
    </div>
  );
}
