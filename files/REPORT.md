# sd-orbit-c-f103 result

BASE-AGENT-003 remains PARTIAL. This round closes only the planner-selected point-3 slice: a genuine selected native opportunity grant receives identical complete public resource responses for an existing unselected company and a missing company. No clause-specific hold is released, and no DONE claim is made.

Product repository: just-every/run-orbit. Branch: cloud/sd-orbit-c-f103. Candidate SHA and exact-SHA CI disposition are recorded in RECEIPT.json and CI.json. No PR is required: Verify runs on branch push. Main is never pushed. The fleet retains publication scanning and landing.

## Work and proof

The full plan is in PLAN.md. The existing managed owner claim case in `tests/core/managed-owner.test.ts:50` continues to invoke `agentDoorProof`; `tests/support/agent-door-proof.ts:212` now supplies autonomous and held signed policies to the existing native credential helper and restores the prior sensitive-field policy afterward. No test registration is added or removed.

`tests/support/agent-door-local-proof.ts:15` obtains the native grant through registered callback consent and the PKCE token exchange, selecting only the opportunity. The original selected tool read and out-of-scope tool refusal assertions remain.

`tests/support/agent-door-local-proof.ts:29` calls the public MCP transport. The selected opportunity resource returns one content item with its actual record identity under both policies. Its decision and completed-read audit remain present; the held standard policy creates an open review tied to that audit. The existing unselected company is confirmed to exist, and the missing company is confirmed absent. Both company calls use JSON-RPC id 2 and must return the same HTTP status and byte-identical complete body. The complete permitted error shape is asserted, with resource_unavailable and no result content, review receipt or additional fields. Complete rows in companies, contacts, opportunities, timeline entries, handoff tasks, saved drafts and outbound messages remain unchanged. Existing scope refusals remain, and both the original tool read and the formerly readable resource are refused after native grant revocation.

PROBE BASE-AGENT-003 point3: POST /mcp with a genuine selected native grant, resources / read for its opportunity -> HTTP 200, one matching resource content, completed audit under autonomous policy and completed audit plus an open review under held policy.
PROBE BASE-AGENT-003 point3: POST /mcp with the same grant, existing unselected company and missing company, same JSON-RPC id -> identical HTTP 200 and complete error bodies, resource_unavailable, no result or partial content, unchanged native records and write effects, under both policies.
PROBE BASE-AGENT-003 point3: native grant revocation followed by the original tool read and selected resource read -> HTTP 401, no resource content, unchanged native records and write effects. Missing write and draft scopes continue to return HTTP 403.

The observed company error body is fully constrained by the passing runtime assertion:

```json
{"jsonrpc":"2.0","id":2,"error":{"code":-32602,"message":"Resource unavailable","data":{"code":"resource_unavailable"}}}
```

## Source inspection and mutation

Inspected the seed record adapter, native credential checks and refusal mapping, plus the shared resource adapter and MCP transport. Native target checks precede graph access; resource classification converts denied or missing reads to unavailable, and the transport exposes the same fixed error shape. No product defect was demonstrated, so product runtime source is unchanged. Only the two existing proof helpers, the target's Status Evidence and Gap, and the generated source lock change.

The one-off URI-leak mutation added the requested URI to unavailable-resource error data in the shared transport. It exited 1 at `tests/support/agent-door-local-proof.ts:59`, quoting: "autonomous: an existing unselected company and a missing company have identical complete public bodies". The mismatch showed the existing company URI versus the synthetic missing company URI. The full actual mutation log is retained in mutation.log. The mutation was restored before final validation and is absent from the candidate. No assertion was removed, narrowed or conditionalized by viewport. There was no CI repair round.

## Validation and limits

The focused native journey, typecheck, first-party check, contract generator write and check, source lock generation and check, and budget check pass locally. The focused journey was rerun after rebase and push on exact SHA 168a6e4a34d2945df728395d800920162a6032c5: one passed, zero failed, no skipped cases; focused.log records that SHA. Final validation uses Node 22.20.0 and pnpm 10.12.4, with the repository's existing rer pin. Test count stays 198 registered cases plus two qualifications, total 200. `ACCEPTANCE.md` and `docs/CLAIMS.md` are restored whole from main and are absent from the product diff. A stale generated-view check in branch Verify is expected under the cloud contract; the lander generates those views before landing. No migration was added; the migration ledger check is not applicable.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock followed by check exit=0; views=node src/base/contract-docs.mjs write followed by check exit=0, then generated views restored from origin/main; ledger=none exit=0.

