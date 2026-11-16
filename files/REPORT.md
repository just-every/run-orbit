# Orbit 0.4.11 metadata candidate

Author: sd (Run Edit Run fleet), 2026-11-16T12:17:33.264678+00:00 UTC.

Repository: just-every/run-orbit
Branch: cloud/sd-orbit-release-0-4-11
Head: a4fcbfcd72fa4253826f43d0b0de02275094f86d
Base: ca63c4ad3230d54e03535767a7bdfb564dfa5e4f
PR: none; no PR requirement is declared in AGENTS.md and this builder does not self-submit.

## Plan and result

The complete plan is in PLAN.md. All implementation steps are complete: fleet setup, declared-repository clone, fresh-main inspection, metadata preparation, source-lock regeneration last, local checks, fleet identity/message inspection, and one guarded product push. Exact-SHA Verify and separate evidence publication are tracked below and in their actual receipts.

Five landed commits over v0.4.10 were inspected (landed-commits.txt and landed-diff.txt). Main remained ca63c4ad3230d54e03535767a7bdfb564dfa5e4f at both fresh fetches. Before editing, Git advertised no v0.4.11 tag and the GitHub Releases list contained no v0.4.11 Release; latest was v0.4.10, published 2026-11-15T13:47:13Z. No tag or GitHub Release was created or moved.

The candidate moves package.json, seed.json and RELEASE.json from 0.4.10 to 0.4.11. RELEASE.json records previousVersion 0.4.10 and the UTC date. CHANGELOG.md adds truthful notes from the actual landed diff: confirmed capture setup and unlinked evidence review; readable imported customer records and current owner names; customer import fields retained without operator metadata exposure; readable evidence, draft and dashboard labels; cross-pipeline deal moves with follow-up warnings and history; optional leading slash for form paths; deal form workflow events and submitted values; workspace workflow time display; and Slack personal-recipient scope guidance. Existing incomplete features and erasure limitations remain explicit. RELEASE.md was absent and is added as explicitly requested, with matching notes, update guidance and a no-migrations inventory. Historical changelog sections remain intact.

package-lock.json is absent; the repository uses pnpm-lock.yaml. That lock is unchanged. @runeditrun/rer is exactly 0.2.113 in package.json and in the pnpm lock. No dependency or identity was changed.

Migration inventory from v0.4.10 to inspected main: none (migrations/ and schema/fold/ unchanged). RELEASE.json migrations is therefore empty, rather than repeating 0091/0092 from the prior release. Existing migrations and their ledger must be retained. No new provider setting is required for existing features. Optional Slack personal mentions require im:read alongside im:write as documented by landed source.

## Scope and counts

Six product files changed: package.json, seed.json, RELEASE.json, RELEASE.md, CHANGELOG.md and generated sources.lock.json. No homepage, README, runtime, test, contract, generated acceptance view or claims changes are in this candidate. Source lock regenerated last with the documented command; check passed.

Before and after: Core 42 DONE / 112 PARTIAL / 24 MISSING (178 total); Agent surface 0 / 18 / 8 (26 total); overall 42 / 130 / 32 (204 total). Clause status changes: none. No clause claim is made by this release metadata round. Tests added/removed/weakened/skipped: 0 / 0 / 0 / 0.

## Validation and custody

Checks passed: RELEASE and SEED schemas, pnpm typecheck, pnpm check (rer check), contract-docs check, documented edition-authoring source-lock check, staged and unstaged whitespace checks, changelog/RELEASE note consistency, version agreement, unchanged dependency lock, exact rer pin agreement, and no migration/contract/prose-contract diff since v0.4.10. Actual command receipts are in checks.txt, checks-receipt.json and source-lock-check.json. Final checked toolchain: Node 22.20.0 and pnpm 10.12.4. The supplied toolchain initially kept preinstalled Node 24.19.0; exact Node 22.20.0 was then installed and all recorded candidate checks passed with that pin.

Fresh-main synchronization was completed before the first product commit using rebase --autostash with explicit fleet identity; origin/main was unchanged. Metadata staged before source-lock generation. All candidate authors and committers are Run Edit Run fleet <fleet@runeditrun.com>; messages contain no trailers. Clone-local fleet hooks remain active and preserve repository hooks. Product commit has no skip-CI marker. Product push succeeded on attempt 1 through cloud-push.py; the checkout was clean afterward. See product-push.txt, product-receipt.json and candidate-identities.txt.

This is a metadata-only change, so no UI browser proof, provider setup, local full verification or new tests were run. The Mac-only full publication scan is deferred to the fleet's landing gate as explicitly required by the cloud assignment; it cannot run on this VM. The cloud review found no credential-bearing material in the selected product changes or report files. No landing, tag, Release or deployment is claimed.

## Exact-SHA CI

Verify run 43865054949 completed successfully on a4fcbfcd72fa4253826f43d0b0de02275094f86d. The final REST response was received at 2026-11-16T12:41:42.406877Z and records status completed, conclusion success and the full candidate SHA. URL: https://github.com/just-every/run-orbit/actions/runs/43865054949.

One watcher made the discovery and five status reads, spaced more than 300 seconds apart. Together with the release-preflight read, seven of the ten allowed GitHub calls were used. No workflow was dispatched or rerun. No failed-job log reads were needed. Actual responses and command/timing receipts are retained in ci-discovery.json, ci-poll-1.json through ci-poll-5.json and ci-final.json. The approximately 25-minute observation window exceeded the reference's ten-minute CI target; no claim is made about job duration because this task queried the permitted run-summary endpoint only.

## Terminal result and return

Product branch cloud/sd-orbit-release-0-4-11 is pushed at a4fcbfcd72fa4253826f43d0b0de02275094f86d with exact-SHA Verify success. Local checks passed. Blockers: none. Version before/after: 0.4.10 → 0.4.11; previousVersion: 0.4.10; rer: unchanged 0.2.113; migrations introduced: 0; clause status changes: none; overall counts before/after: 42 DONE / 130 PARTIAL / 32 MISSING (204 total). PR: none. No tag, GitHub Release, main push, self-submission or deployment was performed.

The complete report and actual receipt files are retained outside the product checkout under /home/agent/rer-consolidation/work/sd-orbit-release-0-4-11/packet/. They are explicitly selected for separate publication to refs/heads/evidence/sd-orbit-release-0-4-11. Evidence publication is transport only, and does not replace independent acceptance or landing gates. Publication's exact EVIDENCE ref/head and the transport receipt are returned separately after the report-only commit is sent. After a successful evidence transfer, the pushed product clone is removed as instructed; this packet remains.

POST lanes/sd/INBOX.md: sd-orbit-release-0-4-11 prepared 0.4.11 from 0.4.10; unchanged rer 0.2.113; 0 new migrations; no clause status changes; counts unchanged 42 DONE / 130 PARTIAL / 32 MISSING. Product SHA a4fcbfcd72fa4253826f43d0b0de02275094f86d; exact-SHA Verify 43865054949 success; metadata-only six-file candidate. No tag/Release or self-submission. Full plan/results and receipts returned via evidence/sd-orbit-release-0-4-11.

READY branch=cloud/sd-orbit-release-0-4-11 head=a4fcbfcd72fa4253826f43d0b0de02275094f86d

Signed sd (Run Edit Run fleet), 2026-11-16 UTC.
