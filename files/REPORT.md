# Orbit: one form enquiry, one notification

Repository: just-every/run-orbit
Branch: cloud/main-orbit-form-notify-once-1-pc1
Candidate: 96f0e60a53ac1a350270bae42cef6740098ec8cc
Preserved starting head: efded904242fef01fbfaf2c24ff20966456c98ed
Verify: 43567711945 — in_progress; conclusion None; exact head 96f0e60a53ac1a350270bae42cef6740098ec8cc; observed 2026-11-14T07:28:49.532547+00:00; 10/10 GitHub calls used
PR: none; this seed's fleet lands the named branch.

## Outcome and continuation repair

The saved product change makes one accepted form enquiry create one notification for its routed operator. The single row links the created contact and deal; the unread count increases by one. Idempotent replay does not create another row or change the inbox. Ordinary NOW notifications and existing notification rows remain intact.

Before/after behaviour: the stranger saw two rows and an unread increase of two; the retained form journey now asserts one row across all kinds and an unread increase of one. This continuation preserves that implementation and repairs the failing archive upgrade that its trigger-only migration introduced.

The saved head's local upgrade test reproduced the prior Verify failure: notification_skip_form_now leaked into the historical catalog at the exact pre-library schema comparison. Archive identities include trigger inventory, so preceding exports could be rejected even when their tables and columns were valid. The repair names the exact preceding generation, removes only the new native trigger when reconstructing earlier generations, and retains the full current catalog. Owner schema objects remain bound. The extended existing upgrade journey captures the real pre-migration schema, validates it after upgrade, admits it through authenticated Records restore HTTP, and aborts staging. It preserves all earlier value, identity, custom DDL and foreign-key assertions.

## Plan and results

The full plan is in PLAN.md. Launcher and fleet Git setup were completed; the published starting commit was preserved without amendment or rebase. Main was fetched and already included; no conflict or contract edit was needed. Only the archive compatibility source, its existing upgrade helper and the generated source lock were committed in this continuation. The source lock was regenerated last and checked with CI's exact command.

- Existing upgrade journey: before repair 0/1 pass; after repair 1/1 pass.
- Existing form HTTP file: 4/4 pass, including routing, one unread increase, all-kind row count, idempotent replay, existing owner, durable rotation, fixed/deal-less and unassigned routes, ordinary NOW events, archive roundtrip and erasure.
- Focused existing form browser journey: pass on the emitted Worker with /usr/bin/chromium and --no-sandbox. Behaviour assertions run at 1440; saved screen proof at 1440 and 390 shows the contact and deal destinations. No serious/critical accessibility violation or horizontal overflow was reported.
- Build, typecheck, contract-docs check, deployment-spec check and source-lock check: pass. See local-receipt.json and the actual logs.
- Test budget before/after: 198 cases + 2 qualifications = 200 / 200. No test registration added or deleted.
- Commit identity and trailers: every candidate commit, including side parents, passed the fleet identity check. Product push succeeded on the first attempt with the cloud push guard.

A supplementary broader browser run timed out on the existing mail-team removal step, waiting for Remove Jamie Patel, before reaching the form mapping journey. That is recorded as a failed local run, not a passing result. The directly executed form mapping journey passed, and exact-SHA Verify remains the full acceptance wall. The first broad browser attempt also lacked Playwright's downloaded browser; the successful focused proof explicitly uses the VM Chromium, as instructed.

The old failed-job archive command returned exit 0 with zero log bytes. A separate evidence artifact download was denied at its blob redirect (Forbidden); no retry or alternate credential was used. previous-ci.json records the actual commands and sanitized transport limitation.

## Claims and limits

No CONTRACT.md status, gap or evidence cell was edited. No generated ACCEPTANCE.md or docs/CLAIMS.md view was committed. No DONE claim is made. Clause status counts are unchanged: Published 31 done, 48 partial, 0 missing, 79 total; Target and push further 11 done, 82 partial, 32 missing, 125 total; All 42 done, 130 partial, 32 missing, 204 total. The scoped notification point is proven; email/push delivery and broader clause acceptance are not claimed by this round. The publication scan remains the fleet Mac's landing gate under the cloud adaptation.

CLAIM FORM-004 PARTIAL points=1 tests=newtests/t096/forms-native.test.ts#FORM-001 mapped cross-origin capture with picklist and declared hidden fields, reviewed proposals and durable owner rotation retain fixed publication, DNC and consent
GAP FORM-004: this round proves the in-app notification path; email/push delivery and full clause acceptance remain outside its claim.

Product custody and evidence publication are separate. product-provenance.json identifies the pushed product; ci-receipt.json holds the actual exact-SHA workflow observations. The report packet is published only to evidence/main-orbit-form-notify-once-1-pc1. No report, receipt, screenshot, credential or private gate material is committed to the product branch.

## Terminal product custody

PUSHED branch=cloud/main-orbit-form-notify-once-1-pc1 head=96f0e60a53ac1a350270bae42cef6740098ec8cc

Verify remains in progress after approximately 45 minutes and the final budgeted status call. No completed green verdict was observed. No failed candidate job was reported by the status endpoint, and no candidate failure is inferred. CI completion is outstanding; the fleet must observe a successful exact-SHA Verify before landing. The earlier failed Verify was 43559901476; this candidate runs as 43567711945.
