# Orbit teammate removal

Repository: just-every/run-orbit
Branch: cloud/main-orbit-teammate-removal-1
Scope: owned-record handover during teammate removal and truthful access summaries.

## Plan
1. Reproduce the missing contact inventory and former teammate access label through authenticated public routes and the built browser interface.
2. Extend the existing atomic removal inventory, review fingerprint, explicit choices and handover transaction to all currently supported independent record owners: contacts and companies. Preserve ownership revisions, attributed history and existing removal safeguards.
3. Correct access administration to reflect the operator's current status, render inactive access without a full-access claim and refresh the embedded summary after removal.
4. Extend the existing removal browser check at 1440 without adding a registration. Cover five contacts, companies, receiver/unassignment, stale review refusal, persisted ownership and per-record timeline attribution. Retain existing assertions. Capture changed screens once at 1440 and 390 outside the product tree.
5. Run touched checks, typecheck and the 200-case inventory. Integrate current main without rewriting published history, regenerate and check the source lock last, audit all candidate commit identities/trailers and push only the named cloud branch.
6. Discover and poll exact-SHA Verify via REST within the ten-call budget and 300-second interval. Publish actual non-secret reports and receipts separately on the evidence branch.

## Boundaries
No CONTRACT.md Status, Gap or Evidence edits, generated-view commits or DONE claim. Leads/custom object ownership and unrelated stranger findings are outside this round. Session revocation retains existing behavior. Publication scanning and landing remain with the fleet's Mac.

## Implementation and observed behavior
- Untouched main b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31 reproduced both stranger findings through authenticated public handlers and the emitted browser application. Five owned contacts and one owned company were absent from removal review; the contacts kept the removed owner. The Collaborators row said “Teammate with full access · Access removed.”
- Removal now inventories contact and company ownership from the existing independent ownership store, including legacy reconciliation. Email-only contacts display their email in the review.
- Each nonempty contact/company set requires its own receiver or explicit unassignment. A stale review, a missing choice or a departing operator selected as receiver is refused. Set membership and record/ownership revisions are checked inside the same batch as existing deal/task/handoff/mail handovers, message cancellation and session revocation.
- Each affected contact/company increments its ownership revision, retains ownership history and receives one owner.changed timeline entry naming the previous/new owner, remover, time and removal operation. Existing assignment undo cannot overwrite the later handover.
- Access administration uses effective current operator/membership status. Inactive native operators are described as former teammates with access removed. The embedded Collaborators section refreshes when the roster changes, including removal and personal-detail erasure.
- The existing browser registration is extended, not supplemented: five contacts (one email-only), an owned company, a deal and a task; missing choices; stale contact and company reviews; invalid self-handover; both contact/company destination choices; persisted per-record history; removal replay refusal; immediate and reloaded access summaries; and the retained personal-detail-erasure assertions.
- Four existing today-brief core tests passed, including the original TEAM-004 task/deal handover and revoked-session assertions. Typecheck passed on Node 22.20.0. No full local Verify was run; exact-SHA branch Verify remains the full wall.

## Contract scope
Status, Gap and Evidence cells are unchanged. TEAM-004 remains partial; RECORD-022 remains partial. No DONE claim is made.

CLAIM TEAM-004 PARTIAL points=none tests=tests/e2e/records.spec.mjs#record creation, edits, manual entries and workspace operator management persist through the interface
CLAIM RECORD-022 PARTIAL points=none tests=tests/e2e/records.spec.mjs#record creation, edits, manual entries and workspace operator management persist through the interface
DEFAULT RECORD-022: Hand over the supported independent contact/company owners using the existing full-operator receiver policy; no ownership grants access.
GAP TEAM-004: This focused round does not newly prove all of acceptance point 1, including delegated handoff unassignment and scheduled-message cancellation; existing checks remain.
GAP RECORD-022: The removal portion of acceptance point 3 is covered; owner views, restricted-seller doors, report grouping/drill-through and dashboard filters remain outside this round. Accordingly no complete point is claimed.

## Local results and product custody
Final candidate: 3044cf16350afc606377aa5354a019707790ea0e.
Main integrated: b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31.
Save: 7b0b2879338a38da3d697f6463fc35487a1d7bb9, pushed with [skip ci].
Final commit has no skip marker. Every candidate author and committer is Run Edit Run fleet <fleet@runeditrun.com>; no co-author trailers remain. No published history was rewritten.

- Extended browser case: passed at 1440, retaining the original record editing and personal-erasure assertions. One of five contacts is email-only.
- Existing today-brief core file: 4 passed, 0 failed.
- Affected existing form case: 1 passed, 0 failed, including the explicit contact handover and its timeline, then its unchanged Records/CLI archive and erasure checks. The dependent fixture now chooses the receiver required by the new removal behavior.
- Typecheck and source-lock generation/check: passed. Contract and generated views unchanged.
- Inventory: 198 cases + 2 qualifications = 200 before and after; no new registration.
- Final-head browser proof: five contacts received, company explicitly unassigned, six attributed ownership handover entries, and a removed access summary. Review, access summary and contact timeline screenshots are retained at 1440 and 390.
- Baseline review count: contacts 0/5 and company 0/1. Final review count: contacts 5/5 and company 1/1. Removal handover timeline entries: 0 to 6 for those records.
- Source checks and typecheck used pinned Node 22.20.0; the successful focused browser test also used Node 22.20.0. Final screenshot proof and form regression used the VM runtime selected by the supplied toolchain, Node 24.19.0, after disposable-database startup timed out during concurrent pinned-runtime attempts. The repository timeouts and assertions were not weakened. Exact-SHA branch CI is authoritative for the pinned workflow.
- PR: none; this brief uses the fleet's named-branch landing contract.
- All screenshots and receipts remain outside the product branch. Publication scanning and landing belong to the fleet Mac.

Actual evidence: baseline-receipt.json, local-checks.json, browser-proof-receipt.json, product-receipt.json and forms-transport-receipts.json. CI receipts are added separately below.

## CI custody and terminal result
Verify run 43153449604 completed successfully on exact candidate head 3044cf16350afc606377aa5354a019707790ea0e:
https://github.com/just-every/run-orbit/actions/runs/43153449604

Seven task API reads were used, each run read at least 300 seconds apart. The launcher's authentication check is conservatively counted as one additional call, for eight of ten total. Actual observations, timestamps and budget accounting are retained in ci-discovery.json, ci-status.json, ci-history.json, api-calls.json and github-budget.json. No failed-job log read or workflow rerun was needed.

Product custody: READY on the named pushed branch and full 40-character SHA above. No task blocker remains. This is a builder candidate, not acceptance, a publication scan, landing or deployment. The fleet Mac owns those gates. Both target clauses remain partial and their status cells are unchanged.

The complete packet includes the plan, actual results, receipts and paired 1440/390 screenshots. It is published only to evidence/main-orbit-teammate-removal-1, separately from the product branch.
