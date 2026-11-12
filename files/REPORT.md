# sd-orbit-c-f160 — OPS-001 Slack declaration qualification

Repository: https://github.com/just-every/run-orbit
Product branch: cloud/sd-orbit-c-f160
Candidate: 1149556a4235ff098d9386fff9d7a91eab6f50a6
Main at inspection and final pre-push fetch: b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31.

The supplied starting commit already implements the requested declaration and journey extensions. This continuation qualifies that exact source; no new product edit, status change, acceptance rewrite or manufactured commit was needed. The four existing candidate commits have fleet author and committer identities and no trailers. The branch is a descendant of current main. The full plan is in PLAN.md; actual command outcomes are recorded in receipts.json and the selected logs.

Counts before and after: 42 DONE, 130 PARTIAL, 32 MISSING, 204 total. OPS-001 remains PARTIAL. Test inventory remains 198 registered cases plus two qualifications, total 200. No plan row, hold, queue or release prerequisite was changed. INTEGRATE-009, INTEGRATE-010, INTEGRATE-011 and TEAM-005 judgments are preserved.

## Acceptance and public-door map

The registered native journey is in tests/core/source-onboarding.test.ts:14. It invokes proveSlackNotices at line 138; that helper and its callees perform the HTTP cases below. Only provider HTTP edges are replaced. The real routes, authentication, encryption, D1 migrations, records, routing, signed callbacks, actions, archives and erasure remain in use.

| Point | Outcome and proof on candidate | Source and test lines | Exact-head Verify |
| --- | --- | --- | --- |
| 1 | Authenticated declaration exists before activation and is identical after connect. Always-required bot permissions include chat:write and channels:read; groups:read is conditional on private channels; users:read.email is prohibited. Both callback URLs identify the installation and require Slack HMAC verification. Anonymous setup reads are refused and setup reads make no provider calls. The unconnected Integrations panel renders the structured declaration. | tests/support/slack-notices-proof.ts:22–41; tests/delegation-browser/calling-journey.mjs:10–18; src/core/features/slack/declaration.ts:4–17  43119775666, push, completed/success |
| 2 | users:read and user_change subscription are declared. Unsigned deletion changes no mapping; a valid signed deleted-user event revokes only UDEACTIVATE in this installation; replay changes nothing. No email endpoint or profile-email query is permitted at the Slack edge throughout the journey. | tests/support/slack-notices-proof.ts:27–33,70–76; tests/support/slack-network.ts:14–15; src/core/features/slack/events.ts:27  43119775666, push, completed/success |
| 3 | Fixed channel fields derive from noticeFields, the same allowlist delivery uses. Before and after connect, Settings and Connected products expose the same declaration. Token and signing secret are encrypted in storage and absent from status reads and archives. Private records disclose only event kind and an authenticated link. | tests/support/slack-notices-proof.ts:34–42,49–55,123; tests/support/slack-archive-proof.ts:14,26,48; src/core/features/slack/content.ts:10–24; src/core/features/slack/contracts.ts:4  43119775666, push, completed/success |
| 4 | The declaration and Settings disclose changing membership and history exposure. A pending external share detected before posting produces no post and disables routing. Signed sharing and bot-departure events suspend the route; event replay and later ticks do not resume it. | tests/support/slack-notices-proof.ts:36,62–69; src/core/features/operator/ui/slack-settings.tsx:40; src/core/features/slack/events.ts:25–26  43119775666, push, completed/success |
| 5 | The Settings Disconnect HTTP action removes credentials and disables routes and mappings. Reconnect and then fresh route and mapping consent send no old notice. Every unused issued pre-disconnect action answers Not changed; complete action and task inventories stay identical. The declaration survives the full cycle. | tests/support/slack-actions-proof.ts:53–69; invoked by tests/support/slack-archive-proof.ts:58; subsequent revoke and reconnect checks at lines 59–64  43119775666, push, completed/success |
| 6 | Held and unclaimed. The current owner-consented Google Workspace and Microsoft Entra proof, complete empty install and populated operation qualification, mail provider lifecycle, other connector declarations, tracked setup obligations and mobile qualification were not performed. | Existing source and judgments retained.  Unclaimed |

The browser proof is the unchanged registration in tests/delegation-browser/records-layout.test.ts:24, which invokes callingJourney at line 54 and remains scheduled by Verify's runtime-delegation shard. Its Integrations assertions run at 1440; the candidate screen proof is captured at 1440 and 390. No assertion was removed, narrowed, skipped or moved behind a new condition. The card and its controls use the existing Settings components; no redesign or homepage change was made.

## DONE riders, scored for this PARTIAL claim

