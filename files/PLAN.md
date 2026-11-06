# Exact failed-case diagnosis plan

1. Read the inline fleet rules, launcher AGENTS.md and Orbit AGENTS.md. Bootstrap only the supplied fleet Git helper.
2. Clone just-every/run-orbit shallow with blob filtering; create the named cloud branch locally from fresh main. Record candidate, original repair and main full SHAs and any main movement.
3. Use the same disposable Linux checkout, dependency pins, Node 22.20.0, pnpm 10.12.4 and /usr/bin/chromium for all three runs. Keep the committed source unchanged. Build each head as the CI shared build does, prepare isolated state, and execute exactly the one requested node test command once per head.
4. Save every per-head build, preparation and test exit/output and JSONL report. Use the process subreaper and the tests’ own recorded child-process cleanup; stop only owned processes.
5. Trace both user-visible messages through the test, route, UI resource and API paths. Compare candidate vs main, original repair vs its base, and relevant landed history to identify the smallest supported cause.
6. Re-fetch main once at the end to record movement. Produce a report and machine-readable execution receipt. Make no product/test/config/contract edits, product commits, PRs, CI reads/reruns/dispatches or release/hold changes.
7. Review explicitly selected packet files as public non-secret evidence, publish only the evidence ref, record the exact transfer receipt, then delete the disposable clone and dependencies. Relay sd and fv inbox lines in the final answer, ending Done (or Blocked if diagnosis cannot be completed).

Cloud adaptations: run directly in this dedicated VM instead of heavy-slot.py. No CI polling or GitHub log refetch is required or authorized by the diagnosis brief. Evidence publication is separately authorized by the cloud report-return instructions; it conveys no READY/landing signal.
