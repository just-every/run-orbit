// Orbit's local archive uses Base portability with Orbit's own data policy:
// operator sessions, sign-in proofs and provider bindings (identity_*), rate
// limits, collaborator authority, delegation and mail-capture credentials stay
// with an installation, as in the Records archive.
export default {
 product: 'just-every/sales-orbit',
 excludeTables: ['sessions', 'magic_links', 'owner_bootstrap', 'sample_seed_runs', 'public_rate_limits', 'auth_rate_limits', 'runtime_controls', 'record_erasure_signals', 'access_write_guards', 'access_invitations', 'access_grants', 'access_form_authorities', 'capture_credentials', 'capture_oauth', 'capture_locks', 'ik_%', 'crm_import_%', 'delegation_%', 'archive_%', 'identity_%'],
 derivedTables: ['record_search', 'timeline_search', 'record_search_fields'],
 // Migrations seed these rows in every empty database; the archive's rows replace them.
 replaceableTables: ['graph_workspace_epochs', 'schema_types', 'pipelines'],
 secretColumns: { signal_sources: ['secret_ciphertext'] },
 requiredConfiguration: ['OWNER_EMAIL', 'SESSION_SECRET', 'SETUP_TOKEN'],
 // Dev personas are real operators in local dev only; an archive carries them suspended.
 exportRow: (table, row) => table === 'operators' && typeof row.email === 'string' && row.email.toLowerCase().endsWith('@dev.localhost') ? { ...row, status: 'removed' } : row,
};
