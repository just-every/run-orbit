# Plan

1. Start from current origin/main in a full-history Orbit clone with fleet identity and preserved repository hooks.
2. Apply only the original 3ea512a8 adoption diff without creating an intermediate commit. Keep current main's newer source, tests and contract documents.
3. Regenerate pnpm-lock.yaml using pnpm, perform a clean frozen install, inspect installed rer's changes report and keep Orbit's intentional divergence.
4. On a scratch copy, prepare a synthetic installation/archive, run the README reset/import/setup recovery and retain only non-secret product-language output and receipts in this packet.
5. Fetch and rebase onto current origin/main before the first candidate, regenerate sources.lock.json last with installed rer 0.2.113, and pass CI's exact source-lock check plus typecheck. Confirm contract documents match main and the candidate is one commit with no test/claim changes.
6. Inspect all candidate author/committer/trailer identities, push only cloud/main-orbit-rer-0213-1-c1 through cloud-push.py, and watch exact-SHA Verify through REST no more than once per 300 seconds within the ten-call budget.
7. Publish explicitly selected non-secret reports/receipts to evidence/main-orbit-rer-0213-1-c1, report product and evidence custody separately, and remove successful scratch checkouts after preservation.

No clause judgments, claims, UI, release, deployment or unrelated product changes are authorized by this brief. The fleet Mac owns the full publication scan and landing. This cloud performs touched checks and diff hygiene only.
