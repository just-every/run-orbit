// Test-host occupancy observation. Credentials, headers and request bodies stay private.
import {readFileSync,mkdirSync,appendFileSync} from 'node:fs';
import WebSocket from 'ws';
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
if(account!=='b20c0ca9cab0c2b70e13d7cf724b89bd')throw Error('Wrong demo account.');
const config=JSON.parse(readFileSync('.rer/demo-host/wrangler.json'));
if(!config.name.endsWith('-demo-test--demo'))throw Error('Observe only the test host.');
const endpoint=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${config.name}/tails`;
const headers={authorization:`Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,'content-type':'application/json'};
mkdirSync('demo-observation',{recursive:true});
const write=row=>{appendFileSync('demo-observation/admissions.jsonl',JSON.stringify(row)+'\n');console.log(JSON.stringify(row));};
let tail,socket,heartbeat,probeTimer,completeTimer,failObservation,stopping=false;
let pongs=0,probes=0,traces=0,reconnects=0,maxGapMs=0,lostAt;
const admissions=new Set();
async function remove(record){
 const response=await fetch(endpoint+'/'+record.id,{method:'DELETE',headers});
 if(!response.ok&&response.status!==404)throw Error(`Tail cleanup failed (${response.status}).`);
}
async function connect(){
 if(stopping)return;
 const response=await fetch(endpoint,{method:'POST',headers,body:'{}'}),body=await response.json();
 if(!response.ok||!body.success)throw Error(`Tail unavailable (${response.status}).`);
 const record=tail=body.result;
 if(stopping){await remove(record);return;}
 const stream=socket=new WebSocket(record.url,'trace-v1');stream.binaryType='arraybuffer';
 stream.on('pong',()=>{pongs++;});
 stream.addEventListener('message',message=>{
  const event=JSON.parse(typeof message.data==='string'?message.data:new TextDecoder().decode(message.data));traces++;
  for(const log of event.logs??[])for(const part of log.message??[]){
   if(typeof part!=='string')continue;
   let value;try{value=JSON.parse(part);}catch{continue;}
   if(value.event==='demo_admitted'&&!admissions.has(value.correlation)){
    admissions.add(value.correlation);write({event:value.event,at:value.at,correlation:value.correlation,userAgent:value.agent,network:value.network});
   }
  }
 });
 await new Promise((resolve,reject)=>{stream.once('open',resolve);stream.once('error',()=>reject(Error('Tail connection failed.')));});
 if(stopping){stream.close();await remove(record);return;}
 stream.send(JSON.stringify({debug:false}));
 heartbeat=setInterval(()=>stream.ping(),30000);
 const gapMs=lostAt?Date.now()-lostAt:0;maxGapMs=Math.max(maxGapMs,gapMs);
 write({event:'tail_connected',at:new Date().toISOString(),gapMs});
 stream.once('close',code=>{
  clearInterval(heartbeat);if(stopping)return;
  lostAt=Date.now();reconnects++;write({event:'tail_closed',at:new Date().toISOString(),code,pongs,probes,traces});
  // Restore the real provider stream, as Wrangler and Base's live-tail client do.
  void remove(record).then(connect).catch(failObservation);
 });
}
async function probe(){
 // A plain GET makes a trace, never a browser challenge response or reservation.
 const response=await fetch(config.vars.DEMO_ORIGIN+'/',{headers:{'user-agent':'Orbit occupancy observation'},signal:AbortSignal.timeout(10000)});
 const cookie=response.headers.has('set-cookie');await response.body?.cancel();
 if(response.status!==200||cookie)throw Error(`Public readback failed (${response.status}, cookie=${cookie}).`);
 probes++;write({event:'public_read',at:new Date().toISOString(),status:response.status,cookie});
}
try{
 let finishObservation;
 const observing=new Promise((resolve,reject)=>{failObservation=reject;finishObservation=resolve;});
 const begin=async()=>{
  await connect();completeTimer=setTimeout(finishObservation,15*60*1000);write({event:'observation_started',at:new Date().toISOString(),worker:config.name});
  await probe();probeTimer=setInterval(()=>{void probe().catch(failObservation);},30000);
 };
 await Promise.all([observing,begin()]);
 write({event:'observation_finished',at:new Date().toISOString(),continuous:reconnects===0,reconnects,maxGapMs,pongs,probes,traces,admissions:admissions.size});
}finally{
 stopping=true;clearTimeout(completeTimer);clearInterval(probeTimer);clearInterval(heartbeat);socket?.close();if(tail)await remove(tail);
}
