# Orbit US dates — main-orbit-us-dates-1

Expected close and Schedule for later now use the same locale policy for numeric date presentation and typed-date parsing. A US workspace reads month first, saves the day the person entered, and shows that same day in its review and readback. Existing shared formatter callers follow that policy.

Repository: just-every/run-orbit
Branch: cloud/main-orbit-us-dates-1
Head: 6fe339f7e7bf1ecdcc9ee018e364e11c46675d8c
Custody: READY; main was merged into the cloud branch. No main push, production deployment or landing was performed.
PR: none; the seed's cloud-branch landing path applies.
Verify: 43016169093 — completed / success — https://github.com/just-every/run-orbit/actions/runs/43016169093

## Plan and implementation

1. Configure the required fleet identity, launcher bundle, decrypted-bundle Git helper and preserved repository hooks. Read launcher and seed instructions; clone only the declared repository and create the named cloud branch from main.
2. Reproduce through native rer dev sign-in, first-run setup with America/Chicago and USD, and ordinary deal/draft creation in an en-US browser. Baseline draft history showed day before month (`11 Nov 2026, 5:19 am`). The Linux native date field used an ISO DOM value; its host-controlled visual order is not asserted to reproduce the Mac order identically.
3. Carry browser Accept-Language from the request into the signed-in shell, including SSR and hydration. America/* workspace zones select en-US; other workspaces use the browser locale. Cache shared display formatters by locale, style and timezone.
4. Share numeric Gregorian date formatting, field hints and explicit date-order parsing between Expected close and Schedule for later. Reject invalid calendar dates instead of rolling them over; preserve existing timezone conversion. These two fields use text date entry with locale hints; the schedule uses HH:mm in 24-hour form.
5. Extend the existing native first-hour scheduling journey, adding no registrations. Assert the new behavior at 1440; retain the changed deal and draft screens once at 1440 and 390. A separate synthetic en-GB context reuses only the test's in-memory native sign-in; no real browser profile or session is read or exported.
6. Run touched tests, typecheck, application build, inventory and source-lock checks. Preserve the first real save (9bc9627) through the fleet push guard. Fetch and merge main after publication, retaining published history; early fetches were current. The final fetch advanced to f336b13d063a9922cadb8f76bf8d8ebe2a39fe82 (HubSpot imports and collaborator browser sequencing). Merge it without conflicts, preserving its tests and docs; the date implementation and focused test remained unchanged. Re-run typecheck and the application build on the merged tree, then regenerate and check the source lock last. Push the final real correction without a skip marker, after inspecting every candidate identity and trailer.
7. Observe Verify on the exact pushed SHA with one REST watcher and at least 300 seconds between calls. Publish this report, actual receipts and selected screenshots only to the separate evidence ref; leave product custody and landing to the fleet.

## Results

- US close date: typed `04/11/2027`, displayed `04/11/2027`, API `2027-04-11T05:00:00.000Z` (April 11 at Chicago midnight). Reload kept the same displayed day.
- Invalid calendar date `02/30/2027` was refused and left the saved API value unchanged.
- Schedule input `01/11/2027 10:00` produced request `2027-01-11T16:00:00.000Z`, review `2027-01-11T16:00:00.000Z` and saved time `2027-01-11T16:00:00.000Z`. The review displayed `01/11/2027, 10:00 AM`; no provider submission occurred before the scheduled time. Cancellation remained durable.
- British browser: locale `en-GB`, typed/displayed `04/11/2027`, API `2027-11-04T00:00:00.000Z` (November 4), proving day-first parsing stays distinct from the US input.
- Corrected 1440 first-hour journey passed. Its date proof shows both changed screens at 1440 and 390. The earlier 390 full first-hour journey also passed; the final candidate proof is taken from the corrected desktop run at both viewports.
- Validation is asserted through the field's own alert and displayed format hint, without pinning exact error wording. The protected API value remains asserted.
- Typecheck, application build, source-lock check and diff check passed. The test cap remains **198 registrations + 2 qualification flows = 200**, before and after.
- Contract counts remain **42 done / 130 partial / 32 missing = 204**, before and after. No clause Status, Gap or Evidence cells, acceptance text, generated views or summary counts changed. No DONE claim.
- Initial 1440 development snapshot failed because Intl date/time option styles were incompatible; corrected. A subsequent locale check based on overriding headers inside an en-US context failed; the final test uses a genuine en-GB fixture context. Actual final results are in checks-receipt.json and date-roundtrip.json.

DEFAULT date policy: America/* workspaces use en-US, as the brief permits for a product deciding by workspace zone. Other workspace zones follow browser language; no date-format setting or timezone conversion change was added.
GAP RECORD-001: This round proves the close-date portion, not every obligation of the core-record acceptance point.
GAP OUT-009: This round proves schedule input, exact review, durable schedule and cancellation; it does not newly qualify every dispatch stop condition or live provider delivery.
CLAIM RECORD-001 PARTIAL points=none tests=tests/rer/onboarding.test.mjs#SIGNAL-001 SIGNAL-009 PUBLIC-002 OUT-001 first hour through native rer sign-in and exact rendered recipes at 1440
CLAIM OUT-009 PARTIAL points=none tests=tests/rer/onboarding.test.mjs#SIGNAL-001 SIGNAL-009 PUBLIC-002 OUT-001 first hour through native rer sign-in and exact rendered recipes at 1440

## Publication and boundaries

Product commits and report-only evidence are separate. Product branch files contain only date behavior, the extended existing test and source-lock changes. Reports, receipts and screenshots stay outside the product tree. All candidate authors and committers are Run Edit Run fleet <fleet@runeditrun.com>, with no co-author trailers. No published history was rewritten.

The earlier candidate 0d98096030fb8a83a622ffb7631da99f261f08ea had Verify run 43013997109, last observed in progress and superseded when the field-validation assertion was refined. Its last actual receipt is retained separately. The exact-SHA run above is authoritative for the final candidate.

The complete publication scan is unavailable in this cloud VM and remains the fleet Mac's landing gate. This report does not claim acceptance, live provider qualification, a production deployment or landing. No product blocker remains if exact-SHA Verify is successful; a pending run is reported as PUSHED rather than READY.
