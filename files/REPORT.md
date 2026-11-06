# sd-orbit-c-f78 — FORM-002 completed in the candidate

FORM-002 changes PARTIAL to DONE at `c51ba2c96f2dc947e29e9e349447b8b4a2ab43b1` on `cloud/sd-orbit-c-f78`. Candidate counts change from 36 DONE, 136 PARTIAL and 32 MISSING to 37 DONE, 135 PARTIAL and 32 MISSING, 204 total. This is a pushed candidate, not a main landing or an independent ct verdict.

The selected withdrawal proof was already present in pinned base `2627702296761a80e95ec2f8b6fc824915ec75c3`; this continuation retained it and completed the native remainder. The first save is `2673f35e4d75d0530ff6513dffd1495b4745315c`. Updated main was fetched and merged before the final push; main was already an ancestor, so no merge commit or history rewrite was needed. The requested predecessor remains in this branch's history. No PR is needed because push starts Verify.

## Product correction

The new exact-consent assertion demonstrated that manual release stamped consent at the release time instead of retaining when the visitor originally submitted it. Reproduction exited 1: actual `2026-11-06T05:53:18.214Z`, expected `2026-11-06T05:53:17.664Z`, at `newtests/t096/forms-abuse-qualification.ts:26`. The actual failing receipt and log are included.

`src/core/features/forms/service.ts:77` now reads the stored refusal time and passes it only for held release. `src/core/features/forms/native-capture.ts:37` uses that time for the consent event. Normal intake, record creation and the release audit keep their processing times. No schema, migration, acceptance sentence, permission or outbound behavior changes.

## Acceptance outcomes and public probes

The existing native registration is `newtests/t096/forms-native.test.ts` — “FORM-001 public form HTTP refuses abuse without customer writes and releases spam exactly once”. It still exercises simultaneous release to one receipt, public accepted replay, erased-payload refusal and actual publication withdrawal. Its extension invokes `forms-abuse-qualification.ts` automatically in Verify; no new registration was added.

- Acceptance 1: honeypot, too-fast, expired, forged and differently bound fill proofs refuse. Network and distributed per-form limits refuse at their boundaries, spoofed headers do not split local authority, keyed network counters expire, and raw network addresses are absent from the retained buckets. The authenticated spam list contains the specific new refusal and reason, while complete populated customer, consent, submission, signal, evaluation, notification, draft and outbound inventories remain unchanged. Non-allowlisted origin and transport refusals remain in the original native registration and origin-race journey.
- Acceptance 2: consenting, nonconsenting and omitted-consent payloads release with their original values and key. Exact wording, revision, artifact and original visitor time are checked for consent; unticked or omitted consent creates no consent event and the new contact remains stopped. Anonymous and collaborator release, stopped capture source, independently revoked capture authorization, withdrawn publication and erased payload all refuse. Held data stays pending and intact, without a receipt or customer effect; fresh exact publication review renews authority and permits one release. Replays repeat no effect or consumed Turnstile token.
- Optional Turnstile: native HTTP with only its verification edge replaced proves wrong action, wrong hostname, unsuccessful response, missing token, missing secret and unavailable verification refuse without domain writes; valid verification succeeds once. The actual emitted public page loads no third party, sends no challenge and sets no cookie before interaction. Interaction starts the optional script and `orbit_form` widget; pending verification prevents submission. The browser replaces only that public script edge and claims no live Cloudflare qualification.

PROBE FORM-002 consent and authority: native held release preserves true, false and omitted consent; stopped source and revoked authorization refuse without writes; fresh exact review permits release.

PROBE FORM-002 abuse boundaries: signed fill age, binding and integrity, network and form windows, trusted metadata and Turnstile action, hostname, configuration and outage refusals preserve inventories; valid intake and replay succeed once.

PROBE FORM-002 browser: no pre-interaction third-party request or cookie; optional verification follows interaction; actual withdrawal refuses UI release and retains the pending payload; erasure disables release.

`RUBRIC.md` contains the frozen R1 through R10 outcome map and each DONE rider. `proof-lines.json` gives exact source and assertion lines. The browser helper `newtests/t096/browser-form-abuse.ts` is called unconditionally by the existing `browser-journeys.test.ts` registration. The final emitted proof invokes that same helper against the rebuilt Worker and captures the Settings spam list and public form at 1440 and 390. Automated serious or critical accessibility findings are zero and there is no horizontal overflow. Four final screenshots and their actual axe receipts are included. The browser and Worker close in the helper's finally path.

