# Independent mandate review gate — implementation evidence

Reporting date: 2026-09-13. This document records implementation and controlled-test evidence, not a business outcome or a production-frontend release.

## Applied database migration

The authoritative applied migration is `mandate_independent_review_gate`, version `20260913093531`, in the canonical control database's managed migration history. Retrieve that migration for exact installed SQL; do not re-create it from this summary.

The additive change installs:
- Private, entity-bound review receipts containing submitter, independent reviewer, submission revision, evidence fingerprint, source and decision.
- Evidence submitter and submission revision fields on the existing mandate record.
- An update/insert guard requiring substantive HTTPS evidence for QA submission and preventing direct self-verification.
- A scoped independent-review RPC with active reviewer authorization, expected-update checks, source binding and a different reviewer from the submitter.
- Protection against changing verified evidence without an authorized reopen.

No source mandate was marked complete by installation. The source records remained 51 original obligations, all `todo`. There were zero real review receipts, zero residual test rows and zero newly certified business results after testing.

## Controlled database checks

All eight checks ran inside the migration transaction. Fixture changes and review receipts were rolled back before the migration committed.

1. Direct verification without independent evidence was rejected.
2. QA submission without substantive evidence was rejected.
3. A valid QA submission recorded its submitter but did not set a completion timestamp.
4. Self-review was rejected.
5. A reviewer outside authorized scope was rejected.
6. A stale expected-update timestamp was rejected.
7. A separate authorized reviewer could attest the exact submitted evidence revision.
8. Post-verification evidence tampering was rejected without an authorized reopen.

The positive case used an explicitly controlled invalid-domain fixture and did not call external services. It demonstrates database behavior, not verification of a real customer result.

The source-row fingerprint before and after the controlled tests matched. The fixture mandate and its receipt did not remain in the database.

## Local UI logic checks

`node --experimental-strip-types scripts/control-truth-checks.ts` was rerun against the recovered PR implementation: 20/20 checks passed. These are unit-level checks, not authenticated browser or end-to-end permission tests.

## Release status

PR #5 remains DRAFT. The production frontend has not been merged or released as part of this evidence update. Before release, verify authenticated rendering, canonical environment routing, read authorization, current human identity/assignment bindings, the review UI's integration with the new RPC, and required regression checks. Existing repository or deployment success alone must not be treated as acceptance.

Do not use this document to infer new user privileges, new human appointments, new external-action approvals or recovered provider capacity.
