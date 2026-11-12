# Orbit setup guidance — main-orbit-setup-guides-1

Product branch: `cloud/main-orbit-setup-guides-1`  
Product head: `2fcbf5e499bbafeaf33da00cff0dc3c25cdbeb63`  
Repository: `just-every/run-orbit`  
PR: none; this repository's supplied rules use the fleet's branch landing gate.

## Delivered

Five collapsed-by-default “How to set this up” disclosures now sit beside Slack, Mailchimp, Twilio, Capture address and Workspace AI. Slack includes app creation, actual bot scopes, both callback URLs, credentials, event subscriptions and channel membership. Mailchimp includes Marketing API key creation and audience selection. Twilio explains account credentials, a Voice-capable number, the operator phone, trial verification, costs and the automatically supplied status callback. Capture explains a receiving domain, SendGrid MX/raw MIME/signature policy, CAPTURE_MAIL_ADDRESS and SENDGRID_PARSE_PUBLIC_KEY, and the alternative Cloudflare route using its current navigation. AI identifies the private local/deploy files, key/model/rate settings, full redeploy, provider billing and the estimate formula.

The misleading promise that deploying alone makes capture.localhost receive mail has been removed. Existing manual upload, connection forms, data handling and provider behavior are preserved. Provider sources, console variants and unconfirmed live-account work are listed in PROVIDER-REVIEW.md.

## Plan and execution

PLAN.md contains the full plan. Reproduced all five findings through native owner setup before editing. Added one shared native disclosure and source-specific instructions; no new everyday top-level controls. Extended the 1440 native first-hour onboarding journey through tests/rer/setup-guidance.mjs without adding registrations or removing assertions. Ran that touched journey, typecheck, source lock generation/check and an application build. Browser proof exercises the five expanded screens at 1440 and 390. No provider account was connected, no paid call/request was made, and no deployment was performed.

Main was fetched and the unpublished work rebased before publication; main stayed at b3e94efdc16e4ae467cd2ed283ee4eb0dc4c0c31. The pre-push autostash restored tracked wiring outside the index: the first commit published the guide components, and the immediate follow-up committed and pushed their page wiring and test call. Published history was preserved. After that save, main was fetched/merged (already current). Both outgoing commits and all side parents passed fleet author/committer/trailer review; commit hooks remained active. The final head has no skip marker, and the product worktree is clean.

## Checks and counts

- Touched native onboarding: 1 passed, 0 failed; 622050 ms total. Actual command/result in onboarding-receipt.json and sanitized full log in onboarding.log.
- Typecheck passed; source lock check reports ok: true; clean application build passed on the candidate source before commit. The local native test also ran before commit; the final-tree browser proof is stamped with the pushed SHA. Exact-SHA Verify is separate.
- Test budget: 198 registered cases + 2 qualifications = 200 before and after.
- Exact final-tree browser proof: all five expanded screens at 1440 and 390, zero page errors, zero guidance accessibility violations, no horizontal overflow, text at least 13px. Screenshots mask the private Capture address.
- New setup disclosures reachable from these five pages: 0 before, 5 after. The unconfigured Capture state previously had an inline Cloudflare-only explanation; the configured local address had the misleading deployment promise and no hosting guide.
- Contract statuses: 42 done, 130 partial, 32 missing before and after. No Status, Gap or Evidence changed. No generated acceptance views committed, no DONE claim made, and no complete contract acceptance point newly claimed by this guidance-only round.
- Diff credential-shape review passed. The complete publication scan remains the Mac fleet's independent landing gate, as the cloud brief requires.

## Limitations and recovery

12ui improve required account sign-in and produced no approved image; the interface uses the existing Orbit design system. The dev runtime developed a Vite SSR reload error after autostash, so final screenshots use a fresh native dev launch of the unchanged final tree, with the application build checked separately. The preview owner-entry link did not reach Orbit’s Settings UI, so it was not used as proof. Only this task's server PIDs were stopped. Stale local-operation locks were removed only after verifying their recorded owner was this task's zombie process. These runtime/recovery details do not change product source.

Live provider account approval, DNS propagation and actual billing/connection proof remain unverified and outside this round. Product custody and exact-SHA CI status are separate from evidence publication. The pending exact-SHA Verify run is 43151925202; CI status and final custody are updated in the final report and receipts before transfer.
