import {RenderedMergeFields,useRenderedReview} from '../../drafts/ui/render-review';
import {ProviderFooter} from "./provider-footer";
import { useState } from 'react';
import type { OperatorDraft } from './operator-api';
import { workbenchRequest } from './workbench-api';
import { OperatorState } from './operator-shell';
import { DraftOptOut, type OptOutState } from './draft-opt-out';
import { messageStatus } from './message-status';
import { formatDateTime, formatTime, workspaceInstant, workspaceTimeZone, zoneLabel } from './formatters';
interface ApprovalPreview {timezone:string;localTime:string;quietHours:boolean;confirmationExpiresAt:string;requestedAt?:string;scheduledAt?:string;scheduledLocalTime?:string;scheduleReason?:string|null}
export function DraftApproval({draft,dirty,recipientName,onSubmitted,mailProvider,onOptOutChanged}:{mailProvider?:string;onOptOutChanged?:()=>void;draft:OperatorDraft;dirty:boolean;recipientName?:string;onSubmitted?:(message:{state:string;scheduledAt:string|null})=>void}) {
 const rendered=useRenderedReview(draft),mergeBlocked=!rendered.review||rendered.review.missing.length>0||rendered.review.stale.length>0||!rendered.review.reviewed;
 const [busy,setBusy]=useState(false),[result,setResult]=useState<{state:string;scheduledAt?:string;scheduleReason?:string|null}|null>(null),[error,setError]=useState(''),[confirmationError,setConfirmationError]=useState(false),[scheduledAt,setScheduledAt]=useState(''),[preview,setPreview]=useState<ApprovalPreview|null>(null),[optOut,setOptOut]=useState<OptOutState|null>(null);
 const differentZones=Boolean(preview&&preview.timezone!==workspaceTimeZone());
 async function approve(confirmation?:ApprovalPreview){setBusy(true);setError('');try{
  const requestedAt=scheduledAt?workspaceInstant(scheduledAt):undefined;
  if(!confirmation){
   const next=await workbenchRequest<ApprovalPreview>(`/drafts/${draft.id}/approval-preview${requestedAt?`?scheduledAt=${encodeURIComponent(requestedAt)}`:''}`);
   if(requestedAt||next.quietHours){setPreview(next);return;}
  }
  const sent=await workbenchRequest<{state:string;scheduledAt?:string}>(`/drafts/${draft.id}/approve`,{revision:draft.revision,...(requestedAt?{scheduledAt:requestedAt,scheduledAtConfirmation:confirmation?.scheduledAt}:confirmation?{quietHoursConfirmation:confirmation.localTime}:{})});
  setPreview(null);onSubmitted?.({state:sent.state,scheduledAt:sent.scheduledAt??null});setResult({...sent,scheduleReason:confirmation?.scheduleReason});
 }catch(error){setError((error as Error).message);setConfirmationError(!/mail|sender|provider/i.test((error as Error).message));setPreview(null);await rendered.load();onOptOutChanged?.();}finally{setBusy(false);}}
 return <section id="send-approval" className="operator-surface workbench-form"><h2>Approve and send</h2><p><strong>To:</strong> {recipientName} &lt;{draft.recipientEmail}&gt;</p><RenderedMergeFields state={rendered} disabled={dirty||busy||draft.isStale}/><p><strong>Subject:</strong> {rendered.review?.subject??draft.subject}</p><p data-testid="rendered-body" style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{rendered.review?.body??draft.body}</p><p>Approval uses the saved recipient, subject and body shown above, revision {draft.revision}. </p>
  <DraftOptOut draftId={draft.id} disabled={busy||Boolean(result)} onState={setOptOut} onChanged={()=>onOptOutChanged?.()}/>
  {(mailProvider==='rer'||optOut?.carries)&&<ProviderFooter provider={mailProvider}/>}
  {dirty&&<OperatorState>Save your changes before approving this revision.</OperatorState>}
  <label>Schedule for later (leave empty to send now)<input type="datetime-local" disabled={busy||Boolean(result)} value={scheduledAt} onChange={e=>{setScheduledAt(e.target.value);setPreview(null);}}/></label>
  {!preview?<button type="button" className="operator-button" disabled={busy||dirty||mergeBlocked||draft.isStale||Boolean(result)||Boolean(optOut?.refusal)} onClick={()=>void approve()}>{busy?'Checking…':scheduledAt?'Review schedule for exact revision':'Approve and send exact revision'}</button>:<div role="alert" className="confirm-actions">
   {preview.scheduledAt?<><p>Requested: <time dateTime={preview.requestedAt!}>{formatDateTime(preview.requestedAt!)}</time>{differentZones?` (${zoneLabel()})`:''}.</p><p><strong>Scheduled send: <time dateTime={preview.scheduledAt}>{formatDateTime(preview.scheduledAt)}</time>{differentZones?` (${zoneLabel()})`:''}.</strong>{differentZones&&<> Recipient time: <time dateTime={preview.scheduledAt}>{formatDateTime(preview.scheduledAt,preview.timezone)}</time> ({zoneLabel(preview.timezone)}).</>}</p>{preview.scheduleReason&&<p>{preview.scheduleReason}</p>}</>:<p>Recipient time reviewed: {preview.localTime}{differentZones?` (${zoneLabel(preview.timezone)})`:''}, outside permitted hours. Send now when you confirm. You have ten minutes to decide, until <time dateTime={preview.confirmationExpiresAt}>{formatTime(preview.confirmationExpiresAt)}</time>{differentZones?` (${zoneLabel()})`:''}.</p>}
   <button type="button" className="operator-button" disabled={busy||dirty||mergeBlocked||draft.isStale} onClick={()=>void approve(preview)}>{preview.scheduledAt?'Approve and schedule exact revision':'Confirm send now'}</button><button type="button" disabled={busy} onClick={()=>setPreview(null)}>Cancel</button></div>}
  {result&&<OperatorState>{result.state==='scheduled'&&result.scheduledAt?<>This exact revision is scheduled for <time dateTime={result.scheduledAt}>{formatDateTime(result.scheduledAt)}</time>. {result.scheduleReason??''} Dispatch will re-check the recipient, evidence, limits and permitted hours.</>:<>{messageStatus(result.state)} Only a delivery event confirms delivery.</>}</OperatorState>}{error&&<OperatorState kind="error">{error} {confirmationError?<a href="#send-approval">Review this message and recipient time again</a>:<a href="/app/settings/mail">Settings › Mail</a>}</OperatorState>}
 </section>;
}
