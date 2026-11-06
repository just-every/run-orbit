# PUBLIC-002 proof rubric

Candidate: `64ef897481343389cb4eafe729573956323d18d4`.

These rows expand the existing single acceptance sentence and requirement into observed outcomes. They add no acceptance text. Native identity and review duties remain owned by their existing clauses.

| Row | Outcome | Proof | Local result |
| --- | --- | --- | --- |
| R1 | Examples are labeled before their workspace is displayed; twelve fictional deals can be selected. | tests/e2e/baseline.spec.mjs, responsive public-surfaces registration, lines 30 to 42. | MET |
| R2 | Relative dates, signals, draft and sent-message and reply story are present. | tests/core/public-demo.test.ts, existing PUBLIC-002 registration, lines 27 to 35; baseline.spec.mjs lines 35 to 39. | MET |
| R3 | Owner data remains private with populated data; public visitors gain no native record or approval authority. | public-demo.test.ts lines 13 to 40; tests/support/public-demo-proof.ts lines 21 to 24. | MET |
| R4 | Public demo document and data requests write no user table. | public-demo.test.ts lines 25 to 46; public-demo-proof.ts lines 15 to 29; existing databaseDigest enumerates every user table. | MET |
| R5 | No model, customer-mail or other provider request occurs. | public-demo.test.ts lines 21 to 24 and 44; public-demo-proof.ts lines 13, 19 and 30. | MET |
| R6 | Unknown demo paths return styled 404 with working home navigation at desktop and phone sizes, without accessibility or overflow failures. | baseline.spec.mjs lines 14 to 28 and 47 to 61, unchanged width loop includes 1440, 390 and 320. | MET |
| R7 | Disabling the buyer's configuration returns 404 from the real emitted document and data endpoint. | public-demo-proof.ts lines 21 to 34 and tests/support/disabled-demo-build.ts. | MET |

The dangerous paths are attempted: private selection returns 400, public mutation returns 404 and native records and approval return 401, all over populated data with an unchanged full database digest. The supported read remains available with 200.

The nonmutation assertion failed against the original emitted implementation before repair: the demo consumed the durable general public counter. The same assertion passes after the narrow GET and HEAD exemption. This is an actual observed regression probe, not a claimed synthetic mutation run. No other code mutations were applied; the remaining rows are supported by the recorded public-door journeys and inspection of their assertions.

## DONE riders

| Rider | Result and evidence |
| --- | --- |
| 1 | Local PASS: R1 to R7 reach every acceptance outcome. Exact-head core and browser receipts both exit 0. Exact-head Verify and landing remain separately reported. |
| 2 | PASS: populated owner data in five private record kinds; allowed public reads and refused private selection, mutation and native approval, with complete nonmutation comparisons. public-demo.test.ts lines 13 to 46. |
| 3 | Permitted cloud exception: exact-head Verify 42171204093 completed failure only on generated ACCEPTANCE.md freshness, with source and aggregate cascades; product shards were skipped. Both journey registrations are in existing Verify partitions. The exact-head local journeys passed; the fleet must regenerate views and rerun its landing Verify. |
| 4 | PASS: public-demo-final.json and browser-final.json name the full candidate SHA. |
| 5 | PASS by inspection: PUBLIC-002's existing clause metadata at CONTRACT.md line 155 cites BASE-PUBLIC-001, BASE-ACCESS-001, BASE-ACCESS-002 and BASE-SIGNIN-001. No native identity duty was redefined or newly claimed. |
| 6 | PASS mechanically: empty DONE Gap, precise journey Evidence, provenance names the code-proof commit; only status, counts and lock follow that code. Generator write and check passed; generated views restored from main as required for cloud. |
| 7 | PASS by inspection: no acceptance sentence changed, no rewrite or split, and every one of 204 parent Status rows is retained in every candidate commit. |
| 8 | PASS for applicable authority boundary: native record and approval attempts from the public visitor return 401 and change nothing. No permission, correction or refund implementation changed. |
| 9 | PASS by inspection: no live provider, legal or production qualification is claimed. Configured synthetic network edges establish only absence of requests. |
| 10 | PASS by inspection: no policy default or new custody, consent, authority or spending decision was adopted. Existing fictional-only policy was enforced. |
| 11 | Pending fleet landing: main equality, exact landed Verify and Run site, and COMPLETE full-history publication scan with zero findings belong to the guarded lander. Current main Verify and Run site are green; neither is substituted for candidate proof. |

## Pre-READY self-check

Every named outcome has an exercised public-door assertion. The full-table check was observed failing before the fix. Existing assertions and all three existing responsive widths remain; added behavioral assertions run at 1440. There are still 198 registrations plus two qualification flows, 200 total. No prior assertion was deleted, skipped, narrowed or moved behind a condition. Public data cannot authorize native records or outreach; repeated requests cannot introduce or resurrect installation data. No credential, erasure or capture-replay implementation changed. The approved visible interface, homepage, logo and copy are untouched. All demo controls have visible text; there is no icon-only action to add a tooltip to. Desktop and phone screenshots were inspected. Source lock is fresh. Added text contains zero email-shaped strings. Publication scanning and final landing are not claimed by the cloud builder.
