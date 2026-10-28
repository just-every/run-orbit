// PENDING-BASE-2026-10-28: normal verification also reaches a managed-mail
// declaration conflict: cli/deploy-variables.mjs:56 refuses the public MAIL_FROM
// and deploy-secret overlap, while modules/delivery-producer/mail.mjs:39 requires
// public MAIL_FROM. Preserve managed packaging and native sender-secret updates
// until Base aligns these contracts; neither check is waived here.
// PENDING-BASE-2026-10-28: full-record --base-archive refresh still calls
// edition-authoring/edition-migrations.mjs:33 for ancestry; archive-source.mjs:56
// refuses history. The door can be recorded from the published release archive.
import { existsSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { spawnSync } from 'node:child_process';
if(process.argv.length!==2)throw Error('Usage: verify-agent-door.mjs');
const entry=join(resolve('node_modules/@runeditrun/rer'),'cli/agent-door.mjs');
if(!existsSync(entry))throw Error('The installed pinned rer CLI lacks agent-door conformance. Run rer install before verification.');
const result=spawnSync(process.execPath,[entry,process.cwd()],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
