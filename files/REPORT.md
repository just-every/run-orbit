# sd-orbit-c-f139

Product: just-every/run-orbit, branch cloud/sd-orbit-c-f139, full candidate 0cbac1c17119cf12b610c338173cdf8ebf94dbc8. Parent and synchronized main: 6d869cb48cbd6bcebb1566be460b49223e892bb6. No PR is required for the existing push Verify entry point, and no PR was opened. Main was not pushed.

BASE-AGENT-005 remains PARTIAL. The planner-selected acceptance 1 collaborator record parity slice is proven locally; the entire acceptance point's every-tool and every-role matrix is not claimed. Counts before and after: 36 DONE, 136 PARTIAL, 32 MISSING, 204 total. Test inventory before and after: 198 registrations plus two qualifications, total 200. No contract text, Status, Gap, Evidence, generated view, workflow, screen, Base pin, plan row or release prerequisite changed.

## Full plan and execution

1. Set the global fleet identity, refresh the fleet launcher, read its instructions and install the bundle-reading Git helper, config cleanup and push guard outside the product clone. Clone full history and create only the named cloud branch. The initial three clone attempts failed with invalid credentials, and an explicitly bundle-loaded repository API read returned HTTP 401 Bad credentials. The fourth clone succeeded after the required refresh and backoff. Recovery never used a different credential. Configure the repository identity and install its preserving commit-message hook before commits. Completed.
2. Read the repository instructions, full target clause, current Status row, existing managed-owner journey and helper, selected-grant proof, Records adapter, AgentAccess, native Access administration and the collaborator Records screen's endpoint. Map the selected slice against the existing proof; retain all broader omissions and holds. Completed. Existing full-operator reads and writes, selected-grant resource equality, missing-scope refusal and whole-grant revocation remain exercised by the same registration.
3. Add a focused collaborator helper through the existing managed-owner registration and agent-door proof. Invite and accept a native guest, sign in through a requested native email link with only its mail transport captured, establish one read-only company grant, bind its Business subject without promoting it, and issue one MCP bearer carrying both records:read and records:write. Compare the actual authenticated shared Records endpoint with orbit.records.read and orbit.records.update, then revoke only the native record grant and reuse the same session and bearer under autonomous and held policies. Completed. No production defect was demonstrated, so no production code changed.
4. Run the touched registration, typecheck, first-party check, test inventory, contract generator write and check, and source lock regeneration and check. Restore generated views from main; leave their bytes untouched. Fetch and rebase onto main immediately before publication, regenerate and check the source lock last, and inspect every candidate identity, trailer and message. Completed; all local checks pass, and the rebase was a no-op. The first exploratory run stopped on a malformed DELETE in the newly added helper, which has been corrected. The final helper uses the native shared Records route used by the collaborator screen and needs no profile modification.
5. Commit only the requested test proof and source lock, push the named branch with the supplied guard, discover exact-SHA Verify through REST within the ten-call budget, and publish this explicitly selected non-secret packet to the separate evidence ref. Product push completed on guard attempt 1 and its remote head was independently read back. Verify was discovered as push run 42479877087. Its latest state is recorded in candidate-ci-status.json. An exact committed-head local runtime receipt is recorded in touched-test.log. Evidence publication is separately reported in the terminal handoff; it has no product acceptance meaning. Fleet scanning and guarded landing remain pending.

## Runtime proof and scope

Registration: tests/core/managed-owner.test.ts, `Managed owner claim verifies RER authority and creates the native owner/session exactly once`, line 115, calls the extended proof at line 158. The new helper is tests/support/agent-door-collaborator-proof.ts. The signed roster mapping and one-time bearer construction are in tests/support/agent-door-proof.ts, lines 234 to 244. The helper is loaded by existing Verify core-1 through the normal discovered core test file; no workflow was edited.

The collaborator's native guest membership remains active throughout. Its only grant reads one company and the name and primary_domain fields. A real private custom field is populated and confirmed through the owner's Records read. The same signed MCP bearer has both read and write tool scopes, so neither a missing scope nor whole-credential revocation explains the record refusal.

