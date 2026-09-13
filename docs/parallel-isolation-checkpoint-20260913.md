# Parallel entity execution — verification checkpoint

This pass reuses the existing command application. No additional dashboard or agent roster was created.

## Database changes applied

Managed migration history is authoritative for exact installed SQL:
- `20260913095544` / `enforce_parallel_entity_worker_claim_isolation`: task-to-agent scope equality; explicit allowlists for shared agents; current active/readiness scope; source operation must be active in the same entity; single live lease per brand with independent brands able to run concurrently; least-recently-serviced ordering preserved. Nine pure boundary checks passed.
- `20260913095817` / `expose_scoped_mandate_review_context`: read-only identity-scoped review context, matching receipt status, and security-barrier view option.
- `20260913095913` / `fix_authenticated_review_rpc_entrypoints`: correct narrowly guarded authenticated RPC entrypoints without granting authenticated access to the private schema.

## New controlled results

Eight rollback-only tests of the actual worker claim function passed: wrong-brand rejection, not-before enforcement, correct claim identity, same-brand overlap rejection, a second brand able to claim while the first remains in progress, parked-brand rejection, invalid lease rejection, and exact receipt count. No fixture agents, tasks or run records were retained. No production task or external action was executed by the tests.

Eight role-accurate database tests passed after repairing the authenticated entrypoints. An unrelated authenticated principal had no control data or review context; a limited principal saw only its assignment, could not read/write a different entity or access its review context; an owner retained the expected active/readiness scope. Original mandate rows were unchanged. These tests use database roles, not a live browser sign-in.

Twenty existing control-logic checks were rerun; fourteen new review UI contract checks passed. Syntax transpilation checks passed. The feature-branch deployment must still be independently checked.

## Frontend changes

Each entity card opens its own server-bound independent review panel. The UI checks exact entity and mandate identity, uses the server's expected revision, requires source inspection and substantive findings, rejects self-review, and confirms a review receipt before announcing success. It cannot certify another entity by changing client identifiers.

The application now withholds cached screens until server-side user verification and clears prior identity caches on account changes. Existing routes and brand detail links remain intact. Browser/session tests are still required before claiming a fully verified live user journey.

## Release gates

Do not merge because compilation alone passes. Require authenticated rendered review testing, current canonical environment binding, reviewer identity readiness, and regression review. Production has not been changed by this feature-branch commit. Provider capacity, connector authorization, sender identity and ownership decisions remain distinct from this implementation proof.
