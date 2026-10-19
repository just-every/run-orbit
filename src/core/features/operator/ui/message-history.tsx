import {ProviderFooter} from "./provider-footer";
import { useCallback,useEffect,useState } from 'react';
import { workbenchRequest } from './workbench-api';
import { useOperatorResource } from './use-operator-resource';
import { OperatorState } from './operator-shell';
import { formatDate } from './formatters';
import { FollowUpOutcomes, type Outcomes } from './follow-up-outcomes';
interface Scheduler {ready:boolean;lastRunAt:string|null;failed:boolean}
interface Message {id:string;draftId:string;state:string;subject:string;body:string;recipientEmail:string;providerMessageId:string|null;failure:string|null;retryAfter:string|null;scheduledAt:string|null;acceptedAt:string|null;deliveredAt:string|null}
/** A sent message's state in plain words; until delivery events are connected, acceptance is all Orbit can know. */
function outcome(state:string,tracked:boolean){
 if(state==='accepted')return tracked?'accepted by mail provider · delivery not confirmed':'accepted by mail provider · delivery not tracked';
 return state==='failed'?'failed · not delivered':state;
}
export function MessageHistory({opportunityId}:{opportunityId:string}) {
 const load=useCallback(()=>workbenchRequest<{messages:Message[];outcomes:Outcomes;mailProvider?:string;scheduler:Scheduler|null;outcomesTracked:boolean}>(`/opportunities/${opportunityId}/messages`),[opportunityId]),resource=useOperatorResource(`messages:${opportunityId}`,load);
 const [error,setError]=useState(''),[confirmation,setConfirmation]=useState<{id:string;localTime:string}|null>(null),[busy,setBusy]=useState(false);
 const pending=resource.data?.messages.some(message=>['scheduled','queued'].includes(message.state))??false;
 useEffect(()=>{if(!pending)return;const timer=setInterval(resource.reload,15000);return()=>clearInterval(timer);},[pending,opportunityId]);
 async function cancel(id:string){try{await workbenchRequest(`/messages/${id}/cancel`,{});resource.reload();}catch(e){setError((e as Error).message);}}
 async function retry(message:Message,localTime?:string){setBusy(true);setError('');try{
  if(!localTime){const preview=await workbenchRequest<{quietHours:boolean;localTime:string}>(`/drafts/${message.draftId}/approval-preview`);if(preview.quietHours){setConfirmation({id:message.id,localTime:preview.localTime});return;}}
  await workbenchRequest(`/messages/${message.id}/retry`,{...(localTime?{quietHoursConfirmation:localTime}:{})});setConfirmation(null);resource.reload();
 }catch(e){setError((e as Error).message);resource.reload();}finally{setBusy(false);}}
 return <section id="approved-outreach" className="operator-surface workbench-form"><h2>Approved outreach</h2><p>Open/click not tracked. Open/click reports in the timeline are inferred evidence and never confirm a human response.</p>{error&&<OperatorState kind="error">{error} <a href="#approved-outreach">Review the approved message and recipient time again</a></OperatorState>}{resource.error&&<OperatorState kind="error">{resource.error.message}</OperatorState>}
  {pending&&resource.data?.scheduler&&<p role="status">{resource.data.scheduler.ready?`Hosted minute timer active. Last completed: ${formatDate(resource.data.scheduler.lastRunAt!)}.`:resource.data.scheduler.failed?'The hosted timer failed. Due sends go out when Orbit is next used; check the deployment’s Worker errors.':resource.data.scheduler.lastRunAt?'The hosted minute timer is overdue. Due sends go out when Orbit is next used until the timer resumes.':'Cloudflare has not started its timer yet. Due sends go out when Orbit is next used until Cloudflare starts its timer.'}</p>}
  {resource.data&&<FollowUpOutcomes outcomes={resource.data.outcomes}/>}
  {resource.data?.messages.length===0&&<p>No outbound messages approved.</p>}
  {resource.data?.messages.map(message=><article key={message.id}><h3>{message.subject}</h3><p data-testid="message-outcome">{message.recipientEmail} · {outcome(message.state,resource.data!.outcomesTracked)}</p>{message.state==='accepted'&&!resource.data!.outcomesTracked&&<p>Provider acceptance does not confirm delivery. Check the recipient’s mailbox or provider activity.</p>}{message.acceptedAt&&<p>Mail provider acceptance receipt · {formatDate(message.acceptedAt)}</p>}{message.deliveredAt&&<p>Delivery reported by mail provider · {formatDate(message.deliveredAt)}</p>}{message.providerMessageId&&<details><summary>Audit details</summary><p>Provider receipt: {message.providerMessageId}</p></details>}{message.failure&&<p role="status">{message.failure}</p>}{message.retryAfter&&<p>Next eligible attempt: {formatDate(message.retryAfter)}</p>}{message.scheduledAt&&<p><strong>{message.state==='scheduled'?'Will send':'Scheduled for'}: {formatDate(message.retryAfter??message.scheduledAt)}</strong> (your browser local time). {message.state==='scheduled'&&'Orbit checks due messages when you use it and when the hosted minute timer runs.'}</p>}
   {message.state==='scheduled'&&<button onClick={()=>void cancel(message.id)}>Cancel scheduled message</button>}
   {message.state==='draft'&&<details><summary>Review blocked message</summary><p>To: {message.recipientEmail}</p><p>Subject: {message.subject}</p><pre className="assistance-preview-json">{message.body}</pre><ProviderFooter provider={resource.data?.mailProvider}/>{confirmation?.id===message.id?<div role="alert" className="confirm-actions"><p>It is {confirmation.localTime} for the recipient, outside permitted hours. This confirmation is valid for ten minutes.</p><button disabled={busy} onClick={()=>void retry(message,confirmation.localTime)}>Confirm send now</button><button onClick={()=>setConfirmation(null)}>Cancel</button></div>:<button disabled={busy} onClick={()=>void retry(message)}>Approve this exact content again</button>}</details>}
   {['queued','reconciling','delivery-unknown'].includes(message.state)&&<p>Approval is recorded; the provider outcome is unresolved. Orbit reconciles this intent without submitting it again.</p>}
  </article>)}
 </section>;
}
