import {ProviderFooter} from "./provider-footer";
import { useState } from 'react';
import type { OperatorDraft } from './operator-api';
import { workbenchRequest } from './workbench-api';
import { OperatorState } from './operator-shell';
import { DraftOptOut, type OptOutState } from './draft-opt-out';
import { formatDate, formatTime, workspaceInstant, zoneLabel } from './formatters';
interface ApprovalPreview {timezone:string;localTime:string;quietHours:boolean;confirmationExpiresAt:string;requestedAt?:string;scheduledAt?:string;scheduledLocalTime?:string;scheduleReason?:string|null}
export function DraftApproval({draft,dirty,recipientName,onSubmitted,mailProvider,onOptOutChanged}:{mailProvider?:string;onOptOutChanged?:()=>void;draft:OperatorDraft;dirty:boolean;recipientName?:string;onSubmitted?:(message:{state:string;scheduledAt:string|null})=>void}) {
 const [busy,setBusy]=useState(false),[result,setResult]=useState(''),[error,setError]=useState(''),[confirmationError,setConfirmationError]=useState(false),[scheduledAt,setScheduledAt]=useState(''),[preview,setPreview]=useState<ApprovalPreview|null>(null),[optOut,setOptOut]=useState<OptOutState|null>(null);
 async function approve(confirmation?:ApprovalPreview){setBusy(true);setError('');try{
  const requestedAt=scheduledAt?workspaceInstant(scheduledAt):undefined;
  if(!confirmation){
   const next=await workbenchRequest<ApprovalPreview>(`/drafts/${draft.id}/approval-preview${requestedAt?`?scheduledAt=${encodeURIComponent(requestedAt)}`:''}`);
   if(requestedAt||next.quietHours){setPreview(next);return;}
  }
  const sent=await workbenchRequest<{state:string;scheduledAt?:string}>(`/drafts/${draft.id}/approve`,{revision:draft.revision,...(optOut?{optOut:optOut.carries}:{}),...(requestedAt?{scheduledAt:requestedAt,scheduledAtConfirmation:confirmation?.scheduledAt}:confirmation?{quietHoursConfirmation:confirmation.localTime}:{})});
  setPreview(null);onSubmitted?.({state:sent.state,scheduledAt:sent.scheduledAt??null});setResult(sent.state==='scheduled'&&sent.scheduledAt?`This exact revision is scheduled for ${formatDate(sent.scheduledAt)}. ${confirmation?.scheduleReason??''} Dispatch will re-check the recipient, evidence, limits and permitted hours.`:`Message state: ${sent.state}. Only a delivery event confirms delivery.`);
 }catch(error){setError((error as Error).message);setConfirmationError(!/mail|sender|provider/i.test((error as Error).message));setPreview(null);}finally{setBusy(false);}}
 return <section id="send-approval" className="operator-surface workbench-form"><h2>Approve and send</h2><p><strong>To:</strong> {recipientName} &lt;{draft.recipientEmail}&gt;</p><p><strong>Subject:</strong> {draft.subject}</p><p style={{whiteSpace:"pre-wrap"}}>{draft.body}</p><p>Approval uses the saved recipient, subject and body shown above, revision {draft.revision}. </p>
  <DraftOptOut draftId={draft.id} disabled={busy||Boolean(result)} onState={setOptOut} onChanged={()=>onOptOutChanged?.()}/>
  {(mailProvider==='rer'||optOut?.carries)&&<ProviderFooter provider={mailProvider}/>}
  {dirty&&<OperatorState>Save your changes before approving this revision.</OperatorState>}
  <label>Schedule for later ({zoneLabel()}; leave empty to send now)<input type="datetime-local" disabled={busy||Boolean(result)} value={scheduledAt} onChange={e=>{setScheduledAt(e.target.value);setPreview(null);}}/></label>
  {!preview?<button type="button" className="operator-button" disabled={busy||dirty||draft.isStale||Boolean(result)} onClick={()=>void approve()}>{busy?'Checking…':scheduledAt?'Review schedule for exact revision':'Approve and send exact revision'}</button>:<div role="alert" className="confirm-actions">
   {preview.scheduledAt?<><p>Requested: {formatDate(preview.requestedAt!)}.</p><p><strong>Scheduled send: {formatDate(preview.scheduledAt)}.</strong> Recipient time: {formatDate(preview.scheduledAt,preview.timezone)}.</p>{preview.scheduleReason&&<p>{preview.scheduleReason}</p>}</>:<p>Recipient time reviewed: {preview.localTime} ({zoneLabel(preview.timezone)}), outside permitted hours. Send now when you confirm. You have ten minutes to decide, until {formatTime(preview.confirmationExpiresAt)}.</p>}
   <button type="button" className="operator-button" disabled={busy||dirty||draft.isStale} onClick={()=>void approve(preview)}>{preview.scheduledAt?'Approve and schedule exact revision':'Confirm send now'}</button><button type="button" disabled={busy} onClick={()=>setPreview(null)}>Cancel</button></div>}
  {result&&<OperatorState>{result}</OperatorState>}{error&&<OperatorState kind="error">{error} {confirmationError?<a href="#send-approval">Review this message and recipient time again</a>:<a href="/app/settings#mail-sender">Customer mail sender settings</a>}</OperatorState>}
 </section>;
}
