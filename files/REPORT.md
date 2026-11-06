# sd-orbit-c-f99 · OPP-001 won-close reason persistence

OPP-001 remains PARTIAL → PARTIAL. The selected point is covered by a fresh authenticated GET after the existing won-close POST. Counts remain 36 DONE, 136 PARTIAL and 32 MISSING, 204 total. No hold or release prerequisite is changed, and no DONE promotion is claimed.

## Work and plan result

The fleet launcher was refreshed, and the authorized credential helper, cloud commit hook and push guard were installed. The declared repository was cloned with full history. The only unfinished predecessor commit, 4ec6648812344d00172e50e7255346dccb84f835, was replayed onto fresh main; the source lock conflict was resolved by regeneration after the contract source merged cleanly. Every other writer's main commit is retained.

The existing test named “OUT-007 OUT-009 SEQUENCE-002 stage move, close and genuine reply end scheduled follow-up atomically; automatic reply and open report do not” now calls the authenticated Records GET immediately after closing the deal as won with reason `Signed`, and requires `record.close_reason` to equal `Signed`. The assertion reads persisted data through the native route, not the POST response. The route validates and passes the reason to the repository; the repository binds it into the opportunity update, and detail reads return the saved record. The unmodified route and repository pass that readback, so no implementation defect was demonstrated and no product source correction was made.

The existing scheduled-send cancellation, explicit reopen and signed reply replay, late dispatch, first exit reason, stop-history and message outcome assertions remain intact. No existing assertion was removed, narrowed, skipped or moved behind a condition. No test registration was added; the suite stays at 198 cases plus two qualification flows, 200 total. No UI, migration, workflow, dependency, homepage or logo change was made. Browser screenshots are not required for this native API assertion addition.

The contract change names the existing journey as won-close readback evidence and retains the remaining lifecycle gaps. Acceptance text and all 204 Status clause rows remain unchanged in identity and rank; the 458 table rows remain present. Generated ACCEPTANCE.md and docs/CLAIMS.md were written and checked locally, then restored whole from main. Only CONTRACT.md, the existing test file and the regenerated sources.lock.json belong to the product candidate.

## Acceptance mapping and remaining work

The sole OPP-001 acceptance sentence requires closing as won and lost with reasons, ingesting later evidence, explicitly reopening, and inspecting history and queue membership at every step. This round closes only the selected won-close reason persistence deficit. The existing Gap still names lost-close reason, closing operator and time, later evidence never silently reopening, correct queue membership on reopen, stage and owner preservation, and every lifecycle transition in history. Those omitted outcomes are not claimed proven. Reopening is never forced into NOW; existing queue rules remain authoritative.

TEAM-005 remains held on ct's contract cleanup landing and the resulting new main, exactly as the brief directs. No existing queue line, note, hold, policy or prerequisite is released. The plan row for this campaign should record only the selected won-close persistence point as covered; no other plan row changes. No new ct judgment is requested because no DONE award is sought.

## Public-door probe

PROBE OPP-001 won-close reason: authenticated POST /api/v1/records/opportunity/:id/lifecycle with state won and reason Signed, immediately followed by fresh authenticated GET /api/v1/records/opportunity/:id -> HTTP 200 and record.close_reason equals Signed. The same native journey retains cancelled scheduled follow-up, no revival after reopen or replay, first exit reasons and the final won outcome.

## Verification and custody

The selected journey passed on pinned Node 22.20.0. Typecheck and first-party checks passed. Local contract write and check, source lock generation and freshness check passed. Main at d89ffcc89d4e87b5276f13298210de9eb21f4f35 has successful Verify 42196045128 and Run site 42198798685; another Verify 42198798726 was in progress when read. No main failure or predecessor failure was repaired in this round.

The full touched test file passed all 16 tests with zero failures, skips or cancellations in 665.5 seconds. It ran on the initial VM Node 24.19.0; the selected journey and the final typecheck were also exercised on the repository pin, Node 22.20.0. Sensitivity result, commit, branch push and exact-head CI discovery are recorded below and in the actual receipt files. The cloud builder does not claim a COMPLETE publication scan or main equality; the guarded fleet lander owns exact-head CI, full-history publication scanning, landing and final Run site.

## Sensitivity and self-check

An intentional temporary mutation replaced the persisted closing reason with NULL. The selected Node 22 journey failed with exit 1 exactly at tests/core/signals-outreach.test.ts:311: “The won-close reason survives a fresh authenticated record read”, null !== 'Signed'. The repository source was restored byte for byte; this was a negative sensitivity check, not an actual Verify failure or a repair round.

The only changed behavior proof runs through the existing native authenticated Records door against migrated D1 data. Existing stop, replay and no-resend assertions remain. No authority, erasure, provider or policy behavior is introduced; no broader qualification is claimed. Added text contains no email-shaped values, and prose slashes are confined to actual source paths or API routes. Full-history publication scanning, exact-final Verify and guarded landing remain fleet gates. The complete rider-by-rider partial disposition is in DONE-RIDERS.md.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock and check exit=0; views=node src/base/contract-docs.mjs write and check exit=0, then restored from main; ledger=none exit=0, no migration change.

## Final product custody

Branch: cloud/sd-orbit-c-f99. Full head: fe8fa714c318954ec7feba73dad3a5abc8be2bbb. Base: d89ffcc89d4e87b5276f13298210de9eb21f4f35. Push succeeded on attempt 1, and remote ref lookup confirms that exact head. No PR was created because push Verify is the existing branch entry point. Exact-head push Verify 42202394752 is in_progress, conclusion pending, at https://github.com/just-every/run-orbit/actions/runs/42202394752. No CI dispatch or rerun was made. Two GitHub REST discovery calls were used, one for main and one for the candidate; no run was polled again.

The final restored-source Node 22 journey passed (one test, no failures or skips). Final typecheck, first-party check, generator write and check, and source lock write and check passed. The local source and test hashes match the final committed tree. Parent rows are retained in the only candidate commit. Main drift was checked with fetch and rebase before publication; the branch was already up to date with the fetched main. The worktree is clean and generated views are absent from the product diff.

Counts: 36 DONE → 36 DONE, 136 PARTIAL → 136 PARTIAL, 32 MISSING → 32 MISSING. OPP-001 stays PARTIAL; no other clause, campaign hold or release prerequisite changes. No implementation blocker was encountered for the selected point. Broader lifecycle gaps and TEAM-005's cleanup dependency remain as stated above.

Full plan: PLAN.md. Actual command results, negative sensitivity proof, exact-head CI discovery and product push custody are in RECEIPT.json and the selected companion logs. Evidence is published only to evidence/sd-orbit-c-f99, separately from product custody. The fully pushed clone is removed only after evidence transfer completes.
