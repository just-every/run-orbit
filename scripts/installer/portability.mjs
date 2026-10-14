import { localPortability } from '@runeditrun/rer/portability';
import { remoteTransfer } from './remote-transfer.mjs';
export { default as policy } from './portability-policy.mjs';

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
 // The native transfer worker imports the policy so its row transform survives
 // the process boundary instead of being serialized as an inline object.
 const base = localPortability({ database, policyModule: new URL('./portability-policy.mjs', import.meta.url), transient: ['full-text search indexes (rebuilt from restored rows)', 'local runtime caches and logs'] });
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
