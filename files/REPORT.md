# sd-orbit-c-f179 — OUT-013

Work scope: just-every/run-orbit, cloud/sd-orbit-c-f179. Product and evidence custody are separate. Contract Status, Gap, Evidence and counts remain owned by the lander.

Plan:
1. Read the clause, repository implementation and existing public-door proof. Preserve capture read access, separate calendar consent, existing exact-content review and all held obligations.
2. Add installation-local send authority to existing connections, refusing absent or unsolicited grants and binding its provider mailbox to the saved rendered approval.
3. Implement documented Gmail MIME submission and Sent readback, one-attempt submission, visible revoked authority, uncertainty reconciliation without resend and mailbox-specific Retry-After.
4. Extend the existing registered capture-provider journey; retain the three named mail regression files, typecheck, first-party and archive checks. Extend existing consent and record-mail browser journeys at 1440 and 390 without adding a registered case.
5. Regenerate deployment metadata and contract views for validation, restore main's generated views, regenerate source lock last, inspect every candidate identity and trailer, push only the named product branch.
6. Publish the actual report and receipts separately to the evidence ref; report exact product custody and all omitted obligations.

Provider constraint discovered before implementation:
Microsoft Graph POST /me/messages requires delegated Mail.ReadWrite for both organizational and personal accounts. Sending an existing message requires Mail.Send. The brief permits only Mail.Send beside Mail.Read and Calendars.Read and explicitly requires create-then-send. The mandated combination cannot execute against the documented API. GET /me for mailbox identity also requires User.Read, which is outside that scope list. The implementation does not invent successful provider behavior or silently request broader authority. Microsoft send opt-in is visibly refused pending a permission or flow decision. Read capture and separately consented calendar writeback continue.

Gmail's independent native work continues. No DONE claim is possible: the Microsoft boundary and owner-consented live provider proof remain unestablished, as do the brief's explicitly held remainder. No live customer message is sent by this run.

Frozen rubric:
- R1: Separate opt-in on an existing source requests the exact send scope; absent or unsolicited send grants are refused.
- R2: Current read-only and calendar-write credentials cannot send; sender authority belongs to its consenting operator.
- R3: The native review binds the exact mailbox, recipient, rendered subject, body and signature; stale binding is refused.
- R4: One Gmail provider message carries Orbit's Message-ID; Sent readback persists provider message and conversation identity.
- R5: Existing capture threads one genuine customer reply onto the contact, company and exactly linked deal; replay cannot duplicate it.
- R6: Revocation or disconnect before scheduled dispatch blocks visibly, with no identity or transport fallback.
- R7: Timeout stays delivery-unknown through absent Sent results and restarts, then normal reconciliation settles it once without resend.
- R8: Retry-After defers only that mailbox; other mailboxes and installation mail continue, retaining daily operator budgets.
- R9: One-to-one opt-out and installation-origin capability remain bound to exact approved bytes.
- R10: Export contains history without credentials or send authority; restore cannot regain dispatch authority.
- R11: Existing registered browser journeys show changed consent and review screens at 1440 and 390.
- R12: Local touched checks, exact candidate lock and recorded exact-SHA Verify establish only what they actually run.

Initial acceptance inventory:
OUT-013 has one acceptance sentence. Its Gmail native limb is buildable here. Microsoft create-then-send at the mandated scopes is UNMET-EXTERNAL due to the documented permission boundary. A real provider Sent copy and real customer reply require owner consent, not credentials admitted to this task. Attachments, multiple recipients, provider reply-all, sequences, tracking, published account-type quotas, mailbox administration and expanded roles retain their existing clauses and holds. Points=none until the full acceptance sentence is proven; native limb results will be listed individually.

Plan rows changed: none. The supplied extract remains read-only. No Status, Gap or Evidence cell is edited.

