# Orbit contact creation consent replay

Repository: just-every/run-orbit
Branch: cloud/main-orbit-contact-consent-1-c1
Base: 5f92fa76579961950d49c7411f54d5446516a708
Candidate: 14cfd039dcc8aac11aca99eafec5c8e7a943e408

Plan:
1. Refresh launcher and install bundle-only Git authentication, commit hooks and guarded push tooling.
2. Clone full history; squash the prior resolved contact-consent branch onto current main. Retain main's newer behavior and every assertion; restore CONTRACT.md and both generated views from main.
3. Compare the replay's changed lines with the prior round's net delta against 87880539d4245e6ee047aa6efa91dd7257ab95c3. Regenerate the source lock last and validate it. Keep one product commit, no merge commit or evidence in the product tree.
4. Run capture intake, launch suppression and workbench/outreach integration coverage plus typecheck. Run the existing capture and records browser journeys, asserting creation behavior at 1440 and taking changed-screen proof at 1440 and 390.
5. Inspect all candidate identities and trailers, publish the named product branch with the fleet guard, and observe exact-SHA Verify through budgeted REST calls.
6. Publish explicitly selected non-secret reports, results and browser proof to the separate evidence ref. Relay claims and terminal provenance to lane main.

Replay results:
- The squash applied cleanly; no unresolved file conflicts.
- Added/removed lines in every product and test file exactly match the earlier round's net change. Main's optional-company deal entry, Mailchimp ledger coverage and operator-removal handover remain.
- Captured evidence creation uses an atomic server-side create-and-link operation and starts Do not contact, with a timeline entry. The existing CAPTURE-012 explicit choice flow is preserved.
- Manual, import and workbench creation consult the existing keyed erasure fence. Details explain the starting state without exposing the erased record. Reviewed native clearing remains explicit and recorded; existing contactable contacts retain their state.
- CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md are byte-identical to origin/main. No status, gap or evidence cells changed.
- Test budget before/after: 198 registered cases + 2 qualification flows = 200 / 200. No test registration added, removed, skipped or loosened.
- Clause status counts before/after: 42 done, 130 partial, 32 missing, 204 total; judgments remain unchanged. Claims are PARTIAL only; no DONE promotion.

Validation and publication results are finalized in the actual receipt files accompanying this report.

Main advanced before publication to 5f92fa76579961950d49c7411f54d5446516a708. The unpublished one-commit replay rebased cleanly; source lock was regenerated and checked again, with no further lock delta. Current main's embedded risk-agent changes remain intact. Browser proof and typecheck rerun on the final candidate.

CLAIM CAPTURE-005 PARTIAL points=none tests=tests/e2e/capture.spec.mjs#CAPTURE-001 CAPTURE-004 an operator adds a mailbox and calendar files, reviews the proposals and opens the account at 1440 and 390
CLAIM RECORD-012 PARTIAL points=2 tests=tests/e2e/records.spec.mjs#record creation, edits, manual entries and workspace operator management persist through the interface
DEFAULT CAPTURE-005: Captured evidence alone never grants permission; the existing explicit CAPTURE-012 review with recorded basis remains available.
DEFAULT RECORD-012: A retained erased-address fence makes a new record Do not contact, including when an import says subscribed; an existing record's explicit permission remains unchanged.
GAP CAPTURE-005: This replay proves contact creation behavior, not the complete authority matrix and address-intake acceptance point; no DONE claim.
GAP RECORD-012: This round claims acceptance point 2 only. The existing done judgment is retained byte-for-byte; this partial round claim does not demote it.

Final-candidate local results: source lock check passed; contract-document check passed; typecheck passed under Node 22.20.0; the two selected native creation checks passed (2 passed, 0 failed, 0 skipped, 286.8 seconds); the two existing capture/records browser journeys passed on the final head (1.6 minutes), using /usr/bin/chromium with --no-sandbox. Six changed-screen screenshots cover 1440 and 390. The additional native capture/suppression/workbench-outreach run passed all 20 cases (0 failed, 0 skipped, 28.0 minutes). It started before rebase and is supplemental; exact final-SHA creation checks were repeated separately. The workbench/outreach file executed after the rebase.

Product push succeeded on attempt 1. Exact-SHA Verify: https://github.com/just-every/run-orbit/actions/runs/43301100881 (completed/success). One watcher, five-minute observation spacing, ten-call budget; observations are retained in ci-receipt.json. No PR is required by this repository's landing rules; the fleet owns landing. Full publication scanning remains with the fleet lander.

Assertion preservation: an AST multiset comparison confirms every assertion call from main remains in all four touched test files (capture intake 66 → 73; suppression 108 → 108; capture browser 65 → 65; records browser 54 → 54). New helper assertions extend the existing registrations. Details are in assertion-preservation.json.

All native subprocesses and browser servers started for validation have exited normally. Product worktree remains clean after checks; the product branch was pushed once, with one commit and no merge commit.

Final CI result: Verify 43301100881 completed successfully on exact SHA 14cfd039dcc8aac11aca99eafec5c8e7a943e408. CI observations used: 8 of 10. Product custody was independently confirmed with git ls-remote. Terminal product state: READY.
