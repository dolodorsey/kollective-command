CREATE TABLE IF NOT EXISTS private.mandate_review_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 mandate_id uuid NOT NULL REFERENCES public.enterprise_daily_mandates(id),
 enterprise_entity_id uuid NOT NULL REFERENCES public.enterprise_directory_records(id),
 submission_revision bigint NOT NULL,
 evidence_fingerprint text NOT NULL,
 submitted_by uuid NOT NULL,
 reviewed_by uuid NOT NULL,
 decision text NOT NULL CHECK(decision IN ('approved','revise')),
 review_note text NOT NULL CHECK(length(btrim(review_note))>=40),
 source_url text NOT NULL CHECK(source_url ~ '^https://[^[:space:]]+$'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(submitted_by<>reviewed_by)
);
ALTER TABLE private.mandate_review_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.mandate_review_receipts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON private.mandate_review_receipts TO service_role;
ALTER TABLE public.enterprise_daily_mandates ADD COLUMN IF NOT EXISTS proof_submitted_by uuid;
ALTER TABLE public.enterprise_daily_mandates ADD COLUMN IF NOT EXISTS proof_submitted_at timestamptz;
ALTER TABLE public.enterprise_daily_mandates ADD COLUMN IF NOT EXISTS submission_revision bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION private.guard_mandate_review_state() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $fn$
DECLARE u uuid:=auth.uid(); changed boolean; matching boolean;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.enterprise_entity_id IS DISTINCT FROM OLD.enterprise_entity_id OR NEW.mandate_date IS DISTINCT FROM OLD.mandate_date OR NEW.lane_key IS DISTINCT FROM OLD.lane_key THEN RAISE EXCEPTION 'mandate_identity_is_immutable'; END IF;
  IF u IS NOT NULL AND NOT private.can_access_entity(OLD.enterprise_entity_id) THEN RAISE EXCEPTION 'entity_access_denied'; END IF;
  IF u IS NOT NULL AND NOT private.is_boh_admin() AND (NEW.owner IS DISTINCT FROM OLD.owner OR NEW.due_at IS DISTINCT FROM OLD.due_at) THEN RAISE EXCEPTION 'ownership_or_deadline_change_requires_admin'; END IF;
  changed:= NEW.proof_url IS DISTINCT FROM OLD.proof_url OR NEW.proof_note IS DISTINCT FROM OLD.proof_note OR NEW.mandate IS DISTINCT FROM OLD.mandate;
  IF OLD.status='verified' AND (changed OR NEW.status IS DISTINCT FROM OLD.status) THEN
   IF NOT private.is_boh_admin() OR NEW.status NOT IN ('todo','in_progress','blocked') THEN RAISE EXCEPTION 'verified_mandate_requires_authorized_reopen'; END IF;
  END IF;
  NEW.proof_submitted_by:=OLD.proof_submitted_by;
  NEW.proof_submitted_at:=OLD.proof_submitted_at;
  NEW.submission_revision:=OLD.submission_revision;
 ELSE
  IF u IS NOT NULL AND NOT private.can_access_entity(NEW.enterprise_entity_id) THEN RAISE EXCEPTION 'entity_access_denied'; END IF;
  IF NEW.status='verified' THEN RAISE EXCEPTION 'independent_review_required'; END IF;
  changed:=true; NEW.proof_submitted_by:=NULL; NEW.proof_submitted_at:=NULL; NEW.submission_revision:=0;
 END IF;
 IF NEW.status='done' THEN
  IF u IS NULL THEN RAISE EXCEPTION 'identified_evidence_submitter_required'; END IF;
  IF coalesce(NEW.proof_url,'') !~ '^https://[^[:space:]]+$' OR coalesce(length(btrim(NEW.proof_note)),0)<40 THEN RAISE EXCEPTION 'substantive_evidence_required'; END IF;
  IF TG_OP='INSERT' OR changed OR OLD.status IS DISTINCT FROM 'done' THEN
   NEW.proof_submitted_by:=u; NEW.proof_submitted_at:=clock_timestamp(); NEW.submission_revision:=NEW.submission_revision+1;
  END IF;
 ELSIF changed THEN
  NEW.proof_submitted_by:=NULL; NEW.proof_submitted_at:=NULL; NEW.submission_revision:=NEW.submission_revision+1;
 END IF;
 IF NEW.status='verified' THEN
  IF u IS NULL OR changed OR NEW.proof_submitted_by IS NULL OR u=NEW.proof_submitted_by THEN RAISE EXCEPTION 'independent_review_required'; END IF;
  SELECT EXISTS(SELECT 1 FROM private.mandate_review_receipts r WHERE r.mandate_id=NEW.id AND r.enterprise_entity_id=NEW.enterprise_entity_id AND r.submission_revision=NEW.submission_revision AND r.submitted_by=NEW.proof_submitted_by AND r.reviewed_by=u AND r.decision='approved' AND r.evidence_fingerprint=md5(jsonb_build_array(NEW.mandate,NEW.proof_url,NEW.proof_note,NEW.submission_revision)::text)) INTO matching;
  IF NOT matching THEN RAISE EXCEPTION 'independent_review_receipt_required'; END IF;
  NEW.completed_at:=clock_timestamp();
 ELSE NEW.completed_at:=NULL;
 END IF;
 NEW.updated_at:=clock_timestamp();
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION private.guard_mandate_review_state() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER enforce_mandate_independent_review BEFORE INSERT OR UPDATE ON public.enterprise_daily_mandates FOR EACH ROW EXECUTE FUNCTION private.guard_mandate_review_state();

