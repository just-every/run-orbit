# sd-orbit-c-f143 results

BASE-AGENT-005 remains PARTIAL. The planner-selected collaborator slice of acceptance 1 is already implemented and proved at the required starting commit. This continuation re-executed that proof, inspected the MCP adapter, and published the unchanged product commit under this round's branch. No additional product edit, commit, acceptance rewrite, Status edit, hold release or adapter correction was justified.

Repository: https://github.com/just-every/run-orbit
Branch: `cloud/sd-orbit-c-f143`
Candidate: `0cbac1c17119cf12b610c338173cdf8ebf94dbc8`
Parent and fetched main: `6d869cb48cbd6bcebb1566be460b49223e892bb6`
Product push: successful, remote ref confirmed in `remote-refs.txt`.
Verify: push run 42481575804 on this exact candidate and branch was in progress at final discovery. The earlier f139 push Verify 42479877087 on the same candidate was also in progress when inspected. Neither is claimed green. No dispatch, rerun, PR or main push was performed. Publication scan and Run site remain with the guarded fleet lander.

## Full executed plan

1. Configure the fleet identity, refresh the launcher, install the decrypted-bundle Git helper, preserve repository hooks, and obtain a fresh full-history clone of the declared repository. Fetch the f139 branch, create this round's branch at the required commit, and compare it with current main.
2. Map all five acceptance points, read the existing collaborator helper, managed-owner registration and agent-door orchestration, and inspect the record adapter, native access fence and Access routes. Determine whether the selected slice lacks a public-door assertion or demonstrates an adapter defect. Preserve every existing assertion, selected-resource comparison, scope fence and revocation proof.
3. Install pinned dependencies, run noninteractive setup, re-install fleet hooks, and run the touched managed-owner journey, typecheck and first-party checks. Generate and check contract documents, restore the view files from main, regenerate the source lock last, check it and recount the test budget.
4. Fetch main and rebase before the first push. No main drift or replay was necessary: the pinned candidate already directly follows current main. Inspect every candidate identity, trailer and full commit message. Push through the cloud guard, confirm the exact remote ref, discover its exact-SHA Verify once, and publish this report and actual receipts through the separate evidence ref. No empty commit was created.

## Acceptance proof map and remaining work

All runtime rows below use the existing registration in `tests/core/managed-owner.test.ts:115`, named “Managed owner claim verifies RER authority and creates the native owner/session exactly once”. Its line 158 invokes the agent-door proof. Verify includes it in `core-1` through `scripts/verification-plan.mjs`. The local run passed at the unchanged candidate: one test, zero failures, duration about 115 seconds. The new branch Verify event is push, conclusion pending; that is a pending receipt for every row below, not a green claim.

| Item | Result at candidate | Concrete evidence |
| --- | --- | --- |
| Acceptance 1, selected collaborator slice | PASS locally; full point remains PARTIAL | `tests/support/agent-door-collaborator-proof.ts:24` invites and signs in a real native guest; lines 44–48 create one populated company and one native read-only grant. `tests/support/agent-door-proof.ts:234` supplies both read and write tool scopes. Helper lines 75–91 compare native Records with authenticated MCP under autonomous and held policies: exact permitted fields, excluded private content, no editable fields, native write 403 and MCP resource_unavailable with unchanged native state. |
| Acceptance 1, record-grant revocation | PASS locally | Collaborator helper lines 93–107 revoke only the native record grant, retain its access audit and event, keep the native session and membership alive, and reuse the same MCP bearer under both policies. Native read returns 403, MCP read and update expose only resource_unavailable, with no record content, approval, completion receipt or native write effect. |
| Acceptance 1, every role and every tool | OMITTED under selected scope | This round covers one supported collaborator and company read and update. The all-tool and all-role matrix and expanded sales roles remain unclaimed. |
| Acceptance 2 | Existing selected-resource subset PASS locally; full point unclaimed | `tests/support/agent-door-local-proof.ts:16` obtains native consent through PKCE; lines 25–27 cover selected, unselected and absent records. Lines 39–63 compare complete existing-unselected and missing resource responses under both policies; lines 65–72 retain scope and whole-grant-revocation refusal. No claim of a complete one-folder or argument-widening matrix. |
| Acceptance 3 | PARTIAL, unchanged | Existing agent-door proof lines 122–137 refuse an outstanding bearer after a native email change, and later native teammate removal is refused. Sponsor role downgrade and suspension qualification remain omitted. |
| Acceptance 4 | UNPROVED, unchanged | Self-widening operations, sponsor-role widening, policy and Pause self-escalation, and own-grant narrowing remain omitted. |
| Acceptance 5 | UNPROVED, unchanged | The general injection matrix remains omitted. No record data was promoted into authority in this round. |
| Inherited current native role and access duty, BASE-ACCESS-004 | Selected boundary PASS locally; full inherited duty unclaimed | Both authenticated doors resolve current native authority. A bearer carrying both tool scopes still cannot write a read-only company, and revoking native access removes its read. `src/core/features/agent-door/records.ts`, `native-access.ts` and `src/core/features/access/routes.ts` were inspected; no demonstrated adapter defect required an edit. |

