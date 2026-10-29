# Personal Slack mentions

The installation owner connects the Slack bot under Settings → Slack sales notices, sends an allowed-field notice to bind the app identity, then explicitly maps a Slack user ID to an active full Orbit operator. An email address never supplies the mapping. Personal DMs require the bot scopes `users:read`, `im:write`, `im:read` and `chat:write` as well as the existing channel configuration scopes.

Each mapped operator chooses Settings → Your Slack mentions and opts in for themselves. The preference applies to new mentions in notes, logged calls and meetings, task notes and internal handoffs. It does not send earlier mentions. The notifications inbox links to this preference.

A DM contains a generic private-entry notice and a link requiring Orbit sign-in. Entry text, customer names, contact details and amounts stay in Orbit. The recipient must remain an active full operator with current record access and the same current installation mapping. Team and restricted-role audiences remain unavailable here.

Settings shows queued, acknowledged, failed, uncertain and withdrawn delivery attempts. Slack acknowledgment means the provider accepted the submission, not that a person received or read it. Only an explicitly failed attempt offers Retry failed mention. A timed-out or interrupted submission stays uncertain and is never resent automatically. Rate limits wait for the provider's retry time and recheck eligibility before another attempt.

Opting out withdraws pending mentions. Deleting a mention source withdraws an undelivered notice; erasure removes its local history. Changing the identity mapping or reconnecting Slack requires fresh personal opt-in. Both Records archives and CLI archives retain history while restoring personal preferences disabled and pending deliveries held. Reconnecting and opting in does not replay that held history.

Email, mobile push, personal task reminders, daily digests and assignment DMs remain unavailable. This native Slack flow has network-edge qualification; real opted-in Slack delivery still needs an authorized provider journey.
