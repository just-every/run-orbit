# sd-orbit-zoom-plan-privacy-1

Repository: just-every/run-orbit
Product branch: cloud/sd-orbit-zoom-plan-privacy-1
Product head: dc6b9d24887cb26799a01d3f324aff79f5fbdf4e
Base main: 1318a110883962527d82acde88bc0e7daf42763f
PR: none; repository instructions do not require a PR for the fleet landing candidate.

## Result

The delegated completed Zoom-plan privacy failure is fixed. The selected-record predicate already passed by delegation/brief-routes.ts now reaches zoom/plan.ts through today/meeting-plan.ts. The Zoom projection retains attendance only when its exact, unambiguous contact match is allowed. Unknown or ambiguous attendee addresses and nested match identities cannot enter a selected-contact projection. The top-level unresolved Zoom attendee projection is empty under delegated visibility; non-Zoom behavior is retained. The unmapped Zoom host identifier is withheld from delegated projections.

Completion citations use the original opportunity entry only when that opportunity is allowed; otherwise they cite the meeting plan. Recap attendance totals use visible rows. Existing filtering of attendee companies, opportunities, primary opportunity, notes, interactions and promises continues to apply. The full native owner projection retains all recorded attendance, unresolved addresses, host metadata, original deal link and saved plan notes.

## Public-door proof

One existing registration in tests/delegation/brief-handoff.test.ts was extended; no test registration was added, skipped, deleted or weakened. The fixture uses only a Zoom network-edge fake. All native routes, consent, PKCE, scoped bearer authorization, signal/link persistence, signed Zoom completion and delegated plan serialization are real application code over an isolated migrated D1.

The flow connects Zoom through native settings, previews and explicitly attaches a meeting to an ungranted deal, saves private agenda/preparation, receives a correctly signed completion with two matched contacts and one unknown attendee, then grants only Ana's contact through native consent and PKCE.

Before: the extended public-door test against unchanged product main failed because the contact-only application's completed plan disclosed Ben's unselected contact ID. The exact assertion and stack are retained in before-test.log. No alternate probe or retry was used to replace that failure.

After: the same flow passes. It asserts the entire serialized delegated response contains none of Ben's ID, name or email; the unknown attendee's email; private deal/company IDs, names or links; or private agenda/preparation and saved-note entry ID. The selected attendee's ID, name, mailbox, exact contact match, join/leave times and completion facts remain. Nested completion citations point to the allowed meeting plan. Company/opportunity arrays are empty, private notes absent and the unmapped host ID withheld.

The same registration verifies the native full-scope owner still sees all three attendance rows, both resolved contacts, the unknown attendee, private deal, saved agenda, host ID, join URL, original completion citation and full attendance count. An explicitly granted deal still exposes its authorized contacts and saved deal plan; a signal-only grant sees no attendee/deal identity; an unrelated deal grant gets 404. Existing consent, scope, revocation, handoff and human-send-boundary assertions continue to pass.

## Validation and counts

- Before regression: 1 test, 0 passed, 1 expected privacy failure.
- After regression: 1 test, 1 passed, 0 failed, 0 skipped.
- Typecheck: passed.
- Source lock generated last; documented source check returned ok=true. Only the three touched file hashes changed in sources.lock.json.
- Seed test budget before/after: 198 registrations + 2 qualification flows = 200/200, unchanged.
- git diff --check passed; checkout clean after commit.
- Before candidate push: fetched current main and rebased; already current, no replay or conflict. One candidate commit checked, including its complete message: fleet author/committer, no trailers.
- Product pushed on the first attempt with the cloud guard. No main/default ref, tag or PR write.
- Contract status counts remain 42 done / 130 partial / 32 missing, total 204. DELEGATE-001 remains partial; no contract text, status, gap, evidence or generated views changed.

Commands and results are recorded in RECEIPT.json; complete focused test logs, source-lock/check output, identity check, product diff and product push receipt accompany this report. PLAN.md records the full implementation/validation/publication plan.

## Claim and limits

CLAIM DELEGATE-001 PARTIAL points=none tests=tests/delegation/brief-handoff.test.ts#BRIEF-005 OUT-001 SIGNAL-009 an application reads the brief and a meeting plan with crm.evidence.read and proposes cited handoffs with crm.handoff.write; consent, scope, revocation and the human send boundary hold
DEFAULT DELEGATE-001: An attendee without an exact, unambiguous selected-contact match contributes no identity to a delegated Zoom plan; a completion entry on an ungranted opportunity is replaced with the meeting-plan citation. Native owner access remains unrestricted.
GAP DELEGATE-001: This round proves the Zoom selected-record privacy portion of acceptance point 3, not all obligations of that point or Slack-related acceptance points 1 and 2. No DONE promotion is claimed. The independent privacy gate and fleet publication scan remain the fleet's work after candidate readiness.

No migration, archive generation, UI, homepage, deployment or other integration work was performed. No real provider account was needed for this privacy proof. Local checks used the supplied cloud toolchain (Node v24.19.0 / pnpm 10.12.4; the rer installer used its project Node 22.20.0); CI uses the repository's own pins. No UI browser proof is applicable.

## CI and custody

Exact-SHA Verify run 43475950990: https://github.com/just-every/run-orbit/actions/runs/43475950990
Initial discovery state: running. The single REST watcher observes the 300-second minimum polling cadence and ten-call budget. Final CI disposition is appended below before evidence publication.

Product custody and evidence publication are separate. Evidence is published only to refs/heads/evidence/sd-orbit-zoom-plan-privacy-1. The fleet owns the independent privacy gate, exact-main checks, publication scan and landing. The cloud builder does not self-land.

Final CI observation at 2026-11-13T18:31:17Z: in_progress/None on exact head dc6b9d24887cb26799a01d3f324aff79f5fbdf4e. REST calls: 10/10.

No observed red check or product blocker. Exact-SHA Verify remains in progress after the ten-call REST budget; independent privacy gate, publication scan and landing remain pending.

PUSHED branch=cloud/sd-orbit-zoom-plan-privacy-1 head=dc6b9d24887cb26799a01d3f324aff79f5fbdf4e
