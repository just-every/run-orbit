import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,readdir,chmod,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {captureNotices,captureRedirects} from '../../scripts/installer/capture-notices.mjs';

const root = fileURLToPath(new URL('../../',import.meta.url)), script = join(root,'scripts/capture-live-proof.mjs');
const fixtureCookie = '__Host-orbit_session='+ 'test_session_'.repeat(4), fixtureKey = 'test_dev_key_'.repeat(4);
function command(args) {
 return new Promise((resolve,reject)=>{
  const child = spawn(process.execPath,[script,...args],{cwd:root,stdio:['ignore','pipe','pipe']});
  let stdout = '',stderr = '';
  child.stdout.on('data',data=>stdout+=data);child.stderr.on('data',data=>stderr+=data);
  child.once('error',reject);child.once('close',code=>resolve({code,stdout,stderr}));
 });
}
async function fixture(t, handler) {
 const directory = await mkdtemp(join(tmpdir(),'orbit-capture-proof-'));
 const session = join(directory,'session.cookie'), key = join(directory,'dev-key.env');
 await writeFile(session,fixtureCookie,{mode:0o600});await writeFile(key,`RER_DEV_KEY=${fixtureKey}\n`,{mode:0o600});
 const server = createServer(handler);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await new Promise(resolve=>server.close(resolve)); await rm(directory,{recursive:true,force:true});});
 const origin = `http://127.0.0.1:${server.address().port}`;
 return {directory,session,origin,args:['--origin',origin,'--session-file',session,'--dev-key-file',key,'--source','capture-proof','--evidence-dir',join(directory,'evidence')]};
}
const emptySummary = () => ({captured:0,unlinked:0,replayed:0,conflicts:0,attached:0,stopped:0,bounces:0,proposals:0,skipped:0});

test('provider proof command observes bounded intake, refuses invented growth, checks replay and disconnect without persisting private response fields',async t=>{
 let captured = 0, calls = 0, pending = 0, disconnected = false, add = false;
 const source = () => ({id:'capture-proof',adapter:'google',state:disconnected?'disconnected':'connected',has_credential:disconnected?0:1,captured_count:captured,skipped_count:0,proposals_waiting:pending,last_success_at:captured?'2026-10-13T00:00:00.000Z':null,last_error_at:null,last_error:null,scope:{mail:{folders:['business']},calendars:['calendar']},cursor:'PRIVATE_CURSOR',body:'PRIVATE_BODY',secret:'PRIVATE_SECRET'});
 const f = await fixture(t,async(req,res)=>{
  assert.equal(req.headers.cookie,fixtureCookie);assert.equal(req.headers['x-rer-dev-key'],fixtureKey);
  res.setHeader('Content-Type','application/json');
  if(req.url === '/api/v1/capture/sources')return res.end(JSON.stringify({sources:[source()]}));
  let body = '';for await(const chunk of req)body+=chunk;
  if(req.url.endsWith('/disconnect')) {assert.deepEqual(JSON.parse(body),{confirmed:true});disconnected=true;return res.end(JSON.stringify({disconnected:true}));}
  assert.equal(req.url,'/api/v1/capture/sources/capture-proof/sync');assert.equal(req.method,'POST');
  if(disconnected) {res.statusCode=409;return res.end(JSON.stringify({error:'PRIVATE_PROVIDER_ERROR'}));}
  calls++;
  const summary = emptySummary();
  if(calls <= 2 || add) {captured++;pending++;summary.captured=1;summary.proposals=1;add=false;}
  res.end(JSON.stringify({summary,more:calls===1,cursor:'PRIVATE_CURSOR'}));
 });
 const run = phase=>command([...f.args,'--phase',phase]);
 let result = await run('initial');assert.equal(result.code,0,result.stderr);assert.equal(calls,3);
 const baseline = JSON.parse(await readFile(join(f.directory,'evidence/initial.json'),'utf8'));
 assert.equal(baseline.after.captured_count,2);assert.equal(baseline.passes[0].requests,2);assert.equal(baseline.replay_counts_stable,true);
 result = await run('incremental');assert.equal(result.code,1);assert.match(result.stderr,/No added captured evidence/);
 add=true;result=await run('incremental');assert.equal(result.code,0,result.stderr);
 result=await run('incremental');assert.equal(result.code,0,result.stderr);
 result=await run('disconnect');assert.equal(result.code,0,result.stderr);
 const files = await readdir(join(f.directory,'evidence'));
 for(const file of files) {const text=await readFile(join(f.directory,'evidence',file),'utf8');assert.doesNotMatch(text,/PRIVATE_BODY|PRIVATE_CURSOR|PRIVATE_SECRET|PRIVATE_PROVIDER_ERROR|test_session_|test_dev_key_/);}
 const receipt = JSON.parse(await readFile(join(f.directory,'evidence',files.find(name=>name.startsWith('disconnect-'))),'utf8'));
 assert.equal(receipt.after.state,'disconnected');assert.equal(receipt.after.has_credential,0);assert.equal(receipt.sync_refused_status,409);
});

