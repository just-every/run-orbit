# Move customer records into Orbit

Open Records → Move in customer records. Choose the source, select CSV files, then review the mappings and run a dry run. Give the source workspace a stable account label; use that label again on every re-import. The same source IDs retain their identity. Re-importing unchanged files is idempotent; changed source content or native edits require a new review and are never silently overwritten.

Orbit accepts up to five files, 1,000 rows and 2 MB per file, with 100,000 characters per cell. Use UTF-8 CSV, quoted multiline text and unique headers. Export columns vary by vendor settings, language and custom fields: presets only fill labels they recognize. Explicitly select every other column and the separator used between association IDs. Never join by company name or person name. A contact or deal can have one company; choose a primary company before import if the source has several. Deals can link multiple contacts. Notes can link contacts, companies and deals. Include the referenced records in the same import.

## Your own spreadsheet

Choose **Generic CSV** for a sheet from your own records. A contacts file with `email,name,company` headers maps automatically; review or change those mappings before the dry run. The `company` column creates one source company per identical name in this source account. It never matches an existing native company by name. Map `company_ids` instead when supplying a companies file with explicit IDs.

Contacts need no ID column when every row has a valid email. Orbit derives a stable source identity from the exact email, lowercased with surrounding whitespace removed, and records the source as Generic CSV. Rows with missing or invalid emails are rejected. Keep the source account label and email stable on re-import; file names and row order do not define identity. If addresses may change, supply and map your own stable `id` column from the first import. A mapped but empty ID is rejected. Companies, deals and notes still require explicit stable IDs, as do HubSpot and Pipedrive records. Generic CSV uses the same saved review, contactability safeguards and undo as vendor exports.

## HubSpot

Export Contacts, Companies and Deals separately, including Record ID, the selected properties, associations and all associated records. Keep unsubscribed contacts in the export. Select English headers if using the preset. Include email information such as Unsubscribed from all email, hard bounce reason and quarantine flags. Map any additional email-type opt-out field into the do-not-contact field, consolidating multiple positive opt-out columns before upload when necessary. Company name on a contact is not its actual company association.

Ordinary Contacts, Companies and Deals CSVs do not include complete note history. Prepare a separate notes CSV from an authorized activity export or your own notes export: Note ID, hs_note_body, hs_timestamp, hubspot_owner_id, Contact IDs, Company IDs, Deal IDs. This is an Orbit preparation recipe, not a promise about native export headers. The timestamp is the note's actual occurrence time. Notes import as literal text; HTML is not executed.

Official references: [record exports](https://knowledge.hubspot.com/import-and-export/export-records), [contact properties](https://knowledge.hubspot.com/properties/hubspots-default-contact-properties), [contact data export](https://knowledge.hubspot.com/import-and-export/export-contact-data), [notes fields](https://developers.hubspot.com/docs/api-reference/legacy/crm/activities/notes/guide).

## Pipedrive

Export People, Organizations, Deals and Notes separately under Tools and apps → Export data → CSV. Include system IDs and linked-record IDs. The documented English ID labels include Person - ID, Organization - ID and Deal - ID. Other selected headers vary; map them explicitly. Export notes separately with their note ID, content, occurrence time and linked records. Include people without deals.

Map the primary email's Marketing status to permission and custom do-not-contact fields to do-not-contact. Unsubscribed or bounced addresses remain stopped. A People export does not establish that independently retained email suppression statuses with no surviving person are complete; supply a separate suppression CSV from your available suppression source too.

Official references: [export data](https://support.pipedrive.com/en/article/exporting-data-from-pipedrive), [system IDs](https://support.pipedrive.com/en/article/updating-pipedrive-data-with-a-spreadsheet), [marketing contacts](https://support.pipedrive.com/en/article/campaigns-marketing-contacts).

## Suppression, review and undo

The separate suppression CSV needs an Email column; map its header if different. Any malformed suppression address blocks application of the whole import until corrected. Positive do-not-contact, bounce and quarantine values win over permission. New contacts are held as do-not-contact by default. An explicitly mapped permission value `subscribed`, or an explicit per-import contactability choice with your attestation that you may contact these people, makes a new imported contact eligible for later operator review. Review this choice before the dry run. The attestation applies only where no permission value is supplied. Missing permission never grants contactability on its own; explicit pending, unknown and no-consent values remain held. Existing do-not-contact stops, unsubscribes, bounces and quarantine always win.

Dry run writes no customer records and sends no messages. It retains a private review and the uploaded bytes so Apply can use the exact reviewed result. Every rejected source row has its file, row and reason. Mapped source owners, stages and descriptions stay as historical evidence; unmapped columns remain only in the private uploaded source. You map source deal stages to existing Orbit stages; source owners never gain an operator identity, invitation or access grant. Existing native identities are associated without replacing their fields. New opportunities have no score, queue action or approved mail.

Application first commits all suppression evidence atomically. Until that succeeds, native contact creation and mail approval/dispatch stay blocked. Stops update contactability revisions and cancel queued or scheduled work. If application fails part-way, reopen its review to continue explicitly or undo. The application never retries a provider send.

Undo uses Base import-kit's recorded before images and ownership. It removes unchanged imported records, associations and notes, preserves native edits and their required records, and removes only the import's own suppression proofs. Independent operator/provider suppression remains. Suppression is one atomic safety group: if later records or edits depend on a hold, undo conservatively retains that group and reports the retained effects. Cancelled work is never revived. Re-imported jobs that reused another job's data cannot undo that job's effects.

Deleting a contact withdraws affected source copies and review uploads; affected pending reviews must be recreated from current source data. Other imported rows that mention the contact's mailbox, including rejected rows and kept companies or deals, lose their retained source too, and any uploaded file containing it is withdrawn; Orbit redacts the mailbox from those kept records, and import undo then leaves them in place. Import status and safe undo remain available. Related imported notes are erased with their attributed contact. Anonymous stop proofs remain.

Import source bytes, reviews, job authority and live undo metadata are private to this installation and excluded from Records and local installation archives. Native records, their inert provenance and keyed suppression proofs remain portable. Reconnecting providers and fresh sign-in remain separate recovery steps.

For SendGrid unsubscribe reflection, configure Orbit's trusted product-scoped event relay (RER product `orbit`) or the native verified webhook. Provider-side suppression alone cannot update Orbit. The signed relay must forward unsubscribe/bounce events with the Orbit delivery correlation; forged posts are rejected. No shared provider webhook setting is changed by this importer.

These recipes were checked against official documentation on 12 October 2026. Validation uses synthetic vendor-shaped CSVs, including the separately prepared notes/suppression recipes. No real vendor account or real customer export was supplied; real-export roundtrip remains unverified.
