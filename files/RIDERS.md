# Clause proof and rider dispositions

No DONE claim is made. All references below describe the selected revocation limb, not full clause qualification. The existing test is `tests/core/managed-owner.test.ts`, named `Managed owner claim verifies RER authority and creates the native owner/session exactly once`; its call at line 50 reaches `agentDoorProof`, which invokes the focused revocation helper.

| Acceptance sentence | Disposition for this round |
| --- | --- |
| 1: unauthorized call and full protected-resource metadata | Existing assertions retained. New helper lines 56–59 require the resource metadata challenge and exact unauthorized body for the selected revocation attempts. Full metadata and scopes matrix unclaimed. |
| 2: correct Business audience and actual sibling refusal | Existing Business read, wrong-audience and unmapped-person checks retained. Actual sibling proof unclaimed. |
| 3: expiry and maximum lifetime | Existing implementation retained; complete seed proof unclaimed. |
| 4: insufficient scope with all needed scopes | Existing insufficient-scope checks retained; full challenge matrix unclaimed. |
| 5: query-token refusal without logging | Existing transport guard retained; full nonretention proof unclaimed. |
| 6: seed or Business consent revoked within 60 seconds | Selected native-agent limb: helper lines 32–39 admits distinct agents by native read; 41–44 proves handshakes work before revocation; 46–53 requires the owner session and exact roster identity; 54–62 checks retained and newly issued credentials against both handshake methods with a surviving admitted control; 21–29 and 64 compare complete rows in every table other than admission records. Both policies execute. Complete seed and Business consent, every-method and timing qualification unclaimed. |
| 7: unpairing and native sign-in | Existing assertions retained; broader qualification unclaimed. |

| DONE rider | Disposition |
| --- | --- |
| 1 | PARTIAL: selected limb performed through native HTTP and MCP; other clause outcomes remain unclaimed. |
| 2 | PASS for selected limb: populated company read, allowed handshakes, revoked handshakes, admitted control and complete persisted-state comparison, normalizing only the owner session activity timestamp while retaining every session authority field. Original transport reproduced a real 200 instead of 401 failure. |
| 3 | The existing push Verify plan loads this registration in core-1. Exact-candidate run and conclusion are recorded in REPORT.md and the CI receipt; no earlier SHA is substituted. |
| 4 | Final source-byte and commit binding is in the receipt. No product or test edit follows final proof. |
| 5 | NOT APPLICABLE: this is the Base duty itself, with no receiving-clause rewrite. |
| 6 | PASS mechanically: contract write and check succeed; generated views restored whole; Status, Gap, Evidence and counts unchanged. Remaining qualification stays named. |
| 7 | PASS by inspection: no acceptance, policy ruling or coverage rewrite. |
| 8 | PASS for selected limb: unsigned revocation denied, actual owner revokes exact identity, revoked credentials refused and control succeeds with no native or downstream effect. Broader role matrix unclaimed. |
| 9 | PASS in scope: Business signing edge is synthetic; no live provider, account, timing or device qualification claimed. |
| 10 | NOT APPLICABLE: no new policy default or ruling. |
| 11 | PENDING fleet landing: builder does not change main. The complete history scan, main equality, landing Verify and Run site on the landing head belong to the guarded lander. |

Pre-handoff self-check: no removed, narrowed, skipped or conditional existing assertion; current authority is enforced before either handshake result; no new erasure or replay path; no screen changed; no new email-shaped fixture string or credential literal. Base origin and original digest are preserved in base-copies.json, with only this local adaptation acknowledged. No scan COMPLETE claim is made by this cloud run.
