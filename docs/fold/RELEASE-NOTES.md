# Orbit release candidate

Contact edits keep do-not-contact state when the field is omitted. API and CSV
updates cannot clear it; clearing it requires an explicit operator action.
Suppression follows a normalized email address through contact deletion and
recreation.

A signed inbound reply is automatically linked to a contact only when its sender
matches that contact's email address. A valid signed reply without a match is
accepted and retained unlinked. Reusing a known provider event ID with different
content records a conflict while preserving and acknowledging the accepted event.
A storage failure returns an error so the provider can retry. Signed inbound
messages have their own rate-limit allowance, separate from unsigned traffic.

Native operators retain equal full access. They can invite a separate collaborator,
choose a profile, and grant or revoke access to particular records and fields.
Collaborators must accept their own invitation. Removal revokes their sessions and
grants; another invitation and acceptance are required to return.

Reports calculate the complete permitted native CRM population. Count, sum, mean
and ratio reports disclose their period, filters, groups and missing values. Saved
results retain their source rows and revisions. Reopen, export and drilldown check
current access and source changes.

Fixed text inquiry pages have a saved revision, compiled HTML, explicit approval
and a publication receipt. An inquiry creates native contact evidence, a signal
and timeline, with optional exact consent text. Existing contacts retain their
fields and do-not-contact state. Linked open opportunities receive the native
signal evaluation. Capture does not approve or dispatch mail.

Unpublishing withdraws the public page. After withdrawal completes, the first
request to its former public link returns 404.

Finish or abort an in-progress native archive import using the installed edition
before upgrading. Migration 0016 refuses an unfinished import before any fold
changes, so the original restore and rollback procedure stays usable.

Complete archives include selected feature data and owner tables within the
source generation's allowance. Restore preserves domain evidence but requires
fresh sign-in, collaborator authorization and public publication authorization.
Binary cells and tables with 100 physical columns use the complete v3 transfer
protocol. Native v2 validation and bounds remain intact. Historical databases
already using all 100 contact columns cannot add a 101st column during an older
native upgrade; that platform refusal remains explicit.

This is a private candidate awaiting final verification, green exact-head CI,
publication-hygiene review and owner release approval. The
[qualification record](QUALIFICATION.md) separates current pending checks from
historical passing and failed evidence. It does not
add workflows, campaign engines, forecasts, FX, experiments, account graphs,
uploads, schema administration or Base operator-auth migration. No deployment,
owner tag, domain/MX change or live inbound mail acceptance is claimed.

Archive transfers reserve storage until cleanup finishes. After verifying a
download, use **Discard export** in Records before starting another export or
restore on that deployment. This also applies to a snapshot downloaded by the
CLI: find its unfinished export in Records and discard it there. The downloaded
archive remains usable; an unfinished restore must be completed or cancelled
with rollback before another transfer begins.
