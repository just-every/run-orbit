// Test-host occupancy observation. Credentials, headers and request bodies stay private.
import {readFileSync,mkdirSync,appendFileSync} from 'node:fs';
import WebSocket from 'ws';
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
if(account!=='b20c0ca9cab0c2b70e13d7cf724b89bd')throw Error('Wrong demo account.');
const config=JSON.parse(readFileSync('.rer/demo-host/wrangler.json'));
if(!config.name.endsWith('-demo-test--demo'))throw Error('Observe only the test host.');
const endpoint=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${config.name}/tails`;
const headers={authorization:`Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,'content-type':'application/json'};
const response=await fetch(endpoint,{method:'POST',headers,body:'{}'}),body=await response.json();
if(!response.ok||!body.success)throw Error(`Tail unavailable (${response.status}).`);
mkdirSync('demo-observation',{recursive:true});
const write=row=>{appendFileSync('demo-observation/admissions.jsonl',JSON.stringify(row)+'\n');console.log(JSON.stringify(row));};
const tail=body.result,socket=new WebSocket(tail.url,'trace-v1');socket.binaryType='arraybuffer';
let interrupted=false,heartbeat,probeTimer,completeTimer,failObservation,pongs=0,probes=0,traces=0;
socket.on('pong',()=>{pongs++;});
socket.addEventListener('message',message=>{
 const event=JSON.parse(typeof message.data==='string'?message.data:new TextDecoder().decode(message.data));
 traces++;
 for(const log of event.logs??[])for(const part of log.message??[]){
  if(typeof part!=='string')continue;
  let value;try{value=JSON.parse(part);}catch{continue;}
  if(value.event==='demo_admitted')write({event:value.event,at:value.at,correlation:value.correlation,userAgent:value.agent,network:value.network});
 }
});
try{
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',()=>reject(Error('Tail connection failed.')),{once:true});});
 socket.send(JSON.stringify({debug:false}));
 // Like Wrangler tail, keep the trace WebSocket alive with control-frame pings.
 heartbeat=setInterval(()=>socket.ping(),30000);
 write({event:'observation_started',at:new Date().toISOString(),worker:config.name});
 const observing=new Promise((resolve,reject)=>{
  failObservation=reject;completeTimer=setTimeout(resolve,15*60*1000);
  socket.addEventListener('close',event=>{
   interrupted=true;write({event:'tail_closed',at:new Date().toISOString(),code:event.code,pongs,probes,traces});
   reject(Error('Tail closed before observation completed.'));
  },{once:true});
 });
 async function probe(){
  // Plain GET makes a trace, never a browser challenge response or demo reservation.
  const response=await fetch(config.vars.DEMO_ORIGIN+'/',{headers:{'user-agent':'Orbit occupancy observation'},signal:AbortSignal.timeout(10000)});
  const cookie=response.headers.has('set-cookie');await response.body?.cancel();
  if(response.status!==200||cookie)throw Error(`Public readback failed (${response.status}, cookie=${cookie}).`);
  probes++;write({event:'public_read',at:new Date().toISOString(),status:response.status,cookie});
 }
 const initialProbe=probe();
 probeTimer=setInterval(()=>{void probe().catch(failObservation);},30000);
 await Promise.all([observing,initialProbe]);
 write({event:'observation_finished',at:new Date().toISOString(),continuous:!interrupted,pongs,probes,traces});
}finally{
 clearTimeout(completeTimer);clearInterval(probeTimer);clearInterval(heartbeat);socket.close();const removed=await fetch(endpoint+'/'+tail.id,{method:'DELETE',headers});
 if(!removed.ok)throw Error(`Tail cleanup failed (${removed.status}).`);
}
