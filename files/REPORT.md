# sd-orbit-c-f117 report

The planner-selected BASE-AGENT-001 acceptance 6 no-effect proof is already implemented in the prescribed base, `5843f5aee0ec8820f9502bb6171c96d4615922d8`. This round reran that proof successfully and pushed the unchanged head to `cloud/sd-orbit-c-f117`. No additional product edit, commit, assertion, policy default, status award or hold release was needed. No PR was opened: push is an existing Verify entry point.

BASE-AGENT-001 remains PARTIAL. Counts before and after are 36 DONE, 136 PARTIAL and 32 MISSING, 204 total. The test inventory remains 198 cases plus two qualifications, total 200. No existing assertion was removed, narrowed, skipped or moved behind a condition. The full clause is not requalified by this round.

## Plan and result

1. Read the supplied plan extract, current full target clause and Status Gap, DONE riders and rulings. Limit this continuation to the specified no-effect limb. The existing Gap names historical protocol proof omissions; it is preserved exactly because the builder does not own clause judgments.
2. Inspect the native transport and parser, the managed-owner registration, its agent-door helper and focused body-limit helper. The prescribed base already contains exactly the requested legal-whitespace, authenticated Request proof. Inspecting `src/base/modules/agent-door/wire.ts` and `transport.ts` found authentication before parsing, advertised-size refusal before tool dispatch, and counted streamed-byte refusal before dispatch. No demonstrated runtime defect justified changing those copies.
3. Run the existing public-door journey and typecheck. For both body modes, discover the actual limit through authenticated `/mcp`, submit an otherwise valid create with legal JSON whitespace to one byte over it, compare every persisted native table freshly, and submit the equivalent within-limit control with the same arguments and idempotency key under the already adopted autonomous policy. All assertions passed.
4. Run the standard generator write and check, restore both generated views whole from origin/main, regenerate the source lock last and check it. All commands passed; regeneration changed no tracked bytes. Fetch current main and merge it without rewriting published ancestry: already up to date. Check every candidate author, committer, full message and trailer, confirm no contract judgment diff, then use the required product push guard. Push succeeded on attempt 1.
5. Publish this actual packet through the evidence-only entry point. Leave publication scanning, judgment changes, base landing order, guarded landing and exact-main Run site with the fleet. The plan extract's target row is reported as PARTIAL to PARTIAL, point 6 revalidated from the existing base. No other plan row changes; every hold, queue note and prerequisite remains unchanged.

## Exact product and CI custody

- Product repository: `https://github.com/just-every/run-orbit`.
- Product branch: `cloud/sd-orbit-c-f117`.
- Full product SHA: `5843f5aee0ec8820f9502bb6171c96d4615922d8`.
- Prescribed base branch: `cloud/sd-orbit-c-f113`, same SHA. New product commits in this round: zero.
- Observed origin/main: `b305e58f673cfe0b9485e179d2678734e261c7a8`. Main is an ancestor and does not equal the product SHA. Base landing remains with the lane.
- Exact-SHA Verify `42225433900`: push event, completed, success, branch `cloud/sd-orbit-c-f113`. `https://github.com/just-every/run-orbit/actions/runs/42225433900`.
- New branch Verify `42233019206`: push event, in progress at last observation, same exact SHA, branch `cloud/sd-orbit-c-f117`. `https://github.com/just-every/run-orbit/actions/runs/42233019206`.
- REST calls used: two discovery calls, no dispatch, no rerun and no failure-log download. The existing green run is explicitly distinguished from the new branch run.
- The inspected Verify plan schedules `tests/core/managed-owner.test.ts` in `core-1`; the runtime helper is called unconditionally. `verify-registration.json` records that plan entry. No workflow was modified.
- Full history is present. Product worktree and index are clean. Contract, generated views, source runtime and all prior writers' commits are preserved.
- Exact-SHA publication scan: commit `5843f5aee0ec8820f9502bb6171c96d4615922d8`, complete=false, historyScanned=unestablished, findings=unestablished. Not run in cloud under the authorized cloud route; the fleet must obtain COMPLETE with zero findings before landing.
- Exact-main Run site and main equality: pending fleet landing; no landing or DONE is claimed.

## Runtime receipt

Command: `cloud_run timeout 1200 pnpm exec tsx --test tests/core/managed-owner.test.ts`.

Registration: `tests/core/managed-owner.test.ts:7`, `Managed owner claim verifies RER authority and creates the native owner/session exactly once`. The registration calls `agentDoorProof` at line 50. Its focused `agentDoorBodyLimitProof` call is in `tests/support/agent-door-proof.ts`, immediately after creating the populated company, contact and opportunity fixture. The helper is `tests/support/agent-door-body-limit.ts`.

Observed exit 0; one case passed; zero failed, cancelled, skipped or todo; duration 107194.523435 ms. The freshly signed Business bearer belongs to the native owner and carries the required scopes. The fixture uses real edition migrations and disposable D1. No provider call or live account is needed for this native transport point.

| Mode | Discovered maximum | Request bytes | Refusal | Fresh persisted-state comparison | Same-key control |
| --- | ---: | ---: | ---: | --- | --- |
| Explicit Content-Length | 1048576 | 1048577 | 413 | all 277 native tables identical | 1048576 bytes, 200, one opportunity |
| Stream without Content-Length | 1048576 | 1048577 | 413 | all 277 native tables identical | 1048576 bytes, 200, one opportunity |

