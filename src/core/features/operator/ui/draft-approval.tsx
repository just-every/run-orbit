import {ProviderFooter} from "./provider-footer";
import { useState } from 'react';
import type { OperatorDraft } from './operator-api';
import { workbenchRequest } from './workbench-api';
import { OperatorState } from './operator-shell';
export function DraftApproval({draft,dirty,recipientName}:{draft:OperatorDraft;dirty:boolean;recipientName?:string}) {
 const [busy,setBusy]=useState(false),[result,setResult]=useState(''),[error,setError]=useState(''),[scheduledAt,setScheduledAt]=useState(''),[preview,setPreview]=useState<{timezone:string;localTime:string;quietHours:boolean}|null>(null);
 async function approve(confirmation?:string){setBusy(true);setError('');try{
  if(!scheduledAt&&!confirmation){const next=await workbenchRequest<{timezone:string;localTime:string;quietHours:boolean}>(`/drafts/${draft.id}/approval-preview`);if(next.quietHours){setPreview(next);return;}}
  const sent=await workbenchRequest<{state:string}>(`/drafts/${draft.id}/approve`,{revision:draft.revision,...(confirmation?{quietHoursConfirmation:confirmation}:{}),...(scheduledAt?{scheduledAt:new Date(scheduledAt).toISOString()}: {})});
  setPreview(null);setResult(sent.state==='scheduled'?'This exact revision is scheduled. Dispatch will re-check the recipient, evidence, limits and permitted hours.':`Message state: ${sent.state}. Only a delivery event confirms delivery.`);
 }catch(error){setError((error as Error).message);setPreview(null);}finally{setBusy(false);}}
 return <section className="operator-surface workbench-form"><h2>Approve and send</h2><p><strong>To:</strong> {recipientName} &lt;{draft.recipientEmail}&gt;</p><p><strong>Subject:</strong> {draft.subject}</p><p style={{whiteSpace:"pre-wrap"}}>{draft.body}</p><p>Approval uses the saved recipient, subject and body shown above, revision {draft.revision}. </p>
  <ProviderFooter/>
  {dirty&&<OperatorState>Save your changes before approving this revision.</OperatorState>}
  <label>Schedule for later (your browser local time; leave empty to send now)<input type="datetime-local" value={scheduledAt} onChange={e=>{setScheduledAt(e.target.value);setPreview(null);}}/></label>
  {!preview?<button type="button" className="operator-button" disabled={busy||dirty||draft.isStale||Boolean(result)} onClick={()=>void approve()}>{busy?'Checking…':scheduledAt?'Approve and schedule exact revision':'Approve and send exact revision'}</button>:<div role="alert"><p>It is {preview.localTime} in the recipient’s timezone ({preview.timezone}), outside permitted hours. Confirm this time to send now.</p><button type="button" className="operator-button" disabled={busy||dirty||draft.isStale} onClick={()=>void approve(preview.localTime)}>Confirm send at {preview.localTime}</button><button onClick={()=>setPreview(null)}>Cancel</button></div>}
  {result&&<OperatorState>{result}</OperatorState>}{error&&<OperatorState kind="error">{error} <a href="/app/settings#mail-sender">Customer mail sender settings</a></OperatorState>}
 </section>;
}
