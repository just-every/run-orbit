import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {browserAPI} from './browser-api.mjs';
import {freePort} from './checkout.mjs';
export async function runRenderedAdapter(page,secret,opportunityId,sourceId){
 const script=await page.locator('[data-recipe="automation-adapter"]').innerText(),port=await freePort(),credential=randomBytes(32).toString('hex');
 const child=spawn(process.execPath,['--input-type=module'],{env:{...process.env,PORT:String(port),ORBIT_SOURCE_SECRET:secret,ORBIT_ADAPTER_TOKEN:credential,ORBIT_ADAPTER_ALLOW_LOOPBACK:'1'},stdio:['pipe','pipe','pipe']});
 const exited=new Promise(resolve=>child.once('exit',code=>resolve(code)));let output='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',()=>{});
 try{
 const ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Rendered adapter did not become ready')),15000);child.stdout.on('data',()=>{if(output.includes('ADAPTER_READY')){clearTimeout(timer);resolve();}});child.once('exit',()=>{clearTimeout(timer);reject(Error('Rendered adapter exited before readiness'));});});child.stdin.end(script);await ready;
 const read=async()=>{return(await browserAPI(page,`/api/v1/opportunities/${opportunityId}`)).opportunity.signals;};
 const before=await read(),url=`http://127.0.0.1:${port}/events`,body=JSON.stringify({eventId:crypto.randomUUID(),type:'form.submitted',subject:'Automation inquiry',occurredAt:new Date().toISOString(),email:'maya@harbour.example'});
 const post=(raw,token=credential)=>fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:raw});
 assert.equal((await post('x'.repeat(262145),'forged')).status,401);
 assert.equal((await post('x'.repeat(262145))).status,413);
 assert.equal((await post(JSON.stringify({type:'form.submitted',subject:'Missing identity',email:'maya@harbour.example'}))).status,400);
 const first=await post(body);assert.equal(first.status,201);const receipt=await first.json();
 const replay=await post(body);assert.equal(replay.status,201);assert.deepEqual(await replay.json(),{id:receipt.id,replayed:true});
 assert.equal((await post(JSON.stringify({...JSON.parse(body),subject:'Changed original content'}))).status,409);
 const enabled=value=>browserAPI(page,`/api/v1/sources/${sourceId}`,'PATCH',{enabled:value});
 await enabled(false);try{assert.equal((await post(body)).status,403,'Adapter preserves the real upstream rejection');}finally{await enabled(true);}
 const added=(await read()).filter(signal=>!before.some(old=>old.id===signal.id));assert.equal(added.length,1);assert.equal(added[0].type,'form.submitted');return script;
 }finally{child.kill('SIGTERM');await exited;}
}