test('proof command refuses credential-bearing origins, unsafe cookie files, HTTP redirects, an unfinished page budget and a replay that adds evidence',async t=>{
 let calls = 0;
 const f = await fixture(t,(req,res)=>{calls++;res.statusCode=302;res.setHeader('Location','https://foreign.example/capture');res.end('PRIVATE_REDIRECT_BODY');});
 let result = await command([...f.args,'--phase','initial']);assert.equal(result.code,1);assert.match(result.stderr,/redirect refused/);assert.equal(calls,1);assert.doesNotMatch(result.stderr,/PRIVATE_REDIRECT_BODY|test_session_|test_dev_key_/);
 await chmod(f.session,0o644);
 result = await command([...f.args,'--phase','initial']);assert.equal(result.code,1);assert.match(result.stderr,/mode-0600/);assert.equal(calls,1);
 const args = f.args.slice();args[1]='https://user:ARGUMENT_SECRET@example.com';
 result = await command([...args,'--phase','initial']);assert.equal(result.code,1);assert.doesNotMatch(result.stderr,/ARGUMENT_SECRET/);assert.equal(calls,1);
 await budgetAndReplay(t);
});

async function budgetAndReplay(t){
 let count=0,more=true;
 const f=await fixture(t,(req,res)=>{
  res.setHeader('Content-Type','application/json');
  if(req.url.endsWith('/sources'))return res.end(JSON.stringify({sources:[{id:'capture-proof',adapter:'microsoft',state:'connected',has_credential:1,captured_count:count,skipped_count:0,proposals_waiting:0,last_success_at:'2026-10-13T00:00:00.000Z',last_error_at:null,last_error:null,scope:{mail:{folders:['business']},calendars:['calendar']}}]}));
  count++;res.end(JSON.stringify({summary:{...emptySummary(),captured:1},more}));
 });
 let result=await command([...f.args,'--phase','initial','--max-rounds','1']);
 assert.equal(result.code,1);assert.match(result.stderr,/bounded request budget/);assert.equal(count,1);
 assert.ok(!(await readdir(join(f.directory,'evidence'))).includes('initial.json'));
 more=false;
 result=await command([...f.args,'--phase','initial']);assert.equal(result.code,1);assert.match(result.stderr,/Replay changed evidence/);assert.equal(count,3);
 assert.ok(!(await readdir(join(f.directory,'evidence'))).includes('initial.json'));
}

test('callback notices use the resolved lifecycle origin only after successful dev startup and leave setup alone',async()=>{
 const lines = [], run = captureNotices({async run(verb,origin) {return {verb,origin,store:{report:line=>lines.push(line)}};}}).run;
 await run('setup','http://127.0.0.1:8787');assert.equal(lines.length,0);
 await run('dev','http://localhost:9331');
 assert.ok(lines.every(line=>new URL(line.split(' ')[2]).origin === 'http://localhost:9331'));
 assert.deepEqual(lines.map(line=>new URL(line.split(' ')[2]).pathname),['/api/v1/capture/oauth/google/callback','/api/v1/capture/oauth/microsoft/callback']);
 const failed = captureNotices({async run(){throw new Error('not ready');}});
 await assert.rejects(failed.run(),/not ready/);assert.equal(lines.length,2);
 assert.throws(()=>captureRedirects('https://user:secret@example.com'),/origin/);
});