Implementation result:
- Separate Gmail send opt-in reuses the existing connected-source OAuth and calendar-consent pattern. The exact gmail.send grant is required; unsolicited, missing, read-only and calendar-write grants are refused. Source and credential changes preserve the send binding only under the current connection; refresh loss and explicit revocation pause authority.
- Each exact rendered approval binds the consenting operator, source, connection, sending address, recipient, Unicode subject, body and real library signature. Contact drafts can remain deal-less. Company and deal doors and Workbench drafts use the same transport resolver. Reauthorization invalidates older reviews.
- A durable message claim prevents concurrent or replayed provider submission. Gmail receives MIME containing Orbit's Message-ID; Sent metadata must match that exact ID before provider message and thread IDs are accepted. Timeouts, uncertain responses and accepted-message readback failures remain delivery-unknown and only search Sent. No automatic resend or installation fallback occurs.
- Retry-After and pacing apply to the mailbox identity across both native mail stores. The installation budget view excludes mailbox sends, while the existing operator daily budget remains shared. Other mailboxes and the real installation HTTP adapter continue during mailbox deferral.
- Existing capture treats the mailbox's own Sent copy as sent evidence and a genuine customer's referenced reply as reply evidence. One replay-safe reply reaches the contact, primary company and exactly linked deal.
- Existing opt-out settings produce the approved header and visible installation-origin capability. GET does not suppress; one-click POST suppresses only its recipient and is replay-safe. Erasure removes the capability, message history and sender authority without resurrection through capture replay.
- The additive 0082 migration registers the new authority and history fields, with exact preceding archive generation support. Export excludes tokens, OAuth state and reusable send authority; restore retains historical mailbox identity but cannot dispatch. Operator erasure removes sender identity from both mail stores and disconnects the credential.
- Existing Settings and approval components show send authorization, sender selection, exact send-as identity, paused authority and retry time. No new icon-only control or navigation category was introduced. Selected mailbox opt-out review does not inherit the installation transport's footer.
- Public readiness now reflects an actual available installation transport or the current actor's mailbox. An unconfigured send returns a descriptive 503 with unchanged outbound inventory and zero provider submissions; it previously returned a generic 500. This was reproduced through the public Workbench door before correcting it.

Scope and inheritance:
The clause itself cites BASE-MAIL-001, BASE-ROLE-001 and BASE-OPS-003. Their native deltas are exercised by delivery uncertainty and Sent reconciliation, own-operator authority refusals and replay/concurrent submission. OUT-014's real signature library is applied and later edited without changing saved approved bytes. Existing OUT-018 daily budgets remain in force and installation-specific minute counting was isolated from mailbox traffic. OUT-020 and OUT-029 retain their setting and capability handler. OUT-015's human-reply and sent-evidence distinction is checked without claiming a delivered receipt from Gmail. No tracking implementation or live AGENT-003 obligation module was changed. Archive and operator-erasure files outside the narrow transport file list are necessary to prevent reusable authority or copied sender identities surviving restore or erasure.