This is a transport-proof change with no screen change. No browser proof or full local suite is run. No account, provider qualification or UI parity is claimed. Publication scan, main equality, and exact-main Run site remain the fleet lander's work; no cloud scan result is invented. On the initial main SHA d89ffcc89d4e87b5276f13298210de9eb21f4f35, Verify runs 42198798726 and 42196045128 and Run site 42198798685 were completed successfully.

## Exact-SHA Verify result

Push Verify 42208163143 completed with conclusion failure on 168a6e4a34d2945df728395d800920162a6032c5. Its root failure is the expected generated view check: `ACCEPTANCE.md: generated content differs; run contract-docs write.` Source job 127860054617 stopped at `pnpm exec node src/base/contract-docs.mjs check`; its authoritative artifact upload then had no generated source artifact. Aggregate job 127860272782 failed because source failed and runtime shards were skipped, with its verdict artifact consequently absent. The failed-job archive was read exactly once for each failed job. Both relevant logs are retained with workflow environment blocks omitted from the public packet. No runtime CI pass is claimed, and no real product test failed in CI. This is the generated-view-only READY exception expressly permitted by the brief. No repair, dispatch or rerun was performed. Six GitHub calls were used; polling respected the 300-second interval. There is no product blocker. The fleet must regenerate views and apply its exact-SHA landing gates.

## Clause and plan disposition

Counts before and after: 36 DONE, 136 PARTIAL, 32 MISSING; total 204. The target stays PARTIAL. Every parent Status ID is retained; the precommit receipt records row counts and the unchanged acceptance text. Plan change: mark the selected BASE-AGENT-003 native-grant company parity slice proven; no campaign reorder or additional target is taken.

Complete primary-type template coverage, two-role UI read parity, broader response parity, remaining write-link readback, file byte-budget refusal with no partial content, and full customer-text untrusted marking qualification remain omitted. Carried company resource-link proof is retained. Expanded roles retain TEAM-005's contract cleanup and new-main qualification prerequisite. BASE-AGENT-012's existing entry and ambiguous remainder, published-client and enterprise authorization receipts, source provenance, every existing queue line and note, all holds and release prerequisites remain unchanged.

## DONE riders and pre-READY review

No DONE judgment is requested. The following disposition applies to the selected slice; it does not award the entire clause.

| Rider | Result | Evidence or remaining condition |
| --- | --- | --- |
| 1 | Whole-clause FAIL; selected slice PASS locally | The public selected resource and both denied company outcomes run in the managed-owner journey. The clause's omitted outcomes stay in Gap. |
| 2 | PASS for selected slice | Real seeded selected and unselected records, native consent, successful read, denied reads, unchanged effects; URI-leak mutation fails at line 59. |
| 3 | Whole-clause recorded runtime proof unmet; permitted landing exception | Exact-SHA Verify 42208163143 failed only at generated-view freshness and its dependent steps; runtime shards skipped. Exact-SHA local journey passes. No whole-clause DONE claim. |
| 4 | PASS | focused.log records the exact pushed candidate SHA and a passing runtime journey; receipt also records candidate file hashes. |
| 5 | Unchanged | No inheritance or acceptance text changed. Expanded roles retain their existing TEAM-005 qualification. |
| 6 | PASS for generation, honest PARTIAL Gap | Generator write and check pass, views restored, all omitted outcomes named. Judged-from provenance is preserved; no new judgment claimed. |
| 7 | PASS | All acceptance text and every other Status row are unchanged. No ruling or rewrite is introduced. |
| 8 | PASS for selected authority boundary | Genuine selected grant reads its opportunity, cannot read unselected companies, cannot write or read drafts without scope, and stops after revocation; lines 26 to 72. |
| 9 | PASS for truthful limits | No provider, published-client, enterprise, file-budget or UI qualification claimed. |
| 10 | Not applicable | No new policy default; existing signed autonomous and held policies are exercised. |
| 11 | Pending guarded landing | Branch-only candidate; fleet owns scan, exact-SHA CI, guarded landing and Run site. |

Pre-READY self-check: the new security behavior has allowed and refused public-door assertions and a failing leak mutation; no existing assertion is removed or weakened. Credential revocation is exercised. Erasure and capture replay are unchanged and no new guarantee is claimed for them. No screens or settings controls change. Source lock is fresh. Exact-SHA Verify and publication custody are reported honestly in the receipt and final message. Added product text contains no email-shaped string; fixture records and write effects are preserved.

Product custody: pushed and remotely verified at 168a6e4a34d2945df728395d800920162a6032c5. Reports are published separately to refs/heads/evidence/sd-orbit-c-f103. The product clone is removed only after both transfers are verified.