| Selected behavior | Public door and assertion | Result |
| --- | --- | --- |
| Native invitation and accepted guest identity | Native Access invitation and acceptance; native requested email-link confirmation, helper lines 25 to 41 | PASS |
| Sole read-only company grant | Native Access POST grants, helper lines 42 to 49; administration read confirms one grant, lines 94 to 96 | PASS |
| Permitted-field parity | Authenticated shared Records GET and authenticated MCP tools/call orbit.records.read, helper lines 75 to 86 | PASS in both policies: exact fields and values match, no hidden value, native editableFields empty |
| Read-only write refusal with both tool scopes | Authenticated shared Records PUT and MCP tools/call orbit.records.update, helper lines 87 to 91 | PASS in both policies: native 403, MCP complete error resource_unavailable, no success content or receipt, no record effects |
| Revoke only this record grant | Native Access DELETE grants, administration read, exact one revocation event and audit, helper lines 93 to 99 | PASS: native session and membership remain active |
| Existing bearer loses the previously permitted read | Same authenticated native cookie and same MCP bearer, helper lines 100 to 107 | PASS in both policies: native 403 and no projection; MCP resource_unavailable with only the fixed error content, no structured content, approval handle or completion receipt |
| No native effect after refusal | Populated inventory of companies, contacts, opportunities, graph records, timeline and link rows, native record audit and domain events, handoffs, mail drafts and outbound messages, and agent attribution context, helper lines 56 to 64, 91 and 107 | PASS. Access administration's intentional audited grant mutation is excluded from the record-effect witness and separately asserted exactly once. |
| Existing selected delegation and scope protections | Unchanged tests/support/agent-door-local-proof.ts, selected and foreign resource equality in both policies, missing tool scope refusal, whole-grant revocation | PASS as part of the same managed-owner registration |

MCP uses HTTP 200 with a typed tool refusal; native Records uses HTTP 403. The parity is the permitted projection and the allow or deny result, preserving each transport's normal response shape.

PROBE BASE-AGENT-005 1: authenticated shared Records GET and PUT with a read-only native company grant, and MCP read and update with both tool scopes -> matching name and primary_domain, native edit hints empty, writes refused without native effect; native Access grant revocation -> same cookie and same bearer refuse the read with no record content under autonomous and held policies.

## Acceptance and inherited duties

| Clause item | Qualification on this candidate |
| --- | --- |
| Acceptance 1, every tool for each role | PARTIAL: only the selected guest collaborator company read and read-only write slice is added; full matrix remains unclaimed. |
| Acceptance 2, one-folder read-only grant and argument widening | Existing selected-grant resource equality and scope proof is preserved; broader qualification remains unclaimed. |
| Acceptance 3, sponsor downgrade and suspension | Existing sponsor-removal and identity-change assertions remain; full downgrade and suspension qualification is omitted. |
| Acceptance 4, self-widening, sponsor role changes, policy and Pause, own-grant narrowing | Omitted and unclaimed. |
| Acceptance 5, general injection fixture and classification preservation | Omitted and unclaimed. |
| BASE-ACCESS-004 current native authority intersection | The selected read and write refusal paths are exercised through independently authenticated Records and MCP, followed by native record-grant revocation; wider inherited qualification is not claimed. |

TEAM-001 remains held under strategy model trial r41, with no foundation edit or acceptance claim. TEAM-005 retains the stated contract-cleanup and resulting-main dependency. All-tool and all-role qualification, sponsor-role downgrade and suspension, self-widening and own-grant narrowing, general injection and expanded sales roles remain omitted. No new policy default was adopted; existing native guest and grant semantics were used.

## DONE riders and pre-ready self-check

This is a PARTIAL claim, with no DONE promotion or count effect.

