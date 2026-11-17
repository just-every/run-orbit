Plan four independent rounds on current main; 162 open clauses / 2 HELD-EXTERNAL / 106 HARD / 54 CHEAP; 42 DONE clauses excluded.

Scope: just-every/run-orbit main at 14a3aae44a2e327978f7ce92f099448190362d3d, inspected 17 November 2026. The 162 open rows are 130 partial and 32 missing; published 48, target/push-further/agent 114. Classifications partition whole open clauses by their remaining primary dependency, not by the size of every possible slice. A CHEAP row already owned by an sd round is not new queue work. OPP-007 is HARD as a whole; its isolated clock qualification is a bounded round. Field proof R-1..R-12 remains separate and never prevents a software DONE judgment by itself.

This was a read-only source/test inspection. No setup keys for Orbit, dependencies, app, CI, product commits, product pushes, PRs or launch were used. The only executed repository check was `node src/base/contract-docs.mjs check`: PASS, "Contract documents are current." Runtime/core/browser tests were read, not run; screenshots below are required builder proof, not new receipts. The product checkout, index and HEAD remain clean and unchanged. Evidence publication is only report custody and conveys no product readiness, acceptance or landing.

The status table remains authoritative for counting, but its old gap descriptions are not a current implementation inventory. In particular:
- CALL-001's definite Twilio creation-refusal and terminal-disposition gaps are stale: calls/routes.ts and repository.ts record failed 21210/21211/21212/21214/21215/21216/21217 outcomes; tests/support/twilio-calls.ts:29 and :76 assert those and no-answer/busy/canceled/failed replay without redial. tests/delegation-browser/calling-journey.mjs already has 1440/390 refusal/uncertain/terminal screens. Aircall and real-account qualification remain.
- TASK-001's high-priority call, weekly recurrence, reassignment, one next occurrence and DST are asserted by tests/support/sales-tasks.ts, called by tests/core/today-brief.test.ts. Its "restart" rebuilds the app against the same database; it is not a persisted-store/process restart. Do not rebuild working recurrence.
- OUT-013 is not wholly missing: outreach/mailbox/* and tests/support/mailbox-send-proof.ts implement/test bound Gmail sending; tests/core/capture-providers.test.ts:66 and newtests/t096/browser-journeys.test.ts:29 exercise consent/review/Sent/uncertainty/revocation. Microsoft sending, attachment support and real provider/recipient proof remain.
- INTEGRATE-002 is not wholly missing: zoom/*, tests/support/zoom-meeting-proof.ts, tests/core/today-brief.test.ts:294 and tests/delegation-browser/today-brief.test.ts:26 cover connected plans and custody. Complete provider/buyer journey and privacy continuation remain.
- MIGRATE-001/002 are no longer CSV-only: imports/hubspot/* and imports/pipedrive/* with hubspot-api-proof.ts and pipedrive-api-proof.ts implement connected reviewed custody. Full source entities/files, workflow mappings and real exports remain. Salesforce is still absent on main; its sd f183 foundation must not be duplicated.
- RECORD-014 saved sorted views, field definition history and typed fields already exist in saved-views-proof.ts, typed-fields-proof.ts and records-complete.test.ts. Custom objects, lead conversion, reviewed bulk editing and per-value history remain.
- NOTIFY-001/002 assigned ownership and fresh-session read persistence have explicit current assertions in tests/core/assistance.test.ts:211/:215, notification-responsibility.ts, notification-session.ts and zz-notifications.spec.mjs. PUBLIC-004 expiry/admission has current assertions in identity.test.ts and provider-redirects.test.ts. These are qualification/status-custody matters, not new feature builds.
- INTEGRATE-007 ledger/merge/suppression custody already has mailchimp-ledger-proof.ts and launch-suppression.test.ts assertions. Its live hosted/signing/complete buyer-walk limits remain; do not repeat the old missing-ledger work.
- The current MCP manifest contains 32 tools, 10 resources and 13 non-tool entries, not the status prose's 23/10/two. Current raw-body/capacity, stored-text classification, AI-input egress, forecast-as-standard, private-address security, report deletion, workflow draft/live and embedded-risk proofs exist. These prove slices, not the entire class/job surface or seeded week.
- The concrete RECORD-010 editor gap survives inspection: records/manual.ts accepts durationMinutes/contactIds; operator/ui/record/entry-editor.tsx exposes only text/time and resubmits the old duration/attendees. tests/support/manual-meeting.ts retains those old values. This warrants a bounded UI build.
- ACTION-002 has replacement/history and current-recommendation fences, plus obsolete completion refusal at tests/core/signals-outreach.test.ts:161. Operator-change, old saved AI-preview and old-draft send refusal qualification remains; no new recommendation engine is justified.
- OPP-001 lifecycle() already stores close reason/by/time, removes queues and schedules reopening evaluation. Complete won/lost/late-evidence/reopen native and browser proof is missing, not the whole lifecycle implementation.
- OPP-007 timing-repository.ts constructs timer transitions, settlement.ts computes response deadlines with workingDaysAfter(), and the prior close deadline slice exists. The actual computed stale/awaiting boundary with US working days/DST/replay remains a valuable qualification slice; never seed next_due_at as a substitute for its construction.

Branch collision check: all 696 fetched cloud/* refs were enumerated; 374 tips were not ancestors of inspected main. The retained branch-scan.json records those tips, unique commit subjects and changed files. A nonancestor is not proof of live work or of an unlanded patch: cherry-picks and older rebase/merge siblings leave many historical refs. I therefore exclude overlapping sd scopes conservatively whether queued, retained for landing, or already represented on main. No launch-state feed was provided, so current execution status is not asserted. Recent main includes 17b7e784/f54f6712 fresh-install/workflow repairs, 1833f212/ca63c4ad import owner/privacy fixes, 73943338 stranger-journey repairs and 14a3aae4 invitation acceptance; the plan credits their source rather than rescheduling them.

Do not requeue these sd scopes:
- f1/f3/f8 and strategy-trial-1/19: owners, role foundation/equal-operator qualification; ct reconciliation remains.
- f14/f24/f25/f26/f27/f29: candidates/merge, signal restart, independent state, skip/no-send, oversized capture, sending limits.
- f22/f23/f31/f32/f34/f35/f36/f38: notifications, Slack acknowledgment, sign-in, capture authority/linking, cited draft and risk proof.
- f41/f42/f43/f44/f45/f46/f47/f48/f49/f50/f51/f52/f53/f54/f55/f57/f58/f59/f60/f61/f62/f63/f67/f68/f72: honest tracking, late evidence, stops, message states, score-source link, stale review, NOW order, approval replay, scheduled/outcome/reconciliation, current recommendation, relationships, AI failures, settings, public tracking, providers, core persistence, scoring, calendars, library, removal and timeline qualification.
- f64/f69/f76/f79/f85/f88/f90/f98/f104/f110/f111/f114/f123: Slack rollback, AI accounting, receiver-task notice, native identity, manual meeting text/time, source-bound call notices, single-message human stop, close deadline, calendar-window extension, populated public privacy. The new clock entry excludes f111; the new entry editor excludes f98's retained text/time proof.
- f113/f117/f120/f125/f127/f130/f128/f131/f132/f135/f136/f144/f139/f143/f140/f149/f152/f153/f154/f157/f158/f161: MCP limits/audit/counts/person-steps/report links/hostile text/collaborator parity/overview/guide/manual drafts/Capture handoffs/saved customer message/graph correction. Latest f158 fixture-repair-2 tip 2bf7234c8e49 retains saved-message work; no new MCP customer-message builder.
- f162/f167/f178/f181 dashboard saved-view/source linking; f156/f160 Slack declaration/disconnect; f163 Calendly lifecycle; f164/f171/f172 immutable sequence authoring; f165 quote foundation; f166 Stripe context; f170 Zendesk; f174 HubSpot; f177 meeting obligations; f183-renumber-2-land-r1 (aabba4f85b2d) Salesforce Account/Contact foundation; Zoom privacy continuation 6246437fa624. These foundations are excluded even when the status row still says missing.

Owner asks, batched as HELD-EXTERNAL items (the first two are primary-held clauses; the rest are external components or field qualification of otherwise HARD work):
- TEAM-001: ct's signed reconciliation of equal-full-operator wording with forecast/library/private-audience/sign-in administrative authority; never widen access to resolve wording.
- RECORD-007: ct's authoritative resolution of opportunity creation/form-owner defaults against existing ownership intent; existing assign/reassign/unassign behavior can be qualified without choosing a new default.
- CAPTURE-010/011 and OUT-013, R-1/R-2: one authorized Google Workspace tenant and one authorized Microsoft 365 tenant, with production-app consent/verification for the scopes actually shipped.
- MIGRATE-001: an authorized real HubSpot customer export containing the named activities, owners, associations and file bytes.
- MIGRATE-002: an authorized real Pipedrive export containing two pipelines, linked activities and files.
- MIGRATE-003: an authorized Salesforce sandbox/real export containing converted Leads, record types, custom objects, activities and Files.
- CAPTURE-008/OUT-029/NOTIFY-003, R-6: an authorized hosted inbound/mail/relay account and real receiving mailbox for routing/delivery/opt-out qualification.
- CALL-001/002/003, R-7: authorized Twilio/Aircall numbers/accounts plus jurisdiction-specific recording/participant-consent legal sign-off; no live calls are requested from this planner.
- ENRICH-001/AGENT-004/005, R-8: licensed Clay/Brave/chosen enrichment entitlement with retention/jurisdiction terms and a permitted research egress policy.
- OUT-016/021/022, R-9: owner-approved tracking-consent and jurisdiction/provider legal basis before collection is field-qualified.
- CAPTURE-012/013/014, R-10: owner-approved prospect purpose, retention, jurisdiction and channel-specific lawful basis; conversational evidence is not marketing consent.
- INTEGRATE-001/002/003/004/006/007/008/QUOTE-001, R-11: authorized vendor accounts for each adapter's actual journey; Dial/Nectar/HappyToHelp/Buoy also need the receiving seed's supported API/event identity contract.
- REPORT-004/NOTIFY-003: a supported system notification sender and relay attachment capability; this is a transport dependency, not permission to send dashboard emails via a substitute account.
- MOBILE-001, R-3 and NOTIFY-003 push: Apple/Google developer distribution accounts and authorized iOS/Android devices for store/offline/push receipts.
- MOBILE-001/PUBLIC-001/FORM-001, R-4/R-5: human screen-reader review and a dated VPAT author assessment.
- SURFACE-013, R-12: published Claude/ChatGPT/Codex/Copilot client receipts and authorized Okta/Entra enterprise-managed authorization. Seeded local policy fixtures can be built before these field receipts.

Every builder must work from current main in an independent branch, retain existing holds, use native doors and exact effect inventories, and report source SHA and actual checks/screens. They must not edit CONTRACT.md Status/Gap/Evidence, generated ACCEPTANCE.md/docs/CLAIMS.md, another lane's plan or any evidence/status to declare themselves DONE. Existing test inventory/budget rules apply: prefer adding support assertions to the appropriate discovered journey; new test paths below are scoped proposals and must obey scripts/verification-inventory.mjs without weakening its limits. No paid model/provider usage is needed for these four rounds. Gate: required appears only because each selected entry changes or qualifies persisted customer data/authority; no money/provider/migration expansion is authorized.

Complete open-clause audit follows. Each row states the actual remaining software or proof obligation, classification and collision disposition. The verbatim acceptance/gap/evidence annex after the audit preserves every exact original point, including repeated split-clause duties, for the local feeder and independent gate. Status/evidence are not changed by this plan.

- **TEAM-001 — HELD-EXTERNAL:** equality across all workspace jobs conflicts with owner-only forecast/library/sign-in administration and private audiences. Need ct's authoritative access-boundary reconciliation; do not widen access. CRM peer/collaborator proof already exists in newtests/t096/collaborator-lifecycle.test.ts.
- **TEAM-003 — CHEAP:** qualify persisted US timezone/USD, working hours, stale intervals and cross-record reload. Settings storage exists; sd f57 already carries the persistence proof; exclude duplicate builder.
- **TEAM-004 — CHEAP:** qualify all removal sets, delegated unassignment, scheduled cancellation, recorded choices and attributed owner change. settings/removal-handover.ts and tasks/handover.ts exist; sd f68 covers this proof; exclude.
- **RECORD-001 — CHEAP:** qualify native create/edit/reload of company/contact/USD deal, custom values and associations. records/routes.ts and repository.ts implement it; sd f61 already carries scalar/association persistence; exclude.
- **RECORD-003 — CHEAP:** qualify email create/edit case/whitespace collision with 409 existing ID/no writes, free-mail exclusion and normal keyless create/edit with no auto-link. Company domain proof exists in tests/support/company-identity.ts; sd f90 covers the remaining native identity outcomes; exclude.
- **RECORD-005 — CHEAP:** combined mail/meeting/note/stage/owner/merge timeline with occurred/recorded time, source and actor, including late events. Note ordering/reload is already in tests/e2e/operator.spec.mjs; sd f72 carries combined proof; exclude.
- **RECORD-007 — HELD-EXTERNAL:** assign/reassign/unassign, reload, attributed history and unchanged score. Ownership implementation and tests/support/record-ownership.ts exist; sd f1/strategy-trial-1 overlap. Creation-default contradiction requires ct, not a builder status edit.
- **RECORD-009 — CHEAP:** keyless same-name candidates remain review-only until chosen merge. records-merge-review.test.ts covers review and merge; sd f14/strategy-trial-10 cover keyless cases; exclude.
- **RECORD-010 — CHEAP:** edit call duration/attendees as well as text/time, and qualify note/call/meeting on contact/company/deal with no score/mail effect. records/manual.ts accepts those values; operator/ui/record/entry-editor.tsx exposes only text/time. tests/support/manual-meeting.ts deliberately retains duration/attendees unchanged; a real UI gap remains. Attachments stay RECORD-018.
- **RECORD-013 — CHEAP:** confirmation on each delete, company detaches contacts/deals without deleting them. records-complete.test.ts already proves deal sent-history/contact erasure; deletion helpers exist. Check existing sd delete continuations before dispatch; do not redo contact erasure.
- **SIGNAL-003 — CHEAP:** persisted-store/process restart replay retains one identity/effect and changed-payload conflict. Concurrent live replay exists in signals-outreach.test.ts; sd f24 owns restart proof; exclude.
- **SIGNAL-004 — CHEAP:** ambiguous identity held and exactly one evaluation after manual link. signals-outreach.test.ts has signed rollback/replay/link tests; sd f35 owns the qualification; exclude.
- **SIGNAL-005 — CHEAP:** late event orders around newer history, triggers fresh evaluation and preserves later-written fields. ingestion/evaluation exist; sd f42 owns full late-event proof; exclude.
- **SIGNAL-007 — CHEAP:** identity-free chat held, no unsupported customer history, no public tracking assets/network/cookies. Existing ingestion holds page views; sd f58 owns public-network proof; exclude.
- **CAPTURE-003 — CHEAP:** booked meeting cancels scheduled work, drafts stale atomically, automatic reply does not stop work. capture-boundaries.test.ts covers genuine reply; sd f43 owns remaining atomic-stop matrix; exclude.
- **CAPTURE-005 — CHEAP:** delegated credential refused, address-only intake permitted, proposed contact remains blocked. capture-review/boundaries tests exist; sd f34 owns application intake refusal; exclude.
- **CAPTURE-006 — CHEAP:** Google/Microsoft selected-folder/calendar reads and resume/revoke/reconnect. capture-providers.test.ts and capture-provider-network.ts cover both adapters and authority; sd f60 owns remaining proof. Real tenant qualification is separate R-1/R-2.
- **CAPTURE-008 — CHEAP:** oversized mail counted without retaining content. Private tag/rotation/envelope capture already tested in capture-no-console.test.ts; sd f27 owns size handling/proof; exclude.
- **CAPTURE-009 — CHEAP:** validate link, clock refresh, changed/cancelled event deduplication and original occurred time. capture-no-console.test.ts exists; sd f63 owns lifecycle repair/proof; exclude.
- **OPP-001 — CHEAP:** complete won/lost reasons, actor/time, late evidence staying closed, explicit reopen queue, unchanged stage/owner and each lifecycle transition. records/repository.ts lifecycle() already writes state/history and queues reopen evaluation; complete native/browser proof absent. Candidate 2.
- **OPP-002 — CHEAP:** stage/owner edits preserve independent lifecycle/queue/score/band. UI visibility is in operator.spec.mjs; sd f25 owns mutation independence proof; exclude.
- **OPP-003 — CHEAP:** band/contribution/policy-version/decay and closed-deal exclusion after weighted signals and edits. Evaluation storage exists; sd f62 owns native computation proof; exclude.
- **OPP-004 — CHEAP:** follow every contribution to original evidence/current reason. Current operator.spec.mjs still resolves IDs through API inside the test; sd f45 supplies the missing product link/source-evidence door and authorization proof; exclude.
- **OPP-006 — CHEAP:** tied/untied deterministic NOW order, rep/stage/band filtering and reload. Queue query/UI exist; sd f47 owns tie/filter qualification; exclude.
- **OPP-007 — HARD:** stale and true five-working-day response clocks in workspace timezone, complete form/reply/booking/failure NOW/NEXT/removal matrix with one explained transition/event. Close-deadline and failed-send slices already exist; sd f111 owns close only. Timing, accepted settlement and ingestion interact. Candidate 1 is only stale/awaiting clock remainder, not a whole-clause completion.
- **OPP-008 — CHEAP:** skip preserves historical action and sends no mail; only genuinely new evidence yields a new recommendation. signals-outreach.test.ts already covers completion; sd f26 owns skip/no-send proof; exclude.
- **ACTION-001 — CHEAP:** evidence/version readback and named action without invented explanation when AI is off. Recommendations exist; sd f52 owns the disabled-AI proof; exclude.
- **ACTION-002 — CHEAP:** evidence and operator mutations supersede; historical action cannot draft, send or complete. evaluation-repository.ts writes superseded history and stales drafts; assistance/routes.ts rejects changed preview; approval-repository.ts fences current recommendation. signals-outreach.test.ts:161 proves only evidence supersession plus obsolete completion refusal. Candidate 3 covers remaining entrances.
- **ACTION-003 — CHEAP:** actual draft facts cite current fields/signals and configured instructions; no send. assistance.test.ts covers preview/citation failure; sd f36 owns factual adapter proof; exclude.
- **ACTION-005 — CHEAP:** customer/deal changes stale drafts, sending refused, differences reviewed. stale-review.spec.mjs/capture-boundaries.test.ts exist; sd f46 owns native edit matrix; exclude.
- **OUT-001 — HARD:** real owning MCP customer-message call under held policy, exact saved revision and one effect. Native session approval/source refusal already tested. sd f158 and saved-message fixture repair own this surface; exclude.
- **OUT-002 — CHEAP:** persisted provider-accepted/delivered/bounced/failed/uncertain labels distinct in buyer UI. Existing provider event test covers delivery; sd f44 owns state/label repair; exclude.
- **OUT-003 — CHEAP:** concurrent approvals yield one durable intent, persisted restart replay and at most one provider submission. Approval commit fence exists; sd f48 owns proof; exclude.
- **OUT-005 — CHEAP:** one sent activity, completed recommendation/NEXT, one notice and replayed receipt with no second effect. source-onboarding.test.ts carries NEXT assertion outside stale evidence; sd f51 owns settlement/proof; exclude.
- **OUT-006 — CHEAP:** ambiguity distinct, permanent bounce stops contact, retained provider reason. outreach-limits.test.ts covers bounded retry; sd f59 owns remaining delivery-failure proof; exclude.
- **OUT-007 — CHEAP:** booking/unsubscribe/bounce/manual stop cancel schedules exactly once and stale drafts. signals-outreach.test.ts includes stop/late dispatch coverage; sd f49 owns replay qualification; exclude.
- **OUT-009 — CHEAP:** schedule/cancel and dispatch recheck evidence, permission, recipient and exact authorized bytes. signals-outreach.test.ts has dispatch rechecks; sd f50 owns remaining scheduled-proof matrix; exclude.
- **OUT-010 — CHEAP:** immediate and scheduled submission limits, visible reason/next window, no silent retry. outreach-limits.test.ts exists; sd f29 owns scheduled-limit proof; exclude.
- **OUT-011 — CHEAP:** lost acceptance transaction, durable-intent reconciliation after restart, unresolved remains visible, no resubmit. Existing test covers lost provider response; sd f53 owns crash/reconciliation proof; exclude.
- **AI-002 — CHEAP:** invalid schema/transport failure visible, no fabricated repair, bounded retries. assistance.test.ts covers foreign citation; sd f55 owns transport/schema matrix; exclude.
- **AI-003 — CHEAP:** configured outage preserves manual CRM, capture/linking, scoring/queue/search, named recommendation/evidence and rendered failure. Unconfigured/manual-send continuity already exists; live model use unnecessary for software proof. Preserve current outage continuation work.
- **AI-004 — CHEAP:** failed/successful call provider/model/tokens/duration/cost and daily/feature Settings totals. assistance.test.ts has usage assertions; sd f76/f79 own failed-preview accounting; exclude.
- **NOTIFY-001 — CHEAP:** assigned owner overrides latest actor; unassigned fallback and replay once. assistance.test.ts:215 plus notification-responsibility.ts already assert assigned responsibility; stale gap. sd f23 owns proof; exclude.
- **NOTIFY-002 — CHEAP:** recipient read survives fresh native sign-in, independent other recipient and no duplicate notice. assistance.test.ts:211 plus notification-session.ts already assert it; zz-notifications.spec.mjs covers browser read persistence. sd f22/f23 overlap; exclude.
- **PUBLIC-001 — CHEAP:** installed Lobby and separate site branding/sign-in links, no private HTML/network data. baseline.spec.mjs/worker-smoke.spec.mjs exist; sd f123 owns populated privacy proof; exclude.
- **PUBLIC-004 — CHEAP:** expired one-use link refusal and linked provider cannot admit unknown operator. identity.test.ts:31 and provider-redirects.test.ts cover expiry/admission; current main 14a3aae preserves explicit invited acceptance. sd f32 overlaps; exclude.
- **DATA-002 — HARD:** erase captured/imported evidence, aliases/drafts/transfers/AI/mail/Slack, anonymous audit, tracked visible provider deletion, five-minute bound and no resurrection. capture-erasure/contact-erasure/Slack archive helpers contain substantial proof; full cross-provider and capacity qualification remains. Do not mistake historical release receipt for current candidate proof.
- **DELEGATE-001 — HARD:** all selected-record kinds/scopes, native consent+PKCE, revocation/restore, Slack grants no authority and acknowledgment cannot accept proposed handoff. delegation/authority-regressions and brief-handoff tests plus Slack proof exist; sd f31 and Zoom privacy continuations overlap; exclude these slices.
- **TEAM-005 — HARD:** native manager/two reps, restricted owned/shared record+field access through URLs/search/API/reports/export/AI, revocation/sign-out/restore. Current collaborator privacy is narrower. Native role/team rollout touches every door; sd f3/f8 own attempted role foundation. No fresh parallel role rollout.
- **TEAM-006 — HARD:** team report/drill scope and hidden totals, team quotas/forecast overrides, team dashboard filter/sharing/defaults/user override and every export/email audience. Requires TEAM-005 across reports/forecast/dashboard.
- **TEAM-007 — HARD:** actual team library access/merge authority, team mention fanout/current access and private-entry audience across Shared/Mentions/notices. Current author privacy exists; real teams remain TEAM-005.
- **TEAM-008 — HARD:** mappings never confer access, next-request role revocation/fresh mapping, restricted audiences/channels, actual admin/team Slack routes and dashboard notices, attributed per-team budget changes. Requires TEAM-005 plus transport/notification enforcement.
- **RECORD-014 — HARD:** Territory custom object/relationships/layouts, lead conversion preserving evidence/consent, denied-item reviewed bulk edits and per-value source history. Typed fields, immutable definition history and saved sorted views already exist in typed-fields-proof.ts/saved-views-proof.ts and records-complete.test.ts; sd f167 owns saved views. Do not rebuild them.
- **RECORD-015 — CHEAP:** champion/evaluator/verified decision-maker, second company, primary move preserving history/current authorization. relationships implementation and buying-context.ts exist; sd f54 owns access/association proof; exclude.
- **RECORD-016 — HARD:** all owner kinds including future leads/custom objects, per-item denial, attributed changes and guarded undo. Contact/company controls and bulk 19/20 slice exist in record-ownership.ts; do not repeat sd f1. Later kinds depend RECORD-014/TEAM-005.
- **RECORD-019 — HARD:** explicit imported Contact/Company/custom-object/People/Organization/Lead/Account owner mapping, unmatched counts, queues/unassigned and undo. import-owners.ts, imports/owners.ts and current HubSpot/Pipedrive mappings exist; 1833f212/ca63c4ad preserve labels without metadata leakage. Salesforce sd f183 and absent lead/custom-object foundation prevent full completion.
- **RECORD-020 — HARD:** reviewed company-to-unowned-contact rule, first nonbulk human send to unowned lead, always-sync primary ownership, automated/bulk exclusion and rule-attributed history. Owner-rule orchestration spans RECORD-014/capture/mail/workflows; broad prior owner foundation excluded.
- **RECORD-021 — HARD:** opt-in mapped current-access personal assignment DM per batch, no replay/undo/self notice, no authority granted, all kinds/deal notices. Native grouped contact/company assignment exists; tasks reassignment already tested. Personal channels and future kinds depend NOTIFY-003/TEAM-005.
- **RECORD-022 — HARD:** My/Unassigned across Contacts/Leads/Companies, every owner filter/group/report/dashboard, restricted next-read reassignment and removal handover. Contact/company search supports owner filters; future kinds and restricted-role totals/removal are not complete.
- **RECORD-024 — HARD:** text-free current-access Slack mentions and nonaccepting acknowledgment plus recipient-preferred email/push/Slack delivery. Slack slice exists in personal-slack-proof.ts; sd f31 covers acknowledgment. Email/push remain NOTIFY-003, so cannot call whole clause cheap.
- **RECORD-018 — HARD:** actual PDF/activity upload, metadata/versions/Files list and executable/150MB refusal. No file storage/upload subsystem; capture/mime.ts drops attachments. Requires byte storage, schema, access and retention design.
- **RECORD-025 — HARD:** restricted direct-download/current field grants, attributed file/version/activity deletion within bound, short-lived links and sandbox previews. Depends RECORD-018 and TEAM-005; not a UI-only slice.
- **RECORD-026 — HARD:** capture genuine PDF excluding inline logo on contact/company/deal, permitted exact-version attachment review/send and oversized/forbidden refusal. Requires RECORD-018 plus MIME/provider/approval/transport bytes.
- **RECORD-027 — HARD:** migration byte/count reconciliation, SHA-256 archive restore, selective attachment erasure and public file API/webhooks/exact AI preview. Depends file storage and cross-subsystem migration/API custody.
- **MIGRATE-001 — HARD:** full activities/associations/owners/files/workflow mapping, interrupt/resume/replay/undo plus authorized real export. Current HubSpot connected import exists (imports/hubspot and hubspot-api-proof.ts); stale CSV-only gap. sd f174 overlaps; files/extra entities and real export remain.
- **MIGRATE-002 — HARD:** connected two pipelines/cross-linked activities/files, rate-limit resume, total reconciliation/undo plus real export. imports/pipedrive and pipedrive-api-proof.ts already implement connected custody; stale CSV-only gap. Full files/products/activity/real-export qualification remains.
- **MIGRATE-003 — HARD:** Salesforce sandbox converted leads/types/custom objects/activities/Files, reviewed map/resume/replay/undo and real export. No Salesforce code on inspected main; sd f183-renumber-2-land-r1 carries Account/Contact foundation only; exclude it, do not claim complete target.
- **CAPTURE-010 — HARD:** unknown correspondent proposals, captured PDF, complete historical window and both-provider tenant qualification. Read scopes/leases/rules/corrections/revoke are implemented in capture-mail-rules/capture-providers tests; explicit calendar-window sd f114 exists. Depends files/prospect custody, not just OAuth.
- **CAPTURE-011 — HARD:** edit provider-originated meetings, concurrent provider edits, recurring occurrence controls and live both-provider journey. calendar-writeback.ts already tests separate write consent and single Orbit-created meeting writes. Recurrence/provider revision synchronization remains.
- **CAPTURE-012 — HARD:** both-provider unknown mail/meeting proposal metadata without customer/score, exclude all named automated/internal types, sealed evidence expires at 30 days. Requires new proposal custody and privacy integration; field legal qualification separate.
- **CAPTURE-013 — HARD:** explicit-basis acceptance, one-time full thread backfill/same-thread reply, decline suppression, manual and every named import/migration/form door, Microsoft repeat and collision/denial/concurrent-stop fences. Cross-door backfill depends CAPTURE-012.
- **CAPTURE-014 — HARD:** recorded reviewer/source/owner/basis distinct from marketing consent, unknown lawful basis blocked, channel authority separate, suppression wins, decline/erase/restore no source resurrection or expired evidence. Requires CAPTURE-012/013 and privacy/legal policy.
- **FORM-001 — HARD:** hosted/framed/direct HTTPS, exact reviewed required/text/picklist/hidden/custom mapping already in forms-mapped-journey and browser-form-mapping. Future lead/custom-object/team/channel inheritances still depend RECORD-014/TEAM-005/NOTIFY-003. Do not invent another form mapper.
- **FORM-004 — HARD:** round robin skips inactive, durable choice/notice, preserve existing/fixed/unassigned owner, NOW and export/erase. forms-mapped-journey proves unassigned/replay; 9940c015/f54f6712 retain notice/history assertions. Teams/deal-less leads depend their owning clauses.
- **OUT-013 — HARD:** Gmail bound send consent, review, Sent/timeout/revoke in outreach/mailbox and mailbox-send-proof.ts, capture-providers.test.ts:66 and browser journeys. Microsoft send, attachments and real recipient threading/tenant proof remain. Do not duplicate existing Gmail foundation.
- **OUT-014 — CHEAP:** remaining second-operator use, signature/opt-out exact bytes and library/rendered review at 1440/390. Core library snapshot/refusal proof exists; sd f67 owns completion; exclude.
- **OUT-015 — CHEAP:** prove no pixel/redirect/token collection; preserve accepted/delivered/inferred/open/human distinction, no automatic/foreign stop. launch-reply-authority.test.ts and existing transport proof cover much; sd f41 owns honest no-tracking slice; exclude.
- **OUT-016 — HARD:** disclosed Gmail one-to-one and Microsoft sequence tracking, exact redirect, untracked status and opaque least-authority tokens. No collection subsystem; depends mailbox/sequence and legal qualification, not a cheap pixel.
- **OUT-021 — HARD:** proxy/scanner/preaccept classification with reasons, first/last/count/link/source, one eligible event notice and no cookie/fingerprint/raw network metadata. Depends OUT-016/NOTIFY-003 and privacy rules.
- **OUT-022 — HARD:** do-not-track/suppression/erase/disable/expiry cease collection but redirect correctly, multi-recipient whole-message exclusion and inferred engagement never counts as business outcomes. Depends tracking plus recipient model and reporting.
- **OUT-017 — HARD:** connected-provider lead/no-deal/won-only/company composition with exact rules and real replies, no implicit deal/reopen. Native record mail already exists in record-mail.ts/signals-outreach.test.ts; future leads, Microsoft and attachments remain.
- **OUT-023 — HARD:** all external recipients/BCC histories, headerless reply hold, working-day deal-less obligation and exact closing events/notices, ten deal-less sequence enrollments. Single-recipient record-mail helpers exist; sd f177 owns meeting-follow-up continuation. Recipient/sequence dependencies remain.
- **OUT-018 — HARD:** separate per-user sequence budget/pace, provider-submitted count once across recipients, lowered SDR budget isolates only that SDR while one-to-one remains. outreach-limits.test.ts covers one-to-one independence; sequence/batch dispatcher still absent.
- **OUT-024 — HARD:** per-Gmail/Microsoft mailbox quotas including lower trial/consumer limits, defer only that mailbox with visible next window, no identity/transport switch. Partial Gmail transport exists; complete mailbox quota scheduler does not.
- **OUT-025 — HARD:** 12 mixed-transport users, 40 one-to-ones each within 60s, two 100x4 batches drained/interleaved in business day, 75% sequence share, reserved one-to-one, round robin/enrollment order under all limits. Requires real batch scheduler plus measured capacity.
- **OUT-026 — HARD:** 25-user measured submission latency, all four refusal reasons/value/window and mailbox/own/admin usage plus mixed morning. Current one-to-one/shared usage exists; mailbox/sequence capacity architecture prerequisite.
- **OUT-019 — HARD:** editable exact To/CC/BCC including internal/one-off recipients, review/address/permission checks, no unintended contact or consent creation. Draft/message schema remains single recipient; requires approval/dispatch/history migration with OUT-027/028/030/031.
- **OUT-027 — HARD:** provider-thread Reply/Reply all with external/internal recipients, selected-contact authority and exact reviewed recipient changes. Depends new recipient model and both mailbox providers.
- **OUT-028 — HARD:** per-recipient delivery/bounce/uncertainty and truthful BCC disclosure on permitted records. Requires normalized recipient receipts/history and replay semantics.
- **OUT-020 — HARD:** new-vs-upgrade defaults/pre-setting approvals and exact Gmail/sequence relationship opt-out state. outbound-boundaries/prior-opt-out-continuity tests cover upgrade and relay exact bytes; sd f146/f148 overlap. Sequence/Microsoft obligations still unbuilt.
- **OUT-029 — CHEAP:** record-mail capability archive roundtrip and review/settings/confirmation/suppressed/invalid screens at both widths. opt-out-archive.ts proves private capability persistence for existing paths and original links without expiry; do not redo completed deal-bound proof. Check existing capability continuations first.
- **OUT-030 — HARD:** three-recipient message omits one-click, shared page names/stops only submitting recipient with basis/citation; preserves others/schedules; nonrecipient refusal leaks nothing; one-off stop without contact. Depends OUT-019 model.
- **OUT-031 — HARD:** one unattributed stop request pauses all external schedules/enrollments without guessing suppression; notify sender/distinct owners once; named resolution/resume or cannot-determine stop-all with actor/time. Depends multi-recipient/sequence durable coordination.
- **OUT-032 — HARD:** connected mailbox/sequence/batch/workflow retain exact reviewed opt-out across upgrades/transports and refuse unsupported state. Existing established-installation retention and SendGrid/relay proof is credited; inherited recipient/sequence paths remain prerequisites.
- **TASK-001 — CHEAP:** actual process/store restart around recurrence, rendered daily completion and unavailable personal-channel truth. sales-tasks.ts already asserts high due call, assignment/reassignment, concurrent weekly completion, single next occurrence and DST, but its restart merely creates another app against the same db. Do not rebuild recurrence or duplicate sd f85 receiver notice.
- **NOTIFY-003 — HARD:** due/overdue/digest with timezone/hours, missed-run recovery/escalation, personal assignment/form/report email and push/DM deletion. Existing opted-in text-free Slack mention is built; mail system sender/attachments and Apple/Google device delivery are separate prerequisites.
- **SEQUENCE-001 — HARD:** rep-shared versioned multi-step library with email/task/manual actions, exact thread/signature/opt-out snapshots and safe enrollment semantics. sd f164/f171/f172 own immutable authoring foundation absent on main; exclude it. Runtime/enrollment not delivered by authoring.
- **SEQUENCE-004 — HARD:** deal-less enrollment, working-day scheduled steps, manual execution/threading and stop/pause/reassignment/disconnect invariants. Single scheduled mail is not a multi-step enrollment; depends sequence foundation/mailbox.
- **SEQUENCE-005 — HARD:** sequence/enrollment outcomes by step/rep, separate delivery/reply/meeting/deal outcomes and no tracking inference as conversion. Depends durable sequence runtime and report joins.
- **SEQUENCE-002 — HARD:** external CC-colleague exit and full due-step event races with actual persisted process restart. Single scheduled cancellation/reply/booking/stage/replay behavior exists in signals-outreach.test.ts; multi-recipient/enrollment runtime absent; sd f110 owns human single-message stop.
- **SEQUENCE-003 — HARD:** one reviewed 50 eligible plus 3 excluded selection, ten deal-less, five steps/four emails, exact per-item renders/edit/removal and one batch approval. Requires saved-list eligibility, sequence runtime and durable exact-content batch custody.
- **SEQUENCE-006 — HARD:** per-item hash/version-bound scheduled one-effect dispatch, 40/day visible deferral, isolate changed recipient, exits/pace/priority/quiet hours/snapshots/opt-out. Requires batch ledger and fair budget scheduler; cannot be inferred from single-message approval.
- **SEQUENCE-007 — HARD:** workflow contacts grouped by owner/sequence/day into approval queue, no preapproval send, durable approver/hashes/holds history/audit. Depends AUTO and batch enrollment, never automatic approval.
- **AUTO-001 — HARD:** actual sales-admin/team/lead/custom-object/enrichment/call triggers, sequence approval queue, large/pre-journal previews/history pagination and scoped provider qualification. Native versioned internal workflows already exist; sd f4/f9/f10 own foundation/repairs; exclude repeat.
- **AUTO-002 — HARD:** real role/field grants, future object targets and product/quote/forecast writes, owner rules, full per-action previews/atomic-failure/intervening-edit qualification and source in reports/API/migrations. Existing typed set/copy/stamp/clear/arithmetic/stage/create-deal guards/undo remain credited.
- **AUTO-003 — HARD:** complete pre-journal 30-day/per-action previews, old-version stop, workflow/version/trigger/old-new attribution in field history/reports/webhooks and migration action mapping. API/migration sources and history reconstruction are cross-subsystem.
- **AUTO-004 — HARD:** needs-approval editor/counts, protected contactability/consent/delete/merge refusals, quote/forecast actions. Current guarded approval/decline/7-day closure exists. Quote foundation sd f165 excluded; future target wiring still required.
- **AUTO-005 — HARD:** protected field activation/current grant refusal, who/time intervening edits, atomic validation failures with earlier undoable/later stopped actions, full loop-depth/order/rate/restart proof. Existing version authority/CAS/typed guards/rate queue/resume credited.
- **AUTO-006 — CHEAP:** no implementation gap recorded; created-record archival conditional undo/skips, stage reversal, attribution/no task/message deletion/no send need independent gate. workflow-undo-journey.ts and strategy-trial-5 cover it; exclude a builder or status edit.
- **CALL-001 — HARD:** Aircall and actual authorized Twilio call/callback/disposition journey and complete buyer walk. Stale definite-refusal/disposition gaps are already built: calls/routes.ts/repository.ts plus twilio-calls.ts test failed codes 21210-21217 and no-answer/busy/canceled/failed; calling-journey.mjs screens at 1440/390. Live account is field qualification, not justification to rebuild fixtures.
- **CALL-002 — HARD:** consented recording, cited transcript/speaker review/stale proposals/risk evidence, access playback, retention/local derivatives/provider deletion. No recording/transcript store; requires CALL-001, file custody and legal policy.
- **CALL-003 — HARD:** per-participant consent, withdrawal/multistate legal enforcement, recording/transcript derivatives and confirmed provider erasure visible on failure. Requires CALL-002 and provider/legal qualification.
- **REPORT-002 — HARD:** true team filters/scopes/defaults and weekly recipient-specific delivery. Nine tiles, filters, current-access drill/export/versioning and Slack routing already built; TEAM-005 and system email/attachment transport remain prerequisites. sd f162/f178/f181 own saved-source link fixes.
- **REPORT-003 — HARD:** team sharing/default/user overrides and restricted audiences on every tile/export/email copy. Named/workspace sharing and current access already built; depends TEAM-005 and NOTIFY-003.
- **REPORT-004 — HARD:** daily/weekly/monthly recipient-specific attached PDF/CSV email, next-send revocation, visible attempts/retry/uncertainty/no resend. Slack generic-link schedule exists; current relay cannot carry attachments and no system sender exists. Transport capability is a precise dependency, not permission to fake email.
- **QUOTE-001 — HARD:** products/line items/discount/tax/USD versioned exact quote, customer review/accept/signature, stale-version refusal, permission and export/history. Main lacks quotes; sd f165 owns native versioned nonbinding quote foundation only. Complete signing/provider/commitment remains.
- **INTEGRATE-001 — HARD:** native Dial and full Calendly reschedule/cancel/completion shared-identity lifecycle/buyer walk. Signed Calendly ingestion exists; sd f163 owns lifecycle continuation, exclude. Receiving Dial API/authorized account qualification still needed.
- **INTEGRATE-002 — HARD:** zoom/*, zoom-meeting-proof.ts and today-brief.test.ts:294 cover connected meeting plans and browser. Delegated attendee privacy has sd continuation. Complete provider/retention/recording and buyer-walk proof remains; do not recreate Zoom connector.
- **INTEGRATE-003 — HARD:** actual Nectar/Stripe customer billing events with exact USD/counterparty/source, deduplication, access/erase/custody and receiving-state links/buyer walk. Main lacks billing; sd f166/fix1 owns Stripe test-context foundation; Nectar/real account remain.
- **INTEGRATE-004 — HARD:** HappyToHelp/Help Scout/Zendesk exact account/ticket context, current permission/link/event identity/replay/erasure and full buyer walk. sd f170/fix1 owns Zendesk foundation absent on main; other adapters/receivers remain.
- **INTEGRATE-009 — CHEAP:** foreign app/enterprise/user-team, access loss, spent action with changed timestamp, no mail edits/approval/proposed-handoff acceptance, no mapped authority. slack-actions-proof.ts already covers atomic rollback/single-use and sd f31/f64/f69 acknowledgment/rollback; exclude duplicate.
- **INTEGRATE-011 — CHEAP:** restored pending deletion requires fresh confirmation, allowed call/meeting link fields and Settings/status/unresolved screens at 1440/390. slack-archive-proof.ts contains portable redacted history/paused credentials/deletion outcomes; sd f17/f104/f156/f160 overlap; exclude.
- **INTEGRATE-006 — HARD:** authorize QBO/Xero, explicit reviewed won-deal accounting handoff and exact mapping, one accepted provider identity/replay, permission/erase/paused restore and buyer walk. No complete connector; money/accounting schema and provider consent required.
- **INTEGRATE-007 — HARD:** complete hosted authorized Mailchimp receipt/webhook verification, full buyer walk/provider qualification. mailchimp-ledger-proof.ts and launch-suppression.test.ts already assert ledger custody, consent and merge/suppression; stale missing-ledger/merge gaps. Check supported signing/registration and 100-request continuation limits, not fabricated universal success.
- **INTEGRATE-008 — HARD:** exact reviewed won USD deal/customer/commitments handoff to Buoy once, follow accepted receiving identity, auth/role/erasure/restore and buyer walk. No Buoy adapter/receiving API proof; needs cross-seed contract, not Slack substitute.
- **ENRICH-001 — HARD:** licensed provider waterfall, preview/price/USD cap, exact identity/cited proposed changes and scheduled news/job signals with retention/erase. Capture proposals alone do not enrich. Adapter/budget/custody buildable with fixtures; real entitlement required separately.
- **API-001 — HARD:** full versioned contact/company/deal/activity/task/file resources, field-aware scopes, CRUD/errors/pagination/revision behavior and complete API journey. API-004 scoped live deal reads already DONE; integrations API/delegation must not be broadened incidentally.
- **API-002 — CHEAP:** named scoped credential create/rotate/revoke/expiry/audit/custody qualification. api-credentials-proof.ts, onboarding-archive and archive-transfer tests already cover local-only authority and restore/erase fences; strategy-trial-14 overlaps. Preserve scopes; do not rebuild token storage.
- **API-003 — HARD:** outbound subscriptions validate safe destinations/secrets/scopes, signed identity/order/retry/deadletter/manual replay, revocation/erase/restore. Requires durable delivery queue and API event sourcing; inbound signed source is not an outgoing webhook.
- **MOBILE-001 — HARD:** native iOS/Android, real offline conflict reconciliation/push and phone multi-recipient compose; responsive web already exists. Offline/storage/native auth/queue architecture plus store/device qualification; no responsive-only completion.
- **OPS-001 — HARD:** owned fresh install/deploy/update/restore/removal, explicit connector failures and actual Workspace/Entra policy journey. OIDC required-domain policy/refusals already in sign-in-domains/provider-redirects tests; native installed tests are not real tenant/release proof.
- **BOUNDARY-001 — HARD:** complete named-product USD buyer walk with product-state/owned-job truth and 1440/390 proof, no scope loss or substitute connector. source-onboarding and Integrations state proof exists; completion belongs to last-shipping receiver, not this planner.
- **AGENT-001 — HARD:** call/enrichment/stakeholder graph maintenance with evidence, current access, review and hostile-content safeguards. agent-door-graph-proof.ts already verifies captured graph proposals under both policies; sd f161 owns expanded correction/erasure proof; exclude.
- **AGENT-003 — HARD:** durable quote-to-close cross-step outcome supervision. obligations, agent-follow-up-proof.ts and today-journey already cover meeting follow-up lifecycle; sd f177 owns continuation. Do not repeat meeting obligation foundation.
- **AGENT-004 — HARD:** configurable selected-account research with exact egress/MCP allowlist, cited schema-valid proposals, hostile evidence/revocation/custody and provider retention/legal policy. Requires adapter capability, policy and budget orchestration; not arbitrary tool execution.
- **AGENT-005 — HARD:** authenticated licensed Clay/Brave/enrichment adapters, entitlement, exact data preview, enforceable USD reservation/actual caps and truthful failure/retention. Requires AGENT-004/ENRICH-001 and licensed account qualification.
- **SURFACE-001 — HARD:** complete jobs/Core split IDs/non-tool reasons and full own-fixture conformance. Current agent-surface registry has more than stale 23-tool inventory; discovery/non-tool parity in agent-discovery-proof.ts. sd f149/f152 own guide parity; missing sequence/quote/file/provider jobs remain.
- **SURFACE-002 — HARD:** standard deal move/task/draft/owner-neutral/Undo with returned item counts, forged class ignored. Existing record/draft/handoff/forecast/report tools and native parity are credited; sd f127/f130 count reads, f140 internal-task audit. Remaining true jobs not declared by all their owners.
- **SURFACE-003 — HARD:** external internal/known/new/public counterparties and exact recipients across mail/forms/export/AI/deletion. agent-door-ai-input-proof.ts already covers AI egress; sd f158 owns customer mail; forms/files/provider-deletion full surface remains.
- **SURFACE-004 — HARD:** money amount/currency/counterparty for paid enrichment/finance and commitment version/value/counterparty for binding quote/signature. agent-door-forecast-proof.ts already proves nonbinding estimate standard; paid/binding owning jobs absent.
- **SURFACE-005 — HARD:** provider-person send/accounting consent and newly required person steps, supported company API route under real classes/policy. Capture source handoff sd f157 covers one slice; mailbox/accounting jobs incomplete.
- **SURFACE-006 — HARD:** access widening/people and security setting/provider for full grants/secrets/adapter enablement, no self escalation. Private-address rotation in agent-door-capture-security-proof.ts is built; native team/research/provider lifecycle registry remains.
- **SURFACE-007 — HARD:** destructive exact counts for every irreversible deletion/provider copy; actual regulated-kind/count sensitive vs ordinary contact data, reversible Undo standard. agent-report-deletion-proof.ts already covers saved-report deletion; files/recordings/other owning jobs absent.
- **SURFACE-008 — HARD:** live installation/workflow/Slack route facts; draft-only changes standard. agent-workflow-proof.ts already qualifies workflow draft distinction; full activated/provider-route class surface remains.
- **SURFACE-009 — HARD:** held policy exact saved content/recipients/attachments/tracking/opt-out/commercial version, changed merge requires revision, autonomous same permitted jobs without wait and truthful actor. sd f158 owns saved single-message tool; recipient/files/quote jobs remain.
- **SURFACE-010 — HARD:** every declared customer/deal/message/sequence/workflow/quote/file resource and event links, booking/reply/stage/quote/Buoy identity across supported channels. Current resources/events exist, but absent owning features prevent complete surface.
- **SURFACE-011 — HARD:** seeded week reconcile messages/quotes/finance/internal calls by class+decision and reserved/actual provider cost, explicit caps/no-cap and real handoffs. Current /agents seller-day audit and internal-task reconciliation exist; paid/commitment surface missing.
- **SURFACE-012 — HARD:** embedded/outside AGENT-001..005 equal state/outcomes/policy under both policies, hostile transcript/mail/tools change no facts/scope/policy. embedded-risk-agent-proof.ts already proves deal-risk parity; full graph/follow-up/research jobs remain.
- **SURFACE-013 — HARD:** full autonomous/held seeded week including arrivals/graph/stalled promise/permitted send/won Buoy, exact attribution/events/spend/overview cross-run. Stalled-deal and meeting-follow-up helpers already exist; sd f158/f161/f177 cover slices. Buoy/complete jobs and published-client receipts remain.
- **BASE-AGENT-001 — CHEAP:** remaining discover/version/order/cache/Origin/HeaderMismatch/413 protocol matrix through Base conformance. agent-door-body-limit.ts already has raw oversize no-effect proof; sd f113/f117 own it. Run pinned Base gate rather than duplicate Base runtime.
- **BASE-AGENT-002 — HARD:** complete Core jobs/non-tool reasons, all outputSchema fixtures and embedded same-tool effects. agent-door-draft-parity-proof.ts already qualifies manual draft UI/MCP; sd f153/f154 own normalization; absent owning jobs remain.
- **BASE-AGENT-003 — HARD:** all primary resource templates, full two-role UI parity, every write link and out-of-scope/missing parity, file budget and untrusted customer text. Current selected-company slice and report links are credited; sd f103/f132/f135 overlap; files/roles remain.
- **BASE-AGENT-004 — CHEAP:** token lifetime and consent-revocation deadline qualification after audience/unmapped/sponsor-change refusals. Business-bound implementation exists; use pinned Base conformance and seed native tokens, no invented second auth layer.
- **BASE-AGENT-005 — HARD:** current record-role narrowing and grant self-escalation refusal across seed jobs. agent-door-collaborator-proof.ts covers selected collaborator slice; sd f139/f143 overlap. Actual restricted roles remain TEAM-005.
- **BASE-AGENT-006 — HARD:** remaining classes external/money/commitment/destructive/access/security/live/gated with actual seed facts, forged arguments/text ignored. Stored-company hostile-text test exists; sd f136/f144 overlap. Complete SURFACE owning jobs still needed.
- **BASE-AGENT-007 — HARD:** policy-held sales action approval/execution through single chokepoint with no early effect; both all-autonomous and held/single-class policies. managed-owner.test.ts preserves rejected-write witnesses; saved-message sd f158 overlaps.
- **BASE-AGENT-008 — HARD:** provider person-step and approver attribution, never agent impersonating person. Existing native agent timeline attribution is credited; sd f128/f131 and f157 own person-step slices; exclude duplicates.
- **BASE-AGENT-009 — HARD:** audit exact resource/outcome/idempotency plus every class/decision and overview reconciliation. Core audit exists and relay pulls have proof; sd f120/f125/f140 overlap. Absent classes depend their owning jobs.
- **BASE-AGENT-010 — HARD:** follow changes through required subscriptions and signed outbound deliveries with same identity/current access. orbit.events.list alone is insufficient; depends Base transport and API-003 durable event delivery.
- **BASE-AGENT-011 — HARD:** capacity and spend-cap refusal/no-effect plus Pause, explicit limits. agent-door-capacity-proof.ts already probes raw discovered capacity under both policies; real paid-provider spend paths depend missing owning jobs. Do not duplicate capacity fixture rounds.
- **BASE-AGENT-012 — CHEAP:** dropped-stream same-key replay, 24-hour retention, changed-argument conflict, stale current-revision detail and cross-person job isolation/concurrency. Existing replay/revision/Pause fences credited; retained-contract qualification needed, no new native authorizer.
- **BASE-AGENT-013 — HARD:** docs exactly live names/classes/tests/scopes/resources, full harness failure matrix under both policies and stranger complete journey. agent-discovery-proof.ts and native journey exist; sd f149/f152 owns guide parity. Full owning job coverage/held week remains.

Verbatim source acceptance, status evidence and recorded gap (all 162 open clauses; provenance is inspected main):

### TEAM-001 — Equal operators (partial; HELD-EXTERNAL)

**Exact acceptance:**

1. Sign in as two full operators and an invited collaborator; confirm both operators reach every record and action, and that the collaborator is refused records, fields and actions outside the share through UI and APIs.

**Recorded gap:** Unproved: equality across every workspace action beyond the CRM journey. Existing FORECAST-001, OUT-014 and TEAM-007 authority rules refuse a second active full operator forecast configuration and shared-library writes; private library, report and dashboard audiences also retain feature-specific restrictions under REPORT-001 and REPORT-003, and sign-in policy administration remains owner-only. These authority boundaries require ct reconciliation with TEAM-001 before whole-clause DONE; no access is widened by this evidence change.

**Carried evidence:** src/core/features/access/service.ts`; `src/core/features/records/routes.ts`; `newtests/t096/collaborator-lifecycle.test.ts` — TEAM-001 signed-in peers use native and shared record actions while collaborators obey fields, grants and lifecycle fences (two emailed full sessions read all three CRM record kinds and private fields, edit through native and shared APIs, manage entries across authors, close and reopen deals, delete another operator’s records; an accepted Guest edits one shared field, forbidden reads and changes preserve records and timelines, revoked shares refuse replay, removal revokes the session; built CRM and shared-record pages at 1440 and 390); `newtests/t096/browser-journeys.test.ts

### TEAM-003 — One workspace (partial; CHEAP)

**Exact acceptance:**

1. Complete first-run setup with US timezone and USD, change working hours and stale intervals, reload, and observe the persisted settings across records.

**Recorded gap:** Unasserted in the carried evidence: persisted US timezone; persisted USD default; persisted working hours; persisted stale intervals; reload reads the settings across records. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

**Carried evidence:** tests/core/records-search.test.ts`; `src/core/features/pipelines/`; `tests/evidence/contract/TEAM-003/

### TEAM-004 — Removal handover (partial; CHEAP)

**Exact acceptance:**

1. Remove an operator who owns an open opportunity, an open sales task, a delegated handoff and a scheduled message; choose a receiver for the opportunity and explicit unassignment for the rest, and verify revoked sessions, cancellation, the recorded choice per set, the attributed owner-change entry and attributed historical notes.

**Recorded gap:** Unasserted in the carried evidence: delegated handoff unassignment; scheduled-message cancellation; choice recorded for every set; one attributed owner-change entry. Asserted: reviewed task handover; reviewed opportunity handover; revoked session; historical note retains its actor.

**Carried evidence:** src/core/features/settings/removal-handover.ts`; `src/core/features/tasks/handover.ts`; `tests/core/today-brief.test.ts`; `tests/evidence/contract/TEAM-004/

### RECORD-001 — Core records (partial; CHEAP)

**Exact acceptance:**

1. Through authenticated Records, create and edit a company, contact and USD opportunity with custom fields; reload and read back the associations and values.

**Recorded gap:** Unasserted in the carried evidence: contact create/read through authenticated Records; contact edits persist; company create/read through authenticated Records; company edits persist; USD opportunity create/edit; custom-field values read back; associations read back. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

**Carried evidence:** src/core/features/records/routes.ts`; `src/core/features/records/repository.ts`; `tests/core/crm-import.test.ts

### RECORD-003 — Identity keys (partial; CHEAP)

**Exact acceptance:**

1. Create case/whitespace email and domain collisions through Records; require a 409 naming the existing identity and no extra row; exercise free-mail and keyless records.

**Recorded gap:** Unasserted in the carried evidence: case and whitespace contact-email create and edit collisions, including existing identity and no-write results; free-mail keys excluded; keyless record create and edit; keyless records never link automatically. Import and Workbench duplicate proofs remain; guided provider migrations remain MIGRATE-001, MIGRATE-002 and MIGRATE-003; expanded roles retain TEAM-005 qualification and contract-cleanup prerequisites. The RECORD-007 creation-default conflict and every existing plan hold remain outside this slice.

**Carried evidence:** src/core/features/records/routes.ts`; `src/core/features/records/repository.ts`; `tests/core/crm-import.test.ts`; `tests/core/records-search.test.ts` — RECORD-016 reviewed owners and guarded bulk undo; OPP-009 TEAM-003 RECORD-015 RECORD-002 RECORD-011 RECORD-006 relationships retain history and pipelines move safely and search matches record and timeline text, intersects every opportunity filter and caps the first page; `tests/support/company-identity.ts` — exerciseCompanyIdentity: uppercase leading-www company domain readback, normalized company create and PATCH collisions return 409 with the original recordId, and fresh complete Records reads preserve companies, contacts, deals, associations and timeline entries

### RECORD-005 — Timeline (partial; CHEAP)

**Exact acceptance:**

1. Open a record containing mail, meetings, notes, changes and a merge; inspect occurred/recorded times, source and actor, including out-of-order events.

**Recorded gap:** Unasserted in the carried evidence: combined mail, meeting, note, stage and owner change, and merge coverage; exact per-entry occurred and recorded times, source and actor. The browser journey asserts native Records and opportunity reads before and after reload and visible note order at 1440 and 390 for late older arrivals and equal-time ID ties; it does not qualify the complete combined journey.

**Carried evidence:** src/core/features/records/routes.ts`; `src/core/features/records/repository.ts`; `tests/core/crm-import.test.ts`; `tests/e2e/operator.spec.mjs` — the mobile opportunity timeline shows metadata and orders out-of-order notes with ID ties

### RECORD-007 — Ownership (partial; HELD-EXTERNAL)

**Exact acceptance:**

1. Assign, reassign and unassign an opportunity through its native control; reload and inspect its attributed timeline without changing score.

**Recorded gap:** Unasserted in the carried evidence: assign owner; reassign owner; unassign owner; owner persists after reload; attributed timeline entry; score unchanged. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

**Carried evidence:** src/core/features/records/routes.ts`; `src/core/features/records/repository.ts`; `tests/core/crm-import.test.ts`; `tests/core/records-search.test.ts

### RECORD-009 — Duplicate candidates (partial; CHEAP)

**Exact acceptance:**

1. Create same-name contacts across companies and keyless records; review candidates without a mutation, then complete a chosen merge explicitly.

**Recorded gap:** Unasserted in the carried evidence: keyless candidate listed. Asserted: same-name contacts across companies listed; same-name companies listed; review changes no records; chosen merge retires exactly one record.

**Carried evidence:** src/core/features/records/import-merge.ts`; `tests/core/records-merge-review.test.ts

### RECORD-010 — Manual entries (partial; CHEAP)

**Exact acceptance:**

1. Log, edit and delete a note, call and meeting on a customer record; verify time, duration and attendees, and verify no score or external message changed.

**Recorded gap:** Unqualified remainder: call editing; remaining combinations of entry kinds and record kinds; duration and attendee editing controls; mentions and attachments under RECORD-017 and RECORD-018; provider activity qualification. Existing three-kind creation, note creation, editing and deletion, call creation and deletion, and note and call independence remain credited. The selected manual meeting lifecycle, retained fields and author, attributed deletion and score and mail independence are asserted by the named journeys. No clause-specific hold is released.

**Carried evidence:** src/core/features/records/manual.ts`; `tests/core/today-brief.test.ts` — BRIEF-004 RECORD-010 RECORD-017 RECORD-023 OUT-001 a booked meeting gets a cited plan (extended by `tests/support/manual-meeting.ts` — exerciseManualMeeting: two full operators create, edit, freshly read and delete a manual meeting with exact time, duration, attending identities and original author; attributed deletion trace; unchanged score, band and complete draft and outbound inventories); `tests/rer/operator-actions.test.mjs` — BASE-PUBLIC-003 T099 native keyboard navigation, form validation, dialog focus and reviewed record changes (extended by `tests/rer/operator-manual-meeting.mjs` — exerciseManualMeeting: native meeting creation, another full operator's edit and confirmed deletion, fresh field and author readback, edit and delete screens at 1440 and 390)

### RECORD-013 — Deletion (partial; CHEAP)

**Exact acceptance:**

1. Confirm each record deletion; company removal detaches dependents, deal removal preserves sent history, and contact removal performs the erasure journey.

**Recorded gap:** Unasserted in the carried evidence: deletion confirmation enforced; company deletion detaches contacts; company deletion detaches opportunities. Asserted: deal deletion preserves sent history; contact deletion erases mail and linked signals.

**Carried evidence:** src/core/features/records/data.ts`; `tests/core/records-complete.test.ts`; `tests/core/contact-erasure.test.ts

### SIGNAL-003 — Idempotency (partial; CHEAP)

**Exact acceptance:**

1. Deliver identical events concurrently and after restart, then change the payload under the same source identity; retain one effect and a visible conflict.

**Recorded gap:** Unasserted in the carried evidence: replay after restart. Asserted: concurrent delivery returns one identity; one persisted effect; changed payload returns conflict.

**Carried evidence:** src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts

### SIGNAL-004 — Linking (partial; CHEAP)

**Exact acceptance:**

1. Ingest exact, ambiguous and unknown identities; verify linked and held queues, then manually link the held event once and inspect evaluation.

**Recorded gap:** Unasserted in the carried evidence: ambiguous identity held; exactly one evaluation after link. Asserted: exact identity affects the intended deal; unknown identity held; one manual link allowed; linked timeline retains event time.

**Carried evidence:** src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts

### SIGNAL-005 — Event time (partial; CHEAP)

**Exact acceptance:**

1. Deliver older evidence after newer evidence and inspect chronological history and fresh evaluation without overwriting later record state.

**Recorded gap:** Unasserted in the carried evidence: history sorted around newer evidence; fresh evaluation after late event; later-written fields not overwritten. Asserted: older event retains occurred time.

**Carried evidence:** src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts

### SIGNAL-007 — No tracking (partial; CHEAP)

**Exact acceptance:**

1. Inspect public assets/network and submit identity-free page/chat events; no Orbit tracker runs and unsupported identity stays outside customer history.

**Recorded gap:** Unasserted in the carried evidence: no tracking script/pixel/cookie in public assets/network; identity-free chat held; unsupported identity absent from customer history. Asserted: identity-free page view held.

**Carried evidence:** src/core/features/ingestion/routes.ts`; `src/core/features/ingestion/repository.ts`; `tests/core/signals-outreach.test.ts

### CAPTURE-003 — What capture applies at once (partial; CHEAP)

**Exact acceptance:**

1. Capture a threaded reply, booked meeting, permanent bounce and automatic reply; inspect atomic linking/stale/cancellation effects and verify automatic reply stops nothing.

**Recorded gap:** Unasserted in the carried evidence: booked meeting cancels scheduled work; drafts staled atomically; automatic reply stops no scheduled work. Asserted: threaded reply linked; permanent bounce stops contact.

**Carried evidence:** src/core/features/capture/intake.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-intake.test.ts

### CAPTURE-005 — Human boundary (partial; CHEAP)

**Exact acceptance:**

1. Attempt capture with native, collaborator, source and delegation authority; only permitted native/address intake succeeds, and a proposed new contact stays blocked.

**Recorded gap:** Unasserted in the carried evidence: delegation credential refused; address-only intake works; proposed new contact stays blocked. Asserted: native intake works; collaborator intake refused; source signature refused.

**Carried evidence:** src/core/features/capture/providers/oauth.ts`; `tests/core/capture-providers.test.ts`; `tests/core/capture-boundaries.test.ts

### CAPTURE-006 — Capture sources (partial; CHEAP)

**Exact acceptance:**

1. Connect each Google/Microsoft read adapter, choose folders/calendars, page and crash before cursor commit; resume without duplicates, revoke, reconnect and disconnect with visible errors.

**Recorded gap:** Unasserted in the carried evidence: Google adapter read; Microsoft adapter read; selected folders/calendars. Asserted: interruption before cursor commit; resumed cursor and deduplication; revoke halts reads and preserves records; reconnect restores capture; disconnect removes credential; visible error reason.

**Carried evidence:** src/core/features/capture/providers/service.ts`; `tests/core/capture-providers.test.ts`; `tests/core/capture-connector.test.ts

### CAPTURE-008 — Orbit address (partial; CHEAP)

**Exact acceptance:**

1. Create and rotate a tagged Orbit address, forward/BCC mail and a Gmail confirmation; accept exact envelope tags only and count oversized mail without retaining it.

**Recorded gap:** Unasserted in the carried evidence: oversized mail counted; oversized content not retained. Asserted: private tagged address created; tag rotation differs; exact envelope tag accepted; wrong envelope tag stores no signal; forwarded/BCC mail captured; Gmail confirmation read back.

**Carried evidence:** tests/core/capture-no-console.test.ts

### CAPTURE-009 — Calendar link (partial; CHEAP)

**Exact acceptance:**

1. Add a private ICS link, advance the refresh clock, change/cancel an event, then break the link; inspect dedupe, preserved times and the halted-source reason.

**Recorded gap:** Unasserted in the carried evidence: calendar link validated; clock advancement refreshes; event changes deduplicate; event cancellation retained; original event times retained. Asserted: broken link halts with reason.

**Carried evidence:** tests/core/capture-no-console.test.ts

### OPP-001 — Lifecycle (partial; CHEAP)

**Exact acceptance:**

1. Close a deal as won and lost with reasons, ingest later evidence, and explicitly reopen; inspect history and queue membership at every step.

**Recorded gap:** Unasserted in the carried evidence: lost close retains reason; closing operator and time; later evidence never silently reopens; explicit reopen restores correct queue; stage and owner remain unchanged on reopening; history records every lifecycle transition. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

**Carried evidence:** src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts` — "OUT-007 OUT-009 SEQUENCE-002 stage move, close and genuine reply end scheduled follow-up atomically; automatic reply and open report do not" (fresh authenticated won-close reason readback)

### OPP-002 — Independent state (partial; CHEAP)

**Exact acceptance:**

1. Change stage and owner and ingest scoring evidence; verify lifecycle, queue, stage, owner and score remain independently represented.

**Recorded gap:** Unasserted in the carried evidence: stage/owner changes preserve independent fields. Asserted: lifecycle independently visible; stage independently visible; owner independently visible; score independently visible; band independently visible; queue independently visible.

**Carried evidence:** src/core/features/records/repository.ts`; `tests/e2e/operator.spec.mjs

### OPP-003 — Evaluation (partial; CHEAP)

**Exact acceptance:**

1. Ingest weighted signals and edit an open opportunity; inspect computed score, band, contributions and policy version, including decay and closed-deal exclusion.

**Recorded gap:** Unasserted in the carried evidence: band; contribution values; policy version; decay; closed-deal exclusion. Asserted: computed score after signal.

**Carried evidence:** src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts`; `src/core/features/workbench/policies.ts`; `src/core/features/records/repository.ts

### OPP-004 — Explainability (partial; CHEAP)

**Exact acceptance:**

1. Open a scored deal and follow every contribution to its source evidence and current action reason.

**Recorded gap:** Not reachable in the product, so unasserted: following each contribution to its source evidence. A contribution in the deal's Why this is first list has no link or visible signal ID, Recorded details lists each signal's subject, kind, source and linking basis without ids, and no route serves a signal's source evidence; `tests/e2e/operator.spec.mjs` resolves each contribution's signal ID from the opportunity API inside the test and then finds its Recorded details line by subject text. Asserted at 390 and 1440 in the browser: every contribution shown with its signal subject, type, signed points and source; the current recommendation's reason and next action beside them; each contributing signal's Recorded details line names its source and how it was linked.

**Carried evidence:** tests/e2e/operator.spec.mjs` — OPP-004 — the mobile detail renders current score evidence and recommendation reason; push Verify runtime-browser in shards (batch-13); `src/core/features/opportunities/repository.ts`; `src/core/features/operator/ui/record/next-action.tsx`; `src/core/features/operator/ui/record/recorded-details.tsx

### OPP-006 — NOW ordering (partial; CHEAP)

**Exact acceptance:**

1. Create tied and untied NOW opportunities, filter by rep/stage/band and verify deterministic persisted ordering.

**Recorded gap:** Unasserted in the carried evidence: tied NOW order; rep filter; stage filter; band filter; ordering persists after reload. Asserted: untied NOW order.

**Carried evidence:** src/core/features/opportunities/repository.ts`; `tests/e2e/operator.spec.mjs

### OPP-007 — Queue entry (partial; HARD)

**Exact acceptance:**

1. Advance close/stale/awaiting clocks and deliver a form, reply, booking and send failure; inspect NOW/NEXT reasons and one timeline transition per event.

**Recorded gap:** Unasserted in the carried evidence: stale clock; genuine five-working-day awaiting-response deadline construction in the workspace timezone; complete form, reply, booking and failure reason and transition reconciliation; all NEXT and removal paths; the complete event matrix and one transition per triggering event beyond the close-deadline case. Asserted: close clock and its single explained transition; failed-send NOW reason.

**Carried evidence:** src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts`; `tests/core/request-scheduling.test.ts` — a fresh hosted schedule sends once through ordinary requests racing Cron, and due follow-ups return to NOW (a distinct Records-created open deal with an explicit null owner is read outside NOW before its expected close deadline; crossing that deadline through ordinary requests racing and repeating hosted timers yields one explained NOW entry and one timer-sourced feature transition with no human actor, preserving score, band, owner, stage and lifecycle)

### OPP-008 — Manual completion (partial; CHEAP)

**Exact acceptance:**

1. Complete or skip the current action without sending; inspect the recorded outcome and only a genuinely new recommendation.

**Recorded gap:** Unasserted in the carried evidence: skip retains historical recommendation; no message sent. Asserted: manual completion changes queue; only new recommendation gets a new identity.

**Carried evidence:** src/core/features/opportunities/repository.ts`; `src/core/features/workbench/repository.ts`; `tests/core/signals-outreach.test.ts

### ACTION-001 — Current recommendation (partial; CHEAP)

**Exact acceptance:**

1. Read an open deal recommendation with observed evidence and version; disable AI and retain the named action/evidence without an invented explanation.

**Recorded gap:** Unasserted in the carried evidence: current action evidence; current action version; named action remains with AI disabled; no invented explanation. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

**Carried evidence:** src/core/features/assistance/provider.ts`; `src/core/features/drafts/service.ts`; `tests/core/assistance.test.ts`; `tests/core/signals-outreach.test.ts

### ACTION-002 — Replacement (partial; CHEAP)

**Exact acceptance:**

1. Supersede an action by new evidence or an operator change; the old action remains historical and cannot be drafted, sent or completed.

**Recorded gap:** Unasserted in the carried evidence: new evidence supersedes old recommendation; operator change supersedes recommendation; old action stays historical; old action cannot draft; old action cannot send; old action cannot complete. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

**Carried evidence:** src/core/features/assistance/provider.ts`; `src/core/features/drafts/service.ts`; `tests/core/assistance.test.ts`; `src/core/features/workbench/action-repository.ts`; `tests/core/signals-outreach.test.ts

### ACTION-003 — Draft on request (partial; CHEAP)

**Exact acceptance:**

1. Preview and request a draft from current customer evidence; inspect the unsent result for cited facts and configured instructions.

**Recorded gap:** Unasserted in the carried evidence: draft facts cite current evidence; configured instructions honored. Asserted: request preview matches generated input; draft saved; no outbound message created.

**Carried evidence:** src/core/features/assistance/provider.ts`; `src/core/features/drafts/service.ts`; `tests/core/assistance.test.ts

### ACTION-005 — Stale draft (partial; CHEAP)

**Exact acceptance:**

1. Change the customer/deal or deliver a stop event after drafting; refuse sending until the operator sees and explicitly reviews current differences.

**Recorded gap:** Unasserted in the carried evidence: customer/deal mutation stales draft; stale send refused; current differences shown before new review. Asserted: reply stop stales draft.

**Carried evidence:** src/core/features/drafts/service.ts`; `tests/e2e/stale-review.spec.mjs`; `tests/core/capture-boundaries.test.ts

### OUT-001 — Exact-content customer sending (partial; HARD)

**Exact acceptance:**

1. Under the held company policy, attempt sending from ingestion, an agent and an unreviewed draft; only a signed-in person’s approval of the unchanged saved recipient, subject and body permits dispatch.

**Recorded gap:** Unasserted in the carried evidence: an actual agent customer-message call under held company policy through its owning agent-surface tool. Asserted: the current source signature ingests evidence but cannot approve or dispatch a saved draft without a native session; refusal is 401 with unchanged saved content and effect inventories and no mail submission, followed by signed-in exact-revision approval and exact reviewed bytes dispatched.

**Carried evidence:** src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`; `tests/core/source-onboarding.test.ts` (source onboarding authenticates inert connection tests, ranks real evidence and preserves customer reply through reviewed send); `tests/rer/onboarding.test.mjs

### OUT-002 — Message states (partial; CHEAP)

**Exact acceptance:**

1. Drive provider acceptance, delivery, bounce, failure and ambiguous responses; inspect each persisted state and truthful buyer-visible labels.

**Recorded gap:** Unasserted in the carried evidence: provider acceptance state; bounce state; persisted buyer-visible labels distinct. Asserted: delivery state; failed state; ambiguous state.

**Carried evidence:** src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts

### OUT-003 — Send idempotency (partial; CHEAP)

**Exact acceptance:**

1. Submit the same approval key concurrently and after restart; observe one outbound intent and at most one provider submission.

**Recorded gap:** Unasserted in the carried evidence: concurrent approval has one outbound intent; same key after restart; at most one provider submission. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

**Carried evidence:** src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`; `src/core/features/workbench/routes.ts

### OUT-005 — Accepted outcome (partial; CHEAP)

**Exact acceptance:**

1. Accept an approved send, replay its provider response and inspect one timeline message, completed action, NEXT transition and one notification for the responsible operator unless the outcome was caused by their own action, including their own immediate send outcome. The outcome remains visible on the record/timeline; this exception leaves other recipients' notices and later provider-event notices unchanged.

**Recorded gap:** Unasserted in the carried evidence: one sent timeline activity; recommendation completed; NEXT transition (assertion is in uncited tests/core/source-onboarding.test.ts); one notification; replayed provider response has no second effect. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

**Carried evidence:** src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts

### OUT-006 — Delivery failure (partial; CHEAP)

**Exact acceptance:**

1. Fail a submission transiently, permanently and ambiguously; verify bounded known-unsent retries, visible exhausted failure, one notification unless the responsible operator's own action caused the outcome (including their own immediate send outcome), and permanent-bounce stop. Verify that the outcome remains visible on the record/timeline and that other recipients' notices and later provider-event notices are unchanged.

**Recorded gap:** Unasserted in the carried evidence: ambiguous outcome distinct; permanent bounce stops contact; provider reason retained. Asserted: known-unsent retry bounded to five attempts; exhausted failure visible; one failure notification.

**Carried evidence:** src/core/features/outreach/service.ts`; `tests/core/outreach-limits.test.ts`; `tests/core/signals-outreach.test.ts

### OUT-007 — Stop conditions (partial; CHEAP)

**Exact acceptance:**

1. Schedule a message, deliver reply/booking/unsubscribe/bounce or a manual stop, then advance dispatch; cancel the message and stale the draft without duplicates.

**Recorded gap:** Unasserted in the carried evidence: booking cancels scheduled mail; unsubscribe cancels scheduled mail; bounce cancels scheduled mail; manual stop cancels scheduled mail; replay has no second effect. Asserted: reply cancels scheduled mail; stop stales unsent draft.

**Carried evidence:** src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts

### OUT-009 — Scheduled send (partial; CHEAP)

**Exact acceptance:**

1. Schedule/cancel approved content, then change its evidence, permission and recipient before dispatch; only unchanged current authorized content can reach the provider.

**Recorded gap:** Unasserted in the carried evidence: schedule and cancel; changed evidence blocks dispatch; changed permission blocks dispatch; changed recipient blocks dispatch; unchanged authorized content submitted. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

**Carried evidence:** src/core/features/outreach/scheduler.ts`; `tests/core/outreach-limits.test.ts

### OUT-010 — Sending limits (partial; CHEAP)

**Exact acceptance:**

1. Exceed the per-minute and per-operator daily limits before immediate and scheduled submission; retain a visible unsent item with its reason and next permitted time, and see no silent retry.

**Recorded gap:** Unasserted in the carried evidence: immediate submission limit; scheduled submission limit. Asserted: per-minute limit visibly holds; per-user daily limit visibly holds; held item shows reason; next permitted time; no silent retry.

**Carried evidence:** src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`; `tests/core/outreach-limits.test.ts

### OUT-011 — Unresolved submission (partial; CHEAP)

**Exact acceptance:**

1. Lose the acceptance transaction or provider response; restart and reconcile the durable intent without submitting again, ending once as accepted or visibly unresolved.

**Recorded gap:** Unasserted in the carried evidence: lost acceptance transaction; restart reconciles durable intent; unresolved stays visible. Asserted: lost provider response becomes uncertain; provider never resubmitted; one accepted final outcome.

**Carried evidence:** src/core/features/outreach/service.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/signals-outreach.test.ts`; `src/core/platform/outbound-mail.ts

### AI-002 — Output validation (partial; CHEAP)

**Exact acceptance:**

1. Return invalid schema, foreign citations and a transport error at the provider edge; fail invalid content visibly with no invented repair and bound transport retry.

**Recorded gap:** Unasserted in the carried evidence: invalid schema visibly fails; transport error visibly fails; no fabricated repair; bounded transport retries. Asserted: foreign citation leaves no draft.

**Carried evidence:** src/core/features/assistance/provider.ts`; `tests/core/assistance.test.ts

### AI-003 — Provider failure (partial; CHEAP)

**Exact acceptance:**

1. Leave AI unconfigured and fail a configured request; finish manual CRM, ingestion, scoring and handwritten outreach flows while generation reports failure.

**Recorded gap:** Unasserted in the carried evidence: configured-outage continuity; manual CRM updates; ingestion and linking continuity; scoring and queue placement continuity; search continuity; recommendation action and evidence readback; rendered generation-failure qualification. Connected mailboxes and live model or provider qualification remain unclaimed. Asserted: unconfigured generation unavailable; handwritten drafting, exact approval and one accepted customer-mail submission continue with AI unconfigured.

**Carried evidence:** src/core/features/assistance/provider.ts`; `tests/core/assistance.test.ts` — AI-002 invented evidence fails visibly; AI-003 unconfigured provider generates nothing and handwritten outreach submits once (after the unconfigured generation 503, the same installation creates a handwritten draft, reads its exact rendered content, opt-out state and recipient time, approves through native Workbench, compares the real mail adapter request with the saved approval snapshot, reads one accepted provider receipt and refuses repeated approval without another submission; no AI call, generated draft or explanation).

### AI-004 — Cost (partial; CHEAP)

**Exact acceptance:**

1. Generate successful and failed requests, then inspect provider/model/tokens/duration/status/cost and day/feature totals in Settings.

**Recorded gap:** Unasserted in the carried evidence: failed call accounting; provider; model; duration; cost; daily totals; feature totals in Settings. Asserted: successful token counts; status.

**Carried evidence:** src/core/features/assistance/provider.ts`; `tests/core/assistance.test.ts

### NOTIFY-001 — Responsible operator (partial; CHEAP)

**Exact acceptance:**

1. Trigger queue entry, reply and delivery problems on assigned and unassigned deals; verify responsible recipients and one notification on replay.
2. Have the responsible operator cause an outcome themselves, including a send that fails at once: they receive no notice and the record shows it. The same outcome caused by another person, or arriving later from the provider, an agent or a workflow, still notifies them.

**Recorded gap:** Unasserted in the carried evidence: assigned-deal responsible recipient (the fixture leaves the deal unassigned). Asserted: unassigned queue recipient; unassigned reply recipient and replay count; delivery-problem recipient once; no-actor fallback goes to every active operator.

**Carried evidence:** src/core/features/notifications/routes.ts`; `tests/core/assistance.test.ts`; `tests/e2e/zz-notifications.spec.mjs`; unassigned NOW, replies and failures follow the latest actor once (authenticated inboxes for both full operators, native NOW event, signed genuine reply and bounce, rejected and uncertain mail submissions, and replay); `tests/support/notification-responsibility.ts`; recipient isolation: NOTIFY-001 NOTIFY-002 queue transitions notify once and recipient read state survives a fresh sign-in

### NOTIFY-002 — Read state (partial; CHEAP)

**Exact acceptance:**

1. Open and mark notifications read across sessions; inspect recipient-specific state and an unread count without duplicate events.

**Recorded gap:** Unasserted in the carried evidence: read state persists after a new sign-in session. Asserted: recipient read mark stored; another recipient cannot mark it; unread count returns to previous value; queue notice not duplicated.

**Carried evidence:** src/core/features/notifications/routes.ts`; `tests/core/assistance.test.ts`; `tests/e2e/zz-notifications.spec.mjs`; `tests/support/notification-session.ts

### PUBLIC-001 — Landing page (partial; CHEAP)

**Exact acceptance:**

1. Visit the public app Lobby and separate run site without a session; verify branding/sign-in links and no installation customer data in HTML or network.

**Recorded gap:** Unasserted in the carried evidence: app Lobby branding and sign-in links; separate run-site branding and sign-in links; no customer data in public HTML; no customer data in network responses. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

**Carried evidence:** src/base/lobby.ts`; `tests/e2e/baseline.spec.mjs

### PUBLIC-004 — Native sign-in (partial; CHEAP)

**Exact acceptance:**

1. Request and confirm a native magic link, test unknown/inactive and expired/reused links, sign out and exercise optional linked identity without admitting new operators.

**Recorded gap:** Unasserted in the carried evidence: expired link refused; linked provider admits no new operator. Asserted: valid native link creates current person session; unknown/inactive response matches; single-use link signs in only once; sign-out revokes session.

**Carried evidence:** src/core/features/identity/index.ts`; `tests/core/identity.test.ts`; `tests/core/prior-auth-upgrade.test.ts`; `tests/core/provider-redirects.test.ts` — PUBLIC-004 OPS-001 required domains deny magic-link and recovery sessions, uninvited OIDC changes no identities, while selected OIDC, owner recovery and unrestricted email remain admitted, using `tests/support/sign-in-domains.ts` (uninvited callback refuses with unchanged complete populated operator, binding, session and provenance inventories and no Orbit session cookie)

### DATA-002 — Contact erasure (partial; HARD)

**Exact acceptance:**

1. Erasing a contact, company or deal redacts INTEGRATE-005’s stored notice content and issues tracked chat.delete requests for its bot messages, with each deletion outcome visible.
2. Delete a contact containing aliases, imported/captured mail and notes, drafts and transfer copies; verify search/export/AI/mail absence and anonymized audit within five minutes, including replay.

**Recorded gap:** Unasserted in the carried evidence: contact erasure redacts stored Slack content; company erasure redacts stored Slack content; deal erasure redacts stored Slack content; provider delete requests tracked; each provider-deletion outcome visible; aliases erased; imported/captured evidence erased; drafts erased; transfer copies withdrawn; AI absence; mail absence; anonymous audit; completion within five minutes; replay cannot recreate erased content. Asserted: search absence; export absence.

**Carried evidence:** src/core/features/records/data.ts`; `tests/core/contact-erasure.test.ts`; `tests/core/crm-import-erasure.test.ts`; `tests/core/assistance.test.ts` — AI-001 DATA-002 changed or deleted preview context never leaves deployment (confirmed authenticated contact erasure withdraws its saved recipient-bound preview; the original preview ID returns 409 with zero provider calls and unchanged post-erasure AI call, draft and generated explanation inventories; changed-context refusal retained)

### DELEGATE-001 — Selected application authority (partial; HARD)

**Exact acceptance:**

1. An INTEGRATE-005 Slack mapping confers no delegation or outreach authority.
2. Its acknowledgment never accepts an application-proposed handoff; its only writes are acknowledgment and an attributed internal task under current native access.
3. Authorize selected records through native consent and PKCE, read and propose a handoff, refuse outside scope, revoke immediately, and restore without restoring credential authority.

**Recorded gap:** Unasserted in the carried evidence: Slack mapping grants no delegation authority; Slack mapping grants no outreach authority; Slack acknowledgment does not accept a proposed handoff; Slack writes only acknowledgment/internal task; task retains current native access and actor; native consent and PKCE scope; remaining selected-record kinds and outside-scope cases. Asserted: active selected-opportunity grant reads its opportunity, refuses its existing unselected linked contact with 404, omits that contact from delegated records and changes no records, history or write effects; internal handoff proposed; revocation stops every door; restored credential authority absent; restored history preserved.

**Carried evidence:** src/core/features/delegation/protocol.ts`; `tests/delegation/authority-regressions.test.ts` — API-002 native credential lifecycle and delegation D1 reject ambient cookies, scope escalation, expiration, disable and revocation on every read and write (active selected-opportunity evidence read, populated unselected-contact refusal, delegated list exclusion and unchanged records and write effects); `tests/delegation/archive-regression.test.ts

### TEAM-005 — Sales roles and assigned records (partial; HARD)

**Exact acceptance:**

1. Invite a manager and two reps, make one account private, deny its record and field through direct URLs/search/API/report/export/AI preview, share it intentionally, then revoke and repeat after sign-out and restore. Restrict one rep to owned records and verify that their lists, search, API and export show only the contacts and companies they own under RECORD-016, and that reassigning one of those contacts removes it from their next request.

**Recorded gap:** Implemented first slice: author-controlled privacy for a note, logged call/meeting, task note or handoff; collaborator record/shared/search/mention/notification reads withhold private entries regardless of the record grant. Visibility changes are audited, flags round-trip through the CLI archive and disappear with deleted entries. Private entry, task-note and handoff controls and collaborator Shared records are exercised at 1440 and 390. FORM-001 round robin retains its explicit active full-operator lists; ownership alone grants no current access. Native teams, team mentions, restricted sales roles, team queues and chosen-user/team notifications remain gaps.

**Carried evidence:** src/core/features/records/entry-privacy.ts`; `src/core/features/records/shared-entries.ts`; `src/core/features/notifications/collaborator.ts`; `newtests/t096/collaborator-lifecycle.test.ts`; `newtests/t096/private-entries-proof.ts`; `tests/delegation-browser/records-layout.test.ts

### TEAM-006 — Team forecast, reports and dashboards (partial; HARD)

**Exact acceptance:**

1. For a manager, team reports and drill-through cover records the team owns; share a report with a team and verify restricted-seller totals, groups, reasons and drill-through reveal no count or sum of hidden records.
2. Exercise team quota membership, team-scoped forecast overrides and rep/team quota attainment.
3. Use the Team dashboard filter, team sharing, administrator team default and user override; every tile, total, drill row, CSV, PDF and email copy contains only currently permitted records and fields.

**Recorded gap:** Implemented first slice: author-controlled privacy for a note, logged call/meeting, task note or handoff; collaborator record/shared/search/mention/notification reads withhold private entries regardless of the record grant. Visibility changes are audited, flags round-trip through the CLI archive and disappear with deleted entries. Private entry, task-note and handoff controls and collaborator Shared records are exercised at 1440 and 390. FORM-001 round robin retains its explicit active full-operator lists; ownership alone grants no current access. Native teams, team mentions, restricted sales roles, team queues and chosen-user/team notifications remain gaps.

**Carried evidence:** src/core/features/records/entry-privacy.ts`; `src/core/features/records/shared-entries.ts`; `src/core/features/notifications/collaborator.ts`; `newtests/t096/collaborator-lifecycle.test.ts`; `newtests/t096/private-entries-proof.ts`; `tests/delegation-browser/records-layout.test.ts

### TEAM-007 — Team libraries, mentions and entry privacy (partial; HARD)

**Exact acceptance:**

1. Use a template, snippet and signature shared with a real team; current role, record and field access govern authoring, use and merge-data reads.
2. Mention an active team and notify each active member once; users without access require explicit sharing or removal of the mention.
3. Share a deal with a collaborator including its notes, calls and meetings; make one note private and confirm it is absent on Shared records, Notifications → Mentions and mention notices for everyone outside its audience.

**Recorded gap:** Implemented first slice: author-controlled privacy for a note, logged call/meeting, task note or handoff; collaborator record/shared/search/mention/notification reads withhold private entries regardless of the record grant. Visibility changes are audited, flags round-trip through the CLI archive and disappear with deleted entries. Private entry, task-note and handoff controls and collaborator Shared records are exercised at 1440 and 390. FORM-001 round robin retains its explicit active full-operator lists; ownership alone grants no current access. Native teams, team mentions, restricted sales roles, team queues and chosen-user/team notifications remain gaps.

**Carried evidence:** src/core/features/records/entry-privacy.ts`; `src/core/features/records/shared-entries.ts`; `src/core/features/notifications/collaborator.ts`; `newtests/t096/collaborator-lifecycle.test.ts`; `newtests/t096/private-entries-proof.ts`; `tests/delegation-browser/records-layout.test.ts

### TEAM-008 — Team sending budgets and Slack audiences (partial; HARD)

**Exact acceptance:**

1. INTEGRATE-005’s Slack mappings confer no role, record or field access.
2. Permission changes apply on the next request and require fresh mapping confirmation.
3. A seller-, team- or otherwise restricted record never counts as visible to every active full operator; a team channel never widens access.
4. Exercise real administrator roles, team-scoped Slack channel/audience rules and dashboard-ready notices; a team channel never widens access.
5. Lower and raise sending budgets per team and read back the attributed old/new values and time.

**Recorded gap:** Implemented first slice: author-controlled privacy for a note, logged call/meeting, task note or handoff; collaborator record/shared/search/mention/notification reads withhold private entries regardless of the record grant. Visibility changes are audited, flags round-trip through the CLI archive and disappear with deleted entries. Private entry, task-note and handoff controls and collaborator Shared records are exercised at 1440 and 390. FORM-001 round robin retains its explicit active full-operator lists; ownership alone grants no current access. Native teams, team mentions, restricted sales roles, team queues and chosen-user/team notifications remain gaps.

**Carried evidence:** src/core/features/records/entry-privacy.ts`; `src/core/features/records/shared-entries.ts`; `src/core/features/notifications/collaborator.ts`; `newtests/t096/collaborator-lifecycle.test.ts`; `newtests/t096/private-entries-proof.ts`; `tests/delegation-browser/records-layout.test.ts

### RECORD-014 — Configurable sales data and custom objects (partial; HARD)

**Exact acceptance:**

1. Create a Territory object and required deal field, validate bad input, qualify a lead, link stakeholders, save a filtered view, bulk-change selected records with one denied item, then archive a field and inspect history/export.

**Recorded gap:** Owner-defined text, number, date and picklist fields on contacts, companies and deals retain required/unique validation, affected-record preview and read-only archived values. Settings now reads immutable definition revisions with their original labels, types, choices, required/unique and archived state; paged native HTTP reads and fresh-session reads after local archive restore preserve that meaning. This is definition history, not a claim of per-record value history. Custom objects and explicit relationships/layouts, lead qualification/conversion preserving source, activities and consent, saved filtered lists with column choice and sorting, reviewed bulk field edits with individual failures, and field-value history naming the user/import/capture/API source remain gaps. Workflow-change approval and workflow/version history inherit AUTO-002. Future lead/custom-object intake retains FORM-001 notification, consent, abuse, export and erasure duties, with no custom-object intake carve-out.

**Carried evidence:** src/core/features/records/typed-fields.ts`; `src/core/features/records/typed-field-history.ts`; `src/core/features/operator/ui/typed-field-settings.tsx`; `src/core/features/operator/ui/typed-field-history.tsx`; `tests/core/records-complete.test.ts`; `tests/support/typed-fields-proof.ts`; `newtests/t096/forms-native.test.ts`; `tests/delegation-browser/records-layout.test.ts`; `tests/delegation-browser/typed-fields-journey.mjs

### RECORD-015 — Deal stakeholders and buying context (partial; CHEAP)

**Exact acceptance:**

1. Associate champion and evaluator with a USD deal, add a verified decision-maker and a second-company relationship, move the primary association and inspect the preserved customer history and authorization.

**Recorded gap:** Unasserted in the carried evidence: champion association; evaluator association; verified decision-maker; second-company relationship; primary association move; history preserved; authorization preserved. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

**Carried evidence:** src/core/features/relationships/`; `src/core/features/operator/ui/record/people.tsx`; `src/core/features/operator/ui/record/deal-context.tsx`; `tests/core/records-search.test.ts`; `tests/evidence/contract/RECORD-015/

### RECORD-016 — Owners for contacts, leads, companies and custom objects (partial; HARD)

**Exact acceptance:**

1. Bulk-reassign 20 contacts with one denied item and see 19 changes, one listed failure and 19 timeline entries.
2. Assign, reassign and unassign each record type; one timeline entry holds previous owner, new owner, actor and time; undo only records unchanged since the audited batch.

**Recorded gap:** Contact/company record-page and list/search bulk assignment, attributed history, per-item refusals, guarded undo and grouped native in-app notices ship. Full operators retain existing workspace access; collaborators receive no new ownership mutation authority or content-bearing assignment notice. CSV owner mapping, My/Unassigned default views, owner grouping and report/dashboard filters, company/first-email assignment rules, deal assignment notices and removal handover remain gaps. Leads/custom objects inherit RECORD-014; restricted sellers inherit TEAM-005 and owners never grant access; email/push/Slack delivery inherits NOTIFY-003; connected-mailbox writes inherit OUT-013/CAPTURE-010/CAPTURE-012, workflows AUTO-001 and public responses API-001. Import-provider mappings remain MIGRATE-001/002/003.

**Carried evidence:** src/core/features/ownership/`; `migrations/core/0054_record_ownership.sql`; `tests/core/records-search.test.ts`; `tests/support/record-ownership.ts`; `newtests/t096/forward-upgrade.test.ts`; `newtests/t096/ownership-upgrade.ts`; `newtests/t096/browser-ownership.ts`; `docs/retained-verification/RECORD-016/

### RECORD-019 — Owner mapping on import and migration (partial; HARD)

**Exact acceptance:**

1. Import HubSpot contacts and companies with Contact owner and Company owner columns, one owner value unmatched; map it in the dry run, apply, and see each record's owner and attributed import entry.
2. Map HubSpot custom-object owners, Pipedrive people and organizations, and Salesforce Lead, Account and Contact owners; explicitly map queue ownership or leave it unassigned, list unmatched values with counts, and restore prior owners on undo.

**Recorded gap:** Contact/company record-page and list/search bulk assignment, attributed history, per-item refusals, guarded undo and grouped native in-app notices ship. Full operators retain existing workspace access; collaborators receive no new ownership mutation authority or content-bearing assignment notice. CSV owner mapping, My/Unassigned default views, owner grouping and report/dashboard filters, company/first-email assignment rules, deal assignment notices and removal handover remain gaps. Leads/custom objects inherit RECORD-014; restricted sellers inherit TEAM-005 and owners never grant access; email/push/Slack delivery inherits NOTIFY-003; connected-mailbox writes inherit OUT-013/CAPTURE-010/CAPTURE-012, workflows AUTO-001 and public responses API-001. Import-provider mappings remain MIGRATE-001/002/003.

**Carried evidence:** src/core/features/ownership/`; `migrations/core/0054_record_ownership.sql`; `tests/core/records-search.test.ts`; `tests/support/record-ownership.ts`; `newtests/t096/forward-upgrade.test.ts`; `newtests/t096/ownership-upgrade.ts`; `newtests/t096/browser-ownership.ts`; `docs/retained-verification/RECORD-016/

### RECORD-020 — Automatic record-owner rules (partial; HARD)

**Exact acceptance:**

1. Enable the company-to-contact rule, preview it, change a company owner and see only its unowned contacts take that owner.
2. Enable the first-email rule, send a first email to an unowned lead and see the sender become its owner.
3. Preview always-sync company ownership, verify primary-contact ownership follows it, and exclude automated and bulk mail from first-email ownership; every rule change names the rule in the timeline.

**Recorded gap:** Contact/company record-page and list/search bulk assignment, attributed history, per-item refusals, guarded undo and grouped native in-app notices ship. Full operators retain existing workspace access; collaborators receive no new ownership mutation authority or content-bearing assignment notice. CSV owner mapping, My/Unassigned default views, owner grouping and report/dashboard filters, company/first-email assignment rules, deal assignment notices and removal handover remain gaps. Leads/custom objects inherit RECORD-014; restricted sellers inherit TEAM-005 and owners never grant access; email/push/Slack delivery inherits NOTIFY-003; connected-mailbox writes inherit OUT-013/CAPTURE-010/CAPTURE-012, workflows AUTO-001 and public responses API-001. Import-provider mappings remain MIGRATE-001/002/003.

**Carried evidence:** src/core/features/ownership/`; `migrations/core/0054_record_ownership.sql`; `tests/core/records-search.test.ts`; `tests/support/record-ownership.ts`; `newtests/t096/forward-upgrade.test.ts`; `newtests/t096/ownership-upgrade.ts`; `newtests/t096/browser-ownership.ts`; `docs/retained-verification/RECORD-016/

### RECORD-021 — Assignment notifications (partial; HARD)

**Exact acceptance:**

1. NOTIFY-003 inherits personal Slack assignment DMs under INTEGRATE-005: only the explicitly mapped, opted-in new owner with current access, one notice per bulk batch, none on replay or undo.
2. Assignment never grants access.
3. Assign a company to another rep and receive one notice naming the record, previous owner and assigner; bulk-assign 20 contacts and receive one batch notice per receiving user.
4. Self-assignment, replay and undo produce no new notice; personal channels follow the receiving user’s preference.

**Recorded gap:** Contact/company record-page and list/search bulk assignment, attributed history, per-item refusals, guarded undo and grouped native in-app notices ship. Full operators retain existing workspace access; collaborators receive no new ownership mutation authority or content-bearing assignment notice. CSV owner mapping, My/Unassigned default views, owner grouping and report/dashboard filters, company/first-email assignment rules, deal assignment notices and removal handover remain gaps. Leads/custom objects inherit RECORD-014; restricted sellers inherit TEAM-005 and owners never grant access; email/push/Slack delivery inherits NOTIFY-003; connected-mailbox writes inherit OUT-013/CAPTURE-010/CAPTURE-012, workflows AUTO-001 and public responses API-001. Import-provider mappings remain MIGRATE-001/002/003.

**Carried evidence:** src/core/features/ownership/`; `migrations/core/0054_record_ownership.sql`; `tests/core/records-search.test.ts`; `tests/support/record-ownership.ts`; `newtests/t096/forward-upgrade.test.ts`; `newtests/t096/ownership-upgrade.ts`; `newtests/t096/browser-ownership.ts`; `docs/retained-verification/RECORD-016/

### RECORD-022 — Owner views, grouping and removal (partial; HARD)

**Exact acceptance:**

1. Contacts, Leads and Companies open on My records; lists, search, saved views and reports filter and group by each record type’s owner and Unassigned.
2. A seller restricted to owned records sees only their own contacts and companies through lists, search, API and export; reassignment changes the next read.
3. Remove a rep and explicitly hand over owned contacts and companies; report groups drill to exactly their counted permitted records, and dashboard Owner filters include every record type and Unassigned.

**Recorded gap:** Contact/company record-page and list/search bulk assignment, attributed history, per-item refusals, guarded undo and grouped native in-app notices ship. Full operators retain existing workspace access; collaborators receive no new ownership mutation authority or content-bearing assignment notice. CSV owner mapping, My/Unassigned default views, owner grouping and report/dashboard filters, company/first-email assignment rules, deal assignment notices and removal handover remain gaps. Leads/custom objects inherit RECORD-014; restricted sellers inherit TEAM-005 and owners never grant access; email/push/Slack delivery inherits NOTIFY-003; connected-mailbox writes inherit OUT-013/CAPTURE-010/CAPTURE-012, workflows AUTO-001 and public responses API-001. Import-provider mappings remain MIGRATE-001/002/003.

**Carried evidence:** src/core/features/ownership/`; `migrations/core/0054_record_ownership.sql`; `tests/core/records-search.test.ts`; `tests/support/record-ownership.ts`; `newtests/t096/forward-upgrade.test.ts`; `newtests/t096/ownership-upgrade.ts`; `newtests/t096/browser-ownership.ts`; `docs/retained-verification/RECORD-016/

### RECORD-024 — Mention delivery through personal channels (partial; HARD)

**Exact acceptance:**

1. Its NOTIFY-003 inheritance adopts INTEGRATE-005’s Slack rules: no entry text enters Slack, private entries get a generic notice and exact authenticated entry link, and an undelivered mention is withdrawn on deletion.
2. Slack acknowledgment never accepts an application-proposed handoff.
3. Deliver personal email, push and Slack mentions under the receiving user’s preference; no entry text enters Slack, private entries have generic notices, and deletion withdraws an undelivered mention.

**Recorded gap:** Unasserted in the cited evidence: Slack acknowledgment never accepts an application-proposed handoff. Asserted: an opted-in personal Slack mention carries no entry text, a private entry gets a generic notice with an authenticated link, and deleting the source withdraws an undelivered mention. Personal email and push channels are not offered.

**Carried evidence:** src/core/features/records/mentions.ts`; `src/core/features/slack/delivery.ts`; `src/core/features/slack/content.ts`; `tests/core/source-onboarding.test.ts`; `tests/support/personal-slack-proof.ts

### RECORD-018 — Files and versions on records and activities (missing; HARD)

**Exact acceptance:**

1. Upload a PDF to a deal and a file to a logged call; see both on the deal's Files list with name, type, size, uploader and time; upload a new version of the PDF; and see an executable and a 150 MB file refused with the reason.

**Recorded gap:** No implementation found. There is no file storage, upload route or Files list on any record or activity, and `src/core/features/capture/mime.ts` skips every `Content-Disposition: attachment` part when parsing captured mail, so captured attachments are dropped; migration presets carry no files.

**Carried evidence:** 

### RECORD-025 — File access, previews and deletion (missing; HARD)

**Exact acceptance:**

1. As a restricted rep, be refused a direct download of a file on a deal you cannot see.
2. Delete a file and see the attributed timeline entry.
3. Download and preview a sensitive record with its file field withheld; enforce the current grant, short-lived link and sandboxed preview.
4. Delete a version and an activity; remove its owned bytes within the erasure bound while retaining the attributed timeline.

**Recorded gap:** No implementation found. There is no file storage, upload route or Files list on any record or activity, and `src/core/features/capture/mime.ts` skips every `Content-Disposition: attachment` part when parsing captured mail, so captured attachments are dropped; migration presets carry no files.

**Carried evidence:** 

### RECORD-026 — Captured and sent mail attachments (missing; HARD)

**Exact acceptance:**

1. Receive a captured Gmail reply with a signed PDF attachment and an inline logo: see the PDF on the contact, company and deal and open it from the timeline entry, with the logo not listed.
2. Select a permitted attachment version, inspect its exact preview and send it; refuse forbidden or oversized selection and record the precise sent version on recipient records.

**Recorded gap:** No implementation found. There is no file storage, upload route or Files list on any record or activity, and `src/core/features/capture/mime.ts` skips every `Content-Disposition: attachment` part when parsing captured mail, so captured attachments are dropped; migration presets carry no files.

**Carried evidence:** 

### RECORD-027 — File migration and portable bytes (missing; HARD)

**Exact acceptance:**

1. Migrate a HubSpot deal with two record attachments and a note attachment, and reconcile file counts and bytes in the dry run and after applying.
2. Export and restore, and compare every file's bytes by SHA-256.
3. Erase the contact: their mail attachments are gone from the deal, while the user-uploaded PDF stays.
4. List, upload, download and delete files through the public API; observe files-added/deleted webhooks and keep AI file content inside the exact preview.

**Recorded gap:** No implementation found. There is no file storage, upload route or Files list on any record or activity, and `src/core/features/capture/mime.ts` skips every `Content-Disposition: attachment` part when parsing captured mail, so captured attachments are dropped; migration presets carry no files.

**Carried evidence:** 

### MIGRATE-001 — HubSpot Sales Hub migration (partial; HARD)

**Exact acceptance:**

1. From Import choose HubSpot, authorize a test account and preview a multi-company export/API pull including activities, associations, separate Contact, Company and deal owners, and a deal with two record attachments and a note attachment; apply, interrupt/resume and rerun; compare source totals and file counts and bytes, inspect a deal workflow's actions listed against AUTO-002, and undo around native edits.
2. Final acceptance includes a real authorized customer export.

**Recorded gap:** Reviewed HubSpot CSV presets cover core records/deals/prepared notes; connected migration and full activity/owner/pipeline and attachment coverage are missing.

**Carried evidence:** src/core/features/imports/contracts.ts`; `tests/core/crm-import.test.ts`; `tests/e2e/imports.spec.mjs

### MIGRATE-002 — Pipedrive migration (partial; HARD)

**Exact acceptance:**

1. Choose Pipedrive, connect an authorized account containing two pipelines, cross-linked activities and deal files, preview/apply, resume a rate-limited page and rerun; reconcile every exported entity and association, then undo without losing a native note.
2. Include a real authorized export.

**Recorded gap:** Pipedrive core CSV presets exist; complete connected migration, products, activity history and files remain missing.

**Carried evidence:** src/core/features/imports/contracts.ts`; `tests/core/crm-import.test.ts

### MIGRATE-003 — Salesforce Sales Cloud migration (missing; HARD)

**Exact acceptance:**

1. Connect a Salesforce sandbox with converted leads, two record types, linked activity/custom-object data and Files on an Opportunity; dry-run, map, apply, interrupt/resume and rerun, reconcile record/association totals and file counts and bytes, and demonstrate conflict-preserving undo.
2. Repeat with an authorized real export.

**Recorded gap:** No implementation found. No implementation of this complete target flow was found.

**Carried evidence:** 

### CAPTURE-010 — Continuous authorized mail and calendar reads (partial; HARD)

**Exact acceptance:**

1. Connect each provider through Capture, import historical and new Inbox/Sent/calendar items, crash/resume an incremental page, resolve ambiguous deal links, switch the multi-deal rule to most recently active open deal and see the next such thread associated automatically with the rule named and then moved in one action, see an unknown correspondent become a CAPTURE-012 proposal, see a captured reply's PDF attachment listed on its contact, company and deal with its inline image not listed, revoke/reconnect and verify no unauthorized folder/mailbox is read.

**Recorded gap:** Durable provider reads retain their selected-scope and OAuth safeguards. The owner chooses held review (default), most recently active open deal or all open deals for exact-contact connected mail; trusted message identity retains priority. Automatic evidence names its rule, and one reviewed action moves or removes deal links without rewriting the original. No-open-deal mail links only the contact and primary company. Reviewed corrections permit any deal the current full operator may view and change, including closed deals and deals unrelated to the captured contact; the original contact and company history remain. TEAM-005 retains real administrator and restricted-record policy; current full operators retain existing workspace access and collaborators gain no capture door. Live Gmail and Microsoft acceptance requires the owner's authorized journey and remains unmeasured; attachments inherit RECORD-018, unknown-participant proposals CAPTURE-012, and the fixed calendar window still needs explicit extension. Implemented first slice: the installation owner acts as administrator until TEAM-005 supplies sales roles. An open deal's activity is the latest recorded source or operator timeline entry, or its creation time when no later entry exists; ties use deal identity order. Active full operators may move captured mail to any currently accessible, changeable deal or remove its deal links. A fingerprint binds the reviewed association, correction history and offered deal revisions; stale reviews return 409, unavailable targets return 403, and collaborators or restricted roles are refused. Replay repeats no mutation or audit.

**Carried evidence:** src/core/features/capture/providers/`; `src/core/features/capture/mail-association.ts`; `src/core/features/capture/mail-rule.ts`; `src/core/features/capture/deal-links.ts`; `migrations/core/0057_capture_mail_rule.sql`; `tests/core/capture-mail-rules.test.ts`; `tests/core/capture-providers.test.ts`; `tests/support/capture-rule-custody.ts`; `newtests/t096/forward-upgrade.test.ts`; `newtests/t096/browser-capture-rule.ts`; `docs/retained-verification/CAPTURE-010/`; `newtests/t096/browser-journeys.test.ts

### CAPTURE-011 — Two-way calendar and CRM activity (partial; HARD)

**Exact acceptance:**

1. For both calendars create an approved meeting in Orbit, verify it in the provider, reschedule it there and read it back, edit concurrently, cancel one recurring occurrence and reconnect after revocation without duplicate invitations.

**Recorded gap:** Implemented first slice: separate opt-in OAuth write consent requests Google `calendar.events` or Microsoft `Calendars.ReadWrite`; exact saved attendees, message and times are reviewed before one create, reschedule or cancellation attempt. Provider revisions and source/customer authority fence writes; provider edits become conflicts for fresh review, ambiguous outcomes remain held, and cancelling one written occurrence leaves the other intact. Activities retain one entry per written meeting. Google and Microsoft consent screens show the requested read scopes and add write scope only after separate opt-in, at 1440 and 390; their native form submissions request those exact scopes. Read-only tokens contain no write scope, unsolicited write grants are refused, and read-only consent cannot authorize writeback. Invitation review and conflict screens are exercised at 1440 and 390. Writeback currently changes single meetings created by Orbit; provider-captured meeting editing, recurring-series authoring and live-account proof remain gaps.

**Carried evidence:** src/core/features/capture/providers/writeback.ts`; `src/core/features/capture/providers/writeback-reconcile.ts`; `tests/core/capture-providers.test.ts`; `tests/support/calendar-writeback.ts`; `tests/delegation-browser/records-layout.test.ts

### CAPTURE-012 — Unknown-participant proposal custody (partial; HARD)

**Exact acceptance:**

1. Through both connected providers, exchange outgoing/inbound unknown-participant mail and a meeting; inspect exact address, name, domain, thread subjects, dates, direction and source evidence without a record or score.
2. Exclude automated, bulk, list, no-reply, daemon, calendar-notification, internal-domain and administrator-excluded senders; expire sealed unaccepted evidence at 30 days.

**Recorded gap:** CAPTURE-012: connected unknown-participant proposals, explicit reviewed contactability basis, exclusion and retention enforcement, all named back-fill doors, replay and erasure, authorized Gmail and Microsoft proof, provider qualification and jurisdiction-specific legal qualification remain unproved. Same-thread mailbox sending remains OUT-013, record composition OUT-017, reply all OUT-019, expanded roles TEAM-005 and ownership behavior RECORD-016.

**Carried evidence:** src/core/features/capture/intake.ts`; `src/core/features/capture/routes.ts`; `src/core/features/capture/sources.ts`; `tests/core/today-brief.test.ts

### CAPTURE-013 — Prospect acceptance and history back-fill (partial; HARD)

**Exact acceptance:**

1. Verify proposals for the two people (none for the newsletter) with direction and evidence; accept the first with the `rep-initiated conversation` basis and see the full thread back-filled once on the new contact and company, then reply from Orbit on the same thread.
2. Decline the second and confirm it is not proposed again, then create a contact manually for a third earlier correspondent and see their history back-filled.
3. Repeat the inbound case through Microsoft 365.
4. Through every named create/import/migration/form door, create an exact-address contact and back-fill provider-available history once; an exact-key collision, denied reviewer or concurrent stop does not create guessed identity or permission.

**Recorded gap:** CAPTURE-012: connected unknown-participant proposals, explicit reviewed contactability basis, exclusion and retention enforcement, all named back-fill doors, replay and erasure, authorized Gmail and Microsoft proof, provider qualification and jurisdiction-specific legal qualification remain unproved. Same-thread mailbox sending remains OUT-013, record composition OUT-017, reply all OUT-019, expanded roles TEAM-005 and ownership behavior RECORD-016.

**Carried evidence:** src/core/features/capture/intake.ts`; `src/core/features/capture/routes.ts`; `src/core/features/capture/sources.ts`; `tests/core/today-brief.test.ts

### CAPTURE-014 — Prospect purpose, retention and suppression (partial; HARD)

**Exact acceptance:**

1. Read explicit chosen contactability basis, reviewer, time, source evidence and owner; inbound or rep-initiated conversation never becomes marketing consent.
2. Unknown jurisdiction or lawful basis leaves contactability blocked; channel-specific telephone/automated authority is separately recorded, and an unsubscribe always wins.
3. Decline, erase and replay after archive restoration; retain only necessary keyed suppression/replay proofs with no revived source authority or expired sealed evidence.

**Recorded gap:** CAPTURE-012: connected unknown-participant proposals, explicit reviewed contactability basis, exclusion and retention enforcement, all named back-fill doors, replay and erasure, authorized Gmail and Microsoft proof, provider qualification and jurisdiction-specific legal qualification remain unproved. Same-thread mailbox sending remains OUT-013, record composition OUT-017, reply all OUT-019, expanded roles TEAM-005 and ownership behavior RECORD-016.

**Carried evidence:** src/core/features/capture/intake.ts`; `src/core/features/capture/routes.ts`; `src/core/features/capture/sources.ts`; `tests/core/today-brief.test.ts

### FORM-001 — Forms on the buyer’s website (partial; HARD)

**Exact acceptance:**

1. Build a Contact sales form mapping name, email, company, phone and a custom deal-size field, publish it hosted and embedded on an allowlisted test HTTPS domain, and submit from that domain both framed and by direct post.
2. Required, picklist, text and declared fixed/query-derived fields map to contact, company, deal and custom properties; a publication is reviewed as exact content.

**Recorded gap:** Implemented first slice: Reviewed fixed forms retain consent, atomic intake, honeypot, signed fill proof, per-form/network limits, optional Turnstile, counted refusals, erasable spam and exactly-once release. Allowlisted HTTPS direct posts use the same admission without cookies or tracking. Required and optional free-text and picklist fields map to contact/company/new-deal native and custom JSON properties; exact business domains link/create companies, chosen stages enter NOW, empty values fill and populated differences wait as CAPTURE-004 proposals. A picklist accepts only its reviewed choices. Hidden fields carry a fixed value from the reviewed definition or one declared query parameter, read from the hosted page address, copied from the embedding page by the generated framed embed or sent by a direct post; publication review lists them, and a saved definition change takes effect only after its new revision is compiled, reviewed and published. Forged choices, undeclared names and fixed-value overrides are refused as `invalid_fields` without a customer or proposal write. Existing contact owners remain; fixed, durable active-user round robin and unassigned rules record each choice and notify the selected full operator once per accepted submission. Team selection, team queues and team notifications inherit TEAM-005; explicit full-operator lists are used meanwhile. Lead/custom-object kinds inherit RECORD-014 and email/push delivery NOTIFY-003.

**Carried evidence:** src/core/features/forms/`; `src/core/features/forms/field-values.ts`; `src/core/features/forms/embed-code.ts`; `migrations/core/0055_form_assignment.sql`; `src/core/features/capture/proposals.ts`; `newtests/t096/forms-native.test.ts`; `newtests/t096/forms-mapped-journey.ts`; `newtests/t096/forms-mapped-custody.ts`; `newtests/t096/browser-form-mapping.ts`; `docs/retained-verification/FORM-001/

### FORM-004 — Form owner routing and sales follow-up (partial; HARD)

**Exact acceptance:**

1. Alternate accepted submissions across two reps, skip inactive users, restart and preserve rotation, owner choice timeline and one notification per submission.
2. Preserve an existing contact owner; verify fixed owner and unassigned queue, NOW entry and reason or deal-less lead view, and submission export/erasure.

**Recorded gap:** Implemented first slice: Reviewed fixed forms retain consent, atomic intake, honeypot, signed fill proof, per-form/network limits, optional Turnstile, counted refusals, erasable spam and exactly-once release. Allowlisted HTTPS direct posts use the same admission without cookies or tracking. Required and optional free-text and picklist fields map to contact/company/new-deal native and custom JSON properties; exact business domains link/create companies, chosen stages enter NOW, empty values fill and populated differences wait as CAPTURE-004 proposals. A picklist accepts only its reviewed choices. Hidden fields carry a fixed value from the reviewed definition or one declared query parameter, read from the hosted page address, copied from the embedding page by the generated framed embed or sent by a direct post; publication review lists them, and a saved definition change takes effect only after its new revision is compiled, reviewed and published. Forged choices, undeclared names and fixed-value overrides are refused as `invalid_fields` without a customer or proposal write. Existing contact owners remain; fixed, durable active-user round robin and unassigned rules record each choice and notify the selected full operator once per accepted submission. The mapped native HTTP journey (`newtests/t096/forms-mapped-journey.ts`, `formsMappedJourney`, invoked by the mapped capture case in `newtests/t096/forms-native.test.ts`) also publishes an explicitly reviewed unassigned rule, rereads its fresh contact with a persisted null owner and exact submission-linked source assignment entry, and replays the same intake with unchanged ownership, assignment entry, submission inventory and notification inventory. Team selection, team queues and team notifications inherit TEAM-005; explicit full-operator lists are used meanwhile. Lead/custom-object kinds inherit RECORD-014 and email/push delivery NOTIFY-003.

**Carried evidence:** src/core/features/forms/`; `src/core/features/forms/field-values.ts`; `src/core/features/forms/embed-code.ts`; `migrations/core/0055_form_assignment.sql`; `src/core/features/capture/proposals.ts`; `newtests/t096/forms-native.test.ts`; `newtests/t096/forms-mapped-journey.ts`; `newtests/t096/forms-mapped-custody.ts`; `newtests/t096/browser-form-mapping.ts`; `docs/retained-verification/FORM-001/

### OUT-013 — Gmail and Microsoft 365 mailbox sending (missing; HARD)

**Exact acceptance:**

1. Connect each provider, review recipient/subject/body/signature/attachment, send once and verify provider Sent, a real recipient reply and Orbit threading; revoke before a scheduled send and cause a timeout to demonstrate visible uncertainty with no duplicate or transport switch.

**Recorded gap:** No implementation found. No implementation of this complete target flow was found.

**Carried evidence:** 

### OUT-014 — Reusable personalized templates and sales content (partial; CHEAP)

**Exact acceptance:**

1. As the installation owner, save a workspace-shared template, snippet and signature; as another full operator, read and use them, create a private entry and be refused a shared-entry write.
2. Render for two contacts and inspect the exact body, signature and OUT-020 state.
3. Refuse a collaborator's library read, authoring, sharing and application attempts.
4. Block approval with a missing merge field and after a merge value changes until a fresh render is reviewed.
5. Approve one render, revise the library entries and verify the approved byte snapshot remains unchanged and dispatch submits exactly those approved bytes under the existing staleness rules.
6. Inspect the library and rendered review at 1440 and 390.

**Recorded gap:** Unasserted in the carried evidence: another operator reads/uses library; signature bytes; reviewed opt-out state; library screen at 1440; library screen at 390; rendered review at 1440; rendered review at 390. Asserted: owner creates template/snippet/signature; private entry hidden from others; shared entry write refused; two distinct contact renders; exact body read back; collaborator read refused; collaborator authoring refused; collaborator sharing refused; collaborator application refused; missing field prevents rendering; missing field prevents approval; changed merge value prevents approval; stale preview cannot approve; saved subject/body match rendered snapshot; library revision does not alter approved body; library revision does not alter approved subject; snapshot remains byte-identical; provider receives exactly approved rendered bytes once.

**Carried evidence:** src/core/features/drafts/`; `src/core/features/outreach/approval-repository.ts`; `src/core/features/outreach/service.ts`; `migrations/core/0050_message_library.sql`; `tests/core/signals-outreach.test.ts`; `tests/core/onboarding-archive.test.ts`; `newtests/t096/forward-upgrade.test.ts`; `docs/retained-verification/OUT-014/

### OUT-015 — Honest open and reply tracking (partial; CHEAP)

**Exact acceptance:**

1. Ingest accepted/delivered/open events and genuine/automatic/foreign replies; show separate provider acceptance, reported delivery, inferred historical open/click reports and human replies with source and occurred/recorded time on account/contact/deal history.
2. Duplicate reports have one effect; automatic replies, foreign senders and ambiguous threads leave scheduled follow-up unchanged, including after manual linking of nonhuman evidence.
3. Without tracking, show `open/click not tracked`.
4. Only a genuine exact-identity linked reply stops follow-up; add no pixel, redirect token or tracking collection.

**Recorded gap:** Unasserted in the carried evidence: no new tracking pixel; no redirect collection; no tracking token collection. Asserted: acceptance distinct from delivery; delivery time read back; historical open/click inference; human reply stored once; source on each timeline; occurred time; recorded time; duplicate event retained once; automatic reply changes no business state; foreign sender changes no business state; ambiguous thread changes no business state; manually linked nonhuman evidence changes no business state; no-tracking label; exact-identity genuine reply stops work.

**Carried evidence:** tests/core/launch-reply-authority.test.ts`; `tests/core/signals-outreach.test.ts`; `src/core/features/outreach/provider-replies.ts`; `src/core/features/operator/ui/mail-evidence.tsx

### OUT-016 — Disclosed per-message tracking (missing; HARD)

**Exact acceptance:**

1. Enable disclosed opens and clicks; review and send a tracked Gmail one-to-one message and Microsoft 365 sequence step, then verify an inferred open, click and unchanged reviewed redirect destination.
2. An untracked message says not tracked; opaque tokens cannot read another message, identify a CRM record or authorize another action.

**Recorded gap:** OUT-016: the complete original tracking journey, token and retention controls, classification and notification behavior, authorized provider acceptance and legal qualification remain unproved. Mailbox delivery remains OUT-013, sequence execution SEQUENCE-001 and SEQUENCE-003, additional notification channels NOTIFY-003 and multi-recipient behavior OUT-019.

**Carried evidence:** 

### OUT-021 — Tracking classification and notifications (missing; HARD)

**Exact acceptance:**

1. Classify known proxies, scanner requests and requests before provider acceptance as proxy or automated with a reason; uncertain traffic remains unknown.
2. Read first/last time, count, clicked link and source on contact, message and deal; the first eligible open and first click per link produce one real-time rep notice, with personal channels under NOTIFY-003.
3. Collect no cookie, script, fingerprint or cross-message identifier and retain no raw network metadata.

**Recorded gap:** OUT-016: the complete original tracking journey, token and retention controls, classification and notification behavior, authorized provider acceptance and legal qualification remain unproved. Mailbox delivery remains OUT-013, sequence execution SEQUENCE-001 and SEQUENCE-003, additional notification channels NOTIFY-003 and multi-recipient behavior OUT-019.

**Carried evidence:** 

### OUT-022 — Tracking expiry, suppression and sales meaning (missing; HARD)

**Exact acceptance:**

1. Mark do-not-track, suppress or erase a recipient, disable the workspace and expire collection; each later request redirects correctly and records nothing further.
2. A multi-recipient event names only a recipient; any do-not-track recipient makes the whole message untracked.
3. Inferred opens/clicks never complete a reply, meeting, action-evidence bar, sequence exit or high-band condition; reports separate engagement from replies.

**Recorded gap:** OUT-016: the complete original tracking journey, token and retention controls, classification and notification behavior, authorized provider acceptance and legal qualification remain unproved. Mailbox delivery remains OUT-013, sequence execution SEQUENCE-001 and SEQUENCE-003, additional notification channels NOTIFY-003 and multi-recipient behavior OUT-019.

**Carried evidence:** 

### OUT-017 — One-to-one email from any permitted record (partial; HARD)

**Exact acceptance:**

1. Through a connected mailbox, email a lead without company or deal, a contact with only a won deal, and a contact on an open deal from the company page; receive each reply.
2. Choose a recipient explicitly, use handwriting, a template and a previewed draft, then verify exact content and current contactability, quiet-hour, schedule, budget, tracking and opt-out rules.
3. Sending creates no deal, reopens none and changes neither a closed deal’s lifecycle nor queue; an optional link selects at most one open deal and a prohibited contact is refused.

**Recorded gap:** Reviewed manual composition from contacts, companies and closed deals uses one explicitly selected recipient, an optional current open-deal link and separate closed-deal history; sending creates or reopens no deal. Exact rendered approval, active/contactable identity, shared sending budgets, clocks, scheduling, reconciliation and contact-wide stops apply to the additive mail store. One accepted activity links reviewed content and provider identity to the contact, primary company and linked/history deal; verified native message headers thread one genuine reply, while missing headers are held. An unlinked accepted message opens one sender-owned contact promise, due in workspace working days and shown in Today when overdue; human replies, booked meetings, later acceptance and explicit sender completion close it. Automatic replies do not; permanent bounce suppresses and cancels contact schedules. Sender/owner reply notices and contact outcomes are native in-app. Full operators retain current authority and collaborators get no new mail door. Record AI drafting from contacts and explicitly selected company contacts uses the assistance preview, exact unchanged evidence and configured instructions through ai.provider.v1, validated citations and length, durable editable unsent drafts and ai_calls accounting; unavailable providers fail visibly. Existing held-reply review attaches genuine or automatic replies to the contact and primary company or dismisses them once with operator attribution; automatic replies and dismissal leave promises open. Removal review includes open contact promises, explicit receiving full operator or unassignment, stale-set refusal and atomic handover with one attributed contact/company entry; original sender attribution remains, receiving overdue promises appear in Today, and unassigned promises remain on their contact. Remaining gaps: additional To/CC/BCC and reply-all inherit OUT-019, mailbox sending and live replies OUT-013, leads RECORD-014, provider-thread capture CAPTURE-010, sequence steps SEQUENCE-001/003 and tracking choice OUT-016.

**Carried evidence:** src/core/features/outreach/`; `src/core/features/assistance/record-routes.ts`; `src/core/features/assistance/record-preview.ts`; `migrations/core/0056_record_mail.sql`; `migrations/core/0066_record_mail_completion.sql`; `src/core/features/operator/ui/record-mail.tsx`; `src/core/features/operator/ui/unlinked-replies.tsx`; `src/core/features/settings/removal-handover.ts`; `src/core/features/operator/ui/operator-removal-review.tsx`; `tests/core/signals-outreach.test.ts`; `tests/support/record-mail.ts`; `tests/support/record-mail-ai.ts`; `tests/support/record-mail-held-replies.ts`; `tests/support/record-mail-handover.ts`; `tests/support/record-mail-custody.ts`; `tests/core/operator-erasure.test.ts`; `newtests/t096/forward-upgrade.test.ts`; `tests/support/record-mail-upgrade.ts`; `newtests/t096/browser-record-mail.ts`; `docs/retained-verification/OUT-017/

### OUT-023 — Record mail history and deal-less obligations (partial; HARD)

**Exact acceptance:**

1. Inspect one sent/reply activity on every external recipient, primary company and linked deal, preserving BCC disclosure; missing reply headers are held rather than guessed.
2. After the awaiting interval in workspace working days, the sender sees the deal-less obligation in Today; a genuine external reply, meeting, later send or explicit completion closes it, while automatic mail does not.
3. Receive sender/contact-owner reply notices once and truthful failure/bounce/uncertain notices for outcomes the sender did not cause directly, while the sender's own immediate send outcome shows on the contact with no notice to them; permanent bounce stops contact, scheduled stops work without a deal, and ten deal-less sequence contacts receive their first step and one reply without a new deal.

**Recorded gap:** Reviewed manual composition from contacts, companies and closed deals uses one explicitly selected recipient, an optional current open-deal link and separate closed-deal history; sending creates or reopens no deal. Exact rendered approval, active/contactable identity, shared sending budgets, clocks, scheduling, reconciliation and contact-wide stops apply to the additive mail store. One accepted activity links reviewed content and provider identity to the contact, primary company and linked/history deal; verified native message headers thread one genuine reply, while missing headers are held. An unlinked accepted message opens one sender-owned contact promise, due in workspace working days and shown in Today when overdue; human replies, booked meetings, later acceptance and explicit sender completion close it. Automatic replies do not; permanent bounce suppresses and cancels contact schedules. Sender/owner reply notices and contact outcomes are native in-app. Full operators retain current authority and collaborators get no new mail door. Record AI drafting from contacts and explicitly selected company contacts uses the assistance preview, exact unchanged evidence and configured instructions through ai.provider.v1, validated citations and length, durable editable unsent drafts and ai_calls accounting; unavailable providers fail visibly. Existing held-reply review attaches genuine or automatic replies to the contact and primary company or dismisses them once with operator attribution; automatic replies and dismissal leave promises open. Removal review includes open contact promises, explicit receiving full operator or unassignment, stale-set refusal and atomic handover with one attributed contact/company entry; original sender attribution remains, receiving overdue promises appear in Today, and unassigned promises remain on their contact. Remaining gaps: additional To/CC/BCC and reply-all inherit OUT-019, mailbox sending and live replies OUT-013, leads RECORD-014, provider-thread capture CAPTURE-010, sequence steps SEQUENCE-001/003 and tracking choice OUT-016.

**Carried evidence:** src/core/features/outreach/`; `src/core/features/assistance/record-routes.ts`; `src/core/features/assistance/record-preview.ts`; `migrations/core/0056_record_mail.sql`; `migrations/core/0066_record_mail_completion.sql`; `src/core/features/operator/ui/record-mail.tsx`; `src/core/features/operator/ui/unlinked-replies.tsx`; `src/core/features/settings/removal-handover.ts`; `src/core/features/operator/ui/operator-removal-review.tsx`; `tests/core/signals-outreach.test.ts`; `tests/support/record-mail.ts`; `tests/support/record-mail-ai.ts`; `tests/support/record-mail-held-replies.ts`; `tests/support/record-mail-handover.ts`; `tests/support/record-mail-custody.ts`; `tests/core/operator-erasure.test.ts`; `newtests/t096/forward-upgrade.test.ts`; `tests/support/record-mail-upgrade.ts`; `newtests/t096/browser-record-mail.ts`; `docs/retained-verification/OUT-017/

### OUT-018 — Sending budgets for each user (partial; HARD)

**Exact acceptance:**

1. Give each user separate rolling one-to-one and sequence budgets, count each provider-submitted message once regardless of recipients, and read the changed limit on the next claim.
2. Lower one SDR’s sequence budget to 50 and verify only that user’s excess steps defer visibly while the other SDR and everyone’s one-to-one mail continue.

**Recorded gap:** Unasserted in the carried evidence: separate sequence budget; provider-submitted count once across recipients; sequence budget of 50 isolates one SDR; other SDR continues; everyone’s one-to-one continues. Asserted: one-to-one budget independent per user; changed limit applies next claim.

**Carried evidence:** tests/core/outreach-limits.test.ts`; `src/core/features/outreach/sending-limits.ts`; `src/core/features/outreach/service.ts`; `src/core/features/outreach/approval-repository.ts`; `src/core/features/operator/ui/sending-capacity.tsx`; `tests/evidence/contract/OUT-018/

### OUT-024 — Connected-mailbox pace and provider quotas (missing; HARD)

**Exact acceptance:**

1. Send through Gmail and Microsoft 365 at the account type’s published message/recipient limits, including lower trial/consumer limits; no deployment throttle delays either mailbox.
2. Inject one mailbox’s provider quota response and verify only that mailbox defers visibly until its stated next window, with no transport or identity switch.

**Recorded gap:** Unasserted in the carried evidence: Gmail account-specific pace; Microsoft 365 account-specific pace; trial/consumer lower limits; no deployment-wide mailbox throttle; only throttled mailbox deferred; visible provider next window; no transport switch; no identity switch. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

**Carried evidence:** tests/core/outreach-limits.test.ts`; `src/core/features/outreach/sending-limits.ts`; `src/core/features/outreach/service.ts`; `src/core/features/outreach/approval-repository.ts`; `src/core/features/operator/ui/sending-capacity.tsx`; `tests/evidence/contract/OUT-018/

### OUT-025 — Shared-transport priority and fair draining (partial; HARD)

**Exact acceptance:**

1. With 12 users (nine AEs, two SDRs and one manager) sending through Gmail and Microsoft 365 mailboxes and the shared transport, in one business morning each user approves 40 one-to-one messages while two SDRs each approve a 100-recipient, four-step SEQUENCE-003 batch.
2. Verify that every one-to-one message is submitted within 60 seconds of its approval while the batches drain; that each SDR's 100 first steps are submitted within the business day inside their own sequence budget, interleaved with the other SDR's; and that no deployment-wide throttle delays a mailbox send.
3. On the shared transport, reserve one-to-one capacity while sequences take at most 75 percent; progress both SDR batches round-robin and preserve enrollment order within each user.

**Recorded gap:** Unasserted in the carried evidence: 12-user mixed-mailbox/shared morning; 40 one-to-one approvals each; two 100-recipient four-step batches; every one-to-one submitted within 60 seconds; both 100-first-step batches drain in business day; batches interleave; provider/mailbox limits respected; 75-percent sequence share; reserved one-to-one capacity; per-user round-robin; per-user enrollment order. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

**Carried evidence:** tests/core/outreach-limits.test.ts`; `src/core/features/outreach/sending-limits.ts`; `src/core/features/outreach/service.ts`; `src/core/features/outreach/approval-repository.ts`; `src/core/features/operator/ui/sending-capacity.tsx`; `tests/evidence/contract/OUT-018/

### OUT-026 — Sending usage and submission latency (partial; HARD)

**Exact acceptance:**

1. Record the measured submission latencies at the declared 25-user capacity before the installation manifest drops `estimated-until-load-tested`.
2. Read visible unsent reasons, limit value and next permitted time for sequence budget, one-to-one budget, mailbox pace, provider throttle and shared rate.
3. Inspect one’s own usage and, as administrator, every user’s and mailbox’s usage under the 12-user morning load.

**Recorded gap:** Unasserted in the carried evidence: declared 25-user measured submission latencies; sequence budget refusal; mailbox pace refusal; provider throttle refusal; mailbox usage; 12-user mixed-transport morning. Asserted: one-to-one budget refusal reason/value/time; shared rate refusal reason/value/time; own budget use and remaining; administrator sees all users.

**Carried evidence:** tests/core/outreach-limits.test.ts`; `src/core/features/outreach/sending-limits.ts`; `src/core/features/outreach/service.ts`; `src/core/features/outreach/approval-repository.ts`; `src/core/features/operator/ui/sending-capacity.tsx`; `tests/evidence/contract/OUT-018/

### OUT-019 — To, CC and BCC recipient review (missing; HARD)

**Exact acceptance:**

1. Compose with ordered To, CC and BCC lists through record compose, drafts, mailbox sends and newly accepted capture; autocomplete offers only permitted contacts and active users.
2. A do-not-contact address in any list refuses the whole message, naming a visible contact but revealing no hidden/erased identity; removing it re-renders for fresh review.
3. For unknown external addresses explicitly create with recorded relationship basis, accept a pending proposal or retain as one-off with basis on the message; internal colleagues remain outside contactability, tracking and customer contacts.

**Recorded gap:** No implementation found. Drafts and outbound messages hold a single `recipient_email` matched to one `contact_id`, and the dispatcher in `src/core/features/outreach/service.ts` joins on it; there are no CC or BCC lists, internal or one-off recipients, reply-all pre-fill or per-recipient landing.

**Carried evidence:** 

### OUT-027 — Reply and reply-all threads (missing; HARD)

**Exact acceptance:**

1. Receive a captured Gmail thread with two CC colleagues, one unknown; reply all, add an internal sales engineer and a known BCC contact, and verify own addresses/aliases removed, no old BCC prefilled and duplicate addresses removed.
2. Record the unknown participant’s inbound basis, keep the provider thread and message-reference chain, and repeat through Microsoft 365 and the shared sender.
3. A genuine exact-identity external participant’s reply closes the contact obligation and the linked deal’s follow-up or sequence enrollment; internal, automatic, foreign and ambiguous replies close nothing.

**Recorded gap:** No implementation found. Drafts and outbound messages hold a single `recipient_email` matched to one `contact_id`, and the dispatcher in `src/core/features/outreach/service.ts` joins on it; there are no CC or BCC lists, internal or one-off recipients, reply-all pre-fill or per-recipient landing.

**Carried evidence:** 

### OUT-028 — Multi-recipient delivery and disclosure (missing; HARD)

**Exact acceptance:**

1. Submit one provider message with exactly the reviewed To, CC and BCC lists and no delivered BCC header; changing any list invalidates the reviewed snapshot.
2. Log once per external contact, primary company and linked deal; show To/CC within current access and show a BCC address only to that contact and sender, absent from other timelines, copies, reports and exports.
3. With several external recipients inspect message-level tracking, untracked behavior when any recipient forbids it, and per-person opt-out without a one-click header; a message counts once against the sender’s budget.

**Recorded gap:** No implementation found. Drafts and outbound messages hold a single `recipient_email` matched to one `contact_id`, and the dispatcher in `src/core/features/outreach/service.ts` joins on it; there are no CC or BCC lists, internal or one-off recipients, reply-all pre-fill or per-recipient landing.

**Carried evidence:** 

### OUT-020 — Opt-out settings and exact message state (partial; HARD)

**Exact acceptance:**

1. Change the type setting after approval and verify the approved unsent state and Settings counts remain unchanged.
2. Check a new-installation default, an established-installation upgrade, allowed and forbidden removal, explicit addition, a pre-setting approval, a SendGrid opt-out-on approval after a transport switch, an explicit removed/off approval and a historical `transport` marking; none may silently lose its approved opt-out state or refusal.
3. For Gmail one-to-one mail with opt-out off inspect no header/link; a sequence step has both, and a permitted relationship removal has neither with its review marking.

**Recorded gap:** Unasserted in the carried evidence: established-installation upgrade; pre-setting approvals; Gmail one-to-one no opt-out header/link; sequence step includes both; relationship-marked sequence step omits both. Asserted: approved unsent state preserved; Settings counts unchanged for bound state; new-installation defaults; allowed removal; forbidden removal; explicit addition; SendGrid-to-relay opt-out continuity; explicit off state; historical transport refusal.

**Carried evidence:** src/core/features/outreach/opt-out.ts`; `src/core/platform/outbound-mail.ts`; `src/core/platform/managed-outbound-mail.ts`; `src/core/features/operator/ui/opt-out-settings.tsx`; `src/core/features/operator/ui/draft-opt-out.tsx`; `tests/core/outbound-boundaries.test.ts`; `tests/evidence/contract/OUT-020/

### OUT-029 — Single-recipient opt-out capabilities (partial; CHEAP)

**Exact acceptance:**

1. On the managed relay, turn one-to-one opt-out on and approve a single-recipient message: inspect the reviewed footer and the exact submitted opt-out URL and the one-click opt-out header and value, all bound to the same capability at the installation’s configured public origin.
2. Open the public link and verify GET changes nothing; use the plain POST button and separately the RFC 8058 POST, replay each, and verify only the bound contact is suppressed and all of that contact's scheduled work is canceled atomically, with a different contact's work unchanged and no late dispatch.
3. Try malformed and foreign capabilities and one invalidated by erasure without recipient disclosure or mutation.
4. Round-trip the private capability table through the archive and retain no-expiry behavior.
5. Inspect review, settings, confirmation, unsubscribed and invalid states at 1440 and 390.

**Recorded gap:** Unasserted in the carried evidence: record-mail capability archive round-trip; review at 1440 and 390; settings at 1440 and 390; confirmation at 1440 and 390; unsubscribed state at 1440 and 390; invalid state at 1440 and 390. Asserted: durable capability bound to message; exact footer bytes; matching opt-out URL header; one-click header; configured installation origin; GET changes no state; plain POST suppresses bound contact; RFC 8058 replay preserves digest; all held/claimed/scheduled work cancelled; different contact untouched; different contact’s schedule untouched; late dispatch sends nothing; malformed and foreign same refusal; invalid request leaves state unchanged; erasure invalidates capability; invalid response discloses no recipient; capability has no arbitrary expiry; deal-bound private capability rows retain exact token, message, contact, origin and creation time through Records HTTP and local portability; original restored links accept plain and RFC 8058 POST ten years later without expiry, rotation or provider resend; source rows and another contact remain unchanged; restored dispatch authority stays cancelled.

**Carried evidence:** src/core/features/outreach/opt-out.ts`; `src/core/platform/outbound-mail.ts`; `src/core/platform/managed-outbound-mail.ts`; `src/core/features/operator/ui/opt-out-settings.tsx`; `src/core/features/operator/ui/draft-opt-out.tsx`; `tests/core/outbound-boundaries.test.ts`; `tests/core/capture-data.test.ts` — DATA-003 current sales capabilities round-trip without authority and erase across public reads, with `tests/support/opt-out-archive.ts`: exact deal-bound capability rows through Records HTTP and local portability, original anonymous GET and POST ten years later, replay, isolated contact, unchanged source and cancelled restored dispatch; `tests/evidence/contract/OUT-020/

### OUT-030 — Several-recipient opt-out (missing; HARD)

**Exact acceptance:**

1. Send an opt-out-enabled three-recipient shared-transport message; inspect no one-click header and one page link, then submit one recipient’s address.
2. Only that recipient becomes do-not-contact, with basis and message citation; the other two remain contactable with scheduled work intact.
3. Refuse a nonrecipient without revealing identities and suppress only a one-off address when it is the actual recipient.

**Recorded gap:** Unasserted in the carried evidence: three-recipient message has no one-click header; one opt-out page link; posted recipient address; only named recipient stopped; basis and message citation stored; other recipients remain contactable; other recipients retain schedules; nonrecipient refusal leaks no identity; one-off address stopped without creating a contact. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

**Carried evidence:** src/core/features/outreach/opt-out.ts`; `src/core/platform/outbound-mail.ts`; `src/core/platform/managed-outbound-mail.ts`; `src/core/features/operator/ui/opt-out-settings.tsx`; `src/core/features/operator/ui/draft-opt-out.tsx`; `tests/core/outbound-boundaries.test.ts`; `tests/evidence/contract/OUT-020/

### OUT-031 — Unattributed stop requests (missing; HARD)

**Exact acceptance:**

1. Deliver a signed multi-recipient provider stop without an address; nobody becomes do-not-contact and every external recipient’s schedule/enrollment pauses visibly with a single request.
2. Refuse new messages naming the request while allowing a reply to that recipient’s inbound message received after it; notify sender and distinct contact owners once.
3. Resolve by naming actual people and resume the others; alternatively record cannot determine and stop all; message and audit retain the resolving user and time.

**Recorded gap:** Unasserted in the carried evidence: unattributed provider stop creates one request; nobody becomes do-not-contact; all external schedules/enrollments visibly paused; new mail refused with request; later inbound reply exception; sender and distinct owners notified once; named people stopped; others’ paused work resumes; cannot-determine stops everyone; resolution user and time in message and audit. The cited evidence does not assert this complete journey; implementation or a test title alone is not proof.

**Carried evidence:** src/core/features/outreach/opt-out.ts`; `src/core/platform/outbound-mail.ts`; `src/core/platform/managed-outbound-mail.ts`; `src/core/features/operator/ui/opt-out-settings.tsx`; `src/core/features/operator/ui/draft-opt-out.tsx`; `tests/core/outbound-boundaries.test.ts`; `tests/evidence/contract/OUT-020/

### OUT-032 — Opt-out upgrades and transport changes (partial; HARD)

**Exact acceptance:**

1. A new installation starts one-to-one opt-out off; an established upgrade keeps it on with its basis shown, and old approvals preserve their original opt-out state.
2. Switch an opt-out-on SendGrid approval to the relay and retain its exact headers/link; explicit off/removal stays off, historical transport markings retain refusal and never become a silent removal.
3. An unsupported transport refuses review and dispatch visibly, with audited Settings counts; connected mailboxes, sequences, batches and workflows preserve the exact reviewed opt-out choice.

**Recorded gap:** Established upgrades keep one-to-one opt-out on with the retained basis visible in authenticated Settings and after page reload; historical approval bytes and state remain unchanged with no provider submissions. Remaining unproved execution: connected mailbox, sequence, batch and workflow paths preserving the exact reviewed opt-out choice, with OUT-013 owner-consented mailbox replies and Base relay sequence proof, OUT-019 Base relay recipient support (one To today), and OUT-013, OUT-019, SEQUENCE-001, SEQUENCE-003 and AUTO-001 prerequisites retained; AUTO-001 retains its ambiguous remainder after one continuation. Asserted in the retained outbound boundary journey: new-installation off default, pre-setting approvals retaining opt-out, SendGrid-to-relay exact header and link continuity, explicit off, historical transport refusal, unsupported review and dispatch refusal, and audited Settings refusal counts.

**Carried evidence:** src/core/features/outreach/opt-out.ts`; `src/core/platform/outbound-mail.ts`; `src/core/platform/managed-outbound-mail.ts`; `src/core/features/operator/ui/opt-out-settings.tsx`; `src/core/features/operator/ui/draft-opt-out.tsx`; `tests/core/outbound-boundaries.test.ts`; `tests/evidence/contract/OUT-020/`; `tests/core/capture-upgrade.test.ts` — CAPTURE-007 OUT-032 the capture migration upgrades a store from the previous main with every prior row and queue unchanged; `newtests/t096/browser-journeys.test.ts` — OUT-032 established opt-out upgrade (the native emitted Worker registration), using `newtests/t096/browser-opt-out-upgrade.ts

### TASK-001 — Assigned prioritized recurring sales tasks (partial; CHEAP)

**Exact acceptance:**

1. Personal email, push and Slack reminders remain visibly unavailable until NOTIFY-003 ships those channels.
2. INTEGRATE-005’s administrator-routed due-work channel notices do not claim personal reminder preferences.
3. Slack-created internal tasks retain the mapped operator, source Slack and single-use action identity.
4. Create a high-priority due call and weekly follow-up, assign/reassign and complete from the daily task view, see the new assignee notified once, restart around recurrence and verify one next occurrence; remove the rep and hand over remaining tasks.

**Recorded gap:** Unasserted in the carried evidence: personal email visibly unavailable; personal push visibly unavailable; personal Slack preference unavailable; channel due-work notice does not claim a personal preference; Slack task names mapped operator; Slack task retains source attribution.; single-use action identity; high-priority due call; weekly follow-up; assignment and reassignment; daily task view completion; restart around recurrence; exactly one next occurrence. Asserted: operator removal handover; reassignment reaches the receiving full operator native inbox once, links to the task readable by that receiver, and stale replay preserves the same inbox identities without another notice.

**Carried evidence:** src/core/features/tasks/`; `tests/core/today-brief.test.ts`; `tests/support/sales-tasks.ts` (exerciseSalesTasks); `tests/evidence/contract/TASK-001/

### NOTIFY-003 — Reminders that reach an absent seller (partial; HARD)

**Exact acceptance:**

1. INTEGRATE-005’s Slack safety rules govern this clause.
2. Personal reminders, digests and RECORD-017 mentions use only opt-in DMs to explicitly mapped operators with current record access.
3. An authorized DM may name a contact, but never entry text, amounts or contact details; private entries get generic notices.
4. Withdraw an undelivered mention when its source is deleted.
5. Leave Orbit closed, advance a task reminder/digest schedule, receive it in a real mailbox/device and inspect its evidence link; complete or reassign the task before dispatch, simulate a provider failure and restart without stale or duplicate reminders.

**Recorded gap:** Native personal mention DMs use self-managed opt-in bound to an explicit current installation mapping and active full-operator authority; generic private-entry notices contain only an authenticated exact-entry link. Team and restricted-role audiences remain TEAM-005. Due and overdue reminders, daily digests, working-hours and timezone scheduling, missed-run recovery and configured-manager escalation remain unbuilt. Personal assignment and form external channels, system notification email, REPORT-002 recipient-specific email, personal-DM provider deletion tracking, real opted-in Slack DM qualification and real mailbox and device receipt remain unproved. Dashboard email stays paused for the system sender and attachment transport prerequisites; mobile push needs Apple and Google accounts. Existing native in-app assignment and form notices, dashboard schedule definitions and Slack delivery history remain intact.

**Carried evidence:** tests/core/source-onboarding.test.ts` — NOTIFY-003 opt-in personal mention DMs recheck identity and access, withdraw on deletion and hold uncertainty (with `tests/support/personal-slack-proof.ts` and `tests/support/slack-archive-proof.ts`); `newtests/t096/report-disclosure.test.ts` — REPORT-002 REPORT-003 REPORT-004 a manager’s Tile board (with `newtests/t096/browser-dashboard-slack.ts` personal preference and delivery screens); `newtests/t096/forward-upgrade.test.ts` — API-002 credential storage and RECORD-016 ownership and accepted main and released v0.3.0 advance

### SEQUENCE-001 — Versioned sales sequence authoring (partial; HARD)

**Exact acceptance:**

1. As a seller create/share a five-step email, wait, call-task, meeting and manual LinkedIn sequence, then refuse a read-only author.
2. Copy a shared sequence to edit, lock one as manager and inspect versioned conditions, business-day delays, permitted team/workspace shares and internal-only CC.

**Recorded gap:** Reviewed single scheduled messages exist; multi-step definitions, rep authoring and sharing, deal-less enrollments, step threading, internal CC and manual step execution are missing.

**Carried evidence:** src/core/features/outreach/scheduler.ts`; `src/core/features/drafts/service.ts`; `tests/core/outreach-limits.test.ts

### SEQUENCE-004 — Sequence enrollment and scheduled steps (partial; HARD)

**Exact acceptance:**

1. As a seller, create and share with the team a five-step email/call/manual-LinkedIn sequence whose second email step is threaded and CCs the account's sales engineer, and see a read-only user refused authoring; enroll eligible contacts with and without deals with exact-content approvals, complete the manual task, advance business time and restart mid-step; verify one action per due step, the second email arriving in the first email's thread with the internal CC, OUT-018 per-user budget enforcement and no unapproved send.
2. Exercise a threaded second email and new-subject step, including the no-earlier-send fallback; review discloses the thread choice and each exact rendered recipient/step.

**Recorded gap:** Reviewed single scheduled messages exist; multi-step definitions, rep authoring and sharing, deal-less enrollments, step threading, internal CC and manual step execution are missing.

**Carried evidence:** src/core/features/outreach/scheduler.ts`; `src/core/features/drafts/service.ts`; `tests/core/outreach-limits.test.ts

### SEQUENCE-005 — Sequence outcome reports (partial; HARD)

**Exact acceptance:**

1. By sequence version, step and enrolling rep, reconcile enrollment, sent, delivered, genuine replies, meetings, stage and revenue outcomes separately.
2. Drill every figure into its permitted enrollments; inferred opens never count as success and automatic replies never count as replies.

**Recorded gap:** Reviewed single scheduled messages exist; multi-step definitions, rep authoring and sharing, deal-less enrollments, step threading, internal CC and manual step execution are missing.

**Carried evidence:** src/core/features/outreach/scheduler.ts`; `src/core/features/drafts/service.ts`; `tests/core/outreach-limits.test.ts

### SEQUENCE-002 — Immediate sequence exits and accountable outcomes (partial; HARD)

**Exact acceptance:**

1. Race an approved due step with each reply/booking/stage/stop event, including a reply on the step's thread from a colleague the buyer CC'd, restart and replay; verify no prohibited send, one exit reason and separate reply/meeting/deal-outcome measures.

**Recorded gap:** Unasserted in the carried evidence: external colleague reply exit; unsubscribe/permanent-bounce stop; complete due-step races for every exit event; persisted-store and process restart preserves exit. Asserted: native human cancellation of one exact reviewed single scheduled message, fresh cancelled-state and first-reason readback, one attributed message.cancelled timeline entry, repeated cancellation refused with unchanged effects, and zero submission from a fresh late dispatcher (not restart proof); reply exit; booking exit; stage exit atomic with stage change; one first exit reason; replay/reopen/late dispatch revive nothing; separate customer outcome counts.

**Carried evidence:** tests/core/signals-outreach.test.ts` — OUT-007 OUT-009 SEQUENCE-002 stage move, close and genuine reply end scheduled follow-up atomically; automatic reply and open report do not; `src/core/features/pipelines/movement.ts`; `src/core/features/records/repository.ts`; `src/core/features/outreach/follow-up-outcomes.ts`; `src/core/features/operator/ui/follow-up-outcomes.tsx`; `tests/evidence/contract/SEQUENCE-002/

### SEQUENCE-003 — Bulk enrollment and rendered batch review (missing; HARD)

**Exact acceptance:**

1. From a saved list of 50 eligible contacts (ten of them on no deal) and 3 ineligible contacts, enroll all of them in a five-step sequence with four email steps in one action; inspect the excluded reasons, open any rendered message, edit one and remove one, then approve once.

**Recorded gap:** No implementation found. Reviewed single scheduled messages exist under OUT-009; sequences, batch rendering and batch approval do not.

**Carried evidence:** 

### SEQUENCE-006 — Batch dispatch and isolated review holds (missing; HARD)

**Exact acceptance:**

1. Advance business time and verify one provider submission per due email step per remaining recipient with no further approval, a per-rep limit of 40 per day deferring the rest visibly to the next window, a merge-field change on one contact holding only that recipient's step for review.
2. With at most 100 selected contacts, persist every rendered message hash and sequence version; dispatch one effect per approved step and hold only a changed recipient while the rest progresses.
3. Observe exits, pauses, template/signature/attachment snapshots, opt-out state, per-user pacing, one-to-one priority and quiet hours through every batch item.

**Recorded gap:** No implementation found. Reviewed single scheduled messages exist under OUT-009; sequences, batch rendering and batch approval do not.

**Carried evidence:** 

### SEQUENCE-007 — Workflow-triggered enrollment review (missing; HARD)

**Exact acceptance:**

1. Trigger a workflow contact and inspect the owner’s sequence/day group awaiting its batch approval; no message sends before that group is approved.
2. Read the batch, approver, listed hashes and later holds in enrollment history and audit.

**Recorded gap:** No implementation found. Reviewed single scheduled messages exist under OUT-009; sequences, batch rendering and batch approval do not.

**Carried evidence:** 

### AUTO-001 — Configurable sales workflows and visible execution (partial; HARD)

**Exact acceptance:**

1. Preview and activate a stale-deal rule, trigger it twice, change the record and revoke permission before dispatch; inspect one authorized task/notification, one AUTO-002 field write applied without a proposal, no stale field write/send, and an actionable failed webhook run after restart.

**Recorded gap:** Native version drafts, retained-snapshot dry runs, preview and activation, persisted runs, internal writes, tasks, explicit operator notices and declared static webhooks are implemented. Remaining: TEAM-005 real sales-admin grants, teams and team rotation or notices; RECORD-014 leads and custom objects; captured and provider call activity trigger integration; ENRICH-001 authorized provider signals; SEQUENCE-003 approval-queue enrollment and inherited sequence exits; OUT-018 and OUT-020 workflow-email obligations; pre-journal 30-day reconstruction, large-population previews and complete execution-history pagination. The conservative interim administration boundary is the installation owner under the standing scope rule; scoped delegation and provider boundaries remain unproved. Exact candidate qualification is recorded in Verify.

**Carried evidence:** tests/core/capture-review.test.ts` — “CAPTURE-004 CAPTURE-005 captured evidence only proposes changes; a person accepts, edits or declines each, and a declined change never returns for the same evidence; activated workflows use separate guarded write authority”; `tests/core/capture-data.test.ts` — “DATA-003 current sales capabilities round-trip without authority and erase across public reads”; `tests/rer/operator-desktop.test.mjs` — “BASE-PUBLIC-003 T099 native operator routes and expanded data views at 1440px”. `tests/core/capture-upgrade.test.ts` — “CAPTURE-007 the capture migration upgrades a store from the previous main with every prior row and queue unchanged”. Workflow helpers include `tests/support/workflow-journey.ts`, `tests/support/workflow-record-journey.ts`, `tests/support/workflow-safety-journey.ts`, `tests/support/workflow-form-journey.ts` and `tests/rer/workflow-journey.mjs

### AUTO-002 — Workflow record-changing actions (partial; HARD)

**Exact acceptance:**

1. As a sales admin, activate three workflows, each after its preview shows per-record current and resulting values: "deal created" sets the primary contact's lead status to "Open deal" and the company's lifecycle stage to "Opportunity"; "deal closed won" sets the company and all its contacts to "Customer", stamps "Became customer" with the run date and creates an onboarding task; "meeting logged on a deal in Qualified" moves the deal to "Meeting held".
2. Create a deal, close another won and log a meeting; verify every field value and the stage move are written with no proposal, each with a timeline entry naming the workflow, its version and the trigger, and replay a trigger to see no second write, task or record.

**Recorded gap:** Native contact, company and deal set, copy, stamp, clear, arithmetic, stage and associated-deal writes are implemented with typed validation, per-record material approval, current-value guards, durable receipts, loop stops and conditional field or stage undo. Remaining: TEAM-005 scoped sales-admin record and field grants; RECORD-014 leads, custom objects and related targets; product, quote and forecast sidecar actions; created-record archival undo and complete owner-rule selection; pre-journal 30-day reconstruction, form-copy previews without a submission value, per-action preview counts, large previews and full-history pagination; complete per-field intervening-edit attribution and record-atomic failure qualification; named typed-user rendering in record summaries; workflow source in reports and API change webhooks; migration mappings and declared rate-limit qualification. The conservative interim activator is the installation owner under the standing scope rule. Exact candidate qualification is recorded in Verify.

**Carried evidence:** tests/core/capture-review.test.ts` — “CAPTURE-004 CAPTURE-005 captured evidence only proposes changes; a person accepts, edits or declines each, and a declined change never returns for the same evidence; activated workflows use separate guarded write authority”; `tests/core/capture-data.test.ts` — “DATA-003 current sales capabilities round-trip without authority and erase across public reads”; `tests/rer/operator-desktop.test.mjs` — “BASE-PUBLIC-003 T099 native operator routes and expanded data views at 1440px”. `tests/core/records-complete.test.ts` — “RECORD-014 typed fields validate edits and preserve paged archived definition meaning through public history and export”. Workflow helpers include `tests/support/workflow-journey.ts`, `tests/support/workflow-record-journey.ts`, `tests/support/workflow-safety-journey.ts`, `tests/support/workflow-form-journey.ts`, `tests/support/workflow-copy-erasure-journey.ts`, `tests/support/workflow-archive-proof.ts` and `tests/rer/workflow-journey.mjs

### AUTO-003 — Workflow activation and history (partial; HARD)

**Exact acceptance:**

1. Preview current matching records and the past 30 days with per-record current/resulting fields, moves, creates and per-action counts; read back activating administrator, version and time.
2. Edit an active version and verify no new-version effect before preview/activation; dispatch a delayed old version and read version replaced.
3. Timeline, field history, reports and API change events name workflow, version, trigger/evidence and old/new values; migrations list each action as mapped, needing approval or without equivalent.

**Recorded gap:** Implemented: versioned activation recording the activating administrator, a preview with past-30-day history and its coverage, internal writes applied without a per-record proposal, and a replaced version stopping its delayed runs. Remaining: pre-journal 30-day reconstruction and large previews; workflow as the change source in reports and API change webhooks; migration mappings that list each action. No cited test asserts all three acceptance points.

**Carried evidence:** src/core/features/workflows/engine.ts`; `src/core/features/workflows/planning.ts`; `src/core/features/workflows/record-writes.ts`; `tests/support/workflow-journey.ts`; `tests/support/workflow-record-journey.ts`; `tests/rer/workflow-journey.mjs

### AUTO-004 — Material workflow changes (partial; HARD)

**Exact acceptance:**

1. Activate a rule that sets a deal amount and verify an approval item waits for the deal owner, with no change until it is accepted.
2. Inspect guarded current/proposed value, evidence and named approver; decline or let seven days lapse and read the closed outcome, with counts in preview.
3. A workflow may stop contactability but cannot create it, change consent, delete or merge; customer content and enrollment follow their own exact-content rules.

**Recorded gap:** Implemented: amount, close date, won or lost, product, line-item, quote-value and forecast changes and fields marked for approval create one guarded approval item that is accepted, declined or closed after 7 days. Unasserted: the "needs approval" editor label and preview counts; that a workflow cannot create contactability, change consent, delete or merge. Quote and forecast targets await QUOTE-001 and FORECAST-001.

**Carried evidence:** src/core/features/workflows/engine.ts`; `src/core/features/workflows/record-plans.ts`; `src/core/features/operator/ui/workflows-record-approvals.tsx`; `tests/support/workflow-safety-journey.ts`; `tests/rer/workflow-journey.mjs

### AUTO-005 — Workflow guards and recovery (partial; HARD)

**Exact acceptance:**

1. Close a deal won whose company lifecycle stage a user edited after the trigger and verify that write is skipped as changed by that user while the contacts and task are updated.
2. As a manager without the grant to edit a protected field, try to activate a rule writing it and see the refusal naming the field; reduce a sales admin's grant after activation and see the next run refuse that action visibly.
3. Chain two workflows into a loop and see it stop at the depth limit.
4. Restart mid-run and resume without a duplicate write.
5. Fail type, picklist, required or unique validation and inspect a per-record atomic action failure; earlier applied actions remain listed and undoable, later actions stop.
6. Change a condition before dispatch and read the stopped run; preserve administrator event order, bounded depth and visibly queued rate excess without silently overwriting another actor.

**Recorded gap:** Implemented: an authority check that marks a version needs re-activation, current-value guards, typed validation, a queued write-rate limit and restart-safe resume of failed runs. Remaining: TEAM-005 field-level grants, so no refusal names a protected field at activation; complete per-field intervening-edit attribution and record-atomic failure qualification; the loop depth limit is not asserted by a cited test.

**Carried evidence:** src/core/features/workflows/engine.ts`; `src/core/features/workflows/record-validation.ts`; `src/core/features/workflows/repository.ts`; `tests/support/workflow-safety-journey.ts`; `tests/support/workflow-journey.ts

### AUTO-006 — Undo workflow effects (partial; CHEAP)

**Exact acceptance:**

1. Undo the closed-won run after a user edited one contact; verify the other values are restored, that contact is listed as skipped and the stage history records the undo.
2. Undo a run or version over a time range; archive a created record only while it has no later edit/association, list skipped records with who/time, and retain attributed stage reversal.
3. Undo sends nothing and never reopens or deletes tasks or messages.

**Recorded gap:** No remaining implementation gap is recorded: the done judgment on this row has not been run through a gate.

**Carried evidence:** tests/core/capture-review.test.ts` — “CAPTURE-004 CAPTURE-005 captured evidence only proposes changes; a person accepts, edits or declines each, and a declined change never returns for the same evidence; activated workflows use separate guarded write authority”, which runs `tests/support/workflow-record-journey.ts` and `tests/support/workflow-undo-journey.ts` — workflowUndoJourney. Acceptance 1: workflowRecordJourney undoes the closed-won run after a person edited one contact (the other contact is restored, the edited contact is listed as skipped with who changed it) and workflowUndoJourney reverses a stage move into stage history, attributed in the audit trail. Acceptance 2: workflowUndoJourney undoes a version over a time range with three created deals (the untouched deal is archived, the deal a person edited and the deal a person logged a note on are skipped, each naming who and when), refuses an operator without workflow authority, leaves runs outside the range untouched and reverses the stage move. Acceptance 3: workflowUndoJourney counts messages, Slack notices, notifications, tasks and notes before and after undo and replay (unchanged), shows a scheduled message stays scheduled across a stage reversal, and `tests/support/workflow-journey.ts` keeps the task created by a run after its undo. Code: `src/core/features/workflows/controls.ts`; `src/core/features/workflows/record-writes.ts`; `src/core/features/workflows/record-archive.ts`; `src/core/features/operator/ui/workflows-version-undo.tsx

### CALL-001 — Provider-backed click-to-call (partial; HARD)

**Exact acceptance:**

1. Connect Twilio and Aircall in turn, initiate a call from a real deal to an authorized test number, record answered/no-answer/failed dispositions, replay callbacks and revoke the connection; verify one truthful linked call each time.
2. Place one call and receive one inbound call in the Aircall app outside Orbit and verify each is logged once on the matched contact and deal, with an unknown number held for review.
3. As part of BOUNDARY-001's walk, call the walk's USD deal contact and inspect the provider link, the carrier boundary and an unapproved provider shown as unresolved setup with manual logging still available.

**Recorded gap:** Implemented first slice: owner-managed encrypted Twilio configuration, replacement and disconnect; contact and linked-deal exact-number review with one attempt; signed ordered callbacks, replay refusal, outside-Orbit logs and owner review of unknown numbers; one call per Rep activities row; contact erasure replay fences and credential-free Records/CLI archives. Calling settings, held review, contact/deal call review and logs are exercised at 1440 and 390. A Twilio test-credential application receipt (sd-orbit-hk1, 26 October 2026) ran the built Worker at an HTTPS loopback origin: the owner saved the account's test credentials through the calling-settings door, and the real dial door made one Calls request, which Twilio accepted with a call receipt (attempt submitted); replaying that operation key was refused before any second request; each of Twilio's documented test refusals (invalid, unroutable, internationally unpermitted and blocked To; invalid From) made one request, returned Twilio's error code and was recorded as an uncertain attempt with no call. Test credentials place no call and send no callbacks, so callbacks, inbound and outside-Orbit logging remain proven only by the signed network-edge fixtures, which cover completed and ringing events; no-answer, busy, canceled and failed dispositions have neither a provider proof nor a fixture. Aircall, a live-account call to an authorized test number with its real callbacks and dispositions, a distinct failed state for Twilio's definite refusals (recorded as uncertain today) and the complete inherited buyer journey remain gaps.

**Carried evidence:** src/core/features/calls/`; `tests/core/today-brief.test.ts`; `tests/support/twilio-calls.ts`; `tests/delegation-browser/records-layout.test.ts`; `newtests/t096/collaborator-lifecycle.test.ts

### CALL-002 — Consented recordings and cited transcripts (partial; HARD)

**Exact acceptance:**

1. Record an authorized test call, decline consent on another, read timestamped transcript evidence from the deal, correct a speaker and approve a stale-guarded proposal; deny an unauthorized user and erase local and provider copies.
2. Contradict a recorded commitment in a transcript and inspect AGENT-002's cited conflict.
3. As part of BOUNDARY-001's walk, record a consented call on the walk's USD deal and inspect the provider link and an unavailable recording provider shown as unresolved setup.

**Recorded gap:** CALL-002: recording and participant-consent enforcement, cited transcripts and speaker review, stale proposals, transcript-based risk evidence, current-access playback, retention, local derivatives and confirmed provider deletion, original buyer-walk steps, provider qualification and state-specific legal qualification remain unproved. Dialing authority remains CALL-001; the complete cross-product steps remain with BOUNDARY-001’s named receiving clauses.

**Carried evidence:** src/core/features/records/manual.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-review.test.ts

### CALL-003 — Participant recording consent and provider deletion (partial; HARD)

**Exact acceptance:**

1. Exercise consent refusal, unknown participant state, a new participant and withdrawal; recording stays off until the stricter applicable participant requirement is met, while an unrecorded call/manual notes remain available.
2. Read disclosure version, participant consent evidence/time and separate lawful calling authority; current record access governs protected provider references and cited evidence.
3. Expire provider retention and refuse inaccessible media; erase local derivatives immediately and inspect separately pending, failed and confirmed provider deletion, never completion from request acceptance.

**Recorded gap:** CALL-002: recording and participant-consent enforcement, cited transcripts and speaker review, stale proposals, transcript-based risk evidence, current-access playback, retention, local derivatives and confirmed provider deletion, original buyer-walk steps, provider qualification and state-specific legal qualification remain unproved. Dialing authority remains CALL-001; the complete cross-product steps remain with BOUNDARY-001’s named receiving clauses.

**Carried evidence:** src/core/features/records/manual.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-review.test.ts

### REPORT-002 — Saved dashboard tiles and filters (partial; HARD)

**Exact acceptance:**

1. As a manager, build a dashboard with at least four tiles: open pipeline by stage across two pipelines, won/lost reasons this quarter, activities by rep, and forecast against quota.
2. Delete one source report and see an unavailable tile.
3. Apply owner, team, pipeline, date and shared-field filters; each unsupported filter is disclosed on the tile and each supported tile drills to its saved report definition with period, timezone, fields, currency, missing data and freshness.
4. Late evidence appears beside the saved result and the grid reflows on a phone; the dashboard holds no more than 24 tiles.

**Recorded gap:** Nine-tile composition, viewer-fenced figures/drill rows, Owner/Pipeline/US date/Region filters, named/workspace sharing, personal defaults, unavailable/error/no-value/late evidence, PDF and tile CSV, versioned custody, paused restore and erasure are implemented. TEAM-005 inherits team filter/sharing/default/restricted sellers; RECORD-016 later owner kinds; NOTIFY-003 the later delivery model. Owner-chosen Dashboard ready routing and separately audited owner enablement send one generic Slack notice and authenticated link per occurrence/channel; replay, rate limits, failure/retry, held uncertainty and non-resuming safety suspension are proven. Email remains paused: the relay rejects attachments and no system notification sender exists; weekly recipient-specific email, next-send email revocation, email attempts and email retry/uncertain behavior remain gaps. PDF rejects text outside WinAnsi. Live forecasts apply the workspace calendar day and shared-field bindings; saved forecasts keep their original UTC definition and measured result. Every composed response rechecks its original dashboard, saved sources and permitted source rows after the final metadata read. Real team roles, audiences/defaults and restricted sellers remain TEAM-005; daily/weekly/monthly recipient-specific email and its revocation, failure, uncertainty and no-resend provider proof remain blocked on the system sender and attachment transport. No real provider delivery or release acceptance is claimed.

**Carried evidence:** src/core/features/dashboards/`; `migrations/core/0053_dashboards.sql`; `newtests/t096/report-disclosure.test.ts`; `newtests/t096/dashboard-access-proof.ts`; `newtests/t096/dashboard-archive.ts`; `newtests/t096/forward-upgrade.test.ts`; `tests/core/source-onboarding.test.ts`; `docs/retained-verification/REPORT-002/`; `src/core/features/dashboards/read-fences.ts`; `newtests/t096/dashboard-backend-proof.ts

### REPORT-003 — Dashboard sharing and defaults (partial; HARD)

**Exact acceptance:**

1. Apply owner, team and date-range filters, share it with the sales team and set it as the team default.
2. Sign in as a restricted rep and verify that the same dashboard opens by default and shows only totals that reconcile with that rep's permitted drill-through, with no hidden count.
3. Share privately, by named user/team or workspace to view/edit, then revoke; every figure, drill row and default applies current access with no hidden count or sum.

**Recorded gap:** Nine-tile composition, viewer-fenced figures/drill rows, Owner/Pipeline/US date/Region filters, named/workspace sharing, personal defaults, unavailable/error/no-value/late evidence, PDF and tile CSV, versioned custody, paused restore and erasure are implemented. TEAM-005 inherits team filter/sharing/default/restricted sellers; RECORD-016 later owner kinds; NOTIFY-003 the later delivery model. Owner-chosen Dashboard ready routing and separately audited owner enablement send one generic Slack notice and authenticated link per occurrence/channel; replay, rate limits, failure/retry, held uncertainty and non-resuming safety suspension are proven. Email remains paused: the relay rejects attachments and no system notification sender exists; weekly recipient-specific email, next-send email revocation, email attempts and email retry/uncertain behavior remain gaps. PDF rejects text outside WinAnsi. Live forecasts apply the workspace calendar day and shared-field bindings; saved forecasts keep their original UTC definition and measured result. Every composed response rechecks its original dashboard, saved sources and permitted source rows after the final metadata read. Real team roles, audiences/defaults and restricted sellers remain TEAM-005; daily/weekly/monthly recipient-specific email and its revocation, failure, uncertainty and no-resend provider proof remain blocked on the system sender and attachment transport. No real provider delivery or release acceptance is claimed.

**Carried evidence:** src/core/features/dashboards/`; `migrations/core/0053_dashboards.sql`; `newtests/t096/report-disclosure.test.ts`; `newtests/t096/dashboard-access-proof.ts`; `newtests/t096/dashboard-archive.ts`; `newtests/t096/forward-upgrade.test.ts`; `tests/core/source-onboarding.test.ts`; `docs/retained-verification/REPORT-002/`; `src/core/features/dashboards/read-fences.ts`; `newtests/t096/dashboard-backend-proof.ts`; `newtests/t096/report-time-boundaries.test.ts` — “report periods compare instants across ISO precision and timezone equality boundaries” (native named view, denied edits, dashboard-share revocation and default-directory privacy); `newtests/t096/report-disclosure.test.ts` — “REPORT-002 REPORT-003 REPORT-004 a manager’s Tile board composes viewer-fenced reports and exports; REPORT-001 a US monthly two-pipeline report reconciles won/lost/open deals, reasons and rep activities by drill-through, discloses its basis, and leaks nothing after revocation or late evidence” (named viewer figures and drill-through, revoked-share refusal and default removal at both widths)

### REPORT-004 — Dashboard export and scheduled delivery (partial; HARD)

**Exact acceptance:**

1. INTEGRATE-005 carries only a generic dashboard-ready notice and authenticated link.
2. No PDF, CSV, image, count or sum goes to a Slack channel; the signed-in viewer renders the dashboard under their current access.
3. Schedule a weekly email to the manager and the rep and verify each received copy matches its recipient's access.
4. Export PDF and per-tile CSV; retain versioned definitions, filters, shares and schedules through archives.
5. Explicitly enable a saved Slack schedule version independently from email; a new version, restore, reconnect or destination safety suspension leaves it paused, with no historic replay or auto-resume.

**Recorded gap:** Nine-tile composition, viewer-fenced figures/drill rows, Owner/Pipeline/US date/Region filters, named/workspace sharing, personal defaults, unavailable/error/no-value/late evidence, PDF and tile CSV, versioned custody, paused restore and erasure are implemented. TEAM-005 inherits team filter/sharing/default/restricted sellers; RECORD-016 later owner kinds; NOTIFY-003 the later delivery model. Owner-chosen Dashboard ready routing and separately audited owner enablement send one generic Slack notice and authenticated link per occurrence/channel; replay, rate limits, failure/retry, held uncertainty and non-resuming safety suspension are proven. Email remains paused: the relay rejects attachments and no system notification sender exists; weekly recipient-specific email, next-send email revocation, email attempts and email retry/uncertain behavior remain gaps. PDF rejects text outside WinAnsi. Live forecasts apply the workspace calendar day and shared-field bindings; saved forecasts keep their original UTC definition and measured result. Every composed response rechecks its original dashboard, saved sources and permitted source rows after the final metadata read. Real team roles, audiences/defaults and restricted sellers remain TEAM-005; daily/weekly/monthly recipient-specific email and its revocation, failure, uncertainty and no-resend provider proof remain blocked on the system sender and attachment transport. No real provider delivery or release acceptance is claimed. the managed mail relay cannot carry PDF/CSV attachments and Orbit has no system notification sender for active operators or collaborators. Email stays paused with no outbound. Weekly recipient-specific email copies, next-send email revocation, queued/sent/failed/uncertain email attempts and email retry/uncertain behavior remain unproven.

**Carried evidence:** src/core/features/dashboards/`; `migrations/core/0053_dashboards.sql`; `newtests/t096/report-disclosure.test.ts`; `newtests/t096/dashboard-access-proof.ts`; `newtests/t096/dashboard-archive.ts`; `newtests/t096/forward-upgrade.test.ts`; `tests/core/source-onboarding.test.ts`; `docs/retained-verification/REPORT-002/`; `src/core/features/dashboards/read-fences.ts`; `newtests/t096/dashboard-backend-proof.ts

### QUOTE-001 — Products, quotes and signatures (missing; HARD)

**Exact acceptance:**

1. Quote two products with discount and tax disclosure, require manager approval above its threshold, send the approved version through DocuSign, reject an old version and process signed/declined callbacks once; review the resulting billing handoff.
2. As AGENT-002 evidence, contradict a quote date with a logged call and inspect the cited conflict.
3. As the signed-quote step of BOUNDARY-001's walk, quote and sign the walk's USD deal after its support context and inspect the DocuSign link, the signature boundary and an unconfigured provider shown as unresolved setup without a substituted mock.

**Recorded gap:** No implementation found. No implementation of this complete target flow was found.

**Carried evidence:** 

### INTEGRATE-001 — Dial and Calendly bookings (partial; HARD)

**Exact acceptance:**

1. Connect Dial and Calendly, share a reviewed link, book/reschedule/cancel from each provider and inspect the same deal activity and sequence exit; replay and reject a forged callback.
2. As the booking step of BOUNDARY-001's walk, book the walk's USD deal from each provider and inspect its product links, the booking product's ownership of availability and routing, and a disconnected provider shown as unresolved setup without a substituted mock.

**Recorded gap:** Calendly signed booking ingestion and guided callback registration exist; native Dial links and complete reschedule/completion lifecycle are missing.

**Carried evidence:** src/core/features/ingestion/booking-webhooks.ts`; `src/core/features/ingestion/calendly-setup.ts`; `tests/core/source-onboarding.test.ts

### INTEGRATE-002 — Zoom meetings and preparation (missing; HARD)

**Exact acceptance:**

1. Connect Zoom, attach an authorized meeting to a deal, open its preparation, finish it and review a cited recap; deny recording permission, replay completion and cancel a second meeting without fabricated context.
2. As part of BOUNDARY-001's booking step, run this on the walk's booked USD deal and inspect the Zoom link, Zoom's ownership of the meeting and an unconnected Zoom shown as unresolved setup.

**Recorded gap:** No implementation found. No implementation of this complete target flow was found.

**Carried evidence:** 

### INTEGRATE-003 — Nectar and Stripe billing context (missing; HARD)

**Exact acceptance:**

1. INTEGRATE-003 inherits INTEGRATE-005’s billing Slack notice, using its fixed allowed fields and authenticated Orbit link.
2. Link a Stripe test customer and Nectar account to a USD deal, ingest invoice paid/past-due/refund events, replay them and inspect one status timeline; approve a billing handoff and deny a mismatched customer.
3. As the billing step of BOUNDARY-001's walk, hand the walk's signed USD quote to each billing product and inspect its link, the collection boundary and a disconnected provider shown as unresolved setup without a substituted mock.

**Recorded gap:** No implementation found. No implementation of this complete target flow was found.

**Carried evidence:** 

### INTEGRATE-004 — HappyToHelp, Help Scout and Zendesk account context (missing; HARD)

**Exact acceptance:**

1. Connect each support service, map a customer, open a ticket on its sales account, restrict a ticket and revoke access; verify current visibility and one reviewed handoff with a returned support outcome.
2. As the support-context step of BOUNDARY-001's walk, open the walk's USD account after its booking and inspect each support product link, the support product's ownership boundary and a disconnected service shown as unresolved setup without a substituted mock.

**Recorded gap:** No implementation found. No implementation of this complete target flow was found.

**Carried evidence:** 

### INTEGRATE-009 — Slack identity and single-use actions (partial; CHEAP)

**Exact acceptance:**

1. Refuse foreign app/enterprise/user.team_id requests and a mapped operator who lost record access.
2. Changing a Slack timestamp cannot reuse a spent Orbit action ID.
3. Refuse unsigned, stale, unmapped, foreign and revoked actions and removed operators; an authenticated mapped operator acknowledges or creates one internal task with an attributed Slack source and atomic action-id consumption.
4. An acknowledgment never approves/edits/sends mail or accepts an application-proposed handoff; mappings confer no native role, content, delegation or outreach authority.

**Recorded gap:** Unasserted in the carried evidence: foreign app refused; foreign enterprise refused; foreign user.team_id refused; lost native access refused; changed timestamp cannot reuse spent action id; no mail editing; no mail approval; acknowledgment cannot accept proposed handoff; mapping grants no native/content/delegation authority. Asserted: unsigned signature refusal; stale signature refusal; unmapped/foreign/revoked/removed identities leave state unchanged; acknowledgment names operator; task names creator/owner; task retains Slack source attribution.; no customer send from Slack. Atomic action consumption rolls back with failed task insertion, and the same issued action retries once without replay effects.

**Carried evidence:** src/core/features/slack/`; `migrations/core/0051_slack_notices.sql`; `tests/core/source-onboarding.test.ts`; `tests/support/slack-notices-proof.ts`; `tests/support/slack-actions-proof.ts`; `tests/support/slack-archive-proof.ts`; `docs/retained-verification/INTEGRATE-005/`  Acceptance 3 atomic failure and retry: `tests/core/source-onboarding.test.ts` — NOTIFY-003 opt-in personal mention DMs recheck identity and access, withdraw on deletion and hold uncertainty; REPORT-004 explicitly enabled Slack schedules respect DST, hold uncertainty and never resume; email stays paused; INTEGRATE-005 INTEGRATE-009 INTEGRATE-010 INTEGRATE-011 Slack notices carry only allowed fields, replay once, withhold private data and refuse unmapped, foreign and replayed actions; BOUNDARY-001 current USD sales journey respects product boundaries and exposes unresolved provider setup; SIGNAL-001 SIGNAL-009 OPP-004 OPP-007 OUT-001 source onboarding authenticates inert connection tests, ranks real evidence and preserves customer reply through reviewed send (extended `tests/support/slack-actions-proof.ts`: a real D1 trigger aborts task insertion through the signed action route; background completion leaves the issued token, prior notice, action, task, series and timeline unchanged; removing the fault and resubmitting the same issued action creates one attributed Slack task and consumes once; replay adds no effect).

### INTEGRATE-011 — Slack portable definitions and deletion (partial; CHEAP)

**Exact acceptance:**

1. Round-trip routing, event choices, mappings and delivery/action history through Records and local archives without bot/signing/action credentials; restored mappings/routes remain paused until fresh administrator confirmation.
2. Erase a contact, company and deal, inspect redacted stored notices and separately tracked provider deletion outcomes; restored pending deletes require fresh confirmation.
3. At 1440 and 390 inspect Settings, notice status and unresolved setup; existing booking, call/meeting, handoff and won-deal notices keep allowed fields and authenticated links.

**Recorded gap:** Unasserted in the carried evidence: restored pending deletion held for fresh confirmation; Settings/status/unresolved at 1440; Settings/status/unresolved at 390; call/meeting notice; exact allowed field/link safety. Asserted: history portable exactly; bot/signing credentials absent; routing restored paused; mapping provenance portable without authority; no restored action credentials; stored notice content redacted; provider deletion requested; nonempty deletion set has confirmed outcomes; booking notice; won-deal and handoff notices.

**Carried evidence:** src/core/features/slack/`; `migrations/core/0051_slack_notices.sql`; `tests/core/source-onboarding.test.ts`; `tests/support/slack-notices-proof.ts`; `tests/support/slack-actions-proof.ts`; `tests/support/slack-archive-proof.ts`; `docs/retained-verification/INTEGRATE-005/

### INTEGRATE-006 — QuickBooks Online and Xero accounting handoff (missing; HARD)

**Exact acceptance:**

1. For both services approve a USD quote-to-invoice handoff, inspect provider lines/tax/identity, receive partial and full payment status and replay a timed-out result without a second invoice.
2. As the accounting step of BOUNDARY-001's walk, hand the walk's signed USD quote to each accounting service and inspect its link, the ledger boundary and a disconnected service shown as unresolved setup without a substituted mock.

**Recorded gap:** No implementation found. No implementation of this complete target flow was found.

**Carried evidence:** 

### INTEGRATE-007 — Mailchimp audience and suppression handoff (partial; HARD)

**Exact acceptance:**

1. Preview an audience containing subscribed, unknown and stopped contacts; sync only the authorized subset, ingest unsubscribe and replay a prior subscription update; verify no resumed outreach or duplicate subscriber.
2. On BOUNDARY-001's walk, preview the walk's consented buyer for a Mailchimp audience and inspect the Mailchimp link, its campaign ownership and a disconnected account shown as unresolved setup.

**Recorded gap:** Remaining: the consent and member ledger is not yet reconciled by a populated DATA-003 export and restore comparison; refusals for a non-owner administering the connection and for a collaborator handing off are not asserted; Settings reads connected before Mailchimp has checked the webhook address; an unchanged member gets no provider read; Orbit shows its webhook address and the owner adds it in Mailchimp (Orbit does not register it), and only a quick tunnel to a loopback harness has received Mailchimp’s calls, not a hosted installation; Mailchimp’s optional webhook signing is not verified, so the unguessable address is the authority; merging contacts does not carry consent or member links to the survivor, which previews as unknown until consent is recorded again; one handoff makes at most 100 provider requests and reports what remains; the installation owner administers the connection until TEAM-005; Mailchimp deletions are sent after Orbit’s accepted changes and on the owner’s confirmation, not by the scheduled Worker run. The third Acceptance sentence, the complete US buyer walk, belongs to whichever BOUNDARY-001 clause ships last and is not met here: INTEGRATE-001, CALL-001 and CALL-002 are partial, and INTEGRATE-002, INTEGRATE-003, INTEGRATE-004, INTEGRATE-006, INTEGRATE-008 and QUOTE-001 are missing.

**Carried evidence:** src/core/features/marketing/`; `src/core/features/settings/connected-products.ts`; `src/core/features/operator/ui/mailchimp-settings.tsx`; `src/core/features/operator/ui/mailchimp-preview.tsx`; `tests/core/launch-suppression.test.ts`; `tests/core/source-onboarding.test.ts`; `tests/evidence/contract/INTEGRATE-007/mailchimp-live-2026-10-27.json

### INTEGRATE-008 — Buoy post-sale handoff (missing; HARD)

**Exact acceptance:**

1. Its inherited INTEGRATE-005 Buoy notice contains no products, commitments or amounts.
2. The actual reviewed Buoy handoff retains its commitments and evidence; disconnected Slack is unresolved setup.
3. Close an authorized USD deal won, preview and approve its Buoy handoff, inspect the linked receiving account/owner and acceptance, then replay, revoke access and fail the provider; verify one handoff, visible failure and no customer-success workflow built inside Orbit.
4. As the post-sale step of BOUNDARY-001's walk, hand the walk's won USD deal to Buoy and inspect the Buoy link, Buoy's ownership of customer success and a disconnected Buoy shown as unresolved setup.

**Recorded gap:** No implementation found. No implementation of this complete target flow was found.

**Carried evidence:** 

### ENRICH-001 — Licensed enrichment and change signals (partial; HARD)

**Exact acceptance:**

1. Configure a Clay waterfall with two permitted providers, preview cost/fields, enrich a company and contact, refresh a verified job change and conflicting phone, exceed budget, fail one provider and erase/replay; no guessed identity, invented value or outreach permission appears.

**Recorded gap:** Captured evidence proposes field changes; licensed sources, scheduled news/job signals and enrichment waterfalls are missing.

**Carried evidence:** src/core/features/capture/intake.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-review.test.ts

### API-001 — Versioned public record API (partial; HARD)

**Exact acceptance:**

1. An INTEGRATE-005 Slack mapping is neither an API nor a delegation credential.
2. It grants no outreach authority, exact-message approval, sequence execution, record sharing or stage/owner/amount changes.
3. Create, update and list a scoped deal, then cover the original contacts, companies, custom objects, associations, notes, activities, files, tasks, pipelines, reports and sequences; pagination, exact filters, schema errors, rate limits, idempotency and stale-write conflicts match native permissions.
4. Erase a contact and read API/export absence; Slack mappings and delegation grants never become general API credentials.

**Recorded gap:** API-001: the remaining original versioned resource surface and complete acceptance journey, outbound subscription security, delivery and replay controls, their custody and erasure, provider security and legal qualification remain unproved. The standalone scoped deal credential journey is asserted; current inbound-source authority remains SIGNAL-009; narrow application delegation remains DELEGATE-001; later resource behavior remains with its named owning clauses. API-004 now proves live scoped close-date, owner-id and buying-context product reads across two installations; the remaining original resource obligations above stay unproved.

**Carried evidence:** src/core/features/ingestion/routes.ts`; `src/core/features/delegation/protocol.ts`; `tests/core/source-onboarding.test.ts`; `tests/delegation/authority-regressions.test.ts`; `src/core/features/api/credentials.ts`; `src/core/features/api/routes.ts`; `migrations/core/0065_api_credentials.sql`; `tests/support/api-credentials-proof.ts`; `tests/core/archive-transfer.test.ts`; `tests/core/onboarding-archive.test.ts`; `tests/core/operator-erasure.test.ts`; `newtests/t096/forward-upgrade.test.ts`; `tests/core/contact-erasure.test.ts

### API-002 — Named API credential lifecycle (partial; CHEAP)

**Exact acceptance:**

1. Issue a named installation/principal credential with explicit operations, records, fields and expiry; show its secret once, keep only a verifier and exclude it from archives and diagnostics.
2. Rotate, expire, revoke during a write and reduce principal/record authority; every denied read/write leaves no effect, and newly created deals enter only the credential’s bounded scope.
3. A credential cannot supply a person’s exact-message approval or revive expired authority.

**Recorded gap:** API-001: the remaining original versioned resource surface and complete acceptance journey, outbound subscription security, delivery and replay controls, their custody and erasure, provider security and legal qualification remain unproved. The standalone scoped deal credential journey is asserted; current inbound-source authority remains SIGNAL-009; narrow application delegation remains DELEGATE-001; later resource behavior remains with its named owning clauses. API-004 now proves live scoped close-date, owner-id and buying-context product reads across two installations; the remaining original resource obligations above stay unproved.

**Carried evidence:** src/core/features/ingestion/routes.ts`; `src/core/features/delegation/protocol.ts`; `tests/core/source-onboarding.test.ts`; `tests/delegation/authority-regressions.test.ts`; `src/core/features/api/credentials.ts`; `src/core/features/api/routes.ts`; `migrations/core/0065_api_credentials.sql`; `tests/support/api-credentials-proof.ts`; `tests/core/archive-transfer.test.ts`; `tests/core/onboarding-archive.test.ts`; `tests/core/operator-erasure.test.ts`; `newtests/t096/forward-upgrade.test.ts`; `tests/core/contact-erasure.test.ts

### API-003 — Outgoing webhooks and safe replay (partial; HARD)

**Exact acceptance:**

1. Subscribe an owned endpoint and verify signed, stable-identity change/outcome events, signature rotation, receiver replay protection, bounded retry, dead-letter history and audited manual replay.
2. Refuse embedded credentials, insecure/local/private/metadata destinations, rebinding and redirects; each attempt rechecks destination and current permitted fields.
3. Restore subscriptions paused pending fresh authority; erase while delivery is queued and inspect the resulting field exclusion and separately tracked deletion outcomes.

**Recorded gap:** API-001: the remaining original versioned resource surface and complete acceptance journey, outbound subscription security, delivery and replay controls, their custody and erasure, provider security and legal qualification remain unproved. The standalone scoped deal credential journey is asserted; current inbound-source authority remains SIGNAL-009; narrow application delegation remains DELEGATE-001; later resource behavior remains with its named owning clauses.

**Carried evidence:** src/core/features/ingestion/routes.ts`; `src/core/features/delegation/protocol.ts`; `tests/core/source-onboarding.test.ts`; `tests/delegation/authority-regressions.test.ts`; `src/core/features/api/credentials.ts`; `src/core/features/api/routes.ts`; `migrations/core/0065_api_credentials.sql`; `tests/support/api-credentials-proof.ts`; `tests/core/archive-transfer.test.ts`; `tests/core/onboarding-archive.test.ts`; `tests/core/operator-erasure.test.ts`; `newtests/t096/forward-upgrade.test.ts`; `tests/core/contact-erasure.test.ts

### MOBILE-001 — Sales on mobile and desktop (partial; HARD)

**Exact acceptance:**

1. Use the same realistic USD account on desktop, 390px web, iOS and Android; complete task/call/note/stage journeys and exact-message journeys for a new one-to-one email, a reply all and an approved outreach, lose network mid-edit, resolve a conflict, receive push and revoke the device without stale sends.

**Recorded gap:** Responsive native web journeys exist; native mobile apps, offline conflict handling, push reminders and phone composing under OUT-017/OUT-019 are missing.

**Carried evidence:** tests/e2e/operator.spec.mjs`; `tests/delegation-browser/viewport.test.ts`; `newtests/t096/report-disclosure.test.ts

### OPS-001 — Owned operation and explicit provider failures (partial; HARD)

**Exact acceptance:**

1. The INTEGRATE-005 connector declares chat:write, channels:read, groups:read for private channels and signed Interactivity/Events callbacks, never users:read.email.
2. User-deactivation subscriptions require users:read.
3. It declares the fixed allowed fields and installation-local encrypted token/secret custody.
4. Membership can change between checks and a newly linked organization may see channel history; pre-post checks and safety events suspend routing.
5. Disable and reconnect replay no old notice or action.
6. Install an empty edition through the supported CLI, sign in, enable Google and Microsoft sign-in and sign in with each as an invited user while an uninvited and an unverified address are refused, configure one mail provider, revoke it, restart and upgrade with populated data; inspect credential-free diagnostics, working manual records and preserved audit, then reconnect without replaying customer actions.

**Recorded gap:** Implemented first slice: installation-owner per-domain requirements on the linked OIDC provider; atomic active full-operator and matching verified-email admission; policy, operator and linked-provider fences on subsequent requests; an uninvited or unverified identity is refused. The existing `/auth/oidc/auth/callback` remains unchanged. Required domains fence non-owner email sessions while owner email recovery and unrestricted-domain magic links remain available. Policy and refused sign-in screens are exercised at 1440 and 390. Direct Google Workspace/Microsoft Entra account proof and the remaining operational, connector and mobile surface remain gaps.

**Carried evidence:** src/core/features/identity/accounts.ts`; `src/core/features/identity/domain-policy.ts`; `src/core/features/identity/store.ts`; `tests/core/provider-redirects.test.ts`; `tests/support/sign-in-domains.ts`; `tests/delegation-browser/records-layout.test.ts

### BOUNDARY-001 — Separate products and US-first delivery (partial; HARD)

**Exact acceptance:**

1. INTEGRATE-005’s existing won-deal and internal handoff notices carry no products, commitments or amounts.
2. Slack disconnection is unresolved setup.
3. Walk a US buyer's USD deal through every current capability: signed Calendly booking intake onto the deal, a manual call log, and an exact-message review and send, with the USD amount unchanged and no mail sent by a booking, a manual entry or provider setup.
4. In Settings › Integrations at 1440 and 390, inspect Connected to Orbit: Slack, Calendly, Cal.com, Mailchimp and Twilio each show the job it does and its real state (Calendly and Cal.com their real delivery state, Slack its actual connected or unresolved setup state), the products Orbit does not connect to are not listed and are named in the docs, with no substituted connector or mock and no reduced CRM scope.

**Recorded gap:** Unasserted in the carried evidence: product states and owned jobs; 1440 browser proof; 390 browser proof; full CRM scope retained. Asserted: no products, commitments or amounts in the exact won-deal and person-authored internal handoff Slack notices; Slack disconnected state; signed Calendly intake links deal; manual call log on deal; exact review and send; USD amount unchanged; booking, manual work and setup send no mail; connected and awaiting Calendly and Cal.com state; unavailable products enumerated; Slack actual state; no substituted connector. The complete buyer walk stays with the last-shipping named clause; live Slack and TEAM-005 qualification and all existing provider, consent and receiving-product prerequisites remain unchanged.

**Carried evidence:** tests/core/source-onboarding.test.ts` — INTEGRATE-005 INTEGRATE-009 INTEGRATE-010 INTEGRATE-011 Slack notices carry only allowed fields, replay once, withhold private data and refuse unmapped, foreign and replayed actions (extended `tests/support/slack-notices-proof.ts` — proveSlackNotices: a person-authored native handoff and the won transition correlate their exact source identities to one stored notice and one complete Slack submission each; distinctive saved products, commitments, handoff content, closing reason and USD amount are absent from stored content and submitted text, blocks and metadata; fixed permitted fields and token-free Orbit links; linked record data refuses an anonymous read; stale native handoff review and repeated processing add no notice); `src/core/features/settings/connected-products.ts`; `src/core/features/operator/ui/connected-products.tsx`; `src/core/features/ingestion/booking-webhooks.ts`; `tests/core/signals-outreach.test.ts`; `tests/support/sales-tasks.ts`; `tests/evidence/contract/BOUNDARY-001/

### AGENT-001 — Keep the customer graph current with evidence (partial; HARD)

**Exact acceptance:**

1. Under the held company policy, authorize one account, introduce a job change and contradictory spoken/written commitment, inspect cited proposals and missing decision-maker question, change a field before acceptance and require conflict; accept another, decline one, revoke the source and erase/replay without re-creation.

**Recorded gap:** Reviewed provenance-bound capture updates exist; call/enrichment graph maintenance and stakeholder inference are not complete.

**Carried evidence:** src/core/features/capture/intake.ts`; `src/core/features/capture/proposals.ts`; `tests/core/capture-review.test.ts`; `tests/delegation/brief-handoff.test.ts

### AGENT-003 — Follow the next action through to a customer outcome (partial; HARD)

**Exact acceptance:**

1. Under the held company policy, accept a meeting follow-up obligation, review and approve its exact draft, fail then reconcile its provider outcome, receive a reply without stage movement and inspect the still-open advancement goal; advance the deal or stop explicitly and verify all remaining work exits once.

**Recorded gap:** Brief promises, handoffs and reviewed scheduled outreach exist; durable cross-step quote-to-close outcome supervision is missing.

**Carried evidence:** src/core/features/today/promises.ts`; `src/core/features/today/plan-actions.ts`; `src/core/features/outreach/scheduler.ts`; `tests/core/today-brief.test.ts`; `tests/core/signals-outreach.test.ts

### AGENT-004 — Controlled research and workflow evidence (partial; HARD)

**Exact acceptance:**

1. Under the held company policy, configure a selected-account web/MCP research block with a USD cap, preview its data, return structured citations into a proposed workflow task, inject untrusted instructions and revoke access mid-run; verify only allowed evidence leaves, no external message runs and budget/schema failures remain visible.

**Recorded gap:** AGENT-004: configurable selected-account research, licensed adapter qualification, allowlisted MCP tools, exact egress preview, enforceable USD budgets, cited schema-valid workflow proposals, hostile-content and revocation journeys, custody, provider retention and legal qualification remain unproved. Purchased enrichment remains ENRICH-001, workflow execution AUTO-001 and AUTO-002, narrow delegation DELEGATE-001 and expanded roles TEAM-005.

**Carried evidence:** src/core/features/assistance/provider.ts`; `src/core/features/delegation/protocol.ts`; `tests/core/assistance.test.ts`; `tests/delegation/authority-regressions.test.ts

### AGENT-005 — Licensed research adapters and bounded spend (partial; HARD)

**Exact acceptance:**

1. Exercise each selected adapter with exact preview and destination assertions, hostile tool instructions, denied records, mid-run revocation, concurrent budget reservations, retries, unknown pricing, invalid schema and unsupported citations; verify visible failure and, under the held company policy, no unapproved external message or commercial change, and no authority restored from an archive.

**Recorded gap:** AGENT-004: configurable selected-account research, licensed adapter qualification, allowlisted MCP tools, exact egress preview, enforceable USD budgets, cited schema-valid workflow proposals, hostile-content and revocation journeys, custody, provider retention and legal qualification remain unproved. Purchased enrichment remains ENRICH-001, workflow execution AUTO-001 and AUTO-002, narrow delegation DELEGATE-001 and expanded roles TEAM-005.

**Carried evidence:** src/core/features/assistance/provider.ts`; `src/core/features/delegation/protocol.ts`; `tests/core/assistance.test.ts`; `tests/delegation/authority-regressions.test.ts

### SURFACE-001 — Registry and complete sales jobs (partial; HARD)

**Exact acceptance:**

1. Compare the registry’s jobs, Core ids and concrete non-tool reasons with this table, including every split part.
2. Run the Base conformance journey on Orbit’s own customer, deal, message, sequence and integration fixtures.

**Recorded gap:** Implemented: a registry of 23 tools, 10 resources and two non-tool reasons, and a seller-day journey on Orbit's own fixtures. Remaining: tools for customer messages, sequences, quotes, files and integrations, and Core ids and non-tool reasons covering every row of this table; the Base conformance result for the complete registry is not asserted by a cited test.

**Carried evidence:** agent-surface.json`; `scripts/agent-surface.ts`; `tests/agent-door/native-journey.mjs`; `tests/support/agent-door-proof.ts

### SURFACE-002 — Internal sales work (partial; HARD)

**Exact acceptance:**

1. Compute standard for a reversible deal move, task, draft, owner-neutral field update and Undo; read item counts.
2. Text or an argument claiming a different class changes none of those computed facts.

**Recorded gap:** Implemented: record, draft, handoff, forecast and report-definition writes compute standard under company policy. Remaining: no task, deal-move or Undo tool is declared, and read item counts are not asserted.

**Carried evidence:** src/core/features/agent-door/records.ts`; `src/core/features/agent-door/drafts.ts`; `src/core/features/agent-door/handoffs.ts`; `agent-surface.json`; `tests/support/agent-door-proof.ts

### SURFACE-003 — Customer and provider exposure (missing; HARD)

**Exact acceptance:**

1. Exercise internal, known, new and public counterparties and exact external recipient counts, including a move that exposes previously internal data, AI draft/summary inputs and tracked provider-deletion requests.
2. A record claiming that an outside destination is internal leaves its computed class unchanged.

**Recorded gap:** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

**Carried evidence:** 

### SURFACE-004 — Money and commitments (missing; HARD)

**Exact acceptance:**

1. Compute amount, currency and counterparty for enrichment and payment/invoice calls.
2. Compute version, value and counterparty for an accepted quote/signature; a nonbinding forecast estimate stays standard.

**Recorded gap:** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

**Carried evidence:** 

### SURFACE-005 — Provider person-only steps (missing; HARD)

**Exact acceptance:**

1. Exercise each declared provider-person step, including Gmail/Microsoft 365 send authorization, QuickBooks Online/Xero connection consent and a provider response that newly requires a person; report provider and step.
2. Use a supported company-credential/API route and apply its classes under the company’s policy.

**Recorded gap:** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

**Carried evidence:** 

### SURFACE-006 — Access and protective settings (missing; HARD)

**Exact acceptance:**

1. Compute widening/narrowing and people for team, user and record/application/agent grant changes, including research-tool allowlists and authenticated adapter enablement.
2. Compute setting/provider for entering, sealing, rotating and revoking provider tokens, signing secrets, private capture addresses and authenticated adapter credentials, and for protective settings; Orbit’s own sales examples retain the Base self-escalation rule.

**Recorded gap:** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

**Carried evidence:** 

### SURFACE-007 — Irreversible and sensitive data (missing; HARD)

**Exact acceptance:**

1. Compute affected item count for irreversible manual-entry, pipeline/stage and saved-report/snapshot deletion, refused-form payload erasure, and contact/file/recording/transcript erasure (including provider copies); keep reversible Undo standard.
2. Compute record count and kind for regulated identifiers in an attachment or transcript, while ordinary contact data does not acquire an invented sensitive label.

**Recorded gap:** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

**Carried evidence:** 

### SURFACE-008 — Running automation (missing; HARD)

**Exact acceptance:**

1. Compute installation and workflow/route facts on activation and route changes, including Slack channel/event routing that changes running notice delivery.
2. Changing a draft definition without changing running behavior remains standard.

**Recorded gap:** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

**Carried evidence:** 

### SURFACE-009 — Saved sales actions under company policy (missing; HARD)

**Exact acceptance:**

1. Under the held company policy approve the exact saved customer message, change one merge field and see a new saved revision needed.
2. Under the all-autonomous company policy the same permitted external and commitment jobs run without a person’s approval, while preserving their truthful actor and exact saved content.

**Recorded gap:** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

**Carried evidence:** 

### SURFACE-010 — Sales events and handoffs (partial; HARD)

**Exact acceptance:**

1. Read each declared sales resource and follow tool links to the changed record.
2. Follow booking, reply, stage, quote and Buoy handoff outcomes by the same event identity across the supported channels.

**Recorded gap:** Implemented: orbit.events.list returns attributed native activity, and records, signals, drafts, reports and operations read as resources. Remaining: the declared contact, company, deal, message, sequence, workflow, quote and file resources, and booking, reply, stage, quote and Buoy handoff events by one identity across channels.

**Carried evidence:** src/core/features/agent-door/evidence.ts`; `agent-surface.json`; `tests/support/agent-door-proof.ts

### SURFACE-011 — Sales overview and provider spend (partial; HARD)

**Exact acceptance:**

1. Reconcile customer messages, binding quotes, financial/provider work and internal task calls by class and decision.
2. Read reserved/actual provider cost, explicit company caps or no cap, and the review/approval/handoff entries the policy actually produced.

**Recorded gap:** Implemented: the /agents audit reads every call of the seller-day journey with its policy decision and reports no difference from policy. Remaining: reconciliation by class and decision for customer messages, binding quotes and financial work, reserved and actual provider cost with explicit caps, and the seeded fixture week.

**Carried evidence:** src/base/modules/agent-door/audit.ts`; `src/base/modules/agent-door/pages.ts`; `tests/agent-door/native-journey.mjs

### SURFACE-012 — Embedded sales agents (missing; HARD)

**Exact acceptance:**

1. Run AGENT-001 through AGENT-005 against the same records through embedded and outside calls and compare sales state, outcomes and decisions.
2. Under held and all-autonomous company policies, untrusted transcript/mail/tool evidence cannot change class facts, scope or decision rules.

**Recorded gap:** No complete MCP registry, class computation and company-policy conformance journey proves this Orbit delta.

**Carried evidence:** 

### SURFACE-013 — Stranger specialist’s seeded week (partial; HARD)

**Exact acceptance:**

1. Under an all-autonomous company policy, link arrivals, update a customer graph, explain a stalled deal, follow a promise, send permitted follow-up and hand a won USD deal to Buoy with no policy wait or refusal.
2. Repeat under the held company policy: standard enters review and each other used class waits for the person the policy names, then runs once on that person’s approval.
3. Compare records, sales outcomes, events, attributions, spend and the overview for both runs; class decisions equal the policy in force.

**Recorded gap:** Implemented: a seller-day journey that reads fixtures, updates a record, replays a write and refuses a stale handoff, then reads the audited write. Remaining: link arrivals, explain a stalled deal, follow a promise, send permitted follow-up and hand a won deal to Buoy; the held-policy leg and the cross-run comparison.

**Carried evidence:** tests/agent-door/native-journey.mjs`; `agent-surface.json`; `docs/AGENT-DOOR.md

### BASE-AGENT-001 — One MCP door per seed (partial; CHEAP)

**Exact acceptance:**

1. `server / discover` returns the supported versions, capabilities, `serverInfo` and instructions.
2. A 2026-07-28 request works with no handshake, and a 2025-11-25 client completes `initialize` and lists the same tools.
3. An unsupported version returns `UnsupportedProtocolVersion`.
4. Two `tools / list` calls return the same order, with cache fields.
5. A foreign Origin returns 403, and a header and body method mismatch returns `HeaderMismatch`.
6. An oversized body returns 413 with no effect.

**Recorded gap:** The door ships and the cited tests assert initialize on both the 2026-07-28 and 2025-11-25 revisions. Not asserted in the cited seed tests: server / discover, unsupported-version refusal, tools / list order and cache fields, foreign Origin 403, HeaderMismatch and the 413 oversize refusal. The full acceptance is proven only by the Base conformance runner in the source verification gate, which this audit did not re-run.

**Carried evidence:** src/base/modules/agent-door/index.ts`; `src/core/features/agent-door/index.ts`; `agent-surface.json`; `tests/support/agent-door-proof.ts`; `tests/core/managed-owner.test.ts`; `tests/agent-door/native-journey.mjs

### BASE-AGENT-002 — The seed's jobs are tools, through the UI's own actions (partial; HARD)

**Exact acceptance:**

1. The Core clause ids in each tool's `_meta`, with the not-a-tool reasons that `server / discover` serves, cover every Core clause in the contract, and no reason is risk; the harness and `rer check` fail on a gap.
2. Each tool's fixture result validates against its `outputSchema`.
3. Read tools declare `readOnlyHint`; tools that can carry destructive declare `destructiveHint`, and tools that can carry external declare `openWorldHint`.
4. A refusal returns the same error code the UI gets for the same action.
5. The UI action and its tool, on the same fixture, give the same record state and the same audit event type.
6. The seed's embedded agents appear in the audit as calls to the same tools.

**Recorded gap:** The door ships and the cited tests assert tools that call the native record, draft and handoff actions and refuse with stable codes such as revision_conflict and policy_blocked. Not asserted in the cited seed tests: core clause coverage by tools or non-tool reasons for the planned jobs (messages, sequences, quotes, files, integrations), outputSchema validation of every fixture result and embedded agents appearing as calls to the same tools. The full acceptance is proven only by the Base conformance runner in the source verification gate, which this audit did not re-run.

**Carried evidence:** src/base/modules/agent-door/index.ts`; `src/core/features/agent-door/index.ts`; `agent-surface.json`; `tests/support/agent-door-proof.ts`; `tests/core/managed-owner.test.ts`; `tests/agent-door/native-journey.mjs

### BASE-AGENT-003 — Records are resources (partial; HARD)

**Exact acceptance:**

1. `resources / templates / list` names every record type in the Agent surface.
2. Reads as two roles return exactly what the UI shows each.
3. An out-of-scope id and a missing id give identical responses.
4. A write's `resource_link` reads back the new state.
5. Bytes over budget return `budget_exhausted` and no partial content.
6. Customer-sourced text carries the untrusted marker.

**Recorded gap:** The door ships and the cited tests assert ten resource templates, the untrusted marker on report data and one refusal for an unregistered resource. The native selected-opportunity consent and PKCE journey also reads the selected resource and proves identical complete public responses for an existing unselected company and a missing company under autonomous and held company policies, retaining permitted review and audit records, native state, scope refusals and revocation. Not asserted in the cited seed tests: complete primary-type template coverage, two-role read parity with the UI, out-of-scope and missing parity beyond this selected-grant company slice, remaining write resource_link read-back, file byte-budget refusal with no partial content, and full customer-text untrusted marking qualification. Carried company resource-link proof is retained. Expanded-role qualification remains subject to TEAM-005 contract cleanup and new-main qualification; published-client and enterprise authorization receipts remain unclaimed. The full acceptance is proven only by the Base conformance runner in the source verification gate, which this audit did not re-run.

**Carried evidence:** src/base/modules/agent-door/index.ts`; `src/core/features/agent-door/index.ts`; `agent-surface.json`; `tests/support/agent-door-proof.ts`; `tests/support/agent-door-local-proof.ts` via the existing managed owner claim in `tests/core/managed-owner.test.ts`; `tests/agent-door/native-journey.mjs

### BASE-AGENT-004 — Business identity and short-lived, audience-bound tokens (partial; CHEAP)

**Exact acceptance:**

1. An unauthenticated call returns 401 with `resource_metadata`, and the metadata names the trusted servers and scopes.
2. A Business token for this seed works, and the same token sent to a sibling seed returns 401.
3. An expired token returns 401, and a token with a lifetime over 15 minutes is refused.
4. A read-only token calling a write tool returns 403 `insufficient_scope` with every needed scope in one challenge.
5. A token in a query string is refused and not logged.
6. Revoking consent in the seed or in Business refuses the next call within 60 seconds.
7. After unpairing, Business tokens are refused and the seed's own sign-in still works.

**Recorded gap:** The door ships and the cited tests assert RFC 9728 protected-resource metadata, Business-bound owner tokens, 401 for a wrong audience or unmapped subject, and refusal of an outstanding token after the sponsor changes email. Not asserted in the cited seed tests: token lifetime and consent-revocation limits. The full acceptance is proven only by the Base conformance runner in the source verification gate, which this audit did not re-run.

**Carried evidence:** src/base/modules/agent-door/index.ts`; `src/core/features/agent-door/index.ts`; `agent-surface.json`; `tests/support/agent-door-proof.ts`; `tests/core/managed-owner.test.ts`; `tests/agent-door/native-journey.mjs

### BASE-AGENT-005 — An agent acts as a person in a role, never more (partial; HARD)

**Exact acceptance:**

1. For each role fixture, every tool's allow or deny through MCP equals the UI's for the same action.
2. A one-folder, read-only grant holds, and widening through arguments is refused.
3. Downgrading the sponsor changes the next call's result, and suspending the sponsor returns 401.
4. Calls that widen the agent's own grant or its sponsor's role, or change the policy or Pause, return `self_escalation` and change nothing, even under a policy with every class autonomous; dropping a scope from its own grant runs.
5. An injection fixture yields no out-of-grant call and no change of class: record text asking for a wider action, or claiming that a recipient is internal.

**Recorded gap:** The door ships and the cited tests assert 403 when a scope is missing, action as the mapped person and refusal after native teammate removal. Not asserted in the cited seed tests: role narrowing per record and grant self-escalation probes. The full acceptance is proven only by the Base conformance runner in the source verification gate, which this audit did not re-run.

**Carried evidence:** src/base/modules/agent-door/index.ts`; `src/core/features/agent-door/index.ts`; `agent-surface.json`; `tests/support/agent-door-proof.ts`; `tests/core/managed-owner.test.ts`; `tests/agent-door/native-journey.mjs

### BASE-AGENT-006 — Every action declares its risk class (partial; HARD)

**Exact acceptance:**

1. Every tool in `tools / list` carries its possible classes in `_meta`, equal to the Agent surface table.
2. For each tool, fixture calls cover every class it can carry, and the computed classes and facts equal the fixture's expected values.
3. An argument or record text asserting a class or a confirmation (`internal: true`, `confirmExternal: true`) leaves the computed classes unchanged.
4. Money calls carry amount and currency, external calls their counterparty and recipient count, access calls their direction, and destructive calls their item count.
5. No tool in `tools / list` declares a class outside the fleet list, and `rer check` fails on one.
6. A refused call's audit row still records its computed classes.

**Recorded gap:** The door ships and the cited tests assert standard and sensitive classes computed for orbit tools and sensitive calls blocked by company policy. Not asserted in the cited seed tests: the external, money, commitment, destructive, access, security, live and gated classes, which no declared tool computes (SURFACE-003 to SURFACE-008). The full acceptance is proven only by the Base conformance runner in the source verification gate, which this audit did not re-run.

**Carried evidence:** src/base/modules/agent-door/index.ts`; `src/core/features/agent-door/index.ts`; `agent-surface.json`; `tests/support/agent-door-proof.ts`; `tests/core/managed-owner.test.ts`; `tests/agent-door/native-journey.mjs

### BASE-AGENT-007 — The company's policy decides, at one chokepoint (partial; HARD)

**Exact acceptance:**

1. The Base harness runs each tool under each disposition for every class it can carry, and sees it run, run and enter the review feed, wait with no effect, or be refused.
2. Before setup is complete, the setup page lists every class the seed's tools carry with examples and no answer pre-selected, an agent call returns `policy_unset` with the setup link and changes nothing, and an incomplete revision cannot be confirmed; a `*` rule completes it, and a tool an upgrade adds with an unanswered class appears in `tools / list` once that class is answered, while the other tools keep running.
3. Under "money autonomous up to $500, approval up to $10,000, blocked above", calls of $400, $600 and $20,000 run, wait and are refused; a per-day cap sends the call that crosses it to the next rule.
4. A call carrying two classes takes the stricter disposition.
5. An approval shows server-computed facts and an expiry, returns the URL elicitation and a handle, and completes once after the named approver approves; a changed input needs a new approval, and a rejection or lapse leaves no effect.
6. The same call through MCP, the integration API and an embedded agent gets the same decision.
7. A policy change applies to the next call within 60 seconds, and the audit cites the new revision.
8. A policy document with a bad signature or another Business's id is rejected, and the door keeps the last valid revision.

**Recorded gap:** The door ships and the cited tests assert policy_unset before a company policy is adopted, then autonomous, paused and blocked decisions at the one door. Not asserted in the cited seed tests: held-class approvals executed through the door for a sales action. The full acceptance is proven only by the Base conformance runner in the source verification gate, which this audit did not re-run.

**Carried evidence:** src/base/modules/agent-door/index.ts`; `src/core/features/agent-door/index.ts`; `agent-surface.json`; `tests/support/agent-door-proof.ts`; `tests/core/managed-owner.test.ts`; `tests/agent-door/native-journey.mjs

### BASE-AGENT-008 — Truthful attribution (partial; HARD)

**Exact acceptance:**

1. An agent call carrying a person-confirmation flag is classified and decided exactly as without it.
2. Approving, marking reviewed or answering a policy question with an agent or device token returns 403 and changes nothing.
3. A form-mode elicitation "accept" never completes an approval.
4. Where an agent's decision, signature or field confirmation runs without a person, it reads `"<agent> for <person>"` in the record, the activity view, exports and any certificate, never as the person's own act.
5. After a person approves an agent's prepared action, the record shows the person as approver and the agent as preparer.
6. Activity and exports at 1440 and 390 show `"<agent> for <person>"` for every agent act.
7. Mail an agent sends to an outside address names `"<agent> for <person>"` as its sender.

**Recorded gap:** The door ships and the cited tests assert a native timeline entry naming the agent for its sponsor (for example "Ari for Morgan Lee"). Not asserted in the cited seed tests: attribution for provider steps and the person-only approval path. The full acceptance is proven only by the Base conformance runner in the source verification gate, which this audit did not re-run.

**Carried evidence:** src/base/modules/agent-door/index.ts`; `src/core/features/agent-door/index.ts`; `agent-surface.json`; `tests/support/agent-door-proof.ts`; `tests/core/managed-owner.test.ts`; `tests/agent-door/native-journey.mjs

### BASE-AGENT-009 — Every agent action is audited with its class and decision (partial; HARD)

**Exact acceptance:**

1. One write leaves a complete audit row.
2. Refused, pending, unset and self-escalation calls are audited.
3. The Agents page's counts by class and decision equal the audit rows on a fixture week.
4. The review feed lists exactly the calls decided as review; Mark reviewed records the person, and Undo restores a reversible one.
5. Filtering by agent or class lists only those rows, and export includes every field.
6. Removing the agent keeps its rows and its name.
7. The Agents page works at 1440 and 390 with no serious or critical axe findings.

**Recorded gap:** The door ships and the cited tests assert audit rows with tool, outcome, idempotency key and the actual resource, and an audit page with no difference from policy. Not asserted in the cited seed tests: class and decision columns across every class. The full acceptance is proven only by the Base conformance runner in the source verification gate, which this audit did not re-run.

**Carried evidence:** src/base/modules/agent-door/index.ts`; `src/core/features/agent-door/index.ts`; `agent-surface.json`; `tests/support/agent-door-proof.ts`; `tests/core/managed-owner.test.ts`; `tests/agent-door/native-journey.mjs

### BASE-AGENT-010 — Agents can follow changes (partial; HARD)

**Exact acceptance:**

1. A subscribed record changed in the UI produces a notification within 10 seconds.
2. `events.list` returns the same event id the webhook carries.
3. Replaying from a cursor returns the same ids in order.
4. After access is revoked, no channel delivers events about that record.
5. A failed webhook is visible and replays without duplicate effects.
6. `approval.pending`, `approval.decided`, `review.flagged` and `policy.adopted` carry the class and decision and nothing the subscriber may not read.

**Recorded gap:** The door ships and the cited tests assert orbit.events.list returning attributed native activity. Not asserted in the cited seed tests: change-following subscriptions and signed outbound event delivery. The full acceptance is proven only by the Base conformance runner in the source verification gate, which this audit did not re-run.

**Carried evidence:** src/base/modules/agent-door/index.ts`; `src/core/features/agent-door/index.ts`; `agent-surface.json`; `tests/support/agent-door-proof.ts`; `tests/core/managed-owner.test.ts`; `tests/agent-door/native-journey.mjs

### BASE-AGENT-011 — Limits are policy, and Pause stops everything (partial; HARD)

**Exact acceptance:**

1. A rate overrun returns 429 with `Retry-After`.
2. A per-day cap of three outside recipients sends the fourth to the rule that applies past the cap.
3. An exhausted spend cap returns `budget_exhausted` with no partial effect and shows the spend.
4. Under the answer "no cap", a spending call runs and its spend shows in usage; a call that spends nothing is unaffected by any cap.
5. The usage view shows calls, decisions by class, money moved and provider spend per agent.
6. Pause and Pause all agents each stop the next call within 60 seconds, and resume restores access.
7. An agent token cannot resume.

**Recorded gap:** The door ships and the cited tests assert Pause stopping replays and a blocked class refusing without effect. Not asserted in the cited seed tests: capacity limits and provider-spend caps. The full acceptance is proven only by the Base conformance runner in the source verification gate, which this audit did not re-run.

**Carried evidence:** src/base/modules/agent-door/index.ts`; `src/core/features/agent-door/index.ts`; `agent-surface.json`; `tests/support/agent-door-proof.ts`; `tests/core/managed-owner.test.ts`; `tests/agent-door/native-journey.mjs

### BASE-AGENT-012 — Writes are idempotent and conflict-safe (partial; CHEAP)

**Exact acceptance:**

1. Two calls with one key give one effect and equal results.
2. A retry with a new JSON-RPC id and the same key, after a dropped stream, returns the recorded outcome.
3. The same key with different arguments returns a conflict and no effect.
4. A stale revision returns a conflict naming the current revision.
5. A job handle used by another person's token reads as not found.

**Recorded gap:** The door ships and the cited tests assert one retained outcome for a replayed idempotency key, revision_conflict for a stale revision, and paused or blocked replays leaving the record unchanged. Remaining seed qualification: dropped-stream recovery, 24-hour outcome retention, stale-refusal current-revision details, cross-person job isolation and general concurrent writes. No clause-specific hold is released; TEAM-005 contract cleanup and qualification prerequisites remain unchanged. The full acceptance depends on the Base conformance runner in the source verification gate and the remaining seed qualification.

**Carried evidence:** src/base/modules/agent-door/index.ts`; `src/core/features/agent-door/index.ts`; `agent-surface.json`; `tests/support/agent-door-proof.ts`; `tests/core/managed-owner.test.ts`; `tests/agent-door/native-journey.mjs` — sellerDay: accepted native record update followed by changed declared value with the same key, target and expected revision under a new JSON-RPC id returns idempotency_conflict, with no successful structured content and unchanged operation witness, native record and history

### BASE-AGENT-013 — Manifest, docs and the conformance journey (partial; HARD)

**Exact acceptance:**

1. The docs list exactly the names in `tools / list` and `resources / templates / list`.
2. Each tool's classes, and the test behind each computed one, are documented.
3. The harness fails on any of: a tool without a schema; an effect under approval or blocked, or before setup is complete; a computed class that differs from its fixture; a flag that changes a class or completes a person's step; a role-parity mismatch; a wrong-audience token being accepted; a duplicate effect on retry.
4. Every acceptance point runs under both policies, every decision matches the policy in force, and under all autonomous no call waits for a person or is refused by policy.
5. A stranger agent given only the seed URL completes the specialist journey through MCP.

**Recorded gap:** The door ships and the cited tests assert a manifest generated from the registry (scripts/agent-surface.ts) and a seeded seller-day journey run by the Base harness. Not asserted in the cited seed tests: the generated /docs/agents page content for the planned jobs and the held-policy leg of the journey. The full acceptance is proven only by the Base conformance runner in the source verification gate, which this audit did not re-run.

**Carried evidence:** src/base/modules/agent-door/index.ts`; `src/core/features/agent-door/index.ts`; `agent-surface.json`; `tests/support/agent-door-proof.ts`; `tests/core/managed-owner.test.ts`; `tests/agent-door/native-journey.mjs


The queue contains only the following four bounded scopes, ranked by buyer value. It is a proposal for the local feeder; no lane plan or product ref was changed.

```queue-entries
[
  {
    "rank": 1,
    "role": "BUILDER",
    "repository": "just-every/run-orbit",
    "title": "Make stale and awaiting-response queue deadlines provable across US working days",
    "clauses": [
      "OPP-007"
    ],
    "acceptance": "Build the remaining stale/awaiting-clock portion of OPP-007 acceptance 1: an open deal crosses the configured stale boundary once; a provider-accepted message enters NEXT until five Monday-Friday working days in the workspace timezone; crossing that real computed deadline enters NOW once with an attributed reason. Exercise New York spring and fall DST, Friday sends, a stage-specific stale interval, repeated ticks and closed deals. Preserve the existing close/form/reply/booking/failure legs; do not claim the whole event matrix DONE.",
    "files": [
      "src/core/features/outreach/timing-repository.ts",
      "src/core/features/outreach/settlement.ts",
      "src/core/features/outreach/time.ts",
      "tests/support/opportunity-clock-proof.ts (new)",
      "tests/core/opportunity-clocks.test.ts (new)",
      "tests/e2e/opportunity-clocks.spec.mjs (new)"
    ],
    "tests_and_proof": "Drive native create/approve/accept and the real scheduler through isolated persisted state at a controlled clock; never prefill next_due_at to simulate its construction. Read native Records, NOW and timeline before, at and after each boundary; repeat/restart and count one transition. Verify no provider re-submission. Capture emitted UI NEXT/deadline and NOW/reason before and after reload at 1440x900 and 390x844, plus current axe serious/critical checks. Run focused core/browser tests and rer verify without live providers or paid calls.",
    "must_not_touch": "No close-deadline rewrite (sd f111), no changes to Today promise semantics, scoring weights, lifecycle writer, recommendation replacement, mailbox quotas, sequence/batch runtime, schema/history, provider configuration, contract Status/Gap/Evidence, generated contract views, claims, PR or deployment. Keep any fix within timing/accepted settlement/time; if it requires a schema or new provider surface, return that dependency rather than expand scope.",
    "gate": "required",
    "gate_reason": "Data: persisted queue/deadline transitions and accepted-message scheduling.",
    "independence": "Owns timing/accepted-settlement helpers; other entries own lifecycle repository, recommendation fences or manual-entry editor. New tests have distinct files. Existing close-deadline work is explicitly excluded."
  },
  {
    "rank": 2,
    "role": "BUILDER",
    "repository": "just-every/run-orbit",
    "title": "Qualify won, lost and explicit reopen without losing sales history",
    "clauses": [
      "OPP-001"
    ],
    "acceptance": "Complete OPP-001 acceptance 1 through native controls: close won and lost with nonempty reasons; record closing actor/time; read queue removal; ingest later weighted evidence while each stays closed; explicitly reopen and wait for the existing mutation evaluation; preserve stage/owner and every lifecycle transition/history.",
    "files": [
      "src/core/features/records/repository.ts (lifecycle method only, if a demonstrated failure needs repair)",
      "tests/support/opportunity-lifecycle-proof.ts (new)",
      "tests/core/opportunity-lifecycle.test.ts (new)",
      "tests/e2e/opportunity-lifecycle.spec.mjs (new)"
    ],
    "tests_and_proof": "Authenticated native Records writes and reads, signed late evidence, current queue reads and full timeline/effect inventory. Test empty-reason refusal with zero writes, both close paths, repeat late delivery and explicit reopen; no direct lifecycle fixture UPDATE as proof. Browser close reason/history/closed queue and reopened state at 1440x900 and 390x844 after reload, with serious/critical axe checks. Run focused core/browser tests and rer verify. Existing lifecycle code is credited; implement only a reproduced behavior gap.",
    "must_not_touch": "No ownership defaults or TEAM-001/TEAM-005 access widening, no scoring/queue-clock implementation changes, no recommendation algorithm change, no sequences, provider setup, schema/migration or contract Status/Gap/Evidence/generated claims. Keep source changes confined to lifecycle method; return any cross-subsystem dependency.",
    "gate": "required",
    "gate_reason": "Data: deal closure, historical attribution and reopen state.",
    "independence": "Uses current main timing/evaluation interfaces, does not change them; isolated lifecycle fixture and new tests avoid other entries' files."
  },
  {
    "rank": 3,
    "role": "BUILDER",
    "repository": "just-every/run-orbit",
    "title": "Fence every obsolete recommendation entrance after evidence or operator edits",
    "clauses": [
      "ACTION-002"
    ],
    "acceptance": "Complete the remaining ACTION-002 acceptance 1: supersede separately by contributing evidence and a permitted operator change; retain the old recommendation and superseded history; reject generating from its saved AI preview, approving/sending its already saved draft and completing the obsolete identity. Prove the current replacement remains usable. Preserve the existing obsolete-completion assertion rather than duplicate it alone.",
    "files": [
      "src/core/features/assistance/routes.ts (saved-preview fence only, if needed)",
      "src/core/features/outreach/approval-repository.ts (current-recommendation fence only, if needed)",
      "src/core/features/workbench/action-repository.ts (obsolete completion fence only, if needed)",
      "tests/support/recommendation-replacement-proof.ts (new)",
      "tests/core/recommendation-replacement.test.ts (new)",
      "tests/e2e/recommendation-replacement.spec.mjs (new)"
    ],
    "tests_and_proof": "Create the current recommendation via native evidence, save real draft/AI preview, mutate through native record control or signed source, then replay all old entrances. Assert 409/no new provider or model call, unchanged domain/effect inventories on refusals, distinct current identity and historical superseded timeline. Verify no stale saved content becomes approved and no automatic customer mail. Exercise historical action and current replacement UI at 1440x900 and 390x844 with reload and serious/critical axe checks. Run focused tests and rer verify using network-edge fixtures only.",
    "must_not_touch": "No manual-draft normalization (sd f153/f154), no saved-message MCP implementation (sd f158), no evaluation algorithm, OPP-001 lifecycle writer, queue deadlines, provider adapters, recipient model, schema/migration, auth expansion or contract Status/Gap/Evidence. If evaluation replacement itself needs redesign, return it as a dependency instead of modifying shared evaluator.",
    "gate": "required",
    "gate_reason": "Data: stale recommendation/draft authority and prevention of obsolete customer sends.",
    "independence": "Owns only obsolete-identity entrance fences and new tests; no changes to the evaluator, lifecycle, timing or manual-entry modules used by the other entries."
  },
  {
    "rank": 4,
    "role": "BUILDER",
    "repository": "just-every/run-orbit",
    "title": "Edit logged call and meeting duration and attendees from the record timeline",
    "clauses": [
      "RECORD-010"
    ],
    "acceptance": "Build the unimplemented editing-control portion of RECORD-010 acceptance 1: native note/call/meeting log-edit-delete on contact, company and deal; call/meeting duration and attending contacts can actually be edited and read after reload alongside text/time. Preserve original entry author/recorded time and attributed edit/delete history, with no score or external message changes. Attachments remain RECORD-018 and no whole-clause attachment completion is claimed.",
    "files": [
      "src/core/features/operator/ui/record/entry-editor.tsx",
      "src/core/features/operator/ui/record/timeline-entries.tsx (pass permitted contact choices only if required)",
      "tests/support/manual-entry-edit-proof.ts (new)",
      "tests/core/manual-entry-edit.test.ts (new)",
      "tests/e2e/manual-entry-edit.spec.mjs (new)"
    ],
    "tests_and_proof": "Native forms edit a call and a meeting from nonzero duration/multiple attendees to different values, remove/add an attendee and reload; exercise all three record kinds and note controls. Native route validation refuses foreign/nonexistent attendee and invalid duration without writes. Assert unchanged scores/outbound inventories and original author/time plus attributed edits/deletion. Prove provider-originated Twilio/calendar receipts remain uneditable. Capture editing, saved readback and deletion history at 1440x900 and 390x844 with keyboard and serious/critical axe checks. Run focused tests and rer verify.",
    "must_not_touch": "No rewrite of sd f98 manual-meeting text/time proof; no provider activity editing, file/attachment subsystem, TEAM-005 changes, ownership/defaults, scoring, outreach/recommendations, database/schema/migrations, contract Status/Gap/Evidence or generated claims. The existing manual endpoint already supports duration/contactIds; do not change its storage contract.",
    "gate": "required",
    "gate_reason": "Data: persisted customer activity edits and attendee validation.",
    "independence": "UI-only production ownership plus distinct tests; relies on unchanged manual-entry API, and does not touch lifecycle/evaluation/timing/outreach source."
  }
]
```