## Validation and mechanical custody

- The complete touched forms file passed all four existing registrations before the timestamp correction. After the correction the complete affected abuse registration passed again, including its original normal-intake, concurrent-release, withdrawal and erasure assertions and all final extension bytes.
- The final focused emitted browser proof passed against the rebuilt app at 1440 and 390. Typecheck, application build, first-party RER check, boundaries and deployment-spec freshness passed. The inventory remains 198 registrations plus two qualifications, 200 total; nothing was removed, skipped or narrowed.
- View write and check passed. Generated views were then restored whole from main and neither is committed. The exact committed tree's view check reports only the expected ACCEPTANCE.md drift. The lander generates that view from the merged CONTRACT.md.
- Source lock was generated last after the final edit and main merge, and its integrity check passed again at the committed candidate. All 204 parent Status rows remain; only FORM-002's row and generated summary counts change. No migration-ledger check applies.
- Every candidate commit, including the predecessor, was inspected for fleet author, committer and trailers before each push. No AI co-author trailer survived. New fixture helpers contain zero email-shaped literals, no secret values and no provider-shaped credentials.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, main views restored; ledger=none exit=0.

## Existing local browser failure

The full emitted browser registration stops in its earlier `formWithoutScript` helper because system Chromium requests `/favicon.ico` and receives 404, which trips the existing unexpected-console-error assertion at `browser-observations.ts:17`. The same full command failed on main `e010d88be9345bda0c7440b371d7e1cffc87ed83` on this runner, with the same favicon error, before the new helper. Both actual logs are included. No assertion was relaxed and no favicon repair was guessed. The focused changed forms browser proof passes independently. This is a baseline runner difference; main's recorded push Verify 42157856242 and Run site 42157856336 are completed/success. No candidate success is inferred from those runs.

## Plan and remaining custody

The original plan is preserved in PLAN.md. The only plan row changed by this continuation is FORM-002: native authority, original consent and remaining abuse, Turnstile and UI qualification are closed locally. No unproved FORM-002 outcome or account dependency remains. TEAM-005 contract cleanup and qualification, RECORD-014 lead and custom-object intake, NOTIFY-003 email and push account holds, all other queue notes and all release prerequisites remain unchanged. Homepage, branding, workflows and Base pins are unchanged.

No cloud publication scan or main push was performed. Scan result for `c51ba2c96f2dc947e29e9e349447b8b4a2ab43b1`: state NOT_RUN_IN_CLOUD, complete unknown, historyScanned unknown, findings unknown; the fleet Mac owns the complete full-history scan and zero-finding decision. Main equality, final exact-SHA Verify and Run site remain guarded landing conditions. No main landing, publication approval, legal certification or live-provider qualification is claimed.

CI run 42171344189 is the push Verify for the exact candidate `c51ba2c96f2dc947e29e9e349447b8b4a2ab43b1`. Its final observed status and conclusion are in RECEIPT.json and candidate-runs.json. Independent landing and ct judgement remain required before counting this candidate on main.

## Final CI observation and handoff

Exact-SHA push Verify 42171344189 completed with conclusion failure. Failed source job 127739743178 stopped at `pnpm exec node src/base/contract-docs.mjs check` with `ACCEPTANCE.md: generated content differs; run contract-docs write.` The source artifact upload then had no files; shards were skipped and the aggregate failed as consequences of that single source stop. The failed-job archive was read once using `gh run view 42171344189 --repo just-every/run-orbit --job 127739743178 --log-failed`. Its actual relevant diagnostic excerpt is included with environment boilerplate omitted. No log-blob workaround, CI repair or rerun was attempted.

This is the explicitly permitted cloud generated-view exception. It establishes readiness for guarded landing; it is not a claim that skipped product shards ran or that CI is green. The lander restores generated views from the merged source and obtains its own exact-SHA Verify and Run site. Rider 3 remains that independent CI custody step; rider 11 remains guarded landing and publication scanning. There is no real blocker. Five GitHub calls were used, including one run-status watch after more than 300 seconds.

The full independent judge request is deferred until the guarded lander has its exact-SHA green run and scan. The outcome map and each rider, with exact code locations and honest pending custody, are already included in RUBRIC.md; no unprovided judgement or scan result is invented.
