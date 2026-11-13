# sd-orbit-zoom-plan-privacy-2

Repository: just-every/run-orbit
Product branch: cloud/sd-orbit-zoom-plan-privacy-2
Base inspected: dc6b9d24887cb26799a01d3f324aff79f5fbdf4e

## Plan and scope

1. Configure fleet identity, launcher credentials, commit hooks and pinned toolchain; clone the declared repository shallow with blob filtering and branch from current main.
2. Extend the existing delegated brief/handoff journey, without registering another test. Retitle its existing Zoom fixture to "Synthetic review with Ben Hale". Obtain grants through native consent and PKCE. Check complete response JSON for the contact-only and signal-only plan, brief and records doors, retain selected-contact/deal assertions, and require the owner to retain the exact real title.
3. Run that extension against the unchanged product at dc6b9d24 and retain the actual failure. Introduce a shared title projector that compares case-insensitively against the full invitation/attendance and contact-match set before filtering. Use names, participant display names, exact email addresses, email local parts and contact/operator IDs; include ambiguous matches and retained aliases. Substitute a dated, nonempty meeting label when necessary.
4. Apply the projection to plan subjects, signal-derived interaction and promise titles, all delegated brief line groups, signal record names before search filtering, and evidence title fields including embedded source JSON. Inspect recap/citation/summary construction for further title echoes.
5. Keep native full-scope reads and stored titles intact. Preserve the existing selected attendance, host and completion-link protections. Retain optional Zoom attendance display names solely so title projection can compare against them; matching still uses exact emails, never names.
6. Fetch/rebase while unpublished, regenerate the source lock last, run the touched public-door journey and typecheck, then make one candidate commit and push the named branch. Observe exact-SHA Verify through REST, publish reports on the separate evidence ref, and leave landing/publication scans to the fleet.

The requested records/search and evidence coverage requires a small routing change in src/core/features/delegation/routes.ts beyond the named lease files. Its only changes connect those existing handlers to title projection helpers in the leased brief-routes.ts. No new routes or authority are introduced.

## Observed results

The before run used unchanged product source at dc6b9d24887cb26799a01d3f324aff79f5fbdf4e plus the extended existing fixture/assertions. It failed because the complete contact-only plan JSON included "Ben Hale" in the meeting title. Actual output is in before-test.log (one test, zero passed, one failed).

The first after run passed the complete original journey with the initial new assertions (after-test.log). Final assertions additionally exercise hidden-name records search and /evidence's top-level and embedded source title. The final run and its result are retained separately in final-test.log and RECEIPT.json.

The original attendance and completion-link assertions remain in place. They require Ana's identity and attendance timestamps, omit Ben/Cy/unselected deal and note data, keep hostId null under delegation, and keep the completion citation on the authorized plan. The owner still sees all recorded attendance, the real title, the linked private deal, saved plan and native completion link. A grant covering both known attendees retains the original title. An unrelated deal grant still gets 404. Consent, PKCE, scope refusal, write boundary, cited handoff and revocation assertions remain intact.

Surface inspection: /brief returns signal titles in account, selectedSignals, held and unresolved lines; /plan returns meeting.subject and may echo signal subjects in interactions/promises; /records names signals and searches their names; /evidence returns a title and serialized source, including payload_json.subject. Those title paths now share the projector. Zoom recap summaries report completion time and filtered attendance count, and citation labels are fixed descriptions, so neither echoes the meeting title. There is no delegated AI account-summary endpoint in the inspected delegation routes.

Local verification is limited to the touched public-door test, typecheck, inventory and required lock checks. No UI changes or browser proof are applicable. The supplied cloud shim used Node 24.19.0 and pnpm 10.12.4 for these direct checks; rer install/setup selected its Node 22.20.0 workflow, and CI uses the repository Node 22.20.0 pin. The complete suite remains the exact-SHA CI wall. Public publication scanning runs on the fleet's landing machine and is not claimed here.

## Counts and claims

Registered tests: 198 before, 198 after. Qualification flows: 2 before, 2 after. Total: 200 before, 200 after. The existing brief-handoff test remains one registration.
Contract status: DELEGATE-001 remains PARTIAL; no Status, Gap, Evidence, generated acceptance, schema, migration or archive-generation changes. No homepage or deployment changes.

CLAIM DELEGATE-001 PARTIAL points=none tests=tests/delegation/brief-handoff.test.ts#BRIEF-005 OUT-001 SIGNAL-009 an application reads the brief and a meeting plan with crm.evidence.read and proposes cited handoffs with crm.handoff.write; consent, scope, revocation and the human send boundary hold
DEFAULT DELEGATE-001: Under selected-record authority, redact a title containing an unselected attendee's known identity to a dated meeting label; full-scope owner reads preserve the source title.
GAP DELEGATE-001: This round proves the delegated Zoom title privacy repair and retains the existing journey assertions. It does not establish every DELEGATE-001 acceptance point, restore/Slack qualification, live Zoom entitlement, or independent gate acceptance. Case-insensitive email/local-part/id and optional provider display-name matching are implemented; this focused fixture specifically proves the unselected contact-name leak and owner/authorized-title preservation.

Final product SHA, push custody and exact-SHA CI outcome are recorded in RECEIPT.json. Independent privacy gate and fleet landing remain pending.

## Final builder return

Product head: 2a0a929f7ba144520bfb301e7a21effa8f1a65f1
Product branch: cloud/sd-orbit-zoom-plan-privacy-2
PR: none created; repository instructions do not require one for this branch handoff.
Product push: succeeded on the first guarded attempt. Candidate author and committer are Run Edit Run fleet <fleet@runeditrun.com>; no trailers. Product worktree is clean.

Final local public-door result: one test passed, zero failures, cancellations, skips or todos (final-test.log). Typecheck and source-lock generation/check exited 0. Test budget remains 198 registrations plus two qualification flows, total 200. No clause status changed; DELEGATE-001 remains PARTIAL.

Exact-SHA Verify: run 43492722717, https://github.com/just-every/run-orbit/actions/runs/43492722717. Discovery and seven subsequent observations all name the exact candidate head. Latest observation: in_progress, conclusion null. Eight calls used from the ten-call budget over about 35 minutes. With the budget nearly spent, polling stopped with a small diagnostic allowance retained. No workflow rerun was requested. There is no observed CI success or failure to claim. Terminal product custody is PUSHED, not READY; the fleet must observe successful exact-SHA Verify and run the independent privacy gate before landing.

No local product blocker was encountered. CI completion, independent gate acceptance and fleet publication scanning remain pending. Evidence publication is separate report transport and does not signal acceptance, READY or landing.
