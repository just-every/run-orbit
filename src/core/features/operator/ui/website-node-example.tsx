import {useState,type RefObject} from 'react';
import {Snippet} from './recipe-snippet';

export function WebsiteNodeExample({frame,origin,form}:{frame:RefObject<HTMLIFrameElement|null>;origin:string;form:{slug:string;operationId:string;revision:number}}){
 const[code,setCode]=useState(''),[error,setError]=useState('');
 function prepare(){
  setCode('');setError('');
  const document=frame.current?.contentDocument,published=document?.querySelector<HTMLFormElement>('#capture');
  if(!published){setError('The published form has not loaded. Refresh this page and try again.');return;}
  if(!published.reportValidity()){setError('Fill in every required field in the published form above, then prepare the example again.');return;}
  const data=new FormData(published),values=Object.fromEntries([...data].filter(([name])=>!['honeypot','consent','cf-turnstile-response'].includes(name))),verification=Boolean(document?.getElementById('capture-verification'));
  setCode(`const endpoint=${JSON.stringify(origin+'/api/public/forms/'+form.slug)};
const values=${JSON.stringify(values,null,2)};
const consent=${data.get('consent')==='on'};
${verification?"if(!process.env.TURNSTILE_TOKEN) throw Error('Set TURNSTILE_TOKEN to a fresh verification token, or submit the live form instead.');\n":''}const idempotencyKey=crypto.randomUUID();
const headers={'Content-Type':'application/json','Origin':${JSON.stringify(origin)}};
const challenge=await fetch(endpoint+'/challenge',{method:'POST',headers,body:JSON.stringify({idempotencyKey})});
if(!challenge.ok) throw Error(await challenge.text());
const {token:fillToken}=await challenge.json();
await new Promise(resolve=>setTimeout(resolve,2000));
const response=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({operationId:${JSON.stringify(form.operationId)},revision:${form.revision},idempotencyKey,fillToken,honeypot:'',${verification?"turnstileToken:process.env.TURNSTILE_TOKEN,":''}values,consent})});
const result=await response.json();
if(!response.ok||result.refused) throw Error(JSON.stringify(result));
console.log(JSON.stringify(result,null,2));`);
 }
 return <details><summary>Run a form submission in Node</summary><p>Fill in the published form above, including every required field and any consent choice, without submitting it. Choose Prepare Node example to copy those values into a script. This sends a real enquiry when you run it.</p><p>Use Node 22 or later on this computer. Check with <code>node --version</code>; if the command is unavailable, install Node separately. The Orbit installer keeps its own Node private and does not add it to your terminal’s PATH.</p><button type="button" onClick={prepare}>Prepare Node example</button>{error&&<p role="alert">{error}</p>}{code&&<><p>Copy the code into a file named <code>orbit-form.mjs</code>. Keep Orbit running, then open a terminal in the folder containing that file and run:</p><Snippet name="website-run" text="node orbit-form.mjs"/><p>The script requests a preparation token, waits two seconds and submits. If this form enables Turnstile, supply a fresh valid verification token as <code>TURNSTILE_TOKEN</code>, or submit the live form above.</p><Snippet name="website" text={code}/><p>Success prints copyable JSON with a <code>submissionId</code>, <code>reviewRequired</code> and <code>replayed</code>. Review any proposed property changes in Capture. Running the file again sends a new enquiry.</p></>}</details>;
}