| Rider | Result | Evidence or remaining duty |
| --- | --- | --- |
| 1 | PARTIAL overall | Points 1–5 map to native and browser journeys above; point 6 remains held. Exact-candidate execution results are recorded below. |
| 2 | PASS | Populated real D1 fixtures, actual posting and refusal paths, signed and unsigned events, permitted new actions and refusal of old actions, exact unchanged effect inventories. |
| 3 | CI pending | Verify schedules both existing registrations. Exact-SHA workflow state is reported below; no green from another SHA is claimed. |
| 4 | Candidate-bound | All local commands use 1149556a4235ff098d9386fff9d7a91eab6f50a6; no source changed afterwards. |
| 5 | INSPECTED | OPS-001 retains BASE-SIGNIN-001, BASE-INSTALL-001, BASE-OPS-002 and BASE-SECRET-001 citations. Inherited domain policy is credited but unchanged. |
| 6 | PASS mechanical | Contract write and check both exit 0; views restored whole from origin/main; Status, Gap, Evidence and counts are byte-for-byte main. |
| 7 | PASS | No acceptance text or coverage rewrite. |
| 8 | PASS | Anonymous connect and declaration denied; only owner admin writes; foreign, unmapped, revoked and replayed actions refused with no task effect. Signed deactivation preserves other mappings. |
| 9 | PASS boundary | Network-edge proof only. No live Slack, Google, Microsoft, mobile, provider-console or external retention qualification is claimed. |
| 10 | PASS | No new policy default adopted. Existing conservative owner administration and explicit identity mapping are preserved. |
| 11 | PENDING fleet landing | No main push, main equality, Run site success or publication scan is claimed. Fleet owns the exact-candidate gates and landing. |

## Inherited duties and self-check

BASE-SECRET-001: encrypted installation-local credentials do not read back or travel in either archive door; checked by native status and Records and CLI archive cases. BASE-OPS-002: no migration change; the native and browser fixtures use all existing real migrations. BASE-SIGNIN-001 and BASE-INSTALL-001: existing domain-policy slice retained; full provider and installation operation qualification remains held under point 6. INTEGRATE-010 pre-post checks, signed safety events and retired historical actions are exercised by the existing Slack journey rather than reimplemented.

PRE-READY 1: native and browser outcomes must complete locally; Verify state remains honest below. PRE-READY 2: inspected complete diff; no existing assertion removed or narrowed. PRE-READY 3: native journey includes revoked mappings and credentials, erased contacts, held provider deletions and no resurrection on replay or restore. PRE-READY 4: existing Settings location, labelled text controls and no newly introduced icon-only controls; required screenshots and accessibility results are reported below. PRE-READY 5: source lock fresh; exact Verify, publication scan and exact-main Run site remain the fleet's separate gates.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0.

Publication scan on 1149556a4235ff098d9386fff9d7a91eab6f50a6: NOT RUN in cloud; complete=unestablished, historyScanned=unestablished, findings=unestablished. Full history is present. The task explicitly delegates the publication scan to the maintained fleet lander.

## Execution results

Initial browser attempt: exit 1 before any page opened. Fixture migration startup at tests/support/isolated-database.ts:11 timed out after 60 seconds, using VM Node 24.19.0. Exact error: spawnSync /opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node ETIMEDOUT. No product assertion failed and no test or timeout was weakened. Pinned Node 22 startup diagnosis and subsequent browser outcome are recorded in the receipts and logs.

Final receipts are listed below; earlier failures are retained for transparency.

The complete emitted-Worker records-layout registration passed under Node 22.20.0 with Wrangler metrics disabled, exit 0, one test passed, no skips, 388722.863817 ms. Both Slack declaration screenshots were inspected and are included in the selected packet. The unconnected panel wraps at both widths, has empty credential fields, and its text controls retain the existing layout. No serious or critical accessibility violation and no horizontal overflow was observed by the existing journey. The registration also retained and completed all calling, sign-in-policy, calendar, private-entry, list and typed-field assertions.

Inherited duty register for this partial slice:

| Duty | Result | Proof and boundary |
| --- | --- | --- |
| BASE-SECRET-001 | Native Slack slice qualified by exact-head Verify | tests/support/slack-notices-proof.ts:41–42 and tests/support/slack-archive-proof.ts:14,26,48; no secret readback or export. Broader connector proof unclaimed. |
| BASE-OPS-002 | No migration change | Existing migrations apply in the emitted-browser fixture; no migration ledger edit is needed. Full operational upgrade proof remains point 6. |
| BASE-SIGNIN-001 | Existing slice credited, unchanged | Domain-policy implementation and its provider-redirects registration retained. Live Google and Microsoft qualification remains held. |
| BASE-INSTALL-001 | Unclaimed remainder retained | Empty-edition operation and full owner-authorized provider lifecycle are not claimed by this Slack round. |
| INTEGRATE-010 | Current Slack protections retained | Pre-post and signed-event refusals at tests/support/slack-notices-proof.ts:62–69; Settings Disconnect and every unused action at tests/support/slack-actions-proof.ts:53–69. |

