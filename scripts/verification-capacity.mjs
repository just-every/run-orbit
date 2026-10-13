import {readFileSync,statSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';

/** The unchanged capacity program writes these only after the actual assertions. */
export function checkCapacityResult(run,notBefore){
 if(!Number.isFinite(notBefore)||!run||run.startedAt<notBefore||run.exitCode!==0||!Number.isSafeInteger(run.startedAt)||!Number.isSafeInteger(run.finishedAt)||run.finishedAt<run.startedAt)throw Error('Full-capacity release qualification did not complete.');
 for(const file of ['records-capacity.json','records-capacity-d1.json','records-capacity-d1.jsonl']){
  const stat=statSync(`verification/${file}`);
  if(!stat.isFile()||!stat.size||stat.mtimeMs<run.startedAt||stat.mtimeMs>=run.finishedAt+1)throw Error('Missing or stale full-capacity artifact.');
 }
 const capacity=JSON.parse(readFileSync('verification/records-capacity.json','utf8'));
 const observations=JSON.parse(readFileSync('verification/records-capacity-d1.json','utf8'));
 if(!capacity.counts||!capacity.measurements||!capacity.archive||capacity.contactErasure?.absentOnNextRead!==true||!capacity.nativeD1||!isDeepStrictEqual(capacity.nativeD1,observations))throw Error('Incomplete full-capacity artifact.');
 return 'passed';
}
