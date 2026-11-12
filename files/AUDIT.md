# Guest and shared-view value audit

The audit covered Shared records list/search/detail/edit controls, shared entries, collaborator field selection/confirmation, the archive panel's selected/unfinished transfers and recovery errors, and draft merge review. Permissions, archive formats and template syntax remain unchanged.

- Shared stage: stored stage identity is resolved from the permitted stage field; editable choices show stage names from that pipeline.
- Shared money: stored cents display through the owner's workspace-currency formatter. Editing uses currency units and converts at the save boundary.
- Shared dates: timestamps use the workspace clock and presentation formatter; date edits convert the workspace wall clock back to an instant.
- Shared owner and closing actor: permitted person references display their names. Editable options name active full operators while retaining the current historical attribution.
- Shared technical columns: record IDs, derived keys/revisions and unsupported raw foreign-key columns do not appear as everyday values.
- Shared custom fields: permitted typed user references resolve names; typed date/datetime fields use calendar/workspace-clock presentation. Ordinary nested custom data and import provenance stay intact.
- Shared edit confirmations: reference, money and date confirmations reuse readable values instead of echoing IDs, cents or ISO strings.
- Company references already used an independently permission-checked company-name read; their existing “not shared with you” state is retained. The existing Share Company UI issues a separate company-name grant automatically; no other company fields are granted. Direct API callers still need the independent name grant.
- Shared list/search labels already use name/title/email, never a record identity. Shared-entry dates already use workspace date formatting.
- Export/restore selected transfers and discovery buttons use transfer start time and, when available, archive row/part counts. Raw identity is available in closed support details and Copy details.
- Browser export-conflict recovery now leads through Find unfinished exports instead of displaying an ID. Terminal recovery retains its technical identity.
- Merge review labels and missing-value warnings use human field names. The library editor retains the fixed supported merge syntax.

No sharing permission, export payload, template expansion, rendered-byte snapshot, approval hash or send policy was changed.

Read-only extension of the search found report-sharing people rendered by name/email and dashboard-sharing grants rendered by person name, with a readable calendar change date. No changes were needed in those controls.
