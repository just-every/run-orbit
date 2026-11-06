# sd-orbit-c-f112 report

CLAIM BASE-AGENT-011 PARTIAL points=1 tests=tests/core/managed-owner.test.ts#Managed owner claim verifies RER authority and creates the native owner/session exactly once

GAP BASE-AGENT-011: Daily recipient caps, spend reservations and exhaustion and no-cap behavior, usage reconciliation, Pause and Pause-all timing, and agent-resume refusal remain omitted under the brief; no hold is released.

Product branch: `cloud/sd-orbit-c-f112`
Product SHA: `881c08da6a64512b18389b32ed83790d59e02f1f`
Base main: `b305e58f673cfe0b9485e179d2678734e261c7a8`
Verify: 42225041552 (push; in_progress, conclusion=None)
https://github.com/just-every/run-orbit/actions/runs/42225041552
PR: none; the existing push entry point started Verify.
Counts: 36 DONE, 136 PARTIAL, 32 MISSING, 204 total before and after.
Clause status: BASE-AGENT-011 PARTIAL to PARTIAL. Plan target row: acceptance 1 proved locally; remaining holds, notes, queue entries and prerequisites unchanged. TEAM-005 retains its recorded cleanup and new-main prerequisite. No other plan row is changed.

## Plan and completed work

1. Read the inline campaign, selected point, conservative-default rules, CT rulings and all eleven DONE-RIDERS. Read the repository guidance, target requirement and all seven acceptance points, status Gap and existing managed-owner registration and helper. Map acceptance 1 to the missing raw transport assertion; retain the shipped Pause and blocked-class proofs. The selected brief explicitly omits the remaining points, so no other hold is released and DONE is not claimed.
2. Inspect native admission, MCP transport and Orbit adapter. Native admission atomically increments the established agent's minute counter, and the transport already returns a raw 429 with a positive seconds delay. Demonstrate behavior before changing runtime code; the new public-door journey passes, so no runtime defect or runtime edit is justified.
3. Extend the existing managed-owner registration to pass its test context through `agentDoorProof`. Add the focused `tests/support/agent-door-capacity-proof.ts`, called at `tests/support/agent-door-proof.ts:219`, using the same migrated D1, Orbit door, actual tool registry, signer, Business trust and existing native owner sponsor. No additional test registration is introduced.
4. Under both existing all-autonomous and held policies, sign and adopt an actual policy envelope, send a raw authenticated discovery request, read the advertised capacity, and establish an agent through an admitted tools-list request. Prepare only that established admission row near its discovered limit, retaining sponsor and window. Admit a final-slot native company creation and check its policy disposition and saved row. Submit another native create and inspect the raw HTTP 429, error code, absence of a tool result and positive integer Retry-After. Compare populated native records, graph state, history, audit, calls, approvals and reviews before and after refusal. Attempt the same call just before the returned delay expires, then advance the controlled clock to the retry time and require one successful native effect. No retrying conformance wrapper or fixed capacity threshold is used.
5. Run the touched journey and typecheck, first-party check, contract generator write and check, and test-budget inventory. Stage the helper before generating the source lock so it is covered. Restore generated views from main. Commit with fleet identity and the installed cleanup hooks, rebase onto the fetched main, check the fresh source lock and complete candidate identities and trailers, then push only the named branch using the cloud push guard. Push succeeded on its first attempt. Rerun the touched journey on the committed exact SHA. Publish this report and actual receipts through the separate report-only evidence ref.

## Acceptance proof and frozen scope rubric

The one selected point is split below into observable checks. These are the full rubric for this round; all are within acceptance 1.

| Item | Outcome and public door | Evidence | Result |
| --- | --- | --- | --- |
| R1 | Real authenticated Orbit MCP is admitted under each policy; discovery supplies the limit | `tests/support/agent-door-capacity-proof.ts:20` through line 49; `tests/core/managed-owner.test.ts:7` existing registration | PASS local exact SHA; Verify 42225041552 in_progress, conclusion=None |
| R2 | Last admitted slot creates the company with the current autonomous or review disposition | helper lines 50 to 59 | PASS local exact SHA |
| R3 | Over-cap raw request is HTTP 429 with rate_limited and a usable positive Retry-After, and makes no native write | helper lines 60 to 72; populated seven-table witness lines 18 to 19 with admitted positive control | PASS local exact SHA |
| R4 | Early retry stays refused; returned delay restores capacity and the same previously refused input creates exactly one company | helper lines 73 to 84 | PASS local exact SHA |

| Acceptance sentence | Evidence and disposition |
| --- | --- |
| 1. Rate overrun returns 429 with Retry-After | Existing managed-owner registration calls focused helper; R1 to R4 cover autonomous and held policies. Local exact SHA PASS; push Verify 42225041552 in_progress, conclusion=None; loaded by existing core-1 glob. |
| 2. Per-day outside-recipient cap | OMITTED and unclaimed per selected brief; no cap proof was added. |
| 3. Exhausted spend cap, no partial effect and displayed spend | OMITTED and unclaimed; no provider-spend proof was added. |
| 4. No-cap spending, displayed usage and zero-spend calls | OMITTED and unclaimed. |
| 5. Calls, decisions, money and spend usage per agent | OMITTED and unclaimed. |
| 6. Pause and Pause all timing and resume | Existing Pause replay refusal and blocked-class assertions at `tests/support/agent-door-proof.ts:140` retained and run; full timing and Pause-all sentence remains unclaimed. |
| 7. Agent cannot resume | OMITTED and unclaimed. |

