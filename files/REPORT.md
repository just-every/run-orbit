# Orbit setup guides replay

Repository: just-every/run-orbit
Branch: cloud/main-orbit-setup-guides-1-c1
Base: eab0faafccd2eb0945dddb7d0f52c30ce573c04c
Prior setup candidate: b133314ee4763a909547551cad295cf41d0088c1
Prior candidate's main parent: cf44d4f851b59f2c325da13d02f07df147e4b5ee

The five setup guides have been replayed on current main. The squash applied cleanly. The result adds only the prior round's product and test changes plus its generated source lock, without importing the earlier branch's merge history. Slack retains main's declaration, restricted-detail notices, mapping and routing behavior; its only additions are the setup-help import and component. The onboarding test retains every main assertion, adding its setup-guidance import and desktop invocation. Byte comparisons confirm both preservation statements.

Scope: Slack app creation, scopes, callbacks and credentials; Mailchimp Marketing API key creation and audience selection; Twilio account credentials, voice number and trial restrictions; hosted Capture receiving-domain routing and declared deploy settings; and AI server configuration, model requirements and estimated pricing. No new account connection or live provider qualification is claimed.

All five pages expose a keyboard-operable, collapsed-by-default “How to set this up” disclosure. The browser check exercises opening and closing each disclosure while preserving its associated credential controls. Screenshots retain the five changed surfaces collapsed and expanded at 1440 and 390. Measurements show no horizontal document overflow, with all visible guidance text at least 13.8px. All 16 distinct provider reference URLs returned HTTP 200, including any redirects. This verifies page availability, not provider account configuration.

Current control labels and settings were compared with the running product and source. Slack scopes and event subscriptions match its public declaration. Mailchimp's connection and audience controls match the guide. Capture's inbound route and both secret bindings exist. AI's Responses API, Structured Outputs, low reasoning effort and pricing settings match the provider adapter. The replayed guidance helpers are byte-identical to the prior candidate.

Before/after counts: collapsed setup guidance panels 0 → 5; test registrations 198 → 198; additional qualification flows 2 → 2; total seed budget 200 → 200. No registration was added, removed, skipped or weakened. Clause counts remain 42 done / 130 partial / 32 missing (204 total); homepage claims remain 3 done / 9 partial / 0 missing (12 total). No clause status changed and no DONE claim is made. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md remain byte-identical to current main. Their hashes are in replay-receipt.json.

Local validation passed: typecheck, generated-contract check, source lock regeneration/check, test inventory, the five-panel browser check and both existing onboarding journeys (1440 and 390). The onboarding run passed 2/2 with no failures, cancellations or skips; desktop took 221 seconds and phone 192 seconds. The external browser launch override used system Chromium with --no-sandbox and changed no product file.

Product head: 64b6464fd1655d57c099a76d40cacbaf1771df2d. It is exactly one non-merge commit atop eab0faafccd2eb0945dddb7d0f52c30ce573c04c, with 13 changed files, 202 insertions and 22 deletions. The product tree matches the source tree used for browser proof. Every candidate author and committer is Run Edit Run fleet <fleet@runeditrun.com>, and no trailers are present. The named product branch was pushed successfully on the first attempt. No PR was created; the fleet owns landing. Exact-SHA Verify succeeded: run 43250871071, https://github.com/just-every/run-orbit/actions/runs/43250871071. The watcher used 6 GitHub REST calls, with at least 300 seconds between lookups. No CI rerun or repair commit was needed. There are no product blockers. The fleet still owns its independent publication scan and landing gates.

Plan and detailed evidence: PLAN.md, replay-receipt.json, test-inventory.json, browser-receipt.json, link-receipt.json and the explicitly selected screenshots. Credentials, runtime environment files, private sign-in links and raw server logs are excluded. The cloud does not run the Mac's publication scan or land on main; the fleet retains those gates.

Terminal custody: READY branch=cloud/main-orbit-setup-guides-1-c1 head=64b6464fd1655d57c099a76d40cacbaf1771df2d

All selected reports and receipts are published separately from the product branch under refs/heads/evidence/main-orbit-setup-guides-1-c1. The disposable product clone is removed after the evidence transfer succeeds; the packet stays in the fleet work directory.
