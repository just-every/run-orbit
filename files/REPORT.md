# sd-orbit-c-f95 — OUT-029 archive custody

Candidate `ecff8067c502168e10e10b124dc7d2bb330d9099` is pushed to `cloud/sd-orbit-c-f95`. No PR is required: push Verify is the existing branch entry point. Product custody is confirmed by product-remote.txt; evidence publication is separate from acceptance and landing.

OUT-029 remains PARTIAL. The selected work covers only acceptance point 4's deal-bound capability table through Records HTTP and the real local portability engine. The record-mail capability-table variant, full review, Settings, confirmation, unsubscribed and invalid-page qualification at 1440 and 390, and live-provider qualification remain unclaimed. No existing plan hold or release prerequisite is lifted.

Baseline: 30f7a864d0a643fa020ea3eaa3d5325a112b872e. Counts remain 36 DONE, 136 PARTIAL, 32 MISSING, 204 total. Test inventory remains 198 registrations and two qualifications, 200 total. No existing registration or assertion is removed, skipped, narrowed or hidden behind a viewport or environment branch. The existing erasure elapsed-time assertion uses performance.now so the fixed Date clock does not make it vacuous.

## Work and proof

The existing DATA-003 current sales capabilities round-trip without authority and erase across public reads registration in tests/core/capture-data.test.ts now loads tests/support/opt-out-archive.ts through the existing current sales data, HTTP archive and local archive helpers. Native Records creates an independent control recipient and deal. Native draft creation, explicit opt-out, exact saved-content review and managed-mail approval produce four capability rows, two accepted messages and two scheduled messages. The actual managed adapter and relay serializer remain in use; only relay HTTP is replaced. The existing captured bounce for Bob remains intact.

The journey compares all five fields of every restored capability: token, message identity, contact identity, origin and creation time. The Records re-export includes the populated capability table in the complete-content comparison. Both independent restored stores use the original sent capability at the configured origin after the clock advances from January 2030 to January 2040. Confirmation GET leaves the store digest unchanged; plain POST on the HTTP-restored store and RFC 8058 POST on the locally restored store suppress only the bound contact. Replay is idempotent, another contact and its capability remain intact, all restored message rows remain exactly as restored, cancelled schedules stay cancelled through repeated late dispatch, the relay receives no resend, and capability rows are unchanged. Source state digests before and after restored operations match.

The inspected production paths are opt-out-capability.ts, opt-out-public.ts, archive-schema.ts and portability-policy.mjs. Both archive policies already include the deal-bound capability table. The exercised behavior requires no production correction; no production implementation is changed. Existing managed single-recipient transport, stops, erasure and invalid-capability assertions in tests/core/outbound-boundaries.test.ts remain unchanged.

## Scope and remaining obligations

No acceptance sentence, status rank, count, homepage, logo, workflow, Base pin or migration changes. The only contract edit is the OUT-029 evidence and Gap accounting for the selected archive slice. No UI is touched and no omitted browser proof is claimed.

Connected mailbox, several-recipient, sequence and workflow execution retain OUT-013, OUT-019, SEQUENCE-001, SEQUENCE-003 and AUTO-001 prerequisites. These include Base relay recipient support, the current single-To relay limitation, owner consent, AUTO-001's held ambiguous remainder, TEAM-005's cleanup and qualification prerequisites, and R-6 live-provider qualification. All existing queue lines, notes and holds remain unchanged. The plan row to update is OUT-029's selected acceptance-point-4 slice only.

## DONE riders and pre-candidate review

There is no DONE claim or judge request. Row 1: the selected archive slice is tested; omitted browser and other qualification remains in the Gap. Row 2: populated source rows, real restore, successful anonymous opt-out, inert GET, idempotent replay and isolation cover the selected dangerous path. Row 3: candidate Verify status will be recorded below; no runtime success is inferred from a different SHA. Row 4: final relevant-source identity and local receipt will be recorded below. Row 5: OUT-029 retains its existing Base citations. Row 6: the selected journey passed before the evidence and Gap update; generated views are checked locally and restored for the lander. The historical judgment provenance is retained because there is no new DONE judgment. Row 7: acceptance sentences are unchanged. Row 8: source dispatch authority remains withdrawn on both restore paths and late dispatch is exercised. Row 9: no real-provider receipt or qualification is claimed. Row 10: no new policy default is introduced. Row 11: main equality, final publication scan and Run site remain the guarded fleet lander's duties and are not claimed here.

The existing journey continues to refuse source credentials and sessions, withdraw publication and delegation authority, erase the restored person, replay captured mail without resurrecting that person, and withdraw pre-erasure exports. No existing protection is weakened. The changed helper adds no literal email address or provider-shaped key. Public response privacy and all managed transport checks stay in the existing boundary journey. The complete publication scan is deferred to the fleet as authorized by the cloud route; this report does not claim COMPLETE or zero findings.

## Initial local iteration

The first extended run failed during setup: native draft creation returned 409, "This contact must not be contacted." Inspection showed the captured fixture's legitimate permanent bounce had already suppressed Bob. The correction creates an independent contact through Records and preserves Bob's stop; no product behavior or existing assertion was changed to bypass that refusal. This was a local fixture preparation correction, not a CI repair.