PROBE BASE-AGENT-005 1: authenticated Records company read and update compared with raw authenticated MCP orbit.records.read and orbit.records.update, both tool scopes, one read-only native company grant, autonomous and held policies -> identical two permitted fields; native write 403; MCP resource_unavailable; native grant deletion makes the same bearer lose read with no content or native write effect.

## DONE riders

No DONE claim is made. These rows record the exact scope and limits instead of releasing omitted work.

| Row | Result | Test, line or receipt |
| --- | --- | --- |
| 1 | FAIL for full clause; PASS selected slice | Proof map above. All-role and all-tool coverage and acceptance points 3–5 remain incomplete. |
| 2 | PASS selected dangerous path both ways | Collaborator helper lines 75–107 uses populated private data, permitted reads, actual refused writes, native revocation and unchanged native-state witnesses. |
| 3 | PENDING | Existing Verify core-1 invocation includes the test; exact candidate push Verify 42481575804 is in progress. |
| 4 | PASS local exact-SHA proof | `managed-owner.tap` and `receipts.json` bind the passing run to the unchanged candidate. No code or test changed afterward. |
| 5 | INSPECTED | BASE-AGENT-005 explicitly names BASE-ACCESS-004 in its requirement. No receiving clause or inheritance text changed. Broader inherited authority proof remains unclaimed. |
| 6 | PASS mechanical checks; judgments unchanged | Contract write and check exit 0. Generated views restored from main. Status, Gap, Evidence and all counts unchanged. |
| 7 | PASS | No acceptance, ruling, coverage-map or contract source edits. |
| 8 | PASS selected authority boundary | Native read allowed, write refused, native grant revoked, same bearer refused, no record effect, helper lines 75–107. |
| 9 | INSPECTED, no external provider claim | Mail transport is captured only for native authentication. No live provider proof, external role qualification or legal claim is made. |
| 10 | INSPECTED, no new default | Existing native read-only authority rules used without a policy change. No ct ASK or new default is needed. |
| 11 | PENDING guarded landing | Main remains the candidate's parent. Scan, green exact-SHA Verify, landing and Run site are not established by this cloud run. |

## Checks and pre-ready self-check

- Touched native journey: PASS, one registration. It also preserves selected-grant resource equality, scope refusal, whole-grant revocation, paused and blocked replay refusal and existing erasure safeguards. No existing assertion was removed, narrowed, skipped or moved behind a condition.
- Typecheck: PASS. First-party RER contract check: PASS.
- Contract generation write and check: PASS, zero generated document changes. Both views restored from main; no generated view is in the candidate diff.
- Source lock regenerated after all other work and checked: PASS, no changed bytes. No migration touched; ledger check not applicable.
- Test budget: 198 cases plus two qualification flows, total 200 before and after. No duplicate or pin test added or removed.
- Current main fetched just before product publication; rebase was a no-op. Candidate CONTRACT diff is empty and every parent Status row remains untouched.
- Complete candidate author, committer and trailers inspected, including all reachable candidate parents: one fleet-authored and fleet-committed product commit, no trailers. No new email-shaped string in the product diff. No OpenAI or Codex co-author survived.
- No screen or UI source changed, so no new screen proof or tooltip audit is applicable to this route-only proof continuation.
- No full publication scan was attempted in cloud. Exact-SHA scan receipt: commit=0cbac1c17119cf12b610c338173cdf8ebf94dbc8, complete=unestablished, historyScanned=unestablished, findings=unestablished. The fleet lander must establish these values before landing.
- Exact-SHA Verify is running; no green status, Run site status or main equality is claimed. This is the cloud handoff authorized by the brief, with the independent landing gates still required.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0; ledger=none exit=0.

## Custody, counts and unchanged holds

Before and after: 36 DONE, 136 PARTIAL, 32 MISSING, 204 clauses. BASE-AGENT-005: PARTIAL to PARTIAL. This continuation closes no additional full acceptance point beyond the already-proved collaborator slice. No new product commit was needed; the f139 product commit is retained unchanged. No plan rows changed. TEAM-001 remains held under the model trial. TEAM-005 remains blocked on its existing contract-cleanup prerequisite; no edit or claim was made for it. Every other hold, queue note and release prerequisite remains unchanged.

Product provenance, actual check outputs, the runtime probe, CI discovery, remote refs and the receipts are explicitly selected into this packet. Setup output, injected credentials, environment dumps, private gate material and symlinks are excluded. The evidence ref is report transport only; it is not acceptance, READY custody, scanning or landing.

CLAIM BASE-AGENT-005 PARTIAL points=1 tests=tests/core/managed-owner.test.ts#Managed owner claim verifies RER authority and creates the native owner/session exactly once
GAP BASE-AGENT-005: Full all-tool and all-role parity, sponsor downgrade and suspension, self-widening and own-grant narrowing, general injection qualification and expanded sales roles remain omitted; all holds remain unchanged.
