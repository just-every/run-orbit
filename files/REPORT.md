# Orbit Integrations API access

Repository: just-every/run-orbit
Branch: cloud/main-orbit-integrations-api-1
Product head: 8a4519f99fcee94b7753f1251a95f11667dae9ec
Verify: 42996633629, exact SHA; in progress at report creation.
PR: none; repository guidance uses the fleet branch landing gate.

## Plan and implementation

1. Reproduced both findings through the running authenticated Integrations page before editing, at 1440 and 390. There were zero API-access links and all five tool rows sat under Connected to Orbit despite no connected tools. REPRODUCTION.json and the two before screenshots contain the actual observations.
2. Added an API access card using existing Settings styles. It explains named, expiring read scope and immediate revocation, names the installation owner and links to a same-installation guide at /docs/api-credentials.
3. Published the existing API-CREDENTIALS.md through the existing docs manifest, with instructions for opening the browser console and privately copying the one-time secret. A person can find IDs, issue a deal.read-only credential, save the secret, perform a bearer read and revoke it without leaving the installation or needing Node or a terminal. The credential API and its scopes are unchanged.
4. Grouped tools using real connected/receiving states. Connected to Orbit contains only known live connections. Unconnected tools appear under Not connected, with connection setup or first booking described plainly. Twilio whose owner-only state cannot be read has a separate Connection status unavailable group; it is not guessed to be disconnected. Inline setup actions still open their existing panels. The row action text no longer wraps within words at phone width.
5. Extended the existing installed-docs navigation test rather than adding a registration. Its real native owner fixture follows Integrations into the rendered guide, executes the actual rendered JavaScript, and proves issuance 201, bearer-only read 200, revoke 200 and subsequent bearer-only read 401. It verifies that both bearer requests have no native Cookie and that credential metadata never re-discloses the secret. The guide never prints the secret. The test does not extract issued.secret from the browser console; request-header metadata is reduced to cookie-presence flags, and only non-secret paths/statuses and those flags are saved in evidence.
6. Fetched main and rebased before the first product commit. Main was unchanged. Staged the new helper before regenerating the source lock last; its documented lock/check commands passed. Inspected all candidate identities/trailers, committed as the fleet with no trailer and no skip-CI marker, and pushed the named branch through the required guard on its first attempt. No main/default branch or unrelated repository was written.
7. Exact-SHA Verify is watched through REST at intervals of at least 300 seconds with a ten-call budget. Full publication scanning and landing remain the fleet Mac's gates; this VM performed the candidate-diff credential-shaped-value check only.

## Validation and before/after

- Retained test inventory: 198 registered cases + 2 qualifications = 200 before and after; no assertion or test was deleted or weakened.
- Touched public-door test: DOCS-001 — installed docs navigation reaches every page and Integrations leads to a working scoped read credential; passed. BROWSER.log contains the final actual run.
- pnpm run typecheck: passed. TYPECHECK.log contains the actual output.
- Documented source lock and check: both exit 0; SOURCE-CHECK.json records the commands and exits.
- API access entries: 0 → 1. Unconnected or unknown-state rows under a connected heading: 5 → 0. Credential lifecycle: 201 → bearer 200 → revoke 200 → bearer 401. Actual non-secret HTTP receipt: api-guide-receipt.json.
- Browser proof: Integrations and the API guide captured at 1440 and 390. Functional assertions run once at 1440. Existing docs navigation assertions and the existing 390 docs-menu assertions remain.
- An initial full run of the touched browser file had two unchanged PUBLIC-001 Lobby failures caused by a console 404; its four other unchanged cases passed. The guide initially exposed the shared fixture's lack of administrator authority, which was corrected using a dedicated native owner fixture. The final guide test passes. No unrelated Lobby assertion was altered; exact-SHA branch Verify remains the full wall.

## Clauses and limits

CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md were not changed. Clause statuses and generated summary counts are unchanged. No DONE claim is made.

CLAIM API-002 PARTIAL points=none tests=tests/e2e/worker-smoke.spec.mjs#DOCS-001 — installed docs navigation reaches every page and Integrations leads to a working scoped read credential
CLAIM BOUNDARY-001 PARTIAL points=4 tests=tests/e2e/worker-smoke.spec.mjs#DOCS-001 — installed docs navigation reaches every page and Integrations leads to a working scoped read credential
DEFAULT API-002: Reuse the existing browser-console administration door and same-installation docs rather than add a new credential UI or API.
GAP API-002: This round proves discoverability and create/read/revoke through the guide; it does not claim the entire rotation, archive, write-race and original-resource lifecycle clause.
GAP BOUNDARY-001: This round changes connection presentation only; it makes no claim about the full cross-product buyer walk or live-provider qualification.

Reports and screenshots are exclusively in the separate evidence packet/ref. Product provenance is in PRODUCT-RECEIPT.json and PRODUCT-PUSH.log. No provider credentials, environment dumps, secret values, trace archives or held-out gate material are selected for publication.
