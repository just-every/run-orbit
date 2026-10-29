import { existsSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { spawnSync } from 'node:child_process';
if(process.argv.length!==2)throw Error('Usage: verify-agent-door.mjs');
const entry=join(resolve('node_modules/@runeditrun/rer'),'cli/agent-door.mjs');
if(!existsSync(entry))throw Error('The installed pinned rer CLI lacks agent-door conformance. Run rer install before verification.');
const result=spawnSync(process.execPath,[entry,process.cwd()],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
