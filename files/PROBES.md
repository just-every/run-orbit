# Public-door probes on the exact candidate

Candidate: 34171c0c784ef3271537ed7adba7b92d8d7484e6.
These are the actual outcomes asserted by the successful native registered journey, not additional test registrations. Its exit was 0, one case passed and no case failed. Whole acceptance points remain unclaimed because of the held limbs.

PROBE SEQUENCE-001 1: POST /api/v1/sequences with email, wait, call, meeting and manual LinkedIn definitions -> 201, private version 1, exact ordered authored steps and the workspace calendar. Another full operator cannot read this private definition (404), and an accepted invited collaborator is refused authoring (403). Unsupported condition, negative delay, CC input and unsupported automatic LinkedIn kind each return 400.

PROBE SEQUENCE-001 2: POST the sequence share door -> 200 with workspace visibility and a new version; PUT the current definition -> 200 with version 3 and unchanged earlier versions; PUT the stale version and stale share -> 409. Another full operator copies version 3 -> 201 with a new private identity, its own version 1 and source identity and version. Editing the copy creates its version 2 and leaves the source byte-equivalent. A collaborator is refused edit, share, copy and reads (403); a revoked full-operator session is refused copy (401).

PROBE SEQUENCE-001 calendar: POST the preview door with startAt 2030-03-08T14:00:00.000Z and stored America/New_York working days Monday, Wednesday and Friday -> 200; the five cumulative due instants are 2030-03-08T14:00:00.000Z, 2030-03-11T13:00:00.000Z, 2030-03-13T13:00:00.000Z, 2030-03-15T13:00:00.000Z and 2030-03-18T13:00:00.000Z. Tuesday, Thursday and weekends do not consume business days, and 9am local time is retained across US daylight saving.

PROBE SEQUENCE-001 content: POST an email definition referencing an authorized shared OUT-014 template and its revision -> 201 with only the unexpanded reference. A stale library revision returns 409. Authoring records no outbound message, record-mail outbound message or sales task, and captured mail and provider submission counters remain zero.

PROBE SEQUENCE-001 custody: export the populated Records archive -> 201, format version 3, 130 tables and 36 rows; restore through the native Records door -> the full current sequence, prior versions and calendar history compare equal. The local CLI archive round trip retains both sequence tables, including copy source and independent version history. Restored outbound-message inventory remains empty.
