#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
import {parseContract} from '../src/base/seed-contract.mjs';
const [command,...args]=process.argv.slice(2);if(!['write','check'].includes(command))throw Error('Use write or check with optional --clauses ID,ID.');
let contract=readFileSync('CONTRACT.md','utf8');
const rows=contract.split('\n').filter(line=>/^\| `[^`]+` \|/.test(line)).map(line=>{const c=line.split('|').slice(1,-1).map(v=>v.trim());return{id:c[0].replaceAll('`',''),kind:c[2],status:c[3],evidence:c[4],gap:c[5]};}).filter(r=>['done','partial','missing'].includes(r.status));
const selectedArg=args.indexOf('--clauses'),selected=selectedArg<0?rows.map(r=>r.id):args[selectedArg+1].split(',');for(const id of selected)if(!rows.some(r=>r.id===id))throw Error(`Unknown clause ${id}.`);
const count=own=>[own.filter(r=>r.status==='done').length,own.filter(r=>r.status==='partial').length,own.filter(r=>r.status==='missing').length,own.length];
for(const [label,own]of [['Published',rows.filter(r=>r.kind==='published')],['Target and push further',rows.filter(r=>r.kind!=='published')],['All',rows]])contract=contract.replace(new RegExp('^\\| '+label+' \\|.*$','m'),`| ${label} | ${count(own).join(' | ')} |`);
parseContract(contract);
let acceptance=readFileSync('ACCEPTANCE.md','utf8');
for(const row of rows.filter(r=>selected.includes(r.id))){const start=acceptance.indexOf(`### ${row.id} —`);if(start<0)throw Error(`Acceptance view has no ${row.id} heading.`);const end=acceptance.indexOf('\n### ',start+4),stop=end<0?acceptance.length:end;
 let block=acceptance.slice(start,stop).replace(/^Status: \*\*\w+\*\*\.$/m,`Status: **${row.status}**.`);const evidence=block.indexOf('Current evidence:');if(evidence<0)throw Error(`Acceptance view has no ${row.id} evidence.`);block=block.replace(/^Current evidence:.*$/m,`Current evidence: ${row.evidence||'No implementation found.'}${row.gap?` Remaining Gap: ${row.gap}`:''}`);
 acceptance=acceptance.slice(0,start)+block+acceptance.slice(stop);
}
let claims=readFileSync('docs/CLAIMS.md','utf8');const begin='<!-- workflow-contract-view -->',end='<!-- /workflow-contract-view -->';
const workflowRows=rows.filter(r=>['AUTO-001','AUTO-002'].includes(r.id));const view=`${begin}\n## Workflow claim boundary\n\n${workflowRows.map(r=>`- **${r.id}: ${r.status}.** Evidence: ${r.evidence}. Remaining work: ${r.gap||'None.'}`).join('\n')}\n${end}`;
const at=claims.indexOf(begin);if(at<0)claims=claims.trimEnd()+'\n\n'+view+'\n';else {const stop=claims.indexOf(end,at);if(stop<0)throw Error('Unclosed workflow claim view.');claims=claims.slice(0,at)+view+claims.slice(stop+end.length);}
let stale=false;for(const [file,text]of [['CONTRACT.md',contract],['ACCEPTANCE.md',acceptance],['docs/CLAIMS.md',claims]])if(readFileSync(file,'utf8')!==text){stale=true;if(command==='write')writeFileSync(file,text);}
if(command==='check'&&stale)throw Error('Contract views are stale. Run the documented Lander-Regenerate command.');
console.log(`Contract views ${command==='write'?'generated':'checked'} for ${selected.join(', ')}.`);
