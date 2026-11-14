# Carried baseline result

The unmodified carried archive journey passed once in 3.2 minutes on main de7eb11ff23eb8db6529f6424639a094fc66460c plus the complete a35d3319..1bf610b4 patch (excluding its stale source lock). See reproduction.log.

It observed captured=do_not_contact before export and restored captured=do_not_contact, cleared=contactable, retained=do_not_contact. Thus current main can persist the reviewed clear and preserve it through restore.

The field uses useAutosave and displays queued/in-flight values before persistence. The existing journey uses toHaveValue immediately after confirming both Stop mail and Clear do-not-contact, then reads the API without waiting for the save response. The next reproduction delays only the browser's clear request by 750 ms; no server, product or stored-state behavior changes. This instrumentation is temporary and will not be committed.

Historical logs: gh run view 43604737145 --repo just-every/run-orbit --log-failed exited 0 and returned only the aggregate verify job failure (SHARDS=failure). A jobs REST read identified failed shard job 132477737270 (batch-13). gh run view 43604737145 --repo just-every/run-orbit --job 132477737270 --log-failed exited 0 with an empty body. Neither log command was retried. The brief supplies the failing assertion location and observed state.