Acceptance sentence and native rubric evidence (line numbers refer to the committed source):
- A1, CONTRACT.md:1076: UNMET-EXTERNAL for the complete sentence. Gmail is covered through the native OAuth, review, provider HTTP, capture, scheduled dispatch, export and restore doors. Microsoft create-then-send cannot run at the mandated scopes; a real recipient reply and real provider Sent copy still require owner consent. Attachment and other held obligations remain omitted. No whole acceptance point is awarded.
- R1: tests/support/mailbox-send-proof.ts:21-44 connects the existing source, refuses missing and unsolicited grants, and checks exact scopes. Microsoft attempts return 409 and create zero send authority or submissions.
- R2 and BASE-ROLE-001: the same helper:40-51 attempts sends with read-only and calendar consent, then with a different current operator; unsafe reviews are refused and submissions remain zero.
- R3 and OUT-014: helper:53-76 applies the actual private library signature, obtains the exact native preview, refuses a forged hash and a stale connection, and checks persisted approved bytes after the library changes.
- R4 and BASE-OPS-003: helper:67-76 submits the same reviewed approval concurrently, expects one 200 and one 409, checks one provider message, exact decoded MIME, Message-ID, provider message ID and thread ID, then refuses replay.
- R5 and OUT-015: helper:77-86 captures an actual synthetic provider-edge reply and the own Sent copy through the existing source drain, then repeats capture; each authenticated record timeline contains that same reply once and own Sent is email.sent.
- R6: helper:87-99 schedules through the public approval door, revokes send consent, dispatches, and checks failed state with no additional submission. A missing encryption capability cannot use an installation sender.
- R7 and BASE-MAIL-001: helper:100-112 causes provider timeout and readback 429 after acceptance, restarts, reconciles an absent Sent copy, later reveals it, and verifies one accepted settlement and unchanged submission count.
- R8 and OUT-018: helper:113-128 checks Retry-After, visible scheduled state and no early submission; a second mailbox and SendGrid HTTP transport continue. Existing outreach-limits tests preserve installation pacing and shared daily limits.
- R9, OUT-020 and OUT-029: helper:129-139 and 169-175 check exact approved unsubscribe headers and footer, non-mutating GET, recipient-only POST, replay, capability erasure and capture replay after person erasure.
- R10: helper:145-157 opens the real Records export, restores it through archive routes and the local portability path, checks absence of credentials and authority, preserved historical sender and zero queued or scheduled restored dispatches. Operator-erasure's existing registration also checks both new copied sender fields are cleared.
- R11: tests/delegation-browser/calendar-journey.mjs extends the existing records-layout registration with Settings consent and send-as review. newtests/t096/browser-record-mail.ts extends the existing native browser registration with an actual library-signature review. Both record changed screens at 1440 and 390. Assertions were extended within existing registrations; no new case was added or existing assertion removed, narrowed or hidden behind a new condition.
- R12: detailed actual command receipts and exact product and CI provenance are in RECEIPT.json. No test is called green unless it completed successfully. Earlier fixture startup timeouts and browser partial executions are retained honestly.

DONE-RIDERS disposition (no DONE claim):
1. FAIL for whole-clause coverage: Microsoft send and real provider proof remain unestablished; native outcomes use the registered capture journey and existing browser registrations above.
2. PASS locally: native allowed and unsafe paths are exercised on seeded data, including wrong actor, absent grant, stale review, revoked authority and replay. No empty-list-only proof substitutes for execution.
3. PENDING CI: exact-SHA Verify receipt is reported separately; local proof is not represented as completed GitHub CI.
4. PASS source provenance: final local proof and source differences are bound in RECEIPT.json. Earlier browser screenshots have unchanged relevant UI bytes; any infrastructure failure is named rather than called a pass.
5. PASS, INSPECTED: OUT-013 already explicitly cites all three Base duties; no contract text or inheritance was changed.
6. PASS mechanical: generator write and check pass; generated files are restored from main. Status, full Gap, Evidence and provenance remain byte-for-byte main's text for the lander.
7. PASS: no acceptance sentence, count, coverage map or ruling was edited.
8. PASS locally: native authority is exercised both ways through OAuth and approval routes. Full expanded role and team matrices remain TEAM-005's hold.
9. FAIL for whole-clause provider proof: all provider HTTP behavior is synthetic at the HTTP edge; no real provider receipt, recipient, account consent or legal qualification is claimed.
10. PENDING POLICY: conservative default: refuse unsupported Microsoft sending rather than request unapproved Mail.ReadWrite or choose a different provider flow. Standing scope policy permits building this refusal as PARTIAL; no ct approval or release is claimed.
11. PENDING LANDER: main equality, COMPLETE full-history publication scan with zero findings and exact-main Run site are not performed or claimed by this cloud builder.

PRE-READY self-check:
Native changed outcomes have public-door assertions, including dangerous-path refusal and no-send inventory checks. Existing assertions are retained and test count stays within 200. Revocation, person and operator erasure, replay, restore and uncertainty are covered. Changed screens reuse existing Settings and review components and have 1440 and 390 browser proof, readable text and no new icon-only controls. Source lock is regenerated after the last source edit. Exact-SHA CI and guarded publication scan are reported as their actual state, never inferred from another commit. All data and screenshots are synthetic; no token, credential file, environment dump or private gate material is selected for evidence.

