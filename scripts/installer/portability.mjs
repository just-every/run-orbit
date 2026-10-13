import { localPortability } from '../base-cli/cli/portability.mjs';
import { remoteTransfer } from './remote-transfer.mjs';

// Orbit's local archive uses Base portability with Orbit's own data policy:
// operator sessions, sign-in proofs and provider bindings (identity_*), rate
// limits, collaborator authority, delegation and mail-capture credentials stay
// with an installation, as in the Records archive.
export const policy = {
 product: 'just-every/sales-orbit',
 excludeTables: ['sessions', 'magic_links', 'owner_bootstrap', 'sample_seed_runs', 'public_rate_limits', 'auth_rate_limits', 'runtime_controls', 'record_erasure_signals', 'access_write_guards', 'access_invitations', 'access_grants', 'access_form_authorities', 'capture_credentials', 'capture_oauth', 'capture_locks', 'ik_%', 'crm_import_%', 'delegation_%', 'archive_%', 'identity_%'],
 derivedTables: ['record_search', 'timeline_search', 'record_search_fields'],
 // Migrations seed these rows in every empty database; the archive's rows replace them.
 replaceableTables: ['graph_workspace_epochs', 'schema_types'],
 secretColumns: { signal_sources: ['secret_ciphertext'] },
 requiredConfiguration: ['OWNER_EMAIL', 'SESSION_SECRET', 'SETUP_TOKEN'],
 // Dev personas are real operators in local dev only; an archive carries them suspended.
 exportRow: (table, row) => table === 'operators' && typeof row.email === 'string' && row.email.toLowerCase().endsWith('@dev.localhost') ? { ...row, status: 'removed' } : row,
};

// Full-text indexes are derived from restored rows inside the same local
// database once the atomic restore has committed.
const searchIndex = `DELETE FROM record_search;
INSERT INTO record_search SELECT 'contact',id,COALESCE(name,'')||' '||COALESCE(email,'') FROM contacts;
INSERT INTO record_search SELECT 'company',id,name||' '||COALESCE(primary_domain,'') FROM companies;
INSERT INTO record_search SELECT 'opportunity',id,title FROM opportunities;
DELETE FROM timeline_search;
INSERT INTO timeline_search(rowid,entry_id,body) SELECT rowid,id,payload_json FROM timeline_entries;
INSERT INTO record_search_fields(record_search_fields) VALUES('rebuild');`;

export function orbitPortability(database) {
 const base = localPortability({ database, policy, transient: ['full-text search indexes (rebuilt from restored rows)', 'local runtime caches and logs'] });
 return {
  remote: true,
  export: context => context.target === 'remote' ? remoteTransfer(context, 'export') : base.export(context),
  async import(context) {
   if (context.target === 'remote') return remoteTransfer(context, 'import');
   const receipt = await base.import(context);
   await context.store.run('Rebuilding search indexes', 'pnpm', ['exec', 'wrangler', 'd1', 'execute', database, '--local', '--persist-to', '.wrangler/state', '--config', 'wrangler.jsonc', '--command', searchIndex],
    { cwd: context.root, signal: context.signal, env: { ...process.env, RER_LOCAL_OPERATION: context.operationToken, WRANGLER_SEND_METRICS: 'false', X_LOCAL_EXPLORER: 'false' } });
   return receipt;
  },
 };
}
