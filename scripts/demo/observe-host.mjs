// Test-host occupancy observation. Credentials, headers and request bodies stay private.
import {readFileSync,mkdirSync,appendFileSync} from 'node:fs';
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
let interrupted=false;
socket.addEventListener('message',message=>{
 const event=JSON.parse(typeof message.data==='string'?message.data:new TextDecoder().decode(message.data));
 for(const log of event.logs??[])for(const part of log.message??[]){
  if(typeof part!=='string')continue;
  let value;try{value=JSON.parse(part);}catch{continue;}
  if(value.event==='demo_admitted')write({event:value.event,at:value.at,correlation:value.correlation,userAgent:value.agent,network:value.network});
 }
});
try{
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',()=>reject(Error('Tail connection failed.')),{once:true});});
 write({event:'observation_started',at:new Date().toISOString(),worker:config.name});
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(resolve,15*60*1000);
  socket.addEventListener('close',()=>{clearTimeout(timer);interrupted=true;reject(Error('Tail closed before observation completed.'));},{once:true});
 });
 write({event:'observation_finished',at:new Date().toISOString(),continuous:!interrupted});
}finally{
 socket.close();const removed=await fetch(endpoint+'/'+tail.id,{method:'DELETE',headers});
 if(!removed.ok)throw Error(`Tail cleanup failed (${removed.status}).`);
}
