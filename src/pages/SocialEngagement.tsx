import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Program = {
  enterprise_entity_id: string;
  entity_key: string;
  platform: string;
  account_handle: string | null;
  program_status: string;
  activation_goal: string | null;
  comment_enabled: boolean;
  dm_lane_enabled: boolean;
  dm_mode: string;
  daily_comment_cap: number;
  daily_dm_cap: number;
  daily_total_cap: number;
  target_cycle_size: number;
  daily_target_count: number;
  cooldown_hours: number;
  open_actions: number;
  needs_approval: number;
  comments_planned_today: number;
  comments_executed_today: number;
  dms_planned_today: number;
  dms_executed_today: number;
  replies_today: number;
  conversions_today: number;
  last_engagement_at: string | null;
  metadata: Record<string, any>;
};

type EngagementAction = {
  id: string;
  enterprise_entity_id: string;
  entity_key: string;
  platform: string;
  target_id: string | null;
  target_handle: string;
  target_url: string | null;
  action_type: string;
  direction: string;
  context_url: string | null;
  draft_text: string | null;
  status: string;
  approval_required: boolean;
  scheduled_for: string | null;
  executed_at: string | null;
  replied_at: string | null;
  outcome: string | null;
  conversion_type: string | null;
  proof_url: string | null;
  owner_label: string | null;
  metadata: Record<string, any>;
  created_at: string;
};

const statusLabel = (value?: string | null) => (value || "open").replaceAll("_", " ");

