# Control continuity release contract

Status: DRAFT REVIEW. No production frontend release is authorized by this file.

## Scope

Improve the existing `/control-cycle` route. Do not create a second app or copy commercial data into frontend source. Read the existing `v_enterprise_command_center_v2` view. Its continuity extension must expose `control_cycle_date`, `mandate_is_carryover`, `open_mandate_count`, and `mandate_last_updated_at`.

The view selects one oldest unresolved mandate per entity across date boundaries. Original mandate identity, owner, date and deadline are preserved. No rollover task copies are needed. All mandate rows remain accessible through their authoritative records; the card shows only the next unresolved obligation.

## Verification

Run `node --experimental-strip-types scripts/control-truth-checks.ts` with Node 22.16 or later. The suite contains 20 controlled checks covering preservation, duplicate rejection, unknown states, invalid counts, safe links, evidence-versus-verification labels, review holds and optimistic-lock prerequisites. These checks do not call external services and do not prove commercial outcomes.

Before production release, require a dependency-resolved build, authenticated rendered tests, confirmation that the app environment is bound to the canonical control database, cross-entity authorization tests, stale-write rejection, backend review-state compatibility, and explicit release approval.

## Proof contract still required

This UI is not a security boundary. It deliberately cannot certify a mandate. Existing `done` is displayed as a QA submission; existing `verified` is a legacy claim until independently validated by the server contract. Server authorization, an independent verifier identity, evidence-to-mandate binding, immutable review history and controlled review/reopen transitions must be verified before release. No frontend test can substitute for those checks. The submitted form does not set `completed_at` or alter the owner or due date.

## Deployment and recovery

Use a feature-branch Vercel preview and keep the production branch unchanged until release gates pass. A successful HTML request proves only the shell, not an authenticated user flow. A successful build proves compilation, not data routing or a customer transaction.

For UI rollback, revert this frontend commit after the same release authorization process. Preserve the additive continuity view fields during frontend rollback. Do not overwrite original mandate rows. Store operational checkpoints and private exception details in the existing private control system, not in this public repository.
