# Preserve fresh-main evidence and gaps

Main c01084f133af9aa484a6c1f5151a4e9cfbc7230f

## OUT-032

Main status: partial

Main Evidence: `src/core/features/outreach/opt-out.ts`; `src/core/platform/outbound-mail.ts`; `src/core/platform/managed-outbound-mail.ts`; `src/core/features/operator/ui/opt-out-settings.tsx`; `src/core/features/operator/ui/draft-opt-out.tsx`; `tests/core/outbound-boundaries.test.ts`; `tests/evidence/contract/OUT-020/`; `tests/core/capture-upgrade.test.ts` — CAPTURE-007 OUT-032 the capture migration upgrades a store from the previous main with every prior row and queue unchanged; `newtests/t096/browser-journeys.test.ts` — OUT-032 established opt-out upgrade (the native emitted Worker registration), using `newtests/t096/browser-opt-out-upgrade.ts`

Main Gap: Established upgrades keep one-to-one opt-out on with the retained basis visible in authenticated Settings and after page reload; historical approval bytes and state remain unchanged with no provider submissions. Remaining unproved execution: connected mailbox, sequence, batch and workflow paths preserving the exact reviewed opt-out choice, with OUT-013 owner-consented mailbox replies and Base relay sequence proof, OUT-019 Base relay recipient support (one To today), and OUT-013, OUT-019, SEQUENCE-001, SEQUENCE-003 and AUTO-001 prerequisites retained; AUTO-001 retains its ambiguous remainder after one continuation. Asserted in the retained outbound boundary journey: new-installation off default, pre-setting approvals retaining opt-out, SendGrid-to-relay exact header and link continuity, explicit off, historical transport refusal, unsupported review and dispatch refusal, and audited Settings refusal counts.

All other rows, full evidence, gaps and provenance are saved byte-for-byte as parsed fields in contract-state.json. This reviewer authorizes no replacement of newer-main text.

The merge also retains the newer main assertions and helper source in newtests/t096/browser-journeys.test.ts, newtests/t096/browser-opt-out-upgrade.ts, tests/core/capture-upgrade.test.ts and tests/support/prior-capture-upgrade.ts. Preserve current main's isolated-database helper judgments while resolving the OUT-011 persisted restart addition; the source uses a 120-second migration bound and quieter captured migration output, while main presently uses 60 seconds and pipe output. Do not lose close and reopen behavior. The exact newer diffs are included in newer-main-browser-assertions.diff and newer-main-core-assertions.diff. They are inspection and preservation context, not another clause judgment.
