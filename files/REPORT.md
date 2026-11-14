# Orbit: one form enquiry, one notification

Task: main-orbit-form-notify-once-1
Repository: just-every/run-orbit
Branch: cloud/main-orbit-form-notify-once-1
Baseline: a35d331920a4bace2548bbd0efaf9344ffcd32a6

## Plan and implementation

The full execution plan is in PLAN.md. The work follows one reported stranger finding: a consented public form enquiry that creates a NOW deal and routes its contact produced two notices. Reproduce it through anonymous public form HTTP and the routed operator's authenticated inbox; extend the existing form journey, preserve routing/consent/deal semantics, run touched checks, integrate main, lock source, commit and push the exact named branch, then observe exact-SHA Verify and publish this separate evidence packet.

The regression reproduced an unread delta of two rather than one on the actual baseline. The generic opportunity NOW trigger and explicit submission notice represented the same accepted enquiry twice. The native intake now sets a batch-local form-submission marker; migration 0092 suppresses only the generic NOW notice within that batch. The marker, captured records and submission notice commit or roll back together. Existing notification rows are never rewritten. The submission notice keeps its existing contact destination and deal identity; the inbox shows the contact name and adds a working Open deal link in the same row. Generated deployment metadata includes the additive migration.

The extended mapped journey counts every new inbox row instead of filtering only form.submitted. It checks unread deltas, recipient isolation, alternating owners, persistence across restart, existing-owner intake, replay, fixed-owner contact-only intake, read state, explicit unassignment and an ordinary non-form NOW event after the form transaction. The browser journey asserts the single row and both destinations at 1440; the changed inbox is captured once at 1440 and 390. Existing native notification tests cover assigned/unassigned responsibility, signed replies, delivery failures and durable recipient read state.

## Before and after

- Accepted routed enquiry: two notices and unread +2 before; one notice and unread +1 after.
- Replay: zero additional notices, unchanged inbox and read state.
- Fixed-owner form without a deal: one contact notice.
- Unassigned form with no chosen recipient: no broadcast NOW duplicate.
- Other NOW events: one notice as before; previous rows stay intact.
- Seed tests: 198 registered cases + 2 qualifications = 200 before and after; no new registration.
- Clause totals remain 42 done / 130 partial / 32 missing / 204 total. FORM-004 stays partial. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are unchanged; no DONE claim is made.

## Validation and limits

The public-door reproduction failed exactly on 2 != 1. Typecheck, application build, source check, boundary check, seed manifest check, contract document check and generated deployment metadata check passed. The existing three NOTIFY regression cases passed. The changed browser journey passed on system Chromium with --no-sandbox: real builder UI, hosted anonymous submission, framed and direct allowlisted HTTPS capture, recipient inbox, contact document and deal document. Both changed-screen axe reports contain zero violations and no horizontal overflow.

All four cases in forms-native.test.ts passed, including the extended mapped journey, atomic refusal/rollback/concurrent replay, abuse release and existing-contact intake. The local file completed in about eleven minutes. Its terminal product identity and exact-head CI result are recorded in the final receipt. The local form run emitted long-timeout warnings during archive operations and completed successfully. The supplied toolchain retained the available Node 24.19.0 for direct pnpm checks; rer commands selected the project Node 22.20.0. CI independently uses the repository pin. No unrelated full suite was run locally. No deployment, PR or landing is performed by this cloud run. The source repository has a push Verify entry point; branch custody is the requested handoff. The fleet performs its publication scan and landing checks on its own machine. External form email/push channels, team audiences and lead views remain the contract's existing gaps.

## Custody

Product commit, exact-SHA Verify run and report-only evidence ref are separate. The final actual receipt and CI receipt in this packet record those results. Only product, additive migration, generated deployment metadata, existing test extensions and the source lock belong on the product branch. This packet contains only synthetic public-door evidence, selected screenshots and non-secret check results; no settings files, session material, environment dumps or private gate material are selected.

DEFAULT FORM-004: Keep the existing explicit full-operator routing policy. An unassigned form selects no full-operator notification recipient; no team audience or external delivery behavior is introduced.
GAP FORM-004: Team audiences, external channels and lead/custom-object views remain outside this repair.

Product head: efded904242fef01fbfaf2c24ff20966456c98ed
Integrated main: a35d331920a4bace2548bbd0efaf9344ffcd32a6; fetch and rebase were a no-op.
Push: first guarded attempt succeeded; one product commit, no skip-CI marker and a clean checkout.
Exact-head Verify: 43559901476, https://github.com/just-every/run-orbit/actions/runs/43559901476 (in progress at packet preparation).
PR: none; this task hands the cloud branch to the fleet lander.

CLAIM FORM-004 PARTIAL points=none tests=newtests/t096/forms-native.test.ts#FORM-001 mapped cross-origin capture with picklist and declared hidden fields, reviewed proposals and durable owner rotation retain fixed publication, DNC and consent

Claim scope: the repaired one-notice obligation is proven; the compound FORM-004 points include additional routing/audience obligations, so no complete acceptance point is promoted by this report. The product change is ready for its independent gates once exact-head Verify completes successfully.