CREATE OR REPLACE FUNCTION private.review_enterprise_mandate(p_mandate_id uuid,p_expected_updated_at timestamptz,p_decision text,p_review_note text,p_source_url text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $fn$
DECLARE m public.enterprise_daily_mandates%rowtype; u uuid:=auth.uid(); rid uuid; allowed boolean;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'authenticated_reviewer_required'; END IF;
 SELECT * INTO m FROM public.enterprise_daily_mandates WHERE id=p_mandate_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'mandate_unavailable'; END IF;
 allowed:=private.is_boh_admin() OR EXISTS(SELECT 1 FROM public.company_team_assignments a JOIN public.org_members o ON o.user_id=a.user_id WHERE a.entity_id=m.enterprise_entity_id AND a.user_id=u AND a.status='active' AND a.access_level IN ('owner','approver') AND o.status='active');
 IF NOT coalesce(allowed,false) THEN RAISE EXCEPTION 'review_scope_denied'; END IF;
 IF m.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'stale_mandate_revision'; END IF;
 IF m.status<>'done' OR m.proof_submitted_by IS NULL THEN RAISE EXCEPTION 'qa_submission_required'; END IF;
 IF m.proof_submitted_by=u THEN RAISE EXCEPTION 'self_review_forbidden'; END IF;
 IF p_decision NOT IN ('approved','revise') OR p_decision IS NULL OR coalesce(length(btrim(p_review_note)),0)<40 OR p_source_url IS DISTINCT FROM m.proof_url THEN RAISE EXCEPTION 'review_evidence_contract_failed'; END IF;
 INSERT INTO private.mandate_review_receipts(mandate_id,enterprise_entity_id,submission_revision,evidence_fingerprint,submitted_by,reviewed_by,decision,review_note,source_url)
 VALUES(m.id,m.enterprise_entity_id,m.submission_revision,md5(jsonb_build_array(m.mandate,m.proof_url,m.proof_note,m.submission_revision)::text),m.proof_submitted_by,u,p_decision,p_review_note,p_source_url) RETURNING id INTO rid;
 UPDATE public.enterprise_daily_mandates SET status=CASE WHEN p_decision='approved' THEN 'verified' ELSE 'in_progress' END WHERE id=m.id;
 RETURN jsonb_build_object('review_id',rid,'mandate_id',m.id,'decision',p_decision,'verified',p_decision='approved');
END $fn$;
REVOKE ALL ON FUNCTION private.review_enterprise_mandate(uuid,timestamptz,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.review_enterprise_mandate(uuid,timestamptz,text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.review_enterprise_mandate(p_mandate_id uuid,p_expected_updated_at timestamptz,p_decision text,p_review_note text,p_source_url text) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
 SELECT private.review_enterprise_mandate(p_mandate_id,p_expected_updated_at,p_decision,p_review_note,p_source_url);
$fn$;
REVOKE ALL ON FUNCTION public.review_enterprise_mandate(uuid,timestamptz,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_enterprise_mandate(uuid,timestamptz,text,text,text) TO authenticated;

COMMENT ON TABLE private.mandate_review_receipts IS 'Independent human review attestations bound to mandate evidence and submission revision. Database tests do not certify external outcomes. Direct authenticated writes denied.';
COMMENT ON FUNCTION public.review_enterprise_mandate(uuid,timestamptz,text,text,text) IS 'Scoped independent reviewer attestation with stale revision, self-review, evidence and role checks. Rollback-only controlled installation checks passed in the applied migration; authenticated browser and full read-RLS validation remain separate release gates.';
