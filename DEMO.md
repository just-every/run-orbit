# Orbit demo

Run `rer install`, `rer setup --owner-email you@example.com`, then `rer demo`.
The demo uses disposable `.rer/demo/` data and leaves `.wrangler/state` alone.
Stopping it discards edits; the next start creates a fresh workspace.

`src/demo.ts` loads the fictional `demoStory` accounts into real contacts,
companies, opportunities, customer signals, reviewed-outreach drafts, mailbox
history and a published walkthrough form. Scores use Orbit's normal policy.
The mailbox archive is disconnected: its historical examples never claim a live
provider connection. All example addresses use reserved example/invalid domains.

The first import of Orbit's Worker entry (`src/core/app/worker.ts`) is Base's
`withDemo`. `src/modules/demo` comes from Base tag `rer-v0.2.15`; the two
operator-auth imports use the pinned package's internal paths. Vite passes
`RER_DEMO`, persists to `RER_STATE_DIR` and installs `demoSockets()` first.

With demo mode on, sign-in and reviewed customer mail are captured in Base's
D1 development outbox. The slim Demo strip lists captured mail and refused
network calls. Hosted sign-in mail reports unavailable and its link is revoked:
Base only accepts development delivery for local sign-in. The hosted visitor is
already signed in through the signed owner claim. Gmail and Microsoft provider connections refuse before OAuth;
file capture remains usable. OpenAI assistance stays unconfigured. Base's guard
refuses external fetches and sockets, and hosted containers also deny egress.
Public forms (including `/p/team-walkthrough`) are reachable only through the
host's per-visitor demo cookie. Sending behavior outside demo mode is unchanged.

Hosted demos use the existing signed `/auth/owner-claim` route. Dispatch **Run
demo** with the `run-demo` environment: `CLOUDFLARE_API_TOKEN`,
`TURNSTILE_SECRET_KEY`, optional `RER_DEMO_OPERATOR_TOKEN`, and the
`TURNSTILE_SITE_KEY` environment variable. `test_only` selects a separate
`demo.test.run-orbit.com` host with Cloudflare's test widget keys; `remove`
removes the selected host. Production uses `https://demo.run-orbit.com/` and
real Turnstile. No repository variable enables automatic deployment.
