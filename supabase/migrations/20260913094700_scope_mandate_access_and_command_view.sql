DROP POLICY IF EXISTS enterprise_daily_mandates_authenticated_select ON public.enterprise_daily_mandates;
DROP POLICY IF EXISTS enterprise_daily_mandates_authenticated_insert ON public.enterprise_daily_mandates;
DROP POLICY IF EXISTS enterprise_daily_mandates_authenticated_update ON public.enterprise_daily_mandates;

CREATE POLICY enterprise_daily_mandates_authenticated_select
ON public.enterprise_daily_mandates
FOR SELECT TO authenticated
USING (private.can_access_entity(enterprise_entity_id));

CREATE POLICY enterprise_daily_mandates_authenticated_insert
ON public.enterprise_daily_mandates
FOR INSERT TO authenticated
WITH CHECK (private.can_access_entity(enterprise_entity_id));

CREATE POLICY enterprise_daily_mandates_authenticated_update
ON public.enterprise_daily_mandates
FOR UPDATE TO authenticated
USING (private.can_access_entity(enterprise_entity_id))
WITH CHECK (private.can_access_entity(enterprise_entity_id));

CREATE OR REPLACE VIEW public.v_enterprise_command_center_v2 AS
SELECT d.enterprise_entity_id,d.entity_key,d.entity_name,d.division,d.execution_state,d.execution_priority,d.entity_operational_state,d.operation_count,d.executing_or_verified,d.configured_not_running,d.blocked_operations,d.failed_operations,d.stale_operations,d.agents_active,d.agents_recent_heartbeat,d.last_agent_heartbeat,d.latest_execution_proof_at,d.last_progress_at,d.next_update_due_at,d.required_platforms,d.required_platforms_verified,d.required_platforms_attention,d.platform_states,
 m.id AS mandate_id,m.mandate_date,m.lane_key AS mandate_lane,m.mandate,m.owner AS mandate_owner,m.status AS mandate_status,m.proof_url AS mandate_proof_url,m.proof_note AS mandate_proof_note,m.due_at AS mandate_due_at,
 CASE WHEN d.entity_operational_state='operational_verified' AND coalesce(m.status,'todo') IN ('done','verified') AND (m.proof_url IS NOT NULL OR m.proof_note IS NOT NULL) THEN 'green'::text WHEN d.failed_operations>0 OR d.blocked_operations>0 OR coalesce(m.status,'todo')='blocked' THEN 'red'::text ELSE 'yellow'::text END AS command_health,
 (now() AT TIME ZONE 'America/New_York')::date AS control_cycle_date,
 coalesce(m.mandate_date<(now() AT TIME ZONE 'America/New_York')::date,false) AS mandate_is_carryover,
 (SELECT count(*) FROM public.enterprise_daily_mandates pending WHERE pending.enterprise_entity_id=d.enterprise_entity_id AND pending.mandate_date<=(now() AT TIME ZONE 'America/New_York')::date AND (pending.status<>'verified' OR (nullif(btrim(pending.proof_url),'') IS NULL AND nullif(btrim(pending.proof_note),'') IS NULL))) AS open_mandate_count,
 m.updated_at AS mandate_last_updated_at
FROM public.v_entity_execution_dashboard_service d
LEFT JOIN LATERAL (
 SELECT candidate.* FROM public.enterprise_daily_mandates candidate
 WHERE candidate.enterprise_entity_id=d.enterprise_entity_id
   AND candidate.mandate_date<=(now() AT TIME ZONE 'America/New_York')::date
   AND (candidate.mandate_date=(now() AT TIME ZONE 'America/New_York')::date OR candidate.status<>'verified' OR (nullif(btrim(candidate.proof_url),'') IS NULL AND nullif(btrim(candidate.proof_note),'') IS NULL))
 ORDER BY CASE WHEN candidate.status='verified' AND (nullif(btrim(candidate.proof_url),'') IS NOT NULL OR nullif(btrim(candidate.proof_note),'') IS NOT NULL) THEN 1 ELSE 0 END,
 candidate.due_at ASC NULLS LAST,candidate.mandate_date,candidate.created_at,candidate.id
 LIMIT 1
) m ON true
WHERE d.execution_state IN ('active_execution','active_readiness')
  AND private.can_access_entity(d.enterprise_entity_id);

COMMENT ON VIEW public.v_enterprise_command_center_v2 IS 'Entity-scoped command feed. Access is filtered through private.can_access_entity(auth.uid). Oldest unresolved mandate remains visible with original identity/date/deadline. Legacy command_health is not independent business-outcome certification.';

-- Controlled post-migration authorization checks performed against the applied database:
-- limited assigned non-admin principal: 1 mandate row and 1 command row, both for the assigned entity only;
-- unrelated authenticated principal: 0 command rows;
-- owner principal: all 51 active/readiness rows.
-- These checks establish access behavior only; they are not business-outcome proof.