export default function SocialEngagement() {
  const qc = useQueryClient();
  const [entityKey, setEntityKey] = useState("dr-dorsey");
  const [block, setBlock] = useState(1);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { data: programs = [] } = useQuery({
    queryKey: ["social-engagement-programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_social_engagement_entity_command_v1")
        .select("*")
        .order("entity_key");
      if (error) throw error;
      return (data || []) as Program[];
    },
    refetchInterval: 30000,
  });

  const program = programs.find((row) => row.entity_key === entityKey) || programs[0] || null;

  const { data: actions = [] } = useQuery({
    queryKey: ["social-engagement-actions", program?.enterprise_entity_id],
    enabled: Boolean(program?.enterprise_entity_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_engagement_actions")
        .select("*")
        .eq("enterprise_entity_id", program!.enterprise_entity_id)
        .order("created_at", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return (data || []) as EngagementAction[];
    },
    refetchInterval: 30000,
  });

  const visible = useMemo(
    () =>
      actions.filter((action) => {
        const actionBlock = Number(action.metadata?.daily_block || 1);
        return actionBlock === block;
      }),
    [actions, block]
  );

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["social-engagement-programs"] });
    qc.invalidateQueries({ queryKey: ["social-engagement-actions"] });
  };

  async function saveDraft(action: EngagementAction) {
    const text = (drafts[action.id] ?? action.draft_text ?? "").trim();
    if (!text) return toast.error("Add the exact comment or DM copy first.");
    const nextStatus = action.action_type === "dm" || action.approval_required ? "needs_approval" : "drafted";
    const { error } = await supabase
      .from("social_engagement_actions")
      .update({ draft_text: text, status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", action.id);
    if (error) return toast.error(error.message);
    toast.success("Engagement copy saved");
    refresh();
  }

  async function setStatus(action: EngagementAction, status: string) {
    const patch: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (status === "executed") patch.executed_at = new Date().toISOString();
    if (status === "replied") patch.replied_at = new Date().toISOString();
    const { error } = await supabase.from("social_engagement_actions").update(patch).eq("id", action.id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${statusLabel(status)}`);
    refresh();
  }

  async function queueDm(action: EngagementAction) {
    if (!program?.dm_lane_enabled) return toast.error("DM lane is disabled for this entity.");
    if (!["executed", "replied", "converted"].includes(action.status)) {
      return toast.error("Use public engagement first. Queue a DM only after a meaningful signal.");
    }
    const { error } = await supabase.from("social_engagement_actions").insert({
      enterprise_entity_id: action.enterprise_entity_id,
      entity_key: action.entity_key,
      platform: action.platform,
      target_id: action.target_id,
      target_handle: action.target_handle,
      target_url: action.target_url,
      action_type: "dm",
      direction: "outbound",
      status: "needs_context",
      approval_required: program.dm_mode === "manual_approval",
      approval_mode: program.dm_mode,
      owner_label: "Muse / Social Growth",
      metadata: {
        source_action_id: action.id,
        wave: action.metadata?.wave || null,
        daily_block: action.metadata?.daily_block || block,
        instruction:
          "Draft a concise, contextual DM tied to the prior public interaction or clear relationship signal. No generic pitch. @DOLODORSEY outbound DMs require manual approval.",
      },
    });
    if (error) return toast.error(error.message);
    toast.success("DM moved into manual-review queue");
    refresh();
  }

  if (!program) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Engagement Command</h1>
        <p className="text-sm text-muted-foreground">No entity engagement programs are configured yet.</p>
      </div>
    );
  }

  const viewBatches = Array.from(new Set(actions.map((action) => Number(action.metadata?.daily_block || 1)))).sort((a, b) => a - b);
  const sourcePool = Number(program.metadata?.source_pool_size || 0);
  const warmPool = Number(program.metadata?.warm_2plus_pool || 0);
  const superfanPool = Number(program.metadata?.superfan_pool || 0);
  const scanTarget = Number(program.metadata?.background_scan_target_daily || 0);
  const contextTarget = Number(program.metadata?.context_review_target_daily || 0);
  const touchCandidateTarget = Number(program.metadata?.direct_touch_candidate_target_daily || 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground">AUDIENCE ACTIVATION</p>
          <h1 className="text-2xl font-bold tracking-tight">Engagement Command</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{program.activation_goal}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {programs.map((row) => (
            <Button
              key={row.entity_key}
              variant={row.entity_key === program.entity_key ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setEntityKey(row.entity_key);
                setBlock(1);
              }}
            >
              {row.account_handle || row.entity_key}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-3">
        <Metric title="Warm Pool" value={sourcePool.toLocaleString()} note="Addressable audience" />
        <Metric title="Multi-Signal" value={warmPool.toLocaleString()} note="2+ source signals" />
        <Metric title="Superfans" value={superfanPool.toLocaleString()} note="Highest confidence" />
        <Metric title="Background Scan / Day" value={scanTarget.toLocaleString()} note="Score + segment at data speed" />
        <Metric title="Context Review / Day" value={contextTarget.toLocaleString()} note="Highest-value accounts" />
        <Metric title="Touch Candidates / Day" value={touchCandidateTarget.toLocaleString()} note="Qualified for real engagement" />
        <Metric title="Open Queue" value={Number(program.open_actions).toLocaleString()} note="Needs work" />
        <Metric title="Replies Today" value={Number(program.replies_today).toLocaleString()} note="Relationship signal" />
        <Metric title="Conversions Today" value={Number(program.conversions_today).toLocaleString()} note="Follow / lead / partner" />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Comment Lane</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Daily cap</span><strong>{program.daily_comment_cap}</strong></div>
            <div className="flex justify-between"><span>Executed today</span><strong>{program.comments_executed_today}</strong></div>
            <div className="flex justify-between"><span>Rule</span><Badge variant="secondary">contextual only</Badge></div>
            <p className="text-xs text-muted-foreground">Specific comments based on the live post. No emoji-only engagement, generic praise, or sales pitch.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">DM Lane</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Mode</span><strong>{statusLabel(program.dm_mode)}</strong></div>
            <div className="flex justify-between"><span>Daily cap</span><strong>{program.daily_dm_cap}</strong></div>
            <div className="flex justify-between"><span>Needs approval</span><strong>{program.needs_approval}</strong></div>
            <p className="text-xs text-muted-foreground">For @DOLODORSEY, DMs are a second-step relationship tool and remain manual-approval only.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Relationship Rules</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Cooldown</span><strong>{program.cooldown_hours}h</strong></div>
            <div className="flex justify-between"><span>Daily total cap</span><strong>{program.daily_total_cap}</strong></div>
            <div className="flex justify-between"><span>Cycle</span><strong>{program.target_cycle_size} accounts</strong></div>
            <p className="text-xs text-muted-foreground">Stop on reply or opt-out. Never turn the warm audience dataset into mass unsolicited messaging.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Continuous Engagement Queue</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">These 20-row views are dashboard pagination only — not a daily limit. The background team processes the full priority queue continuously; all current 100 targets can advance in the same day.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(viewBatches.length ? viewBatches : [1]).map((n) => (
                <Button key={n} size="sm" variant={block === n ? "default" : "outline"} onClick={() => setBlock(n)}>
                  View {n}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">No actions in this view.</p>
          ) : (
            visible.map((action) => (
              <EngagementCard
                key={action.id}
                action={action}
                draft={drafts[action.id] ?? action.draft_text ?? ""}
                onDraft={(value) => setDrafts((prev) => ({ ...prev, [action.id]: value }))}
                onSave={() => saveDraft(action)}
                onStatus={(status) => setStatus(action, status)}
                onQueueDm={() => queueDm(action)}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

function EngagementCard({
  action,
  draft,
  onDraft,
  onSave,
  onStatus,
  onQueueDm,
}: {
  action: EngagementAction;
  draft: string;
  onDraft: (value: string) => void;
  onSave: () => void;
  onStatus: (status: string) => void;
  onQueueDm: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm">{action.target_handle}</strong>
            <Badge variant="outline">{action.action_type}</Badge>
            <Badge variant="secondary">{statusLabel(action.status)}</Badge>
            {action.approval_required && <Badge>approval required</Badge>}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Wave {action.metadata?.wave || "engagement"} · #{action.metadata?.sequence_in_wave || "—"}
          </p>
          {action.target_url && (
            <a className="mt-2 inline-block text-xs underline underline-offset-4" href={action.target_url} target="_blank" rel="noreferrer">
              Open Instagram target
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => onStatus("skipped")}>Skip</Button>
          {action.action_type === "comment" && ["executed", "replied", "converted"].includes(action.status) && (
            <Button size="sm" variant="outline" onClick={onQueueDm}>Queue DM</Button>
          )}
          {["drafted", "approved", "needs_approval"].includes(action.status) && (
            <Button size="sm" onClick={() => onStatus("executed")}>Mark Executed</Button>
          )}
          {action.status === "executed" && (
            <Button size="sm" variant="outline" onClick={() => onStatus("replied")}>Reply Received</Button>
          )}
          {["executed", "replied"].includes(action.status) && (
            <Button size="sm" variant="outline" onClick={() => onStatus("converted")}>Mark Converted</Button>
          )}
        </div>
      </div>

      <div className="mt-3">
        <Textarea
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          placeholder={
            action.action_type === "dm"
              ? "Write the contextual manual-approval DM..."
              : "After reviewing the live post, write one specific, natural comment..."
          }
          className="min-h-[84px]"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-[10px] text-muted-foreground">
            {action.metadata?.instruction || "Context first. Quality over volume."}
          </p>
          <Button size="sm" onClick={onSave}>Save Copy</Button>
        </div>
      </div>
    </div>
  );
}
