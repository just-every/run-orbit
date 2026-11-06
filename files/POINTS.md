# Selected point result

PROBE OPP-001 won-close reason: authenticated POST /api/v1/records/opportunity/:id/lifecycle with state won and reason Signed, then a fresh authenticated GET /api/v1/records/opportunity/:id -> record.close_reason equals Signed.

Native proof: tests/core/signals-outreach.test.ts, registration "OUT-007 OUT-009 SEQUENCE-002 stage move, close and genuine reply end scheduled follow-up atomically; automatic reply and open report do not", lines 282 to 321; selected readback at lines 309 to 311.

The existing authenticated helper requires HTTP 200 for both lifecycle POST and record GET. The read is a new request after the write, not the write response or a local object. The reason assertion is evaluated before scheduled-message cancellation, reopening, reply replay, late dispatch, first-exit reason and outcome checks. No existing assertion changed.

Negative probe: replacing only the lifecycle close_reason storage binding with NULL causes the selected assertion to fail with null !== Signed, exit 1. The production file was restored byte for byte in a finally block and has no candidate diff. This is a temporary build probe, not a retained test registration or a CI repair.

No source defect was demonstrated in routes.ts or repository.ts; production code is unchanged. The point is newly proved in the existing public-door sanity journey. No UI, provider, migration, queue policy or new authority is introduced.

OPP-001 stays PARTIAL. The remaining omitted proof includes lost-close reason, closing operator and time, later evidence leaving the deal closed, complete queue membership and lifecycle-history reconciliation, and stage and owner preservation on reopening. Reopening retains existing eligibility rules, with no forced NOW entry. No held remainder or TEAM-005 prerequisite is released.
