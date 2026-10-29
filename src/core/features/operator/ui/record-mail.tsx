import {DataValue} from './data-value';
import {formatDate} from './formatters';
import {useCallback,useEffect,useState} from 'react';
import {Link} from '@tanstack/react-router';
import {DraftContentFields} from '../../drafts/ui/draft-content-fields';
import {OperatorState} from './operator-shell';
import type {ActivityEntry} from './record/activity';
interface Contact {id:string;name:string|null;email:string|null;contactability:string}
export interface MailContext {record:{lifecycle?:string};contacts:Contact[];deals:{id:string;title:string;contactId:string}[]}
type Message={id:string;draftId:string;state:string;subject:string;body:string;recipientEmail:string;failure:string|null;scheduledAt:string|null;createdAt?:string;acceptedAt?:string|null};
export interface MailHistory {messages:Message[];drafts:{id:string;subject:string;isStale:number;updatedAt?:string;createdAt?:string}[];obligations:{messageId:string;dueAt:string;closedAt:string|null;closedReason:string|null;operatorId:string;ownerId:string|null}[]}
async function request<T>(path:string,body?:unknown):Promise<T>{const response=await fetch(`/api/v1/workbench/${path}`,body===undefined?undefined:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const value=await response.json() as T&{error?:string};if(!response.ok)throw new Error(value.error??'The mail operation failed.');return value;}

/** A record's mail: who it can go to and which deals it can link, and for a contact the drafts, messages and
 * follow-ups owed (which Activity lists). */
export function useRecordMail(kind:'contact'|'company'|'opportunity',id:string){
 const [context,setContext]=useState<MailContext>(),[history,setHistory]=useState<MailHistory>(),[error,setError]=useState('');
 const reload=useCallback(async()=>{try{const [nextContext,nextHistory]=await Promise.all([request<MailContext>(`records/${kind}/${id}/mail-context`),kind==='contact'?request<MailHistory>(`records/contact/${id}/mail`):Promise.resolve(undefined)]);setContext(nextContext);setHistory(nextHistory);setError('');}catch(e){setError((e as Error).message);}},[kind,id]);
 useEffect(()=>{void reload();},[reload]);
 return {context,history,error,reload};
}

/** Record compose shares the saved-draft review and exact approval page: saving a draft sends nothing. */
export function RecordMailComposer({kind,id,context,deal:linked}:{kind:'contact'|'company'|'opportunity';id:string;context:MailContext|undefined;deal?:string}){
 const [contactId,setContactId]=useState(kind==='contact'?id:''),[deal,setDeal]=useState(linked??'automatic'),[subject,setSubject]=useState(''),[body,setBody]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[aiPreview,setAiPreview]=useState<any>();
 const contact=context?.contacts.find(c=>c.id===contactId),deals=context?.deals.filter(d=>d.contactId===contactId)??[],forced=kind==='opportunity'&&context?.record.lifecycle==='open';
 async function create(){setBusy(true);setError('');try{const result=await request<{id:string}>(`records/${kind}/${id}/drafts`,{contactId,subject,body,...(deal==='automatic'?{}:{opportunityId:deal==='unlinked'?null:deal})});window.location.assign(`/app/drafts/${result.id}`);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function aiRequest(path:string,payload:unknown){const response=await fetch(`/api/v1/assistance/record-mail/${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const result=await response.json() as any;if(!response.ok)throw new Error(result.error??'AI request failed.');return result;}
 async function previewAI(){setBusy(true);setError('');try{setAiPreview(await aiRequest('preview',{kind,recordId:id,contactId,opportunityId:forced?id:deal==='unlinked'?null:deal==='automatic'?(deals[0]?.id??null):deal}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function generateAI(){if(!aiPreview)return;setBusy(true);setError('');try{const result=await aiRequest('generate',{previewId:aiPreview.id});window.location.assign(`/app/drafts/${result.draftId}`);}catch(e){setError((e as Error).message);setAiPreview(undefined);}finally{setBusy(false);}}
 const blocked=busy||!contact?.email||contact.contactability!=='contactable'||(!forced&&deals.length>1&&deal==='automatic');
 return <section className="operator-surface workbench-form r-mail" aria-label="Write an email">{error&&<OperatorState kind="error">{error}</OperatorState>}{!context?<p>Loading recipients…</p>:<form onSubmit={e=>{e.preventDefault();void create();}}>
  <label>To<select aria-label="To" value={contactId} required onChange={e=>{setContactId(e.target.value);setDeal('automatic');}}><option value="">Choose a contact</option>{context.contacts.map(c=><option key={c.id} value={c.id} disabled={!c.email||c.contactability!=='contactable'}>{c.name??c.email} · {c.email??'No email'}{c.contactability!=='contactable'?' · Do not contact':''}</option>)}</select></label>
  {contact?.contactability==='do_not_contact'?<p>This contact must not be contacted.</p>:null}
  <label>Deal link<select aria-label="Deal link" value={forced?id:deal} disabled={forced} onChange={e=>setDeal(e.target.value)}>{forced?<option value={id}>This open deal</option>:<><option value="automatic">{deals.length>1?'Choose a deal or leave unlinked':deals.length===1?`Automatic: ${deals[0]!.title}`:'No open deals — contact only'}</option><option value="unlinked">Leave unlinked</option>{deals.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</>}</select></label>
  {kind==='opportunity'&&!forced?<p>This closed deal receives the email as history. Sending does not reopen it.</p>:null}{deals.length>1&&!forced&&deal==='automatic'?<p>Several open deals need your choice before saving the draft.</p>:null}
  <details><summary style={{minHeight:44,display:'flex',alignItems:'center'}}>Email assistance</summary><button type="button" style={{minHeight:44}} disabled={blocked} onClick={()=>void previewAI()}>Preview AI draft request</button></details>
  {aiPreview&&<section aria-label="AI request preview" className="assistance-card" style={{overflowWrap:'anywhere'}}><h3>Review AI draft request</h3><p>{aiPreview.provider??'No AI provider configured'}{aiPreview.model?` · ${aiPreview.model}`:''}</p><p>{aiPreview.preview.instructions}</p><details><summary style={{minHeight:44,display:'flex',alignItems:'center'}}>Complete request: every field and timeline entry</summary><DataValue value={aiPreview.preview}/></details>{!aiPreview.configured&&<p role="status">AI is not configured. No draft can be generated.</p>}<div className="workbench-actions"><button type="button" style={{minHeight:44}} disabled={busy||!aiPreview.configured} onClick={()=>void generateAI()}>Generate draft</button><button type="button" style={{minHeight:44}} disabled={busy} onClick={()=>setAiPreview(undefined)}>Revise inputs</button></div></section>}
  <DraftContentFields subject={subject} body={body} onSubjectChange={setSubject} onBodyChange={setBody}/>
  <button className="operator-primary-button" disabled={blocked}>Save draft for review</button><p>Save first, then review the exact message, recipient time and opt-out state before approving or scheduling.</p>
 </form>}</section>;
}

/** One sent message's own actions: review a retry of one the provider refused, or cancel one that is scheduled. */
function MailTools({message,reload}:{message:Message;reload:()=>Promise<void>}){
 const [retry,setRetry]=useState<{localTime:string;timezone:string;quietHours:boolean}>(),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function run(work:()=>Promise<void>){setBusy(true);setError('');try{await work();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <>
  <details><summary>Approved message</summary><p>To: {message.recipientEmail}</p><p style={{whiteSpace:'pre-wrap'}}>{message.body}</p></details>
  {message.state==='draft'?<button type="button" disabled={busy} onClick={()=>void run(async()=>setRetry(await request(`drafts/${message.draftId}/approval-preview`)))}>Review send retry</button>:null}
  {retry?<div role="alert" className="r-confirm"><p>Recipient time: {retry.localTime} ({retry.timezone}). {retry.quietHours?'This is outside permitted sending hours.':''} Confirm submission of the saved approved message above.</p><div><button type="button" className="operator-button" disabled={busy} onClick={()=>void run(async()=>{try{await request(`messages/${message.id}/retry`,{quietHoursConfirmation:retry.localTime});setRetry(undefined);}finally{await reload();}})}>Confirm retry now</button><button type="button" className="operator-text-button" disabled={busy} onClick={()=>setRetry(undefined)}>Cancel retry</button></div></div>:null}
  {message.state==='scheduled'?<button type="button" className="operator-text-button" disabled={busy} onClick={()=>void run(async()=>{await request(`messages/${message.id}/cancel`,{});await reload();})}>Cancel scheduled email</button>:null}
  {error?<p className="r-fail" role="alert">{error}</p>:null}
 </>;
}
function CompleteFollowUp({messageId,reload}:{messageId:string;reload:()=>Promise<void>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <><button type="button" className="operator-text-button" disabled={busy} onClick={()=>void (async()=>{setBusy(true);setError('');try{await request(`record-mail/${messageId}/complete`,{});await reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}})()}>Complete my follow-up</button>{error?<p className="r-fail" role="alert">{error}</p>:null}</>;
}

/** A contact's mail as Activity lines: drafts not yet sent, messages with their state, follow-ups still owed. */
export function mailEntries(history:MailHistory|undefined,reload:()=>Promise<void>):ActivityEntry[]{
 if(!history)return [];
 const sent=new Set(history.messages.map(message=>message.draftId));
 return [
  ...history.drafts.filter(draft=>!sent.has(draft.id)).map(draft=>({key:`mail-draft-${draft.id}`,kind:'Draft',draft:true,title:<Link to="/app/drafts/$id" params={{id:draft.id}}>{draft.subject}</Link>,line:`Not sent${draft.isStale?' · review needed':''}`,at:draft.updatedAt??draft.createdAt??null})),
  ...history.messages.map(message=>({key:`mail-${message.id}`,kind:'Sent',title:<Link to="/app/drafts/$id" params={{id:message.draftId}}>{message.subject}</Link>,line:[`To ${message.recipientEmail}`,message.state==='accepted'?'accepted by the mail provider':message.state,message.failure,message.scheduledAt?formatDate(message.scheduledAt):''].filter(Boolean).join(' · '),at:message.acceptedAt??message.scheduledAt??message.createdAt??null,tools:<MailTools message={message} reload={reload}/>})),
  ...history.obligations.filter(obligation=>!obligation.closedAt).map(obligation=>({key:`owed-${obligation.messageId}`,kind:'Waiting',title:'Awaiting customer response',line:`${obligation.ownerId===null?'Unassigned · ':''}due ${formatDate(obligation.dueAt)}`,at:obligation.dueAt,tools:<CompleteFollowUp messageId={obligation.messageId} reload={reload}/>})),
 ];
}