Remaining boundaries and plan disposition:
OUT-013 is claimed PARTIAL with points=none, without changing its source Status. The native Gmail limb is substantial partial progress. Microsoft needs a ruling authorizing the documented draft-creation permission or a different flow. Owner consent is still needed for each live provider, provider Sent and a real customer reply. Multiple To, CC and BCC, reply and reply-all, attachments, tracking, approved sequence steps and disconnect enrollment pauses, published account-type limits and administrator usage, deal-less obligations, agent mailbox sends, expanded team roles and live-provider qualification retain exactly the brief's holds and prerequisites under OUT-019, RECORD-018, MIGRATE-001, OUT-016, SEQUENCE-001, SEQUENCE-002, OUT-018, OUT-024, OUT-017, OUT-023, SURFACE-009, OUT-001, OUT-020, OUT-032 and TEAM-005. No hold or release prerequisite is retired. No next buildable target touching these files is provided outside those existing holds, so no unrelated clause was started. Plan rows changed: none.

Before and after counts: 42 DONE, 130 PARTIAL, 32 MISSING, 204 total, unchanged. Registered test budget: 198 plus two qualification flows, 200 total, unchanged. No PR is required for the repository's branch-push Verify entry point. Product custody and evidence publication remain separate; only the named product branch is pushed, and all reports go to the named evidence ref.

Public-door probes on the candidate:
PROBE OUT-013 1: existing Google source OAuth send opt-in, exact native rendered review, concurrent approval and capture replay -> one Gmail HTTP submission, matching Sent message and thread IDs, one genuine reply on each permitted linked record, and refused missing or unsolicited grants.
PROBE OUT-013 revocation: scheduled native approval followed by revoke-send or source disconnect -> visible failed state and zero identity or transport fallback submissions.
PROBE OUT-013 uncertainty: provider POST timeout, process restart and empty Sent search, then matching Message-ID in Sent -> delivery-unknown until reconciliation, one accepted settlement and unchanged submission count.
PROBE OUT-013 deferral: Gmail 429 with Retry-After -> that mailbox scheduled until the exact time, while another mailbox and the installation's SendGrid HTTP edge each submit successfully.
PROBE OUT-013 custody: Records export, Records import and local portability restore -> no credential or reusable send authority, historical sender preserved and no scheduled or queued restored dispatch authority; erasure followed by capture replay -> no revived person, mail or capability.
PROBE OUT-013 Microsoft: existing source sendConsent=true -> 409 explaining Mail.ReadWrite and zero send authority or provider submissions.
PROBE OUT-013 readiness: public Workbench onboarding and approval without a sender -> mailConfigured=false, descriptive 503, unchanged inventory of three outbound rows and zero provider submissions.

Mechanical receipt:
MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0, followed by restoring ACCEPTANCE.md and docs/CLAIMS.md from origin/main; ledger=wrangler d1 migrations apply DB --local --config wrangler.jsonc exit=0.
The source checker returns ok=true across 2800 tracked edition files. Typecheck, shared build, boundary check and first-party check exit 0. The 0082 deployment specification is generated by scripts/publish-deployment-spec.mjs and its --check, not edited manually. No uncommitted product file remains.

Local startup diagnosis:
The initial native regression batch passed 21 of 23 registrations. One failure was an already corrected duplicate temporary test variable; the other was ETIMEDOUT starting a fresh fixture inside the existing record-mail custody helper. The final expanded capture registration then passed on the exact candidate. Retrying the one remaining record-mail registration serially still failed at tests/support/record-mail-custody.ts:14, before its local restore assertion, with spawnSync Node ETIMEDOUT from isolated-database.ts:11 and its unchanged 60000ms migration limit. A separate four-open-fixture startup probe passed all four starts at 51.909, 41.357, 48.794 and 42.070 seconds; it did not reproduce that timeout. These results establish local startup variability, not a product defect or a completed green regression suite. No timeout, assertion, source guard or fixture helper was weakened. The earlier full native browser registration likewise reached the changed record-mail screens and then timed out starting a separate fixture in forecastArchiveJourney. Full logs are retained. The exact candidate browser helper is also invoked directly as a scoped runtime probe; its actual result is in RECEIPT.json.


