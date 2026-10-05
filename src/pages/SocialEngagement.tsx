import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  context_key: string | null;
  voice_mode: string | null;
  copy_qa_status: string;
  copy_similarity_max: number | null;
  copy_qa_flags: Record<string, any>;
};

type VoicePattern = {
  id: string;
  context_key: string;
  voice_mode: string;
  action_type: string;
  intent: string;
  max_words: number;
  learned_weight?: number;
};

type ActionMenuItem = {
  id: string;
  action_key: string;
  trigger_rule: string;
  action_type: string;
  priority: number;
  approval_required: boolean;
  notes: string | null;
  metadata: Record<string, any>;
};

type LearningWeight = {
  entity_key: string;
  context_key: string;
  voice_mode: string;
  action_type: string;
  executions: number;
  replies: number;
  dm_replies: number;
  follows: number;
  conversions: number;
  learned_weight: number;
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
        .from("v_social_engagement_queue_v1")
        .select("*")
        .eq("enterprise_entity_id", program!.enterprise_entity_id)
        .order("target_priority", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return (data || []) as EngagementAction[];
    },
    refetchInterval: 30000,
  });

  const { data: voicePatterns = [] } = useQuery({
    queryKey: ["social-engagement-voice-patterns", program?.entity_key],
    enabled: Boolean(program?.entity_key),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_social_engagement_pattern_rank_v1")
        .select("id,context_key,voice_mode,action_type,intent,max_words,learned_weight")
        .eq("entity_key", program!.entity_key)
        .order("learned_weight", { ascending: false })
        .order("context_key");
      if (error) throw error;
      return (data || []) as VoicePattern[];
    },
  });

  const { data: actionMenu = [] } = useQuery({
    queryKey: ["social-engagement-action-menu", program?.entity_key],
    enabled: Boolean(program?.entity_key),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_engagement_action_menu")
        .select("id,action_key,trigger_rule,action_type,priority,approval_required,notes,metadata")
        .eq("entity_key", program!.entity_key)
        .eq("active", true)
        .order("priority", { ascending: false });
      if (error) throw error;
      return (data || []) as ActionMenuItem[];
    },
  });

  const { data: similarityFlags = [] } = useQuery({
    queryKey: ["social-engagement-similarity-flags", program?.entity_key],
    enabled: Boolean(program?.entity_key),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_social_engagement_similarity_guard_v2")
        .select("*")
        .eq("entity_key", program!.entity_key)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: learningWeights = [] } = useQuery({
    queryKey: ["social-engagement-learning", program?.entity_key],
    enabled: Boolean(program?.entity_key),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_social_engagement_learning_weights_v1")
        .select("*")
        .eq("entity_key", program!.entity_key)
        .order("learned_weight", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as LearningWeight[];
    },
    refetchInterval: 30000,
  });

  const { data: contentFeedback = [] } = useQuery({
    queryKey: ["dorsey-engagement-content-feedback", program?.entity_key],
    enabled: program?.entity_key === "dr-dorsey",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_dorsey_engagement_content_feedback_v1")
        .select("*")
        .order("avg_learned_weight", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: teamQueue = [] } = useQuery({
    queryKey: ["dorsey-engagement-team-queue", program?.entity_key],
    enabled: program?.entity_key === "dr-dorsey",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_social_engagement_team_queue_v1")
        .select("research_owner,qa_owner,status")
        .eq("entity_key", "dr-dorsey");
      if (error) throw error;
      return data || [];
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
    qc.invalidateQueries({ queryKey: ["social-engagement-similarity-flags"] });
    qc.invalidateQueries({ queryKey: ["social-engagement-learning"] });
    qc.invalidateQueries({ queryKey: ["dorsey-engagement-content-feedback"] });
    qc.invalidateQueries({ queryKey: ["dorsey-engagement-team-queue"] });
  };

  async function saveDraft(action: EngagementAction) {
    const text = (drafts[action.id] ?? action.draft_text ?? "").trim();
    if (!text) return toast.error("Add the exact comment or DM copy first.");
    if (!action.context_key || !action.voice_mode) return toast.error("Choose the context + voice pattern first.");
    const nextStatus = action.action_type === "dm" || action.approval_required ? "needs_approval" : "drafted";
    const { data, error } = await supabase
      .from("social_engagement_actions")
      .update({ draft_text: text, status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", action.id)
      .select("copy_qa_status,copy_similarity_max,status")
      .single();
    if (error) return toast.error(error.message);
    if (data?.copy_qa_status === "blocked") {
      toast.error("Too similar to recent Dorsey copy. Kept in context/redraft queue.");
    } else if (data?.copy_qa_status === "review") {
      toast.warning("Saved, but variation QA flagged this draft for review.");
    } else {
      toast.success("Engagement copy passed variation QA");
    }
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

  async function setActionChoice(action: EngagementAction, actionKey: string) {
    const choice = actionMenu.find((item) => item.action_key === actionKey);
    if (!choice) return;
    const nextStatus =
      actionKey === "do_nothing" || actionKey === "research_only" ? "skipped" : "needs_context";
    const { error } = await supabase
      .from("social_engagement_actions")
      .update({
        action_type: choice.action_type,
        status: nextStatus,
        approval_required: choice.approval_required,
        context_key: null,
        voice_mode: null,
        draft_text: null,
        metadata: {
          ...(action.metadata || {}),
          chosen_action_key: choice.action_key,
          chosen_action_rule: choice.trigger_rule,
          chosen_action_notes: choice.notes,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", action.id);
    if (error) return toast.error(error.message);
    toast.success(nextStatus === "skipped" ? "No-action decision recorded" : `Action set to ${statusLabel(choice.action_key)}`);
    refresh();
  }

  async function setPattern(action: EngagementAction, patternValue: string) {
    const pattern = voicePatterns.find((p) => `${p.context_key}|${p.voice_mode}` === patternValue);
    if (!pattern) return;
    const { error } = await supabase
      .from("social_engagement_actions")
      .update({
        context_key: pattern.context_key,
        voice_mode: pattern.voice_mode,
        metadata: { ...(action.metadata || {}), voice_intent: pattern.intent, max_words: pattern.max_words },
        updated_at: new Date().toISOString(),
      })
      .eq("id", action.id);
    if (error) return toast.error(error.message);
    toast.success("Context + voice locked");
    refresh();
  }

  async function setConversion(action: EngagementAction, conversionType: string) {
    const { error } = await supabase
      .from("social_engagement_actions")
      .update({
        status: "converted",
        conversion_type: conversionType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", action.id);
    if (error) return toast.error(error.message);
    toast.success(`Recorded ${statusLabel(conversionType)} conversion`);
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
  const voicePatternCount = Number(program.metadata?.engagement_voice_patterns || voicePatterns.length || 0);
  const actionOptionCount = Number(program.metadata?.engagement_action_options || 0);
  const learningSignals = learningWeights.reduce((sum, row) => sum + Number(row.replies || 0) + Number(row.dm_replies || 0) + Number(row.follows || 0) + Number(row.conversions || 0), 0);
  const blockedCopyCount = similarityFlags.filter((row: any) => row.copy_qa_status === "blocked").length;
  const reviewCopyCount = similarityFlags.filter((row: any) => row.copy_qa_status === "review").length;
  const teamCounts = teamQueue.reduce((acc: Record<string, number>, row: any) => {
    const key = row.research_owner || "unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const proofBackedPillars = contentFeedback.filter((row: any) => Number(row.executions || 0) > 0).length;

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
        <Metric title="Voice Patterns" value={voicePatternCount.toLocaleString()} note="Dorsey-specific context + tone modes" />
        <Metric title="Action Options" value={actionOptionCount.toLocaleString()} note="Comment / Story / DM / no-action choices" />
        <Metric title="Copy QA Flags" value={similarityFlags.length.toLocaleString()} note={`${blockedCopyCount} blocked · ${reviewCopyCount} review`} />
        <Metric title="Learning Signals" value={learningSignals.toLocaleString()} note="Replies + DM replies + follows + conversions" />
        <Metric title="Muse Queue" value={Number(teamCounts.muse || 0).toLocaleString()} note="Primary live-context lane" />
        <Metric title="ChatGPT Queue" value={Number(teamCounts.chatgpt || 0).toLocaleString()} note="Public-context / strategy / QA" />
        <Metric title="Dot Queue" value={Number(teamCounts.dot || 0).toLocaleString()} note="Scoring / proof / control" />
        <Metric title="Claude Queue" value={Number(teamCounts.claude || 0).toLocaleString()} note="Secondary QA when available" />
        <Metric title="Proof-Backed Pillars" value={proofBackedPillars.toLocaleString()} note="Content pillars with real execution evidence" />
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

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Copy Variation QA</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Blocked recent copy</span><strong>{blockedCopyCount}</strong></div>
            <div className="flex justify-between"><span>Review required</span><strong>{reviewCopyCount}</strong></div>
            <p className="text-xs text-muted-foreground">Exact-copy fingerprints, token overlap, and repeated sentence structure are checked before engagement copy advances.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Learning Leaderboard</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {learningWeights.length === 0 ? (
              <p className="text-xs text-muted-foreground">No provider-backed response learning yet. The system will rank context + voice + action combinations as replies, follows and conversions arrive.</p>
            ) : (
              learningWeights.slice(0, 5).map((row) => (
                <div key={`${row.context_key}|${row.voice_mode}|${row.action_type}`} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate">{statusLabel(row.context_key)} · {statusLabel(row.voice_mode)} · {row.action_type}</span>
                  <Badge variant="secondary">×{Number(row.learned_weight).toFixed(2)}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Dorsey Content Feedback</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {contentFeedback.length === 0 ? (
            <p className="text-xs text-muted-foreground">No engagement-to-content feedback rows yet.</p>
          ) : (
            contentFeedback.map((row: any) => (
              <div key={row.content_pillar} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <strong className="text-xs">{statusLabel(row.content_pillar)}</strong>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {Number(row.executions || 0)} executions · {Number(row.replies || 0)} replies · {Number(row.follows || 0)} follows · {Number(row.conversions || 0)} conversions
                  </p>
                </div>
                <Badge variant={Number(row.executions || 0) > 0 ? "secondary" : "outline"}>
                  {Number(row.executions || 0) > 0 ? `weight ×${Number(row.avg_learned_weight || 1).toFixed(2)}` : "hypothesis only"}
                </Badge>
              </div>
            ))
          )}
          <p className="text-[10px] text-muted-foreground">Do not scale a Dorsey content pillar from audience overlap alone. Promotion to winner status requires provider-backed executions and response evidence.</p>
        </CardContent>
      </Card>

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
                patterns={voicePatterns.filter((pattern) => pattern.action_type === action.action_type)}
                actionMenu={actionMenu}
                onActionChoice={(value) => setActionChoice(action, value)}
                onPattern={(value) => setPattern(action, value)}
                onSave={() => saveDraft(action)}
                onStatus={(status) => setStatus(action, status)}
                onQueueDm={() => queueDm(action)}
                onConversion={(conversionType) => setConversion(action, conversionType)}
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
  patterns,
  actionMenu,
  onActionChoice,
  onPattern,
  onSave,
  onStatus,
  onQueueDm,
  onConversion,
}: {
  action: EngagementAction;
  draft: string;
  onDraft: (value: string) => void;
  patterns: VoicePattern[];
  actionMenu: ActionMenuItem[];
  onActionChoice: (value: string) => void;
  onPattern: (value: string) => void;
  onSave: () => void;
  onStatus: (status: string) => void;
  onQueueDm: () => void;
  onConversion: (conversionType: string) => void;
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
            {action.context_key && <Badge variant="outline">{statusLabel(action.context_key)}</Badge>}
            {action.voice_mode && <Badge variant="outline">{statusLabel(action.voice_mode)}</Badge>}
            {action.copy_qa_status && action.copy_qa_status !== "pending" && (
              <Badge variant={action.copy_qa_status === "blocked" ? "destructive" : "secondary"}>
                copy QA: {action.copy_qa_status}
              </Badge>
            )}
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
            <>
              <Button size="sm" variant="outline" onClick={() => onConversion("follow")}>Mark Follow</Button>
              <Button size="sm" variant="outline" onClick={() => onConversion("qualified_relationship")}>Mark Converted</Button>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <Select
          value={action.metadata?.chosen_action_key || undefined}
          onValueChange={onActionChoice}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose what Dolo should actually do" />
          </SelectTrigger>
          <SelectContent>
            {actionMenu.map((item) => (
              <SelectItem key={item.id} value={item.action_key}>
                {statusLabel(item.action_key)} · {statusLabel(item.action_type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {["comment", "dm", "story_reply"].includes(action.action_type) ? (
          <>
            <Select
              value={action.context_key && action.voice_mode ? `${action.context_key}|${action.voice_mode}` : undefined}
              onValueChange={onPattern}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose live context + Dorsey voice mode" />
              </SelectTrigger>
              <SelectContent>
                {patterns.map((pattern) => (
                  <SelectItem key={pattern.id} value={`${pattern.context_key}|${pattern.voice_mode}`}>
                    {statusLabel(pattern.context_key)} · {statusLabel(pattern.voice_mode)}{Number(pattern.learned_weight || 1) > 1 ? ` · ×${Number(pattern.learned_weight).toFixed(1)}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              placeholder={
                action.action_type === "dm"
                  ? "Write the contextual manual-approval DM..."
                  : action.action_type === "story_reply"
                    ? "Write one specific Story reply..."
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
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            {action.metadata?.chosen_action_notes || "Review the live context, then choose the lightest genuine action. A no-action decision is valid."}
          </p>
        )}
      </div>
    </div>
  );
}
