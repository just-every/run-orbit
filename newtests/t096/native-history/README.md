# Immutable native generations

The fold proofs install and execute two earlier native Orbit generations: the
accepted native main (`1cc919c0`) and launch 0013 (`f28dcf59`). `manifest.json`
records, for each commit, its Git tree and every `migrations/core` and `src`
path with the SHA-256 of its bytes; `blobs/` holds those bytes once each, named
by SHA-256. `../native-history.ts` reads them and rejects any byte that does not
match its recorded hash. The snapshot is fixed: it is never regenerated from
current source.

Each commit's `omitted` list names three generated homepage images (the solar
engravings and mountain illustration) with their SHA-256. They are not
retained: they carry third-party image-provenance metadata, and the proofs
never load them (they execute the API application, which imports no artwork).

REPORT-002 also retains the exact `migrations/core` bytes from its starting main
(`d392b7ad`) to prove the populated 0052 to 0053 upgrade. That entry has no
application or homepage assets and is fixed to that Git tree.
