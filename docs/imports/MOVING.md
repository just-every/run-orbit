# Move customer records into Orbit

Open Records, expand the import and export tools, then choose Move in customer records. Choose the source, select CSV files, check which column holds each detail, and run a dry run. Give the import a name, such as “Old CRM”, and use the same name every time you import an updated file from the same place: Orbit then updates the records it imported before instead of adding them twice. Re-importing an unchanged file changes nothing; changed files and records you edited in Orbit always go through a new review and are never silently overwritten.

Orbit accepts up to five files, 1,000 rows and 2 MB per file, with 100,000 characters per cell. Use UTF-8 CSV, quoted multiline text and unique headers. Export columns vary by vendor settings, language and custom fields: presets only fill the headers they recognise, so check every other column yourself. When one cell lists several IDs, choose the character that separates them. Orbit never links records by company or person name. A contact or deal has one company; choose a primary company before import if the source has several. Deals can link several contacts. Notes can link contacts, companies and deals. Include the linked records in the same import.

## Your own spreadsheet

Choose **Generic CSV** for a sheet from your own records. A contacts file with `email,name,company` headers maps automatically; check or change those choices before the dry run. The `company` column creates one company for each different name in this import. It does not merge with a company already in Orbit that has the same name; choose a company ID column instead when you also import a companies file with IDs.

Every other column in a generic spreadsheet comes in as a custom field with the column’s name, for example `Seats`; whole numbers and decimals become numbers. Under **Other columns in this file**, choose **Leave out** for any column you do not want. Columns you leave out stay only in Orbit’s private copy of your file. For HubSpot and Pipedrive exports, other columns start as Leave out.

Contacts need no ID column when every row has an email address: Orbit recognises each contact by email (ignoring capitals and spaces) when you import again. Rows with a missing or invalid email are not imported. Keep the import name and the emails the same when you re-import; file names and row order do not matter. If addresses may change, choose your own ID column from the first import. A chosen ID column with an empty cell is not imported. Companies, deals and notes always need an ID column, as do HubSpot and Pipedrive records. Generic CSV gets the same review, Do not contact safeguards and undo as vendor exports.

Orbit emails only people who agreed to it. Unless your file has a permission column saying `subscribed`, new contacts are marked **Do not contact**, and the review says how many. If you have their permission, choose **I confirm they agreed to hear from us** before the dry run.

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
