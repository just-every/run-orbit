# Scheduled Slack notice

The Schedule dialog keeps the accepted Tile board form parts, order and tokens. Slack is a separate destination. The installation owner selects Dashboard ready on a channel, saves a schedule version, then explicitly enables that saved version. Email stays paused. A save, restore, reconnect or safety suspension requires explicit enablement again; old occurrences stay held.

Retained differences from SPEC-DASHBOARD section 7: day and time remain separate controls with a timezone sentence; the dialog scrolls internally; the email access note remains conditional while no sender exists; attachments remain disabled. Slack-only attempts use the specified Queued, Sent, Failed and Uncertain pills, with explicit Rate-limited and Paused labels where applicable. No email recipient counts are shown for Slack. The new enable/pause action and its state note sit after Slack channel, using existing form controls. The shared tooltip covers Close dialog and Remove person in dashboard dialogs; the Slack settings controls already have visible action labels.

New or changed visible strings (placeholders name current runtime values):

- “Dashboard ready”
- “Send stage moves, wins, due work, internal handoffs and dashboard-ready notices. Dashboard-ready notices contain only the event kind and an authenticated Orbit link; no dashboard name, figure, count or attachment.”
- “Slack receives only a dashboard-ready notice with a sign-in link.”
- “Slack paused · {reason}”
- “Pause Slack schedule”
- “Enable saved Slack schedule”
- “Enable applies to the saved schedule version. Saving changes pauses Slack again. Email recipients do not determine the Slack audience.”
- “Email paused: dashboard email needs a system notification sender. The managed relay cannot carry attachments. Slack is a separate destination and must be explicitly enabled by the installation owner.”
- “Rate-limited”, “Paused”, “No Slack delivery attempts.”
- “Remove person” (tooltip and accessible name); “Close dialog” reuses its existing accessible name as a tooltip.

New validation, suspension and history reasons, also shown when relevant:

- “Choose an email recipient or a Slack channel.”
- “Only the installation owner enables Slack schedules until TEAM-005.”
- “Schedule changed. Reload before enabling.”
- “Choose an eligible channel with Dashboard ready routing, then save the schedule.”
- “Every saved schedule version starts paused. Enable Slack explicitly.”
- “Paused by installation owner”
- “Slack disconnected; enable the saved schedule again after reconnect.”
- “Dashboard-ready routing paused; enable the saved schedule again.”
- “Slack credentials revoked; reconnect and enable the saved schedule again.”
- “Slack reconnected; enable the saved schedule again.”
- “Channel safety changed; enable the saved schedule again after confirmation.”
- “Slack revoked; reconnect and enable the saved schedule again.”
- “Slack processing failed; enable the saved schedule again after resolving setup.”
- “Slack destination unavailable; enable the saved schedule again after confirmation.”
- “Dashboard or owner access unavailable; enable the saved schedule again after resolving access.”
- “Schedule authority changed; historical notice held”
- “Schedule changed; historical notice held”

“Explicit owner enable” is the new audit reason. “Slack scheduled; email paused”, the schedule heading, attachment labels, access note, existing Slack transport errors and Queued/Sent/Failed/Uncertain labels are reused.

sd-orbit-c24 (25 Oct 2026), Tile board UI round: the remove buttons on grants and recipients are named for their person ("Remove {name}") with the same tooltip; the Slack helper is now one sentence, "Saving a new schedule version pauses Slack until it is enabled again."; the email-paused text is a neutral state with an info icon rather than an error box; delivery pills carry an icon and "Paused" is neutral; Day and Time sit under "Every {day} at {time}, {zone}" with the calendar icon. The Slack status strings, buttons and the email-paused sentence are unchanged.
