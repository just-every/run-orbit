# Development results

The first local test startup exceeded the existing 60-second D1 migration timeout before any assertion. The task-only preload raises only that setup timeout to 300 seconds; no such harness change is committed.

The initial new no-submission assertion compared the full D1 response, whose last_row_id and duration change after unrelated writes. It now compares complete outbound rows; the successful native positive send remains the control.

The first native send returned revision_conflict because the shared door consumes its reserved expected_revision before calling the tool. A required send_revision carries the same read hash to the final native fence. Both conformance and native sends now pass.

The contact merge-field fixture initially used whole-record PUT and returned 400, A contact requires a name or email. It now uses the native record editor PATCH with changed and base values. The original pending approval then refuses and a newly saved reviewed revision sends once.

The erasure probe initially replayed a retained autonomous success after native contact deletion. The call output now retains its native contact identity so the existing artifact matcher retires the outcome and replay alias. The successful final probe returns subject_erased, has no old native message history and makes no submission.

Browser fixture corrections matched the existing loopback Host admission, MCP protocol metadata, and input_required response shape. The final committed browser registration passes on the actual emitted Worker at both release widths. No product guard or existing assertion was weakened.
