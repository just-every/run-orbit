# Orbit saved-record views mechanical republication

Task: sd-orbit-c-f162-rebase-1
Repository: just-every/run-orbit
Product branch: cloud/sd-orbit-c-f162-rebase-1

1. Refresh the fleet launcher and install decrypted-bundle Git authentication, publication identity hooks, the push guard, and the report-only evidence transport. Clone main shallowly with filtered blobs; fetch the published f15a833113df39d8cbfbf8ac56202d1234b0720b candidate and deepen only as needed to establish ancestry.
2. Record main and candidate provenance and contract counts. Create the named branch at the published candidate, merge current main with no rewrite of published history, resolve CONTRACT.md first in favor of main's newer judgments, and retain all of main's newer tests and product content.
3. Rename this round's unapplied saved-view migration from 0081 to 0082, retaining its SQL bytes. Update every saved-view migration reference and archive generation ordering after main's graph generation. Preserve the feature, currency fix, assertion behavior, all applied migration history, and main's contract text.
4. Install the pinned repository dependencies/toolchain. Reinstall the fleet hook after dependency setup. Regenerate deployment-spec.json and check it. Prove contract generation/check, restore ACCEPTANCE.md and docs/CLAIMS.md whole from origin/main, then regenerate sources.lock.json last and check it. Run the repository migration-ledger check.
5. Run only the saved-view tests touched by the original round, affected archive/migration tests, and typecheck. Record exact commands, results, limitations, and content comparisons against f15a8331 separating inherited main changes from the renumbering adaptation.
6. Complete a single new merge commit without skip-ci, inspect every candidate author/committer and trailer including side parents, and push only the named product branch with cloud-push.py. Retain all published history. Do not land, deploy, dispatch duplicate CI, or change clause acceptance.
7. Discover and poll the exact-SHA Verify run through REST using the injected bundle token, one watcher, at most one call per 300 seconds for the run, and at most ten GitHub calls. Read each failed job archive at most once if required. Report generator-view-only exceptions accurately.
8. Save a full non-secret report, actual command receipts, content diff, product push and CI receipts outside the product checkout. Publish selected actual packet files only to evidence/sd-orbit-c-f162-rebase-1 using cloud_evidence.py. Verify product custody and evidence custody independently; delete the successful product clone after publication, keeping evidence and any necessary recovery bundle.

Constraints: RECORD-014 remains PARTIAL; no status, acceptance, homepage, production, secret, mock-app, broad-suite or watcher changes. Do not write fleet lane inboxes; return POST lines in the final message. All timestamps use UTC.
