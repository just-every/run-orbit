import {formatDateTime} from '../formatters';
import {useState} from 'react';
import {ProviderFooter} from '../provider-footer';
import {workbenchRequest} from '../workbench-api';

export interface DealMessage {id:string;draftId:string;state:string;subject:string;body:string;recipientEmail:string;providerMessageId:string|null;failure:string|null;retryAfter:string|null;scheduledAt:string|null;acceptedAt:string|null;deliveredAt:string|null;createdAt:string;optOut:number|null}

/** Cancel a scheduled message or review and explicitly retry a message held before submission. */
export function MessageTools({message,mailProvider,reload}:{message:DealMessage;mailProvider?:string;reload:()=>void}){
 const [error,setError]=useState(''),[confirmation,setConfirmation]=useState<string|null>(null),[busy,setBusy]=useState(false);
 async function run(work:()=>Promise<void>){setBusy(true);setError('');try{await work();}catch(e){setError((e as Error).message);reload();}finally{setBusy(false);}}
 const retry=(localTime?:string)=>run(async()=>{
  if(!localTime){const preview=await workbenchRequest<{quietHours:boolean;localTime:string}>(`/drafts/${message.draftId}/approval-preview`);if(preview.quietHours){setConfirmation(preview.localTime);return;}}
  await workbenchRequest(`/messages/${message.id}/retry`,{...(localTime?{quietHoursConfirmation:localTime}:{})});setConfirmation(null);reload();
 });
 return <>
  {message.state==='scheduled'?<button type="button" className="operator-text-button" disabled={busy} onClick={()=>void run(async()=>{await workbenchRequest(`/messages/${message.id}/cancel`,{});reload();})}>Cancel scheduled message</button>:null}
  {message.state==='draft'?<details><summary>Review blocked message</summary><p>Held before submission. This message has not been sent.</p>{message.failure&&<p>{message.failure}</p>}{message.retryAfter&&<p>May be sent after <time dateTime={message.retryAfter}>{formatDateTime(message.retryAfter)}</time>.</p>}<p>Review and approve again to send. Orbit will not retry automatically.</p><p>To: {message.recipientEmail}</p><p>Subject: {message.subject}</p><pre className="assistance-preview-json">{message.body}</pre>{(mailProvider==='rer'||message.optOut!==0)&&<ProviderFooter provider={mailProvider}/>}
   {confirmation?<div role="alert" className="r-confirm"><p>It is {confirmation} for the recipient, outside permitted hours. This confirmation is valid for ten minutes.</p><div><button type="button" className="operator-button" disabled={busy} onClick={()=>void retry(confirmation)}>Confirm send now</button><button type="button" className="operator-text-button" onClick={()=>setConfirmation(null)}>Cancel</button></div></div>:<button type="button" disabled={busy} onClick={()=>void retry()}>Approve this exact content again</button>}
  </details>:null}
  {error?<p className="r-fail" role="alert">{error}</p>:null}
 </>;
}
