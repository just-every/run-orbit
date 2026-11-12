# Plan: readable values replay
1. Initialize fleet identity, refresh the launcher, install the decrypted-bundle Git helper, cloud push guard and commit hook.
2. Clone just-every/run-orbit with full commit history. Read AGENTS.md and the supplied rules and inspect the original readable-values net change.
3. Branch from current origin/main and squash origin/cloud/main-orbit-readable-values-1-pc1. Preserve current-main behavior and every existing assertion. Restore CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md byte-for-byte from main.
4. Install and set up the pinned toolchain. Check the contract generator and test inventory. Regenerate sources.lock.json last with the documented authoring command, then run source:check and typecheck.
5. Build the app and run only affected journeys: operator UI, native archive and rollback, collaborator lifecycle, and the existing report authoring browser journey. Use Chromium /usr/bin/chromium with --no-sandbox; inspect changed-screen proof at 1440 and 390.
6. Recheck main and preserve exactly one new commit when no main drift occurs. Inspect all candidate authors, committers and trailers. Push only cloud/main-orbit-readable-values-1-c1 through cloud-push.py.
7. Use one REST watcher for exact-SHA Verify, at least 300 seconds between calls for the run and at most ten total GitHub calls. Diagnose a completed failure once per failed job and fix an in-scope failure if possible.
8. Keep actual non-secret reports and receipts outside the product tree. Publish explicit packet files only to evidence/main-orbit-readable-values-1-c1. Report clause claims and custody precisely; remove the clone after successful transfers.

# Initial findings
- Current main: eab0faafccd2eb0945dddb7d0f52c30ce573c04c.
- Replay source: d61f2aadce0a80a803ca5cc646f5aef27ee357cc.
- Squash applied cleanly. No clause-source or generated-view change.
- Net readable-values patch: 21 files. Only the source lock needs regeneration rather than reuse.
- Main has 198 registered tests and two qualification flows, total 200; this replay adds no registration.
- No new screen design is created: this task replays the existing readable-values implementation and its existing proof helpers.
