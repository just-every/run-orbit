# CI observation recovery

The first exact-SHA Actions discovery command returned successfully from gh. The task's initial log sanitizer treated compact JSON URLs as unquoted text and damaged the response, producing JSONDecodeError: Unterminated string starting at line 1 column 10590 (char 10589). This was a local observation failure, not a workflow verdict or a GitHub rejection.

The sanitizer now parses successful JSON before sanitizing string values, keeps stdout separate from stderr, and preserves valid JSON encoding. The single watcher resumed using the first call's recorded time and does not issue another run/discovery request until at least 300 seconds have elapsed. The initial call counts against the ten-call budget. No product commit or published history changed during this recovery.
