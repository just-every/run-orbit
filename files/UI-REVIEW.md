# Candidate screen review

Scope: the new report-definition link inside a ready report tile's existing Basis disclosure. The continuation uses the existing text link, font and router components; it adds no icon-only control, dialog, setting or top-level action.

The actual 1440 desktop captures were inspected: the Basis link is underlined, wraps inside the tile and shows the pinned version. The report destination displays version 1 even while version 2 is available, with the original period, timezone, currency, missing-data and source-field disclosures. Existing desktop spacing remains unchanged. The long full-definition report retains existing scrolling tables; no new layout styles are introduced.

Dashboard icon-only controls already use DashboardTooltip, which delegates to ActionTooltip. Basis text is 13.5 or 14 pixels; the link inherits 14 pixels. There is no newly added one-sided border or configuration placement. Runtime keyboard checks focus Basis, open it with Enter, Tab to the link and activate it with Enter.

The 390 phone Basis capture was also inspected: tiles stack in one column, the link stays within the card and long source-field names wrap. The final runtime outcome will be recorded in RECEIPT.json. This builder review is not an independent uip gate. A fresh uip gate on the pushed head and both width captures is still required before landing.

The limited-reader destination at 390 was inspected too: it keeps version 1 while version 2 exists, shows Limited to your access, and exposes only the two permitted deals and their USD 23,000 total. Its Basis includes the original monthly boundaries, timezone, source fields and missing-data notes.
