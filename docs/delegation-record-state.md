# Optional handoff state observations

The protocol remains `rer-delegation/1`. A client may send
`X-RER-Record-State-Schema: crm.handoff-state/1` to `/identity` to negotiate
`capabilities.recordStateSchemas`. Orbit advertises that schema only with a
current `crm.evidence.read` grant. Unknown schema requests return 422.

Send the same header to `/evidence?target=...` or `/check?target=...` for an
existing, selected `opportunities/{id}/handoffs/{id}` target. The response adds
`recordState: {schema: 'crm.handoff-state/1', kind: 'crm.handoff', state: ...}`.
State is exactly `open`, `completed`, or `cancelled`, validated from the same
handoff row included in the revision. Terminal states are never collapsed.
Unsupported record kinds return 422; absent or unauthorized records retain
content-free denials. An absent upsert target cannot supply state.

Without the header, identity and evidence/check shapes are unchanged. This
read-only extension grants no write, mail, account activation, or additional
record-kind behavior. Native edits change current observations; immutable write
receipts remain historical attribution. Callers must separately revalidate
current authority and freshness before acting on an observation.