Final integration and repair history:
The original candidate ae91bb500222adab251858960883d64368ee3bd7 reproduced a genuine legacy archive rejection at newtests/t096/released-forecast-upgrade.ts:69: Archive inventory does not match a complete supported source generation. The precise pre-0079 notification catalog was retaining the new mailbox additions. Applying the existing preMailboxCatalog reconstruction to that historical branch corrected the source rather than relaxing validation or the test. The unchanged full forward-upgrade registration then passed in 621.2 seconds on the source saved as 6366ddd. Both original failure and passing rerun are retained.

Fresh main advanced to 63aa0647cabbd86ae1ee2c489f1dfe8ef31e123b with the separately owned completed-meeting follow-up work. Integration retains its approval and scheduled-dispatch fences, accepted-message effects, restore pauses, migration 0085 and all its obligation modules byte-for-byte. Mailbox authorization, exact review, installation-budget isolation and restore authority removal remain. The archive generation list preserves both independently published source shapes: main with follow-up tables but no mailbox additions, and this branch with mailbox additions before follow-up tables, followed by their common older generations. No live obligation implementation module was edited by this task.

The final product is 816aea662699ca8b0ed2e559c116078ef57f02d0 on cloud/sd-orbit-c-f179, pushed with the fleet guard and verified candidate identities including side parents. Its merge commit is a real non-skipped candidate. Main, generated contract documents and default branch custody are unchanged by this builder. The exact-head push Verify is 43320028360; its actual latest conclusion is recorded in RECEIPT.json. Prior run 43314581586 belongs only to ae91bb500222adab251858960883d64368ee3bd7 and is superseded, not a green receipt for the final candidate. No workflow was dispatched or rerun and no PR was needed.

The successful browser proof at ae91bb500222adab251858960883d64368ee3bd7 remains applicable: UI-PROVENANCE.json verifies every relevant consent, draft-review and browser-helper source file is unchanged through the final candidate. The final native mailbox helper and historical upgrade registration are rerun on the merged source; their actual exits, full logs and scope are retained in RECEIPT.json. No pending run is represented as a pass.

CLAIM OUT-013 PARTIAL points=none tests=tests/support/mailbox-send-proof.ts#mailboxSendProof
DEFAULT OUT-013: Refuse Microsoft send authorization rather than request unapproved Mail.ReadWrite or silently change the mandated provider flow; existing own-operator consent and explicit review remain the floor under the standing scope rule.
GAP OUT-013: Microsoft create-then-send requires the unapproved Mail.ReadWrite permission; live Google and Microsoft Sent and real recipient reply proof still need owner consent. All explicitly held remainder and release prerequisites remain unchanged.

Final native result: mailboxSendProof completed for Google and Microsoft on 816aea662699ca8b0ed2e559c116078ef57f02d0 with exit 0. Google executes the complete supported native send journey; Microsoft executes the explicit permission-boundary refusal, not a fabricated successful send. The registered full capture case previously passed; its same focused helper is now freshly executed on the merged candidate. Final historical upgrade and exact-head Verify retain their actual status in RECEIPT.json.


Terminal result:
The final historical upgrade registration on 816aea662699ca8b0ed2e559c116078ef57f02d0 reported one passed case, zero failures and duration 600.8 seconds. The enclosing command session disappeared before its shell wrote an exit receipt. The retained final-upgrade cloud_run subreaper was defunct with Linux wait status 9 (SIGKILL), recorded in UPGRADE-EXIT.json. The assertions passed; the wrapper is not represented as a completed zero-exit process. No live owned server or browser remained. This is retained as an execution limitation, not hidden as a green command.

Exact-head Verify 43320028360 remains in_progress with no conclusion at the final REST observation. The product is therefore handed over as PUSHED, not as a green Verify or a DONE clause. Eight GitHub API calls were used, with no short-interval polling, dispatch or rerun. The Mac lander still owns its publication scan, required exact-head Verify, landing and Run site. Publication scan fields complete, historyScanned and findings remain unestablished in RECEIPT.json; no zero-finding result or main equality is claimed. Source judgments and all original holds remain unchanged. Product branch remote identity is recorded in PRODUCT-REMOTE.txt.
