DO $migration$
DECLARE
  before_fingerprint text;
  after_fingerprint text;
  expected_entities bigint;
  actual_entities bigint;
  actual_rows bigint;
  eligible_entities bigint;
  visible_mandates bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('khg:mandate-continuity-schema'));
  SELECT md5(coalesce(string_agg(to_jsonb(m)::text,'|' ORDER BY m.id),'')) INTO before_fingerprint FROM public.enterprise_daily_mandates m;
  SELECT count(DISTINCT enterprise_entity_id) INTO expected_entities FROM public.v_entity_execution_dashboard_service WHERE execution_state IN ('active_execution','active_readiness');
  EXECUTE $view$
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
$view$;
  SELECT count(*),count(DISTINCT enterprise_entity_id),count(mandate_id) INTO actual_rows,actual_entities,visible_mandates FROM public.v_enterprise_command_center_v2;
  SELECT count(DISTINCT d.enterprise_entity_id) INTO eligible_entities FROM public.v_entity_execution_dashboard_service d WHERE d.execution_state IN ('active_execution','active_readiness') AND EXISTS (SELECT 1 FROM public.enterprise_daily_mandates m WHERE m.enterprise_entity_id=d.enterprise_entity_id AND m.mandate_date<=(now() AT TIME ZONE 'America/New_York')::date AND (m.mandate_date=(now() AT TIME ZONE 'America/New_York')::date OR m.status<>'verified' OR (nullif(btrim(m.proof_url),'') IS NULL AND nullif(btrim(m.proof_note),'') IS NULL)));
  SELECT md5(coalesce(string_agg(to_jsonb(m)::text,'|' ORDER BY m.id),'')) INTO after_fingerprint FROM public.enterprise_daily_mandates m;
  IF before_fingerprint IS DISTINCT FROM after_fingerprint THEN RAISE EXCEPTION 'Mandate source records changed unexpectedly'; END IF;
  IF actual_rows<>expected_entities OR actual_entities<>expected_entities OR visible_mandates<>eligible_entities THEN RAISE EXCEPTION 'Control coverage assertion failed'; END IF;
END
$migration$;
COMMENT ON VIEW public.v_enterprise_command_center_v2 IS 'Entity-isolated control feed. Oldest unresolved mandate remains visible with its original ID, date, owner and due date. No rollover duplicates. Uses America/New_York for cycle selection. Legacy command_health is not independent business-outcome certification. Continuity repair 2026-09-13.';
