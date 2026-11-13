import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const root=resolve(process.argv[2]),receipt=process.argv[3];
const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
const head=git('rev-parse','HEAD'),tree=git('rev-parse','HEAD^{tree}'),startedAt=new Date().toISOString();
if(git('status','--porcelain'))throw Error('The candidate must be clean before the public probe.');
const {launchFixture}=await import(pathToFileURL(join(root,'tests/support/launch-fixture.ts')).href);
const {pipedriveApiProof}=await import(pathToFileURL(join(root,'tests/support/pipedrive-api-proof.ts')).href);
const fixture=await launchFixture();let exit=0,failure;
try{await pipedriveApiProof(fixture,message=>console.log('PROBE MIGRATE-002 1: '+message));}
catch(error){exit=1;failure=error instanceof Error?error.message:'Probe failed';throw error;}
finally{await fixture.dispose();if(git('rev-parse','HEAD')!==head||git('status','--porcelain'))throw Error('Candidate changed during the probe.');writeFileSync(receipt,JSON.stringify({head,tree,startedAt,finishedAt:new Date().toISOString(),exit,...failure?{failure}:{},door:'Native authenticated HTTP routes',replacement:'Pipedrive HTTP only',helper:'tests/support/pipedrive-api-proof.ts',nativeStore:'Real persisted D1 emulator, closed and reopened at the source checkpoint',restore:'Actual Records archive into a destination with its own connected pull and saved review'},null,2)+'\n');}
console.log('Committed-candidate Pipedrive public probe passed.');