The safety save is recorded in save-head.txt and was pushed with [skip ci] after passing the archive journey, managed boundary journey, typecheck, first-party and mechanical checks. The landing candidate adds an explicit original-source capability comparison after each transfer. The final local archive run passes with the explicit source-row comparison; its test and helper bytes are unchanged in the committed candidate. Candidate push Verify is run 42197013913 on this exact SHA, event push; its final disposition is recorded below and in candidate-ci.json.

## Executed local results

- `pnpm exec tsx --test tests/core/capture-data.test.ts`: exit 0, one pass, no failure or skip; final duration 435394.950378 ms. This registration is loaded by routine Verify shard core-7 through the existing test list.
- `pnpm exec tsx --test tests/core/outbound-boundaries.test.ts`: exit 0, one pass, no failure or skip. Relevant code and that test have not changed since this run.
- `pnpm exec tsc --noEmit`: exit 0 after the final test-helper edit.
- `pnpm exec rer check --profile first-party`: exit 0 with the new evidence path and unchanged acceptance.
- Contract generator write and check: exit 0. Generated views restored from origin/main; neither view is in either product commit. The subsequent check of restored views returns 1 as expected and names ACCEPTANCE.md; the fleet lander regenerates it.
- Edition authoring lock and check: exit 0 after the last edit and the final main integration check. The lock includes the new helper. No migration changed; ledger check is not applicable.
- All 204 parent Status rows remain; both parent and staged contract contain 458 table rows. OUT-029 is the only edited Status row. Counts and acceptance sentences are unchanged. Test budget is 198 plus two qualifications.
- Both candidate commits have the fleet author and committer, with no trailers. No default branch was pushed and no published history was rewritten. Fresh main integration reported already up to date.

The baseline main SHA has successful push Verify runs, including 42184925051, and successful Run site 42182721336. These are baseline health receipts only; they are not candidate CI proof.

## Public-door probe receipts

PROBE OUT-029 4 Records HTTP: native managed review and approval, private export, import and re-export -> all five fields of every deal-bound capability retained; original anonymous GET in 2040 returns 200 and changes no state; original plain POST returns 200, suppresses only the bound contact and replays idempotently; other contact and original capability remain intact; source capability rows remain exact; restored cancelled schedules cannot dispatch and the relay receives zero resends.
PROBE OUT-029 4 local portability: the real createPortability and readArchive engine with Orbit policy -> exact capability rows retained; original anonymous GET and RFC 8058 POST in 2040 return 200 without expiry, rotation or resend; repeated POST has unchanged digest; other contact remains contactable; source capability rows remain exact; restored cancelled schedules stay cancelled through repeated late dispatch.
MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, generated views restored from origin/main and never committed; ledger=none exit=0.

Full execution plan: PLAN.md. Actual command receipts, source hashes, scope and identity checks: RECEIPT.json and its explicitly referenced packet files. No finished work is left solely in the clone.

## Exact candidate Verify and handoff

Push Verify 42197013913 completed with conclusion failure on ecff8067c502168e10e10b124dc7d2bb330d9099. The source job 127822852672 executes `node scripts/verification-shard.mjs source`; its first gate is `pnpm exec node src/base/contract-docs.mjs check`. The complete substantive failure is: `ACCEPTANCE.md: generated content differs; run contract-docs write.` Exit 1. The source job's later artifact upload fails because orbit-source.bundle and the source release receipts were never produced. The aggregate job 127823083103 fails its required-source-success condition and its unavailable-artifact retention; runtime shards are skipped. Job steps and the substantive source log are retained. Workflow environment sections are omitted from the public log packet.

This is the brief's permitted generated-view-only exception, including jobs that fail or skip because they need that step. No generated view is committed and no workflow, test or guard is weakened. No CI repair, dispatch or rerun was made. This is a branch handoff under that exception, not a full-green runtime Verify or DONE claim; the fleet must regenerate views and obtain the final integration runtime Verify before acceptance and landing. DONE rider 3 and rider 11 are therefore still pending for any broader DONE award.

The single aggregate-log request failed: `gh run view 42197013913 --repo just-every/run-orbit --job 127823083103 --log-failed`, exit 1, transport response `EOF`, HTTP status unknown because none was supplied. It was not retried. Source-log fetch succeeded once with `gh run view 42197013913 --repo just-every/run-orbit --job 127822852672 --log-failed`. Six explicit task GitHub API or log invocations were used: baseline discovery, exact-candidate discovery, the one status poll after five minutes, job inventory, and one log request per failed job. No other watcher was started.

Plan return: update only OUT-029's selected deal-bound acceptance-point-4 slice to proved. Status remains PARTIAL to PARTIAL; counts remain 36 DONE, 136 PARTIAL, 32 MISSING. Preserve every other plan row, queue entry, note, hold, release prerequisite and provider boundary. There is no blocker to handing over this scoped product candidate; the explicitly omitted work remains unclaimed.