The helper checks populated company, contact and opportunity tables before refusal; full rows of all native tables after refusal; valid JSON after whitespace padding; no Content-Length on the streamed request; the saved opportunity title and company; the exact primary-contact association; one linked `record.created` timeline entry; and no new pending approval or review item for the autonomous control. It does not substitute an invalid oversized argument for a valid business request.

## Acceptance sentences and retained boundaries

| Acceptance | Proof and lines | Result in this round | Verify |
| --- | --- | --- | --- |
| 1. Discovery returns versions, capabilities, serverInfo and instructions. | Existing copied `src/base/modules/agent-door/conformance/discovery.mjs:39-42`; focused native helper also reads discovered limits at lines 22-28. | Existing broader assertion retained; complete point not newly claimed. | Existing exact-SHA push Verify success; no new full-conformance qualification claim. |
| 2. Current no-handshake request and legacy initialize expose the same tools. | Existing copied conformance discovery, lines 24-31 and 75-80; native create uses the current protocol without handshake. | Existing broader assertion retained; complete point not newly claimed. | Same boundary. |
| 3. Unsupported version is refused. | Existing copied conformance discovery, lines 33-34 and 47-48. | Retained, outside the selected slice. | Same boundary. |
| 4. Repeated tool lists preserve order and cache fields. | Existing copied conformance discovery, lines 59-63. | Retained, outside the selected slice. | Same boundary. |
| 5. Foreign Origin is 403 and method mismatch is HeaderMismatch. | Existing copied conformance discovery, lines 43-46. | Retained, outside the selected slice. | Same boundary. |
| 6. Oversized body is 413 with no effect. | `tests/support/agent-door-body-limit.ts:22-91`, under the named managed-owner registration. Lines 61-71 compare all persisted rows after both authenticated refusals; lines 74-90 prove equivalent valid controls and actual record, association, timeline, approval and review outcomes. | PASS for both specified modes. This is the only acceptance point claimed here. | Exact-SHA push Verify 42225433900 success; new branch run 42233019206 in progress. |

The planner explicitly leaves complete role, class and provider qualification, BASE-AGENT-003 and BASE-AGENT-012 outside this slice. No inherited duty is promoted. TEAM-005's ct contract-cleanup prerequisite remains unchanged. There is no new policy decision or DEFAULT line.

## DONE riders

This is a PARTIAL claim. These rows do not award full-clause DONE.

| Rider | Result | Evidence or remaining boundary |
| --- | --- | --- |
| 1 | PASS for selected point; full clause unclaimed | Named public-door managed-owner journey reaches both refusal modes and the allowed controls, helper lines 61-90. Other acceptance points retain copied assertions without new full qualification. |
| 2 | PASS for selected point | Populated fixture and fresh complete-table comparisons, helper lines 67-90; equivalent request creates genuine linked state only within the limit. |
| 3 | PASS for exact-SHA loaded registration | Existing push Verify 42225433900 success on the exact unchanged SHA; inspected core-1 registration in `verify-registration.json`. New branch Verify is still running. |
| 4 | PASS | This round's local proof ran on the exact product SHA and no tracked byte changed afterward. |
| 5 | INSPECTED, no new inheritance claim | Target is itself a Base clause. No receiving clause or duty is rewritten or promoted. Broader named duties remain outside the slice. |
| 6 | Mechanical PASS; judgments preserved | Standard write and check exit 0; zero generated document changes; generated views restored whole from main; all counts, Status, Evidence, Gap and provenance retained. |
| 7 | PASS | No acceptance sentence, coverage map, ruling or contract source is changed. |
| 8 | PASS for selected refusal boundary | Authenticated owner token, two valid writes refused before any state changes, same-key supported controls complete. Complete role qualification is not claimed. |
| 9 | PASS, honest boundary | Only native MCP and D1 proof is claimed. No live-provider, legal or outside-system result is asserted. |
| 10 | PASS | No default or new authority choice is introduced; existing adopted autonomous policy is used unchanged. |
| 11 | PENDING LANDER | Main equality, exact-main Run site and complete full-history publication scan remain the fleet's obligations. No DONE or landing is claimed. |

## Pre-ready self-check and mechanical receipt

The selected no-effect behavior is asserted through the installed MCP door and actual native state. No assertion was changed. The suite cap is preserved. This round introduces no authority, erasure or replay behavior, UI, settings, text size or icon control; the existing broader protections are retained, without a new qualification claim. Browser screenshots are not applicable to this transport-only revalidation. No migration was added or edited.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0

Additional checks: typecheck exit 0; first-party check exit 0; inventory exit 0; clean worktree after regeneration; all candidate identities and messages checked before guarded push. The local VM used Node v24.19.0 and pnpm 10.12.4 under the supplied toolchain script; the exact-SHA green CI uses the repository's pinned Node configuration. No pin changed.

PROBE BASE-AGENT-001 6: authenticated /mcp orbit.records.create, valid legal-whitespace body of 1048577 bytes with Content-Length -> 413; 277 native tables unchanged; equivalent 1048576-byte request -> 200 and one linked opportunity.

PROBE BASE-AGENT-001 6: authenticated /mcp orbit.records.create, valid legal-whitespace body of 1048577 bytes streamed without Content-Length -> 413; 277 native tables unchanged; equivalent 1048576-byte request -> 200 and one linked opportunity.

CLAIM BASE-AGENT-001 PARTIAL points=6 tests=tests/core/managed-owner.test.ts#Managed owner claim verifies RER authority and creates the native owner/session exactly once

GAP BASE-AGENT-001: Broader role, class and provider qualification remains unclaimed; existing copied protocol assertions, BASE-AGENT-003, BASE-AGENT-012 and all current holds and prerequisites remain unchanged.
