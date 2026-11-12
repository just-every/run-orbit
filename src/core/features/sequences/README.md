# Sequence definitions

Open `/app/sequences` and choose **New sequence**. Add ordered email, wait, call task, meeting and manual LinkedIn steps. A new sequence is private. Each step stores one condition (`always`, `no_reply`, `no_meeting` or `task_completed`) and a delay in business days.

Email content is an authored subject and body or an authorized message-library template reference with its revision. Workspace sharing requires shared templates. References remain references: authoring does not expand merge fields or create messages. Call, meeting and LinkedIn steps hold instructions for a person.

**Save new version** appends content and the current workspace calendar without changing earlier versions. Sharing also appends a version. The calendar records the workspace timezone and selected working days. **Preview saved schedule** takes a UTC start time and shows cumulative business-day delays in that version's timezone, preserving the local clock time across daylight saving. A missing local time is refused.

The owner can share with the workspace or make the sequence private. Another full operator can create an independent private copy of a shared sequence; the copy records its source sequence and version and starts its own history. Reload after a stale-version refusal before saving again. Invited collaborators cannot read, author, share or copy definitions.

These pages save definitions only. They do not enroll recipients, send mail, create scheduled tasks, place calls, book meetings or post to LinkedIn.