The clause itself is a Base clause, so it introduces no new receiving-clause inheritance. Existing native authority, current sponsor, revoked local credential, idempotency replay and blocked-class proofs stay in the same registration. The public protocol literals and the existing test title remain their actual names; no new unrelated repository reference, provider-shaped secret or email literal was added.

## Actual probes

PROBE BASE-AGENT-011 1: raw authenticated MCP under autonomous; discovered capacity=600; admitted native create; overrun=429 Retry-After=50; early retry=429; clock recovery=200 with one native create
PROBE BASE-AGENT-011 1: raw authenticated MCP under held; discovered capacity=600; admitted native create; overrun=429 Retry-After=60; early retry=429; clock recovery=200 with one native create

## DONE-RIDERS on this candidate

| Row | Result | Evidence or remaining limit |
| --- | --- | --- |
| 1 | FAIL for full DONE; selected acceptance 1 PASS locally | Seven acceptance sentences scored above. Points 2 to 7 remain unclaimed, so full clause stays PARTIAL. |
| 2 | PASS for selected point | Real company writes complete before and after capacity refusal; populated seven-table witness changes on allowed control and stays equal on each refusal, helper lines 51 to 82. |
| 3 | PENDING | Exact-SHA push Verify 42225041552, in_progress, conclusion=None; existing core-1 loads the registration with no new environment gate. |
| 4 | PASS | Actual committed-candidate journey in `managed-owner.log`; no later source or test edit. |
| 5 | NOT APPLICABLE | This Base clause is the target; no receiving clause or inheritance text changed. |
| 6 | PASS mechanical; judgment remains with lander | Generator write reports zero changed documents; check passes. All Status, Gap, Evidence, provenance and count bytes are unchanged from main. |
| 7 | PASS | No acceptance, clause shape, ruling or coverage text changed. |
| 8 | PASS for selected admission refusal | Valid signed token, current native owner sponsor, real policies, allowed write control and refused native write under both policies; no new authority code. Broader omitted authority proof is unclaimed. |
| 9 | PASS boundary honesty | No live-provider receipt, spend, legal or external account claim is made. |
| 10 | PASS | No new policy default or decision; existing autonomous and held policies are used as supplied. |
| 11 | PENDING GUARDED LANDER | Product remains branch-only. Main equals base b305e58f673cfe0b9485e179d2678734e261c7a8, not candidate. Exact-candidate Run site and full-history publication scan are not performed in this cloud run. |

## Pre-ready checks

1. The selected user-visible outcome has direct assertions of actual transport status, response header and native effect. A removed limiter, missing Retry-After, premature reopening or failed recovery fails this journey. Exact-SHA Verify 42225041552 is in_progress, conclusion=None; no full-clause DONE claim.
2. No existing assertion was removed, narrowed, skipped or placed behind a width or environment condition. The registration name is unchanged. The suite remains 198 registrations plus two qualification flows, total 200, before and after.
3. Existing native current-sponsor, revoked credential, replay, Pause and blocked-class protections remain in the touched registration and run with it. Runtime authority, erasure and replay code is unchanged. Broader erased-person behavior is not newly claimed.
4. No screen, component, icon-only control or UI behavior changed. Browser screenshots and viewport qualification are not applicable to this transport-only test change.
5. Source lock fresh; generated views current, restored and uncommitted. No migration changed, so no migration ledger check is needed. Publication scan is NOT RUN in cloud, not COMPLETE or zero findings; the guarded Mac lander must supply it, main equality and exact-main Run site. New helper has zero email-shaped literals and zero provider-shaped key strings. Existing unrelated fixtures are untouched.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0

## Custody and limits

Product commit `881c08da6a64512b18389b32ed83790d59e02f1f` is pushed and verified at `refs/heads/cloud/sd-orbit-c-f112`. All candidate commits, including side parents, were inspected with the required origin-main range: fleet author and committer, no trailers. There is one product commit and no side parent, published rewrite, force push, main push, generated-view commit or evidence file on the product branch. The source lock includes the newly tracked helper.

Main Verify 42217956400 and Run site 42217956677 are green on base main `b305e58f673cfe0b9485e179d2678734e261c7a8`; they are not candidate proof. Candidate Verify 42225041552 is in_progress, conclusion=None. No rerun, dispatch or PR was issued. Publication scan result: commit=881c08da6a64512b18389b32ed83790d59e02f1f, complete=unestablished, historyScanned=unestablished, findings=unestablished (cloud delegation). Main equality=false; candidate Run site=not yet applicable. These are landing custody limits, not new product blockers. No runtime blocker was found. Remaining clause scope and all existing holds stay named above.

An earlier committed invocation emitted a complete passing TAP result but its command session reported exit 1, with no assertion error. The identical command was repeated unchanged with an explicit exit receipt and completed with exit 0; no source, test assertion or guard was repaired. Both actual logs and the explicit exit receipt are retained.

Full actual command outcomes, provenance and log hashes are in `RECEIPTS.json`. The selected packet includes the report, structured receipt, candidate touched-test log, typecheck log and contract check log. It contains no credentials, environment dump, private gate material or symlinks. The evidence ref transports reports only and signals neither product acceptance nor landing.
