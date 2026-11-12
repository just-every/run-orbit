# sd-orbit-c-f175-fix2 execution plan

Scope: just-every/run-orbit, cloud/sd-orbit-c-f175-fix2. Repair only the forward-upgrade archive generation handling for Zoom. No migration, UI change, assertion change, clause promotion, deployment, landing, main push, or tag write.

1. Initialize fleet identity, credential helper, push guard, preserving commit hooks, pinned dependency setup and isolated evidence packet.
2. Fetch main, landing branch cloud/sd-orbit-c-f175-fix1-land-6bbc45213f and v0.3.0. Start product candidate at 8e7568859399c190aad9d153f0ae0345c4f8c5e3; incorporate newer main only if it is not already included. Preserve newer main contract judgments and restore generated views from main if regeneration is needed.
3. Run the exact unmodified newtests/t096/forward-upgrade.test.ts case on the resolved head before edits. Inspect native generation reconstruction and identify the missing optional Zoom slice.
4. Make the smallest composable change to the before-generation helper. Preserve every assertion and all unrelated archive slices.
5. Re-run the exact test, migration-ledger check, deployment specification generation/check, contract generator/check (restore generated views from main), typecheck and source lock generation/check last. Record actual results separately from claims.
6. Inspect every candidate commit author, committer, and trailer, including side parents. Commit with explicit fleet environment and active cleanup hooks. Push the named branch using cloud-push.py as soon as this real commit exists.
7. Discover and poll one exact-SHA Verify via gh REST, no more than one call per 300 seconds for the run and within the ten-call budget. Fix attributable failures if possible; treat only the documented generated-view check failure as lander-deferred.
8. Save complete non-secret report and actual receipts outside product, publish explicit packet files only on evidence/sd-orbit-c-f175-fix2, and return product custody and evidence identity separately. Preserve work if any transport fails.

Claim: INTEGRATE-002 PARTIAL, points=none. GAP holds stand. No DONE or acceptance promotion.
