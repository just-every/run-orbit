import {relative} from 'node:path';
/** Preserve the runner's terminal totals independently of individual completions. */
export default async function* report(source) {
 let focused=false;
 for await (const {type,data:value} of source) {
  if(type==='test:pass'||type==='test:fail') {
   yield JSON.stringify({kind:'test',runner:'node:test',name:value.name,file:value.file?relative(process.cwd(),value.file):null,type:value.details?.type??'test',nesting:value.nesting,status:type==='test:pass'&&value.skip===undefined&&value.todo===undefined?'passed':value.skip!==undefined?'skipped':value.todo!==undefined?'todo':'failed',durationMs:value.details?.duration_ms??null})+'\n';
  } else if(type==='test:summary'&&value.file===undefined) {
   yield JSON.stringify({kind:'summary',runner:'node:test',success:value.success,counts:value.counts})+'\n';
  } else if(type==='test:diagnostic'&&/\b(?:only|runOnly)\b.*--test-only/.test(value.message)) {
   focused=true;
   yield JSON.stringify({kind:'focus',runner:'node:test'})+'\n';
  }
 }
 if(focused)throw Error('Focused Node tests are forbidden in verification.');
}
