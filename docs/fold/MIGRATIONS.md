# One forward migration sequence

Main's migrations 0001–0015 retain their original names and exact bytes. In
particular, main's 0013 remains delegation handoffs; the expansion's different
0013 provider-connections migration is not substituted or replayed.

The selected expansion schema follows main as 0016 collaborator access, 0017
native graph projections, 0018 analytics events, 0019 fixed publication and 0020
archive generation. These adapters include only the selected reports, roles,
field access and fixed public-form consumers. Workflows and account graphs remain
excluded. The [operation map](migration-operation-map.json) documents each
original SQL operation and its selected adapter or exclusion; the
[path map](path-map.json) records the original files and the copies the merge made; the public release carries neither the copies nor the research captures it lists.

The original expansion SQL, which only the private merge history keeps, is not an
executable second migration sequence. This preserves any historical applied
expansion bytes without claiming that no expansion installation ever existed.

Finish or abort a pre-fold archive import using the installed version before
upgrading. Migration 0016 refuses an unfinished import before changing the fold
schema. The upgrade test starts from main's exact migration bytes with realistic
data; the archive test exports with the original main implementation and restores
with the folded implementation. An empty-install test applies the full sequence.
