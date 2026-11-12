# Content comparison with the gate-passed f15a8331 head

The original published head is f15a833113df39d8cbfbf8ac56202d1234b0720b. The main merged for this republication is e397ddbd66ed9254302f762b7db3e831b5b72de5. Their shared ancestor is 01c15358b1bada090ebe87fe1dd9a72bf22b6082.

The original round has 23 changed paths relative to that ancestor. Excluding its migration, archive-generation ordering, generated deployment spec, and generated source lock, 18 paths are byte-identical to f15a8331. The nineteenth, src/core/features/operator/ui/records-list.tsx, is exactly Git's clean three-way merge of the round and main. All original saved-view assertions, the Value column currency formatter, and the feature code remain unchanged. content-proof.json records each file's SHA-256 and verifies this distinction.

The republication adaptation is:

- Rename migrations/core/0081_saved_record_views.sql to migrations/core/0082_saved_record_views.sql, with 100% identical SQL bytes (SHA-256 4d5c969fca698f1107f71ffc973708cec64ca8f8aa02e9a0399cb0fb5cd92100). Preserve all 76 core migration files already on main unchanged, including 0081_graph_proposals.sql. No 0083 or 0084 migration is introduced.
- Combine the two additive archive generations in real migration order: current catalog, before saved views (0082), before graph proposals (0081), then the existing notification and earlier generations. preDirectNotificationCatalog removes both later additions before reconstructing the earlier notification catalog. The actual repository path is src/core/features/records/archive-generations.ts; the brief's shared/archive-generations.ts spelling does not exist in this checkout.
- The generated deployment spec is exactly main's spec plus the saved-view migration under its new name and unchanged SQL/hash. Relative to f15a8331, main's graph migration is also present ahead of the renamed saved-view entry.
- Regenerate sources.lock.json from the merged tracked source last. Its other changed hashes reflect the inherited main updates, not additional edits by this task.

No other file contains a literal reference to the old saved-view migration filename. The archive-schema and portability policy register/exclude tables by table name, so their saved-view content is retained byte-for-byte; no test references require renaming. The Value column fix and every original test assertion are retained.

adaptation-vs-f15a8331.patch shows the actual old-to-new diff limited to the migration directory, archive generations, deployment spec, and source lock. It includes main's graph migration and inherited main lock updates and does not misrepresent those as renumbering edits. product-vs-main.patch shows the complete saved-view candidate delta against the merged main.

CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md match main exactly. Contract generation wrote zero documents and its check passed; the views were then explicitly restored from main before the final source lock. RECORD-014 remains PARTIAL. Before and after counts are unchanged: Core 42 done / 112 partial / 24 missing / 178 total; Agent surface 0 / 18 / 8 / 26; Full target 42 / 130 / 32 / 204.
