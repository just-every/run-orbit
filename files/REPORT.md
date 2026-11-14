# Orbit contact permission round

Repository: just-every/run-orbit
Branch: cloud/main-orbit-contact-permission-1
Initial main: a35d331920a4bace2548bbd0efaf9344ffcd32a6

The assignment covers contacts created from captured meeting plans and preservation of an explicitly reviewed email permission through Settings Data export and restore. It excludes other consent/import doors, archive format changes and unrelated stranger findings.

The complete plan is in PLAN.txt. The existing native archive browser journey is extended rather than registering a new test. Before count: 198 registered cases plus 2 qualification flows, 200 total. No contract Status, Gap or Evidence edits are authorized or planned; generated acceptance and claim views remain untouched.

Investigation: the meeting plan posts an email-only ordinary Records contact create request, which defaults to contactable. A direct public Records API stop/clear followed by a fresh-database native archive restore preserved contactable with zero active anonymous suppression proofs on initial main. The Settings Data browser path remains the decisive reproduction for the second finding.

Implementation: the meeting-plan create request explicitly supplies do_not_contact. Restore still loads archived contactability and the archived clear history. A separate active anonymous destination stop still wins; that override now appends an attributed contact timeline entry and audit event in the same durable restore batch, with the archived permission and the reason. The Settings restore preview explains this exception before the confirmation and start control. Scheduled-message cancellation and source credential reconnection code are unchanged.

Reproduction is detailed in REPRODUCTION.md. Fresh-installation cleared-state drift was not reproduced on current main. The separate retained destination stop was reproduced through public APIs and Settings restore; its silent override failed the new history assertion before the fix.

The extended existing browser registration covers the meeting plan's captured hold and missing Email action, a deliberate stop/clear, actual streamed Settings export, archived current state, eligible empty target restore, session revocation and renewed sign-in, exact preservation of the earlier attributed clear, and a separate retained target stop with a visible reason in contact history. It captures meeting plan, restore review and restored contact states at 1440 and 390; behavioral assertions run at 1440. No test registration was added or removed.

Policy default: preserve an archived clear unless an independent active destination stop applies. Retained suppression wins under CONTRACT D-1; the protective exception must be visible and attributed.

Clause status changes: none. CONTRACT.md and both generated views are unchanged. Counts remain 198 registered cases + 2 qualifications = 200. Contract ledger counts remain 42 done, 130 partial and 32 missing. No DONE claim is made.

Final candidate: cloud/main-orbit-contact-permission-1 at 1bf610b4bd3937e66c745b6a127babd44a373317. The extended native archive journey passed (1 registration, 2.3 minutes; 3.0 minutes including server startup), as did typecheck and the exact CI source-lock check. The source lock was regenerated after staging the new helper so it includes its bytes. The initial candidate was rebased onto current main before publication; after that published save, current main was fetched and merged before the attribution follow-up. Main had not moved in either case. Every candidate commit author, committer and trailer was inspected; both fleet-authored commits have no trailers; each guarded push succeeded on attempt 1. The working tree is clean.

Pending: exact-SHA Verify and evidence transfer. The fleet's Mac publication scan remains a landing gate and is not available in this cloud environment.

Claims are deliberately partial; clause judgments remain the lander’s. CAPTURE-005’s created-contact limb is asserted here, while this round does not independently prove every authentication limb of acceptance point 1.

CLAIM CAPTURE-005 PARTIAL points=none tests=tests/archive/browser.spec.mjs#native archive preparation, streamed download, confirmed restore and renewed session preserve workspace records
CLAIM DATA-001 PARTIAL points=3 tests=tests/archive/browser.spec.mjs#native archive preparation, streamed download, confirmed restore and renewed session preserve workspace records
DEFAULT DATA-001: Preserve archived current permission unless a separate retained destination suppression proof wins; disclose and attribute that protective exception.
GAP CAPTURE-005: This round adds the meeting-plan contact-creation proof; it does not rejudge the clause’s other authentication limbs.

Attribution follow-up: native restore keeps a matching operator email under the archive’s operator ID. The protective hold history now resolves that same final identity before writing. The journey deliberately uses a different source operator ID and asserts that the new event retains the restored operator ID and visible name. The test session fixture renews the real owner session by email after that identity merge. This is an additional ordinary commit on the already published branch; published history is preserved.

Published heads: b87126071db69a784c23067a7ba57d666206ef99 (superseded candidate) and 1bf610b4bd3937e66c745b6a127babd44a373317 (final candidate). Earlier Verify run 43560083467 belongs to the superseded SHA and is not final proof. No PR was required or created.