Product custody: the fleet push guard succeeded on attempt 1, creating cloud/sd-orbit-c-f160 at 1149556a4235ff098d9386fff9d7a91eab6f50a6. Main remains b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31. The final rebase was a no-op. Contract generation, restoration of the views, source-lock regeneration and check, clean-tree checks and all-candidate identity and trailer review passed again immediately before the push. No new product commit was created.

Exact-head Verify 43119775666 is completed/success (push on cloud/sd-orbit-c-f156). The named-branch push started Verify 43127892992 on the same exact full SHA; its first observation was in_progress. No workflow was dispatched or rerun, and no PR is needed because Verify has a branch-push entry point. Four GitHub calls have been used, including the optional artifact query and the blocked storage redirect.

Optional CI artifact download: `gh api repos/just-every/run-orbit/actions/artifacts/13900549560/zip` failed at the storage redirect with Forbidden. The CLI emitted no numeric HTTP status. The sanitized diagnostic is in ci-download-error.log; it contains no signed query. There was no retry or added authorization header. The successful exact-head workflow result was obtained through REST, not inferred from downloaded content.

Final native HTTP qualification: exit 0 under Node 22.20.0 with Wrangler metrics disabled and without a concurrent browser run. The selected existing registration completed in 998837.054706 ms: one test passed, zero failures, zero skipped. The complete helper chain, including both archive doors and Settings Disconnect followed by reconnect, ran unchanged. Earlier migration timeouts and the Node 24 D1 connection failure are retained in their actual logs; no product repair, test weakening, timeout change or CI repair was made.

The exact registered native test name is: NOTIFY-003 opt-in personal mention DMs recheck identity and access, withdraw on deletion and hold uncertainty; REPORT-004 explicitly enabled Slack schedules respect DST, hold uncertainty and never resume; email stays paused; INTEGRATE-005 INTEGRATE-009 INTEGRATE-010 INTEGRATE-011 Slack notices carry only allowed fields, replay once, withhold private data and refuse unmapped, foreign and replayed actions; BOUNDARY-001 current USD sales journey respects product boundaries and exposes unresolved provider setup; SIGNAL-001 SIGNAL-009 OPP-004 OPP-007 OUT-001 source onboarding authenticates inert connection tests, ranks real evidence and preserves customer reply through reviewed send. The exact registered browser test name is: emitted Worker record and NOW lists wrap full valid long names; an invited collaborator opens only permitted mentions and survives grant revocation at 1440 and 390.

PROBE OPS-001 1: authenticated GET /api/v1/settings/slack before activation and after POST connect -> identical structured declaration; anonymous read 401; both signed callback URLs and conditional private-channel scope present; forbidden email scope absent from requests.
PROBE OPS-001 2: unsigned then signed user_change with deleted UDEACTIVATE -> unsigned 401 and no mapping change; signed event revokes only that mapping; replay unchanged; no email or profile query at Slack HTTP edge.
PROBE OPS-001 3: Settings and Connected products reads and actual channel deliveries -> identical declared allowlist; storage ciphertext contains neither token nor signing secret; status and both archive doors exclude credentials; private notice has event kind and authenticated link only.
PROBE OPS-001 4: pending external share before a stage move, then signed channel safety events -> zero unsafe post, route disabled and no automatic resumption; declaration warns about membership changes and channel history.
PROBE OPS-001 5: Settings POST disconnect, reconnect, fresh mapping and route consent, then every unused pre-disconnect action -> zero old notice posts, every old action Not changed and unchanged action and task inventories.
PROBE OPS-001 6: none; explicitly held operational and live-provider remainder outside this round.

PRE-READY final local result: selected native HTTP and complete emitted browser journeys pass; typecheck, build, first-party, contract generation, source lock and history checks pass. Source and assertions were not edited. No migration changed. Both screenshots were inspected. Clause remains PARTIAL; no provider, scan, main equality or Run site completion is inferred from these local results.

CLAIM OPS-001 PARTIAL points=1,2,3,4,5 tests=tests/support/slack-notices-proof.ts#proveSlackNotices; tests/support/slack-actions-proof.ts#proveSlackDisconnect; tests/delegation-browser/calling-journey.mjs#callingJourney
GAP OPS-001: Acceptance 6, owner-consented Google Workspace and Microsoft Entra proof, live Slack qualification, the remaining operational and other connector declarations, tracked provider setup and mobile surface remain held and unclaimed. Existing scopes, queue lines, holds and release prerequisites are unchanged.

Terminal CI observation: Verify 43127892992 remains in_progress on cloud/sd-orbit-c-f160 at 1149556a4235ff098d9386fff9d7a91eab6f50a6. The same exact SHA already has completed/success push Verify 43119775666. This handoff does not claim the new run completed, and does not claim main equality, a publication scan or Run site. The maintained fleet lander must enforce its exact-ref and exact-head gates before landing. Six GitHub calls were used; status polling respected the 300-second interval. No CI run was dispatched or rerun.

Selected point blockers: none. The broader OPS-001 holds remain unchanged. No new product commit or plan-row edit was needed. The actual complete non-secret packet is published separately from the product branch.