| Rider | Result and evidence |
| --- | --- |
| 1 | PASS for the selected slice, helper lines 25 to 107; NOT ESTABLISHED for all five full acceptance points. Exact-SHA Verify state is in candidate-ci-status.json. |
| 2 | PASS for the selected slice: populated company and hidden field, permitted reads, refused writes and post-revocation reads with unchanged native effects, helper lines 42 to 107. |
| 3 | Existing Verify core-1 loads the registration. Run 42479877087, push event, exact candidate. Current status is in_progress with conclusion null in candidate-ci-status.json; no green result is inferred from another SHA. |
| 4 | The final runtime receipt names the clean committed candidate. No product edits followed the source-lock generation and commit. |
| 5 | INSPECTED: BASE-AGENT-005 itself names BASE-ACCESS-004. No receiving clause or inheritance text changed. |
| 6 | PASS mechanically: contract write and check exit 0, views restored unchanged, source lock fresh. Status, Gap, Evidence, provenance and counts remain main's bytes. |
| 7 | PASS by inspection: no acceptance text, obligation or ruling changed. |
| 8 | PASS for selected authority paths: allowed read, native and MCP write refusal, native revocation, same bearer loses read, no content or write effect. Broader role and operation matrices remain unclaimed. |
| 9 | NOT APPLICABLE to new proof: no live provider or legal-boundary claim. Only synthetic mail transport is captured. |
| 10 | NOT APPLICABLE: no policy default or authority change shipped. |
| 11 | PENDING FLEET LANDING: candidate remains on the named cloud branch. No main equality, candidate Run site or publication-scan completion is claimed. |

Pre-ready checks: the selected visible authorization outcomes have runtime assertions; no existing assertion was deleted, skipped, weakened or conditionalized. Revocation is exercised with the original bearer and no content or record effects. Existing selected-grant resource equality and whole-grant revocation remain intact. No erasure or capture-replay path was modified; no new qualification of them is claimed. No screen was changed, so screenshots and tooltip or typography changes are outside this test-only slice. Test count remains 200 including qualifications. No email-shaped string was introduced in changed fixture source; synthetic email inputs are constructed from separate parts. No provider-shaped key or credential was added. Source lock and generated-view checks pass.

MECHANICAL lock=node node_modules/@runeditrun/rer/edition-authoring/cli.mjs lock then check exit=0; views=node src/base/contract-docs.mjs write then check exit=0; ledger=none exit=0 (no migration changed).

Publication scan: commit=0cbac1c17119cf12b610c338173cdf8ebf94dbc8; status=NOT RUN IN CLOUD; complete=unestablished; historyScanned=unestablished; findings=unestablished. Full Git history is present, but the maintained Mac fleet must run the publication scan. Main equality is not claimed. Parent main's recorded successful Verify is 42477363510 and successful Run site is 42479134746 on 6d869cb48cbd6bcebb1566be460b49223e892bb6; neither is offered as candidate qualification.

## Product and evidence custody

Only sources.lock.json and three test files are in the product commit. Global and local Git identity use the fleet identity. Every candidate author's and committer's identity and all messages and trailers were inspected before push, including all parents in origin/main..HEAD. No co-author trailer is present. The hook remained enabled. The push guard succeeded on attempt 1; the exact remote branch head equals the candidate. No main push, force push, history rewrite of published commits, PR creation or workflow dispatch occurred.

This packet contains actual non-secret report and receipt files only. No credential, environment dump, private local settings, held-out gate material or symlink is selected for evidence publication. Report transport uses only refs/heads/evidence/sd-orbit-c-f139 and has no READY or acceptance meaning. Product scanning and guarded landing are fleet duties. The clone is removed only after product and evidence transfer are verified.

CLAIM BASE-AGENT-005 PARTIAL points=1 tests=tests/core/managed-owner.test.ts#Managed owner claim verifies RER authority and creates the native owner/session exactly once
GAP BASE-AGENT-005: Only acceptance 1's selected collaborator company read and read-only write parity slice is newly proven; the all-tool and all-role matrix, sponsor-role downgrade and suspension, self-widening and own-grant narrowing, general injection matrix and expanded sales roles remain omitted. All holds remain unchanged.

Terminal CI handoff: exact-SHA push Verify 42479877087 remains in_progress after one status read at the required 300-second interval. Product custody is PUSHED; no READY, green Verify, DONE, scan completion or landing is asserted. The cloud brief limits waiting; the fleet independently waits for exact-SHA checks and publication scanning. GitHub REST calls used: 4 of 10. No workflow rerun or dispatch. Local clean committed-head managed-owner proof passes (touched-test.log, exit 0). There is no known product blocker.
