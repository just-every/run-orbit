// PENDING-BASE-2026-10-29: edition-authoring/edition-migrations.mjs:33 still
// requests Git ancestry for an unadapted copy crossing a declared migration;
// archive-source.mjs:34 correctly refuses to invent it. This release refresh
// completed after normal record-base of the byte-identical run-site singleton
// and the refreshed, unadapted foundation runtime directory. A later archive
// refresh crossing a migration can still need that explicit reconciliation.
import { existsSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { spawnSync } from 'node:child_process';
if(process.argv.length!==2)throw Error('Usage: verify-agent-door.mjs');
const entry=join(resolve('node_modules/@runeditrun/rer'),'cli/agent-door.mjs');
if(!existsSync(entry))throw Error('The installed pinned rer CLI lacks agent-door conformance. Run rer install before verification.');
const result=spawnSync(process.execPath,[entry,process.cwd()],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
