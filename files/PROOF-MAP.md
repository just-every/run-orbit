# Exact candidate proof map

Candidate: 7ba57f6aaa8efebf0b0493417fe6c1f8aa706572. Acceptance 1 remains partial; this map covers its saved-view limb only.

- Create populated lists: `tests/support/saved-views-proof.ts:15`.
- Persisted fresh-session reopen: `tests/support/saved-views-proof.ts:21`.
- Stale edit and delete refusal: `tests/support/saved-views-proof.ts:23`.
- Current owner filtering: `tests/support/saved-views-proof.ts:27`.
- Archived definition and value: `tests/support/saved-views-proof.ts:30`.
- Erasure freshness: `tests/support/saved-views-proof.ts:31`.
- Collaborator refusal: `tests/support/saved-views-proof.ts:38`.
- Revoked authority: `tests/support/saved-views-proof.ts:40`.
- Populated public export: `tests/support/saved-views-proof.ts:42`.
- Restore with source-session refusal: `tests/support/saved-views-proof.ts:43`.
- Saved controls and reopen: `tests/delegation-browser/typed-fields-journey.mjs:43`.
- Current archived metadata on reopen: `tests/delegation-browser/typed-fields-journey.mjs:48`.
- Current rows after insertion and erasure: `tests/delegation-browser/typed-fields-journey.mjs:49`.
- Both changed-screen widths: `tests/delegation-browser/typed-fields-journey.mjs:50`.

Native registration: `tests/core/records-complete.test.ts`, “RECORD-014 typed fields and saved filtered views retain current access, stable sort and archived meaning through export”. Two of two cases passed on Node 22.20.0.

Browser registration: `tests/delegation-browser/records-layout.test.ts`, “emitted Worker record and NOW lists wrap full valid long names and reopen sorted saved views; an invited collaborator opens only permitted mentions and survives grant revocation at 1440 and 390”. One of one passed on Node 22.20.0, with real emitted Worker documents and native Records APIs.
