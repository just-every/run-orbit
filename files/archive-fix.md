# Archive compatibility repair

The preserved head adds notification_skip_form_now in migration 0092. Archive schema hashes include table triggers. The historical catalog projections carried that later trigger into older schemas, so the released-upgrade proof failed its exact schema comparison. A user importing an archive written before migration 0092 could also be refused despite having every correct table and column.

The repair declares the preceding trigger inventory as an exact supported generation, strips this later trigger before projecting any earlier generation, and keeps the full current catalog as the first candidate. It removes only the named native addition; owner tables, columns, indexes and other triggers remain bound to their original schema identity.

The existing released-upgrade journey now captures the genuine 0091 schema, upgrades with 0092, checks the exact historical catalog and manifest, admits that manifest through the authenticated Records restore HTTP API, and aborts the staging job. All earlier release, owner-column, identity, custom DDL, value and foreign-key assertions remain. No test registration is added.
