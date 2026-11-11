# main-orbit-hubspot-import-1 plan

1. Initialize fleet credentials, identity and publication hooks; clone only just-every/run-orbit on cloud/main-orbit-hubspot-import-1.
2. Read repository guidance and current import implementation. Reproduce the standard HubSpot notes export through the native browser wizard and public dry-run route; delay browser scripts to reproduce source/file reset across hydration.
3. Compare HubSpot contact, company, deal and note export labels against official documentation. Add only supported-field mappings, preserve prior prepared exports, avoid inferring consent from marketing-contact status, and leave ambiguous columns for review.
4. Preserve source and uploaded files picked in server HTML until scripts attach; ensure late hydration neither resets the form nor causes a native form reload. Make the review banner describe actual planned effects.
5. Extend existing import route and browser registrations within the 200-test cap. Exercise standard exported notes through review, Apply, native timeline reads, replay and undo. Assert the browser journey at 1440; collect changed-screen proof at 1440 and 390.
6. Run touched tests and typecheck. Refresh main before publication, retain newer source/tests, regenerate the source lock last and check it. Leave contract status/gap/evidence and generated views unchanged.
7. Commit with fleet identity and hooks, inspect all candidate identities/trailers and push only the named cloud branch using cloud-push.py. Poll exact-SHA Verify via REST at intervals of at least 300 seconds within the API budget.
8. Save complete non-secret reports and actual receipts here, publish explicitly selected files to the separate evidence ref, report claims and custody, stop owned servers, and delete the pushed product clone.

# Official documentation reviewed

- https://knowledge.hubspot.com/import-and-export/export-records
- https://knowledge.hubspot.com/properties/hubspots-default-contact-properties
- https://knowledge.hubspot.com/properties/hubspot-crm-default-company-properties
- https://knowledge.hubspot.com/properties/hubspots-default-deal-properties
- https://knowledge.hubspot.com/properties/hubspots-default-activity-properties
- https://developers.hubspot.com/docs/api-reference/legacy/crm/activities/notes/guide

The environment HTTP client received HTTP 403 for direct documentation requests. The web tool successfully retrieved the official documentation. Activity date denotes occurrence time; Create date is the activity's creation time and is the requested fallback for the supplied notes export. Activity assigned to is the historical owner. Note body carries text. The API-style hs_timestamp, hs_note_body and hubspot_owner_id remain supported. Record exports retain Record ID and association columns. Marketing contact status is not an explicit subscribed permission and must not grant contactability.
