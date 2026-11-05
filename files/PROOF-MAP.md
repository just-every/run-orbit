# RECORD-001 proof map

Existing registration: tests/core/records-complete.test.ts line 12, calls typedFieldsProof at line 13. The helper tests/support/typed-fields-proof.ts line 8 calls recordChangesProof. The selected native flow is tests/support/record-changes-proof.ts lines 64 to 127.

R1 Contact: lines 69 to 71 create; lines 78 to 83 and 95 read exact saved fields; line 100 edits ordinary fields; lines 105 to 109 save and reload; lines 113 and 115 to 126 exercise single-field edits and preserve custom fields and associations.
R2 Company: lines 66 to 68 create; lines 78 to 83 and 94 read exact saved fields; line 99 edits name and domain; lines 105 to 109 save and reload; lines 112 and 115 to 126 exercise single-field edits and preserve custom fields and associations.
R3 USD deal: line 65 reads workspace USD; lines 72 to 75 create with explicit cents, close date, owner, company and primary contact; lines 78 to 83 and 96 read exact saved fields; lines 101 to 109 update amount, close date, title and owner; lines 114 to 126 save again through PATCH without resending custom values or associations. Lines 85 to 97 and 109 and 126 independently read the same associated identities in both directions.
R4 Authority: lines 119 to 122 refuse missing native cookie, compare complete fresh detail to its prior snapshot, then admit the authenticated edit.

No explicit mutation execution is claimed. Independent stored-response comparisons make scalar loss or substitution observable; association loss fails the exact identity projections. This proof does not change authority, erasure, replay or provider implementation.
