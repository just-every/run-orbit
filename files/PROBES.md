PROBE INTEGRATE-009 atomic action consumption: signed POST `/api/v1/slack/actions` with an unused issued orbit_task action and a real D1 task-insert abort -> HTTP 200 with generic acknowledgment; after awaited background completion, token unconsumed and unattributed, prior notice unchanged, complete action, task, series, timeline and runtime guard inventories unchanged. Removing the trigger and resubmitting that same issued action creates one mapped Slack task and one consumption. Replaying with a changed Slack timestamp leaves the consumed token and complete effect inventories unchanged.

Proof: `tests/support/slack-actions-proof.ts:15-45`; signed public-door transport and awaited background completion: `tests/support/slack-notices-proof.ts:15-18`; invoked by `tests/core/source-onboarding.test.ts:13`.
Candidate: 577549de0ddac57a921f664e290bf6176682fb28
Local touched command: pnpm exec tsx --test --test-concurrency=1 tests/core/source-onboarding.test.ts
Result: exit 0, 3 passed, 0 failed. Source bytes match this candidate. Only Slack and mail provider network edges are replaced; native auth, Hono route, migrated D1, transaction and task storage are real.
