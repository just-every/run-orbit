# Before-change observations

Initial main a35d331920a4bace2548bbd0efaf9344ffcd32a6. The extended Settings Data browser journey created a company, known contact and deal through the public workbench, imported an ICS, accepted its proposed link, opened Brief > Plan this meeting and created the unknown exact-address attendee. The new contact read contactable rather than do_not_contact. The first behavioral assertion failed on initial main.

An isolated Records API stop/clear and native archive restore probe returned source active suppression count 0 and restored contactable, active count 0; both anonymous stop and clear receipts were retained. This probe uses synthetic data and is diagnostic only. The browser Settings archive path is tested separately.

Two initial harness issues were corrected before the final test: first-run setup was already initialized by the isolated dependency fixture, and the separate source browser context needed explicit download acceptance and a native loopback session cookie. These are harness setup failures, not product findings.

The complete Settings Data browser move reproduced the meeting-plan contactable default. It did not reproduce cleared-contact drift on fresh target main: the downloaded archive held the known contact as contactable, and restored UI and API both returned contactable with the original Contactability Cleared timeline entry. The initially unheld captured contact likewise returned contactable, proving the restore followed its archived current state.

The restore code explicitly reapplies active anonymous destination suppression proofs even to an archived contactable contact. That protective branch originally updates the contact without recording a reason in that contact history or explaining the permission exception before restore. The journey now also creates and erases a stopped target contact through public Records APIs before restoring a different archived identity at that address, to exercise the protective exception.

The public retained-stop reproduction failed exactly on the missing contact history event. Observed source captured permission after the meeting fix: do_not_contact. Restored captured: do_not_contact; restored explicitly cleared: contactable; restored separate destination stop: do_not_contact. The last contact had no restore-hold timeline event. This verifies the unaccounted protective override before the history/disclosure fix.
